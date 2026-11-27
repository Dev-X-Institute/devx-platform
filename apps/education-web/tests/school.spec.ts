import { expect, test } from "@playwright/test";
import { buildReport } from "../src/report";
import {
  actorFor,
  addSubject,
  approveReport,
  assignFormMaster,
  assignTeacherToSubject,
  attendanceFor,
  computePosition,
  computeSubjectScore,
  computeTermAverage,
  gradeFor,
  migrateSchoolState,
  recordInPersonPayment,
  saveGradingScheme,
  seedSchoolState,
  selectGradingScheme,
  setMark,
  setReportField,
} from "../src/school";

const admin = actorFor("admin", "admin");
const teacher1 = actorFor("teacher", "teacher-1");
const teacher2 = actorFor("teacher", "teacher-2");
const teacher3 = actorFor("teacher", "teacher-3");
const mathsMark = {
  studentId: 1, subjectId: "mathematics", component: "assignment" as const,
  score: 20, max: 25, term: "Term 1", className: "JHS 2",
};

const stateWithMathsMarks = () => {
  let state = seedSchoolState();
  state = setMark(state, admin, mathsMark);
  state = setMark(state, admin, { ...mathsMark, component: "homework", score: 10, max: 10 });
  state = setMark(state, admin, { ...mathsMark, component: "quiz", score: 15, max: 20 });
  state = setMark(state, admin, { ...mathsMark, component: "exam", score: 48, max: 60 });
  return state;
};

test("seed data defines five subjects, three teachers, two schemes and a JHS 2 form master", () => {
  const state = seedSchoolState();
  expect(state.subjects).toHaveLength(5);
  expect(state.teachers).toHaveLength(3);
  expect(state.gradingSchemes).toHaveLength(2);
  expect(state.gradingSchemes[0]!.weights.classScore).not.toBe(state.gradingSchemes[1]!.weights.classScore);
  expect(state.formMasters.some(assignment => assignment.className === "JHS 2")).toBe(true);
});

test("v1 save migrates with seeded school slices", () => {
  const seed = seedSchoolState();
  const migrated = migrateSchoolState({ payments: [] }, seed);
  expect(migrated.subjects).toEqual(seed.subjects);
  expect(migrated.marks).toEqual([]);
  expect(migrated.gradingSchemes).toEqual(seed.gradingSchemes);
});

test("unassigned teacher cannot set any mark", () => {
  expect(() => setMark(seedSchoolState(), teacher3, mathsMark)).toThrow();
});

test("assigned teacher sets a mark", () => {
  const state = setMark(seedSchoolState(), teacher1, mathsMark);
  expect(state.marks).toHaveLength(1);
  expect(state.marks[0]!.enteredBy).toBe("teacher-1");
});

test("setMark rejects score above max and negative score", () => {
  const state = seedSchoolState();
  expect(() => setMark(state, teacher1, { ...mathsMark, score: 30 })).toThrow();
  expect(() => setMark(state, teacher1, { ...mathsMark, score: -1 })).toThrow();
});

test("non-admin cannot manage subjects, form masters or approve", () => {
  const state = seedSchoolState();
  expect(() => addSubject(state, teacher1, "French")).toThrow();
  expect(() => assignTeacherToSubject(state, teacher1, "mathematics", "teacher-3")).toThrow();
  expect(() => assignFormMaster(state, teacher1, "JHS 2", "teacher-3")).toThrow();
  expect(() => approveReport(state, teacher1, "1:Term 1", 1)).toThrow();
});

test("non-admin cannot save a scheme or record a fee payment", () => {
  const state = seedSchoolState();
  expect(() => saveGradingScheme(state, teacher1, state.gradingSchemes[0]!)).toThrow();
  expect(() => recordInPersonPayment(state, teacher1, { studentId: 1, amount: 200, date: "2026-11-27", method: "cash" })).toThrow();
});

test("non-form-master cannot edit another class report", () => {
  expect(() => setReportField(seedSchoolState(), teacher3, "1:Term 1", "teacherRemark", "Well done")).toThrow();
});

test("form master edits their own class report but not the head remark", () => {
  const state = setReportField(seedSchoolState(), teacher2, "1:Term 1", "teacherRemark", "Well done");
  expect(state.reports.find(report => report.id === "1:Term 1")!.teacherRemark).toBe("Well done");
  expect(() => setReportField(state, teacher2, "1:Term 1", "headRemark", "Approved")).toThrow();
});

test("admin can add a subject, assign a teacher and record an in-person payment", () => {
  let state = addSubject(seedSchoolState(), admin, "French");
  const subject = state.subjects.find(item => item.name === "French")!;
  state = assignTeacherToSubject(state, admin, subject.id, "teacher-3");
  expect(state.teacherAssignments.some(item => item.subjectId === subject.id && item.teacherId === "teacher-3")).toBe(true);
  state = recordInPersonPayment(state, admin, { studentId: 2, amount: 200, date: "2026-11-27", method: "cash", reference: "RCP-1" });
  expect(state.balance).toBe(450);
  expect(state.payments.some(payment => payment.studentId === 2 && payment.amount === 200 && payment.method === "cash" && payment.reference === "RCP-1" && payment.recordedBy === "admin")).toBe(true);
});

test("commands refuse changes after approval", () => {
  const state = approveReport(seedSchoolState(), admin, "1:Term 1", 2);
  expect(state.reports.find(report => report.id === "1:Term 1")!.status).toBe("approved");
  expect(() => setMark(state, admin, mathsMark)).toThrow();
  expect(() => setReportField(state, admin, "1:Term 1", "headRemark", "Approved")).toThrow();
  expect(() => approveReport(state, admin, "1:Term 1", 3)).toThrow();
});

test("computeSubjectScore with no marks returns null score", () => {
  expect(computeSubjectScore(seedSchoolState(), 1, "mathematics", "Term 1")).toBeNull();
});

test("recorded marks produce weighted class score, exam score and JHS grade", () => {
  expect(computeSubjectScore(stateWithMathsMarks(), 1, "mathematics", "Term 1")).toEqual({
    classScore: 34, exam: 48, total: 82, grade: "A1", remark: "Excellent",
  });
});

test("changing the scheme changes the grade", () => {
  const base = stateWithMathsMarks();
  const shs = base.gradingSchemes.find(scheme => scheme.id === "shs-default")!;
  const state = saveGradingScheme(base, admin, { ...shs, id: "jhs-default", appliesTo: ["JHS"] });
  expect(computeSubjectScore(state, 1, "mathematics", "Term 1")).toMatchObject({ total: 82, grade: "A2" });
});

test("computePosition ranks students by term average", () => {
  let state = seedSchoolState();
  state = setMark(state, admin, { ...mathsMark, score: 25 });
  state = setMark(state, admin, { ...mathsMark, component: "exam", score: 60, max: 60 });
  state = setMark(state, admin, { ...mathsMark, studentId: 2, score: 5, max: 25 });
  state = setMark(state, admin, { ...mathsMark, studentId: 2, component: "exam", score: 20, max: 60 });
  expect(computeTermAverage(state, 1, "Term 1")).toBe(100);
  expect(computePosition(state, "JHS 2", "Term 1", 1)).toBe(1);
  expect(computePosition(state, "JHS 2", "Term 1", 2)).toBe(2);
  expect(computePosition(state, "JHS 2", "Term 1", 3)).toBeNull();
});

test("selectGradingScheme prefers a level match over a school-name match", () => {
  const state = seedSchoolState();
  expect(selectGradingScheme(state, "DevX Demo School", "SHS 1").id).toBe("shs-default");
  expect(selectGradingScheme(state, "Unknown School", "JHS 2").id).toBe("jhs-default");
});

test("attendanceFor uses override when present", () => {
  const state = seedSchoolState();
  const scheme = selectGradingScheme(state, state.schoolName, "JHS 2");
  expect(attendanceFor(state.students[0]!, scheme, "42/60 days")).toBe("42/60 days");
  expect(attendanceFor(state.students[0]!, scheme, null)).not.toBe("42/60 days");
});

test("PDF renders long conduct and promotion text", () => {
  const conduct = "Shows steady progress in all subjects and relates well to peers in class discussions and group work.";
  let state = seedSchoolState();
  state = setReportField(state, admin, "1:Term 1", "conduct", conduct);
  state = setReportField(state, admin, "1:Term 1", "promotion", "promoted");
  const report = buildReport(state, 1, "Term 1");
  expect(report.conduct).toBe(conduct);
  expect(report.promotion).toBe("promoted");
});

test("gradeFor resolves the matching band from the selected scheme", () => {
  const state = seedSchoolState();
  expect(gradeFor(state.gradingSchemes[0]!, 70)).toEqual({ grade: "B3", remark: "Good" });
  expect(gradeFor(state.gradingSchemes[1]!, 70)).toEqual({ grade: "B3", remark: "Very good" });
});

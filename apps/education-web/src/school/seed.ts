import { seedRecords } from "../records";
import type { GradeBand, GradingScheme, Mark, ReportDraft, SchoolState, Subject, TeacherAssignment, TeacherProfile } from "./types";

export const subjects: Subject[] = [
  { id: "mathematics", name: "Mathematics" },
  { id: "english", name: "English Language" },
  { id: "science", name: "Integrated Science" },
  { id: "social", name: "Social Studies" },
  { id: "ict", name: "ICT" },
];

export const seededTeachers: TeacherProfile[] = [
  { id: "teacher-1", name: "Mr. Mensah" },
  { id: "teacher-2", name: "Mrs. Adjei" },
  { id: "teacher-3", name: "Mr. Boateng" },
];

const teacherAssignments: TeacherAssignment[] = [
  { subjectId: "mathematics", teacherId: "teacher-1" },
  { subjectId: "science", teacherId: "teacher-1" },
  { subjectId: "english", teacherId: "teacher-2" },
  { subjectId: "social", teacherId: "teacher-2" },
  { subjectId: "ict", teacherId: "teacher-3" },
];

const band = (min: number, max: number, grade: string, remark: string): GradeBand => ({ min, max, grade, remark });

const jhsScheme: GradingScheme = {
  id: "jhs-default",
  name: "JHS terminal grading",
  appliesTo: ["JHS", "DevX Demo School"],
  weights: { classScore: 40, exam: 60 },
  termDays: 60,
  bands: [
    band(81, 100, "A1", "Excellent"),
    band(71, 80, "A2", "Very good"),
    band(61, 70, "B3", "Good"),
    band(51, 60, "B4", "Credit"),
    band(41, 50, "C5", "Credit"),
    band(35, 40, "C6", "Pass"),
    band(30, 34, "D7", "Pass"),
    band(25, 29, "E8", "Pass"),
    band(0, 24, "F9", "Fail"),
  ],
};

const shsScheme: GradingScheme = {
  id: "shs-default",
  name: "SHS terminal grading",
  appliesTo: ["SHS"],
  weights: { classScore: 30, exam: 70 },
  termDays: 60,
  bands: [
    band(90, 100, "A1", "Outstanding"),
    band(80, 89, "A2", "Excellent"),
    band(70, 79, "B3", "Very good"),
    band(60, 69, "C4", "Good"),
    band(50, 59, "D5", "Credit"),
    band(40, 49, "E6", "Pass"),
    band(0, 39, "F7", "Fail"),
  ],
};

export function seedSchoolState(): SchoolState {
  const records = seedRecords();
  const reports: ReportDraft[] = records.students.map(student => ({
    id: `${student.id}:Term 1`,
    studentId: student.id,
    term: "Term 1",
    className: student.className,
    status: "draft",
    teacherRemark: "",
    headRemark: "",
    conduct: "",
    promotion: "promoted",
    positionOverride: null,
    attendanceOverride: null,
    position: null,
  }));
  const marks: Mark[] = [];
  return {
    ...records,
    balance: 650,
    actor: { role: "admin", userId: "admin" },
    subjects: subjects.map(subject => ({ ...subject })),
    teachers: seededTeachers.map(teacher => ({ ...teacher })),
    teacherAssignments: teacherAssignments.map(assignment => ({ ...assignment })),
    formMasters: [{ className: "JHS 2", teacherId: "teacher-2" }],
    marks,
    reports,
    gradingSchemes: [
      { ...jhsScheme, weights: { ...jhsScheme.weights }, bands: jhsScheme.bands.map(item => ({ ...item })) },
      { ...shsScheme, weights: { ...shsScheme.weights }, bands: shsScheme.bands.map(item => ({ ...item })) },
    ],
  };
}

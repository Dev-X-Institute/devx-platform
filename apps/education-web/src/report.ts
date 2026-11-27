import { attendanceDays, attendanceFor, computePosition, computeSubjectScore, computeTermAverage, selectGradingScheme } from "./school";
import type { SchoolState } from "./school";

export interface ReportRow {
  subject: string;
  classScore: number | null;
  exam: number | null;
  total: number | null;
  grade: string;
  remark: string;
}

export interface ReportModel {
  schoolName: string;
  term: string;
  className: string;
  year: number;
  student: string;
  position: string;
  attendance: string;
  monogram: string;
  rows: ReportRow[];
  average: number | null;
  teacherRemark: string;
  headRemark: string;
  conduct: string;
  promotion: string;
  daysPresent: number;
  daysPossible: number;
  generatedOn: string;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}

/** Build a report from the stored school state; an approved report uses its frozen position. */
export function buildReport(state: SchoolState, studentId: number, term: string, generatedOn = new Date().toISOString().slice(0, 10)): ReportModel {
  const student = state.students.find(item => item.id === studentId);
  if (!student) throw new Error("Student not found.");
  const draft = state.reports.find(report => report.studentId === studentId && report.term === term);
  const scheme = selectGradingScheme(state, state.schoolName, student.className);
  const classSize = state.students.filter(item => item.className === student.className).length;
  const rank = draft?.status === "approved" ? draft.position : computePosition(state, student.className, term, studentId);
  const rows: ReportRow[] = state.subjects.map(subject => {
    const score = computeSubjectScore(state, studentId, subject.id, term);
    return score
      ? { subject: subject.name, classScore: score.classScore, exam: score.exam, total: score.total, grade: score.grade, remark: score.remark }
      : { subject: subject.name, classScore: null, exam: null, total: null, grade: "—", remark: "" };
  });

  return {
    schoolName: state.schoolName,
    term,
    className: student.className,
    year: Number.parseInt(generatedOn.slice(0, 4), 10),
    student: student.name,
    position: rank ? `${rank} of ${classSize}` : "—",
    attendance: attendanceFor(student, scheme, draft?.attendanceOverride ?? null),
    monogram: initials(state.schoolName),
    rows,
    average: computeTermAverage(state, studentId, term),
    teacherRemark: draft?.teacherRemark ?? "",
    headRemark: draft?.headRemark ?? "",
    conduct: draft?.conduct ?? "",
    promotion: draft?.promotion ?? "promoted",
    daysPresent: attendanceDays(student, scheme),
    daysPossible: scheme.termDays,
    generatedOn,
  };
}

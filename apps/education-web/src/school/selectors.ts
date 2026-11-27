import type { StudentRecord } from "../records";
import type { GradingScheme, Mark, SchoolState } from "./types";

export interface SubjectScore {
  classScore: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

const levelOf = (className: string) => className.trim().split(/\s+/)[0] ?? className;

/** School+level match wins, then level, then the first configured scheme. */
export function selectGradingScheme(state: SchoolState, schoolName: string, className: string): GradingScheme {
  const level = levelOf(className);
  const exact = state.gradingSchemes.find(scheme => scheme.appliesTo.includes(schoolName) && scheme.appliesTo.includes(level));
  if (exact) return exact;
  const byLevel = state.gradingSchemes.find(scheme => scheme.appliesTo.includes(level));
  return byLevel ?? state.gradingSchemes[0]!;
}

const percentage = (mark: Mark) => mark.max > 0 ? mark.score / mark.max : 0;
const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

function gradeFor(scheme: GradingScheme, total: number) {
  const band = scheme.bands.find(item => total >= item.min && total <= item.max);
  return { grade: band?.grade ?? "", remark: band?.remark ?? "" };
}

/** All class-work components are averaged as percentages, then weighted against the exam. */
export function computeSubjectScore(state: SchoolState, studentId: number, subjectId: string, term: string): SubjectScore | null {
  const marks = state.marks.filter(mark => mark.studentId === studentId && mark.subjectId === subjectId && mark.term === term);
  const classMarks = marks.filter(mark => mark.component !== "exam");
  const examMarks = marks.filter(mark => mark.component === "exam");
  if (!classMarks.length || !examMarks.length) return null;

  const student = state.students.find(item => item.id === studentId);
  if (!student) return null;
  const scheme = selectGradingScheme(state, state.schoolName, student.className);
  const classScore = Math.round(average(classMarks.map(percentage)) * scheme.weights.classScore);
  const exam = Math.round(average(examMarks.map(percentage)) * scheme.weights.exam);
  const total = Math.round((average(classMarks.map(percentage)) * scheme.weights.classScore) + (average(examMarks.map(percentage)) * scheme.weights.exam));
  return { classScore, exam, total, ...gradeFor(scheme, total) };
}

export function computeTermAverage(state: SchoolState, studentId: number, term: string): number | null {
  const totals = state.subjects
    .map(subject => computeSubjectScore(state, studentId, subject.id, term)?.total)
    .filter((total): total is number => total !== undefined);
  return totals.length ? Math.round(average(totals)) : null;
}

/** 1-based rank among classmates who have at least one scored subject for the term. */
export function computePosition(state: SchoolState, className: string, term: string, studentId: number): number | null {
  const ranked = state.students
    .filter(student => student.className === className)
    .map(student => ({ id: student.id, average: computeTermAverage(state, student.id, term) }))
    .filter((entry): entry is { id: number; average: number } => entry.average !== null)
    .sort((a, b) => b.average - a.average || a.id - b.id);
  return ranked.findIndex(entry => entry.id === studentId) + 1 || null;
}

export function attendanceDays(student: StudentRecord, scheme: GradingScheme): number {
  return Math.round((student.attendance / 100) * scheme.termDays);
}

export function attendanceFor(student: StudentRecord, scheme: GradingScheme, override: string | null): string {
  if (override) return override;
  return `${attendanceDays(student, scheme)}/${scheme.termDays} days`;
}

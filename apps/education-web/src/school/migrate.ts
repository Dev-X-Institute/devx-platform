import type { Actor, FormMasterAssignment, GradingScheme, Mark, ReportDraft, SchoolState, Subject, TeacherAssignment, TeacherProfile } from "./types";

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isNullableNumber = (value: unknown): value is number | null => value === null || isNumber(value);
const oneOf = (value: unknown, options: readonly string[]) => isText(value) && options.includes(value);

const isActor = (value: unknown): value is Actor => isObject(value)
  && oneOf(value.role, ["student", "teacher", "admin", "parent"])
  && isText(value.userId);
const isNamed = (value: unknown): value is Subject | TeacherProfile => isObject(value) && isText(value.id) && isText(value.name);
const isTeacherAssignment = (value: unknown): value is TeacherAssignment => isObject(value) && isText(value.subjectId) && isText(value.teacherId);
const isFormMaster = (value: unknown): value is FormMasterAssignment => isObject(value) && isText(value.className) && isText(value.teacherId);
const isMark = (value: unknown): value is Mark => isObject(value)
  && isText(value.id) && isNumber(value.studentId) && isText(value.subjectId)
  && oneOf(value.component, ["assignment", "homework", "quiz", "exam"])
  && isNumber(value.score) && isNumber(value.max) && isText(value.term) && isText(value.className)
  && isText(value.enteredBy) && isText(value.updatedAt);
const isReport = (value: unknown): value is ReportDraft => isObject(value)
  && isText(value.id) && isNumber(value.studentId) && isText(value.term) && isText(value.className)
  && oneOf(value.status, ["draft", "approved"])
  && isText(value.teacherRemark) && isText(value.headRemark) && isText(value.conduct)
  && oneOf(value.promotion, ["promoted", "not-promoted", "repeat"])
  && isNullableNumber(value.positionOverride) && (value.attendanceOverride === null || isText(value.attendanceOverride))
  && isNullableNumber(value.position);
const isScheme = (value: unknown): value is GradingScheme => isObject(value)
  && isText(value.id) && isText(value.name) && Array.isArray(value.appliesTo) && value.appliesTo.every(isText)
  && isObject(value.weights) && isNumber(value.weights.classScore) && isNumber(value.weights.exam)
  && isNumber(value.termDays) && Array.isArray(value.bands)
  && value.bands.every(band => isObject(band) && isNumber(band.min) && isNumber(band.max) && isText(band.grade) && isText(band.remark));

/** Merge a saved demo record (v1 or v2) over seed data, keeping only valid slices. */
export function migrateSchoolState(raw: unknown, seed: SchoolState): SchoolState {
  const saved = isObject(raw) ? raw : {};
  const next: SchoolState = { ...seed };

  if (isText(saved.schoolName)) next.schoolName = saved.schoolName;
  if (Array.isArray(saved.students) && saved.students.every(student => isObject(student) && isNumber(student.id) && isText(student.name))) next.students = saved.students as SchoolState["students"];
  if (Array.isArray(saved.study)) next.study = saved.study as SchoolState["study"];
  if (Array.isArray(saved.payments)) next.payments = saved.payments as SchoolState["payments"];
  if (Array.isArray(saved.attempts)) next.attempts = saved.attempts as SchoolState["attempts"];

  if (isActor(saved.actor)) next.actor = { role: saved.actor.role, userId: saved.actor.userId };
  if (Array.isArray(saved.subjects) && saved.subjects.every(isNamed)) next.subjects = saved.subjects;
  if (Array.isArray(saved.teachers) && saved.teachers.every(isNamed)) next.teachers = saved.teachers;
  if (Array.isArray(saved.teacherAssignments) && saved.teacherAssignments.every(isTeacherAssignment)) next.teacherAssignments = saved.teacherAssignments;
  if (Array.isArray(saved.formMasters) && saved.formMasters.every(isFormMaster)) next.formMasters = saved.formMasters;
  if (Array.isArray(saved.marks) && saved.marks.every(isMark)) next.marks = saved.marks;
  if (Array.isArray(saved.reports) && saved.reports.every(isReport)) next.reports = saved.reports;
  if (Array.isArray(saved.gradingSchemes) && saved.gradingSchemes.length > 0 && saved.gradingSchemes.every(isScheme)) next.gradingSchemes = saved.gradingSchemes;

  return next;
}

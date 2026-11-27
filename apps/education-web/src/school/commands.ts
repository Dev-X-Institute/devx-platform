import type { Actor, GradingScheme, Mark, MarkComponent, PaymentMethod, Promotion, ReportDraft, SchoolState } from "./types";

export interface SetMarkInput {
  studentId: number;
  subjectId: string;
  component: MarkComponent;
  score: number;
  max: number;
  term: string;
  className: string;
}

export interface InPersonPaymentInput {
  studentId: number;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
}

export type ReportField = "teacherRemark" | "headRemark" | "conduct" | "promotion";
const promotions: Promotion[] = ["promoted", "not-promoted", "repeat"];

const requireAdmin = (actor: Actor) => {
  if (actor.role !== "admin") throw new Error("Only an administrator may perform this action.");
};

const requireDraft = (report: ReportDraft | undefined): ReportDraft => {
  if (!report) throw new Error("Report not found.");
  if (report.status === "approved") throw new Error("An approved report cannot be changed.");
  return report;
};

export function addSubject(state: SchoolState, actor: Actor, name: string): SchoolState {
  requireAdmin(actor);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subject name is required.");
  if (state.subjects.some(subject => subject.name.toLowerCase() === trimmed.toLowerCase())) throw new Error("That subject already exists.");
  const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!id || state.subjects.some(subject => subject.id === id)) throw new Error("Subject name cannot be used as an id.");
  return { ...state, subjects: [...state.subjects, { id, name: trimmed }] };
}

export function assignTeacherToSubject(state: SchoolState, actor: Actor, subjectId: string, teacherId: string): SchoolState {
  requireAdmin(actor);
  if (!state.subjects.some(subject => subject.id === subjectId)) throw new Error("Subject not found.");
  if (!state.teachers.some(teacher => teacher.id === teacherId)) throw new Error("Teacher not found.");
  const keep = state.teacherAssignments.filter(assignment => assignment.subjectId !== subjectId);
  return { ...state, teacherAssignments: [...keep, { subjectId, teacherId }] };
}

export function assignFormMaster(state: SchoolState, actor: Actor, className: string, teacherId: string): SchoolState {
  requireAdmin(actor);
  if (!state.teachers.some(teacher => teacher.id === teacherId)) throw new Error("Teacher not found.");
  const keep = state.formMasters.filter(assignment => assignment.className !== className);
  return { ...state, formMasters: [...keep, { className, teacherId }] };
}

export function setMark(state: SchoolState, actor: Actor, input: SetMarkInput): SchoolState {
  requireDraft(state.reports.find(report => report.studentId === input.studentId && report.term === input.term));
  if (actor.role !== "admin" && !state.teacherAssignments.some(assignment => assignment.subjectId === input.subjectId && assignment.teacherId === actor.userId)) {
    throw new Error("You are not assigned to this subject.");
  }
  if (!Number.isFinite(input.score) || input.max <= 0 || input.score < 0 || input.score > input.max) {
    throw new Error("Mark must be between zero and the maximum.");
  }
  const id = `${input.studentId}:${input.subjectId}:${input.component}:${input.term}`;
  const mark: Mark = { ...input, id, enteredBy: actor.userId, updatedAt: new Date().toISOString() };
  return { ...state, marks: [...state.marks.filter(existing => existing.id !== id), mark] };
}

export function setReportField(state: SchoolState, actor: Actor, reportId: string, field: ReportField, value: string): SchoolState {
  const report = requireDraft(state.reports.find(item => item.id === reportId));
  if (field === "headRemark" && actor.role !== "admin") throw new Error("Only an administrator may write the head's remark.");
  if (actor.role !== "admin") {
    const isFormMaster = state.formMasters.some(assignment => assignment.className === report.className && assignment.teacherId === actor.userId);
    if (!isFormMaster || field === "headRemark") throw new Error("Only the form master may edit this report field.");
  }
  let patch: Partial<ReportDraft>;
  if (field === "promotion") {
    if (!promotions.includes(value as Promotion)) throw new Error("Unknown promotion decision.");
    patch = { promotion: value as Promotion };
  } else {
    patch = { [field]: value };
  }
  return { ...state, reports: state.reports.map(item => item.id === reportId ? { ...item, ...patch } : item) };
}

export function approveReport(state: SchoolState, actor: Actor, reportId: string, position: number | null): SchoolState {
  requireAdmin(actor);
  requireDraft(state.reports.find(report => report.id === reportId));
  return {
    ...state,
    reports: state.reports.map(report => report.id === reportId
      ? { ...report, status: "approved" as const, position, approvedBy: actor.userId, approvedAt: new Date().toISOString() }
      : report),
  };
}

export function recordInPersonPayment(state: SchoolState, actor: Actor, input: InPersonPaymentInput): SchoolState {
  requireAdmin(actor);
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Payment amount must be positive.");
  const payment = {
    id: `in-person-${input.studentId}-${input.date}-${state.payments.length}`,
    studentId: input.studentId,
    date: input.date,
    amount: input.amount,
    method: input.method,
    reference: input.reference,
    recordedBy: actor.userId,
  };
  return {
    ...state,
    payments: [...state.payments, payment],
    balance: input.studentId === 2 ? Math.max(0, state.balance - input.amount) : state.balance,
  };
}

export function saveGradingScheme(state: SchoolState, actor: Actor, scheme: GradingScheme): SchoolState {
  requireAdmin(actor);
  const exists = state.gradingSchemes.some(item => item.id === scheme.id);
  const gradingSchemes = exists
    ? state.gradingSchemes.map(item => item.id === scheme.id ? scheme : item)
    : [...state.gradingSchemes, scheme];
  return { ...state, gradingSchemes };
}

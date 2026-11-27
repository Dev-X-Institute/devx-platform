import type { EducationRole } from "@devx/core";
import type { SchoolRecords } from "../records";

export type MarkComponent = "assignment" | "homework" | "quiz" | "exam";
export type PaymentMethod = "cash" | "bank-transfer" | "mobile-money" | "other";
export type ReportStatus = "draft" | "approved";
export type Promotion = "promoted" | "not-promoted" | "repeat";

export interface Actor {
  role: EducationRole;
  userId: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface TeacherProfile {
  id: string;
  name: string;
}

export interface TeacherAssignment {
  subjectId: string;
  teacherId: string;
}

export interface FormMasterAssignment {
  className: string;
  teacherId: string;
}

export interface Mark {
  id: string;
  studentId: number;
  subjectId: string;
  component: MarkComponent;
  score: number;
  max: number;
  term: string;
  className: string;
  enteredBy: string;
  updatedAt: string;
}

export interface ReportDraft {
  id: string;
  studentId: number;
  term: string;
  className: string;
  status: ReportStatus;
  teacherRemark: string;
  headRemark: string;
  conduct: string;
  promotion: Promotion;
  positionOverride: number | null;
  attendanceOverride: string | null;
  position: number | null;
  approvedBy?: string;
  approvedAt?: string;
}

export interface GradeBand {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

export interface GradingScheme {
  id: string;
  name: string;
  appliesTo: string[];
  weights: { classScore: number; exam: number };
  termDays: number;
  bands: GradeBand[];
}

export interface SchoolState extends SchoolRecords {
  actor: Actor;
  subjects: Subject[];
  teacherAssignments: TeacherAssignment[];
  formMasters: FormMasterAssignment[];
  teachers: TeacherProfile[];
  marks: Mark[];
  reports: ReportDraft[];
  gradingSchemes: GradingScheme[];
}

export const classes = ["JHS 1", "JHS 2", "JHS 3", "SHS 1"] as const;
export interface StudentRecord { id: number; name: string; className: string; progress: number; attendance: number; contact: string | null }
export interface StudyRecord { id: string; studentId: number; lessonId: number; date: string; minutes: number }
import type { PaymentMethod } from "./school/types";

export interface PaymentRecord { id: string; studentId: number; date: string; amount: number; method?: PaymentMethod; reference?: string; recordedBy?: string }
export interface AttemptRecord { id: string; studentId: number; lessonId: number; date: string; score: number; total: number }
export interface SchoolRecords { schoolName: string; students: StudentRecord[]; study: StudyRecord[]; payments: PaymentRecord[]; attempts: AttemptRecord[] }
export function dateKey(offset = 0) { const day = new Date(); day.setUTCHours(12, 0, 0, 0); day.setUTCDate(day.getUTCDate() + offset); return day.toISOString().slice(0, 10); }
export function seedRecords(): SchoolRecords {
  const students: StudentRecord[] = Array.from({ length: 16 }, (_, i) => ({ id: i + 1, name: `Student ${i + 1}`, className: i < 4 ? "JHS 2" : classes[Math.floor((i - 4) / 4) === 0 ? 0 : Math.floor((i - 4) / 4) + 1]!, progress: [82, 50, 31, 55][i % 4]!, attendance: [97, 95, 84, 92][i % 4]!, contact: i % 4 === 3 ? null : `parent${i + 1}@school.example` }));
  const payments = students.flatMap((student, i) => { const amount = i < 4 ? [1500, 850, 0, 0][i]! : [1200, 1000, 1500, 500][i % 4]!; return amount ? [{ id: `seed-payment-${student.id}`, studentId: student.id, date: dateKey(-3), amount }] : []; });
  const minutes = [25, 42, 30, 55, 38, 18, 32]; const counts = [1, 2, 1, 3, 2, 1, 2];
  const study = minutes.flatMap((total, day) => Array.from({ length: counts[day]! }, (_, n) => ({ id: `seed-study-${day}-${n}`, studentId: 2, lessonId: n, date: dateKey(day - 6), minutes: Math.floor(total / counts[day]!) + (n === 0 ? total % counts[day]! : 0) })));
  const attempts = students.filter(student => student.id !== 2).flatMap(student => Array.from({ length: 4 }, (_, lessonId) => ({ id: `seed-attempt-${student.id}-${lessonId}`, studentId: student.id, lessonId, date: dateKey(-2), score: [4, 3, 5, 4][(lessonId + student.id) % 4]!, total: 5 })));
  return { schoolName: "DevX Demo School", students, payments, study, attempts };
}

import { classes, dateKey } from "./records";
import { lessons, studentBalance, type DemoState } from "./demo";
export type AnalyticsKind = "activity" | "fees" | "performance";
export function analyticsData(records: DemoState, kind: AnalyticsKind, days: number, className: string, metric: string) {
  const start = dateKey(1 - days);
  const students = records.students.filter(s => className === "all" || s.className === className);
  const ids = new Set(students.map(s => s.id));
  if (kind === "activity") return Array.from({ length: days }, (_, i) => { const date = dateKey(i - days + 1); const sessions = records.study.filter(s => s.studentId === 2 && s.date === date); return { label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)), date, value: metric === "minutes" ? sessions.reduce((sum, s) => sum + s.minutes, 0) : sessions.length }; });
  if (kind === "fees") return classes.filter(name => students.some(s => s.className === name)).map(name => { const group = students.filter(s => s.className === name); const due = records.fees.reduce((a, b) => a + b, 0) * group.length; const outstanding = group.reduce((sum, s) => sum + studentBalance(records, s.id), 0); return { label: name, date: "Current balance", value: due ? Math.round((due - outstanding) / due * 100) : 100, collected: due - outstanding, outstanding }; });
  return lessons.flatMap((lesson, i) => { const attempts = records.attempts.filter(a => ids.has(a.studentId) && a.lessonId === i && a.date >= start && a.date <= dateKey()); return attempts.length ? [{ label: lesson.title, date: "Quiz average", value: Math.round(attempts.reduce((sum, a) => sum + a.score / a.total * 100, 0) / attempts.length) }] : []; });
}

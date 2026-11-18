import { useRef, useState } from "react";
import type { QuizQuestion } from "@devx/ai";
import type { Navigate } from "./App";
import { dateKey, seedRecords, type SchoolRecords } from "./records";
import { buildReport } from "./report";

export const school = "DevX Demo School";
export const money = (amount: number) => `GH₵ ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const questions: QuizQuestion[] = [
  { question: "What is a force?", options: ["A push or a pull", "The size of an object", "A type of energy", "The temperature of an object"], answerIndex: 0 },
  { question: "Which unit is used to measure force?", options: ["Joule (J)", "Newton (N)", "Watt (W)", "Metre (m)"], answerIndex: 1 },
  { question: "Which force pulls objects towards the Earth?", options: ["Friction", "Magnetism", "Gravity", "Air resistance"], answerIndex: 2 },
  { question: "What happens when balanced forces act on a stationary object?", options: ["It speeds up", "It remains stationary", "It changes direction", "It becomes lighter"], answerIndex: 1 },
  { question: "Which force slows a bicycle when the brakes are applied?", options: ["Gravity", "Magnetism", "Friction", "Upthrust"], answerIndex: 2 },
];
export const lessons = [
  { title: "Matter", summary: "Matter is anything that has mass and occupies space. Solids have a fixed shape, liquids take the shape of their container, and gases spread out to fill the space available.", reading: "Look around your classroom. Your desk, the water in your bottle and the air you breathe are all matter. Changes in temperature can turn a solid into a liquid or a liquid into a gas." },
  { title: "Energy", summary: "Energy is the ability to do work. It can take different forms, including light, heat, sound, electrical and kinetic energy.", reading: "Energy transfers between objects and changes from one form to another. A lamp changes electrical energy into light and heat. A moving bicycle has kinetic energy." },
  { title: "Forces and motion", summary: "A force is a push or a pull. Forces can change the speed, direction or shape of an object. In this lesson, explore balanced and unbalanced forces in everyday life.", reading: "Forces are measured in newtons (N). Gravity pulls objects towards the Earth, while friction opposes movement between surfaces. When forces are balanced, an object's motion does not change. An unbalanced force causes an object to speed up, slow down or change direction." },
  { title: "Electricity", summary: "An electric current is the flow of charge through a complete circuit. A circuit needs a power source, conducting wires and a component such as a lamp.", reading: "A switch opens or closes a circuit. Conductors, such as copper, allow current to flow. Insulators, such as rubber, resist the flow of current and help us use electricity safely." },
];
export interface Product { id: number; name: string; price: number; stock: number; kind: "uniform" | "books" | "sports" | "other" }
export interface Order { id: number; item: string; collected: boolean }
export const initialProducts: Product[] = [
  { id: 1, name: "School uniform", price: 150, stock: 42, kind: "uniform" },
  { id: 2, name: "Exercise books", price: 30, stock: 120, kind: "books" },
  { id: 3, name: "Sportswear", price: 95, stock: 5, kind: "sports" },
];
export interface DemoState extends SchoolRecords { completed: number[]; quizScore: number | null; fees: number[]; products: Product[]; orders: Order[]; balance: number; drafts: QuizQuestion[]; published: boolean }
export function initialDemo(): DemoState { return { ...seedRecords(), completed: [0, 1], quizScore: null, fees: [1200, 100, 80, 120], products: initialProducts, orders: [{ id: 1002, item: "School uniform", collected: false }, { id: 1001, item: "Exercise books", collected: true }], balance: 650, drafts: [], published: false }; }
const storageKey = "devx-education-demo-v1";
const nonnegative = (n: number) => Number.isFinite(n) && n >= 0;
const validDate = (value: string) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const validId = (id: number) => Number.isSafeInteger(id) && id > 0;
const lessonId = (id: number) => Number.isInteger(id) && id >= 0 && id < lessons.length;
function readDemo(): DemoState {
  const initial = initialDemo();
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as DemoState | null;
    if (saved && Array.isArray(saved.completed) && saved.completed.every(Number.isInteger)
      && Array.isArray(saved.fees) && saved.fees.length === 4 && saved.fees.every(n => Number.isFinite(n) && n >= 0)
      && Array.isArray(saved.products) && saved.products.every(p => validId(p.id) && typeof p.name === "string" && nonnegative(p.price) && Number.isInteger(p.stock) && nonnegative(p.stock) && ["uniform", "books", "sports", "other"].includes(p.kind))
      && Array.isArray(saved.orders) && saved.orders.every(o => validId(o.id) && typeof o.item === "string" && typeof o.collected === "boolean")
      && nonnegative(saved.balance) && Array.isArray(saved.drafts) && saved.drafts.every(q => typeof q.question === "string" && Array.isArray(q.options) && q.options.length > 1 && q.options.every(o => typeof o === "string") && Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex < q.options.length)) {
      const next = { ...initial, ...saved, completed: [...new Set(saved.completed.filter(n => n >= 0 && n < lessons.length))] };
      for (const key of ["students", "study", "payments", "attempts"] as const) if (!Array.isArray(next[key])) Object.assign(next, { [key]: initial[key] });
      if (!next.students.every(s => validId(s.id) && typeof s.name === "string" && typeof s.className === "string" && nonnegative(s.progress) && s.progress <= 100 && nonnegative(s.attendance) && s.attendance <= 100 && (s.contact === null || typeof s.contact === "string"))) next.students = initial.students;
      if (!next.study.every(s => typeof s.id === "string" && validId(s.studentId) && lessonId(s.lessonId) && validDate(s.date) && nonnegative(s.minutes))) next.study = initial.study;
      if (!next.payments.every(p => typeof p.id === "string" && validId(p.studentId) && validDate(p.date) && nonnegative(p.amount))) next.payments = initial.payments;
      if (!next.attempts.every(a => typeof a.id === "string" && validId(a.studentId) && lessonId(a.lessonId) && validDate(a.date) && Number.isInteger(a.total) && a.total > 0 && nonnegative(a.score) && a.score <= a.total)) next.attempts = initial.attempts;
      next.schoolName = typeof next.schoolName === "string" ? next.schoolName : initial.schoolName;
      next.published = next.published === true;
      next.quizScore = next.quizScore !== null && Number.isInteger(next.quizScore) && next.quizScore >= 0 && next.quizScore <= questions.length ? next.quizScore : null;
      next.students = next.students.map(s => s.id === 2 ? { ...s, progress: Math.round(next.completed.length / lessons.length * 100) } : s);
      if (!Array.isArray(saved.payments)) next.payments = [...initial.payments.filter(p => p.studentId !== 2), { id: "legacy-payment", studentId: 2, date: dateKey(), amount: Math.max(0, saved.fees.reduce((a, b) => a + b, 0) - saved.balance) }];
      next.balance = Math.max(0, next.fees.reduce((a, b) => a + b, 0) - next.payments.filter(p => p.studentId === 2).reduce((sum, p) => sum + p.amount, 0));
      return next;
    }
  } catch { /* Storage may be unavailable. */ }
  return initial;
}
export function useDemoData() {
  const [data, setData] = useState<DemoState>(readDemo);
  const current = useRef(data);
  const preview = useRef(false);
  const generation = useRef(0);
  const normal = useRef(data);
  const [storageError, setStorageError] = useState(false);
  const [status, setStatus] = useState<"ready" | "loading" | "error">("ready");
  const persist = (next: DemoState) => { if (preview.current) return; normal.current = next; try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); } };
  const apply = (next: DemoState) => { current.current = next; setData(next); persist(next); };
  const update = (change: Partial<DemoState> | ((current: DemoState) => Partial<DemoState>)) => {
    const previous = current.current;
    const version = generation.current;
    const patch = typeof change === "function" ? change(previous) : change;
    const next = { ...previous, ...patch };
    apply(next);
    return () => { const keys = Object.keys(patch) as (keyof DemoState)[]; if (version !== generation.current || keys.some(key => current.current[key] !== next[key])) return false; const restored = { ...current.current }; keys.forEach(key => Object.assign(restored, { [key]: previous[key] })); apply(restored); return true; };
  };
  const setPreview = (fixture: DemoState | null) => { generation.current++; preview.current = fixture !== null; current.current = fixture ?? normal.current; setData(current.current); setStatus("ready"); };
  const startStudy = (lessonId: number) => { const id = crypto.randomUUID(); const started = performance.now(); update(d => ({ study: [...d.study, { id, studentId: 2, lessonId, date: dateKey(), minutes: 0 }] })); return () => update(d => ({ study: d.study.map(s => s.id === id ? { ...s, minutes: Math.round((performance.now() - started) / 60000 * 100) / 100 } : s) })); };
  const recordQuiz = (score: number) => update(d => ({ quizScore: score, attempts: [...d.attempts, { id: crypto.randomUUID(), studentId: 2, lessonId: 2, date: dateKey(), score, total: questions.length }] }));
  const recordPayment = (amount: number) => update(d => ({ balance: Math.max(0, d.balance - amount), payments: [...d.payments, { id: crypto.randomUUID(), studentId: 2, date: dateKey(), amount }] }));
  return { data, update, storageError, retryStorage: () => persist(current.current), status, setStatus, setPreview, startStudy, recordQuiz, recordPayment };
}
export type Demo = ReturnType<typeof useDemoData>;
export type Notify = (message: string, undo?: () => boolean) => void;
export interface ScreenProps { navigate: Navigate; demo: Demo; notify: Notify }
export function studentBalance(data: DemoState, id: number) { if (id === 2) return data.balance; return Math.max(0, data.fees.reduce((a, b) => a + b, 0) - data.payments.filter(p => p.studentId === id).reduce((sum, p) => sum + p.amount, 0)); }
export function csvCell(value: string | number) { const text = String(value); const safe = /^\s*[=+@\-]|^[\t\r\n]/.test(text) ? `'${text}` : text; return `"${safe.replace(/"/g, '""')}"`; }
export function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadBytes(name: string, bytes: Uint8Array, type = "application/pdf") {
  const url = URL.createObjectURL(new Blob([bytes.slice().buffer as ArrayBuffer], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Styled vector report card. `pdf.ts` is imported on demand so pdf-lib (and its
// ~420 kB chunk) stays off first load; `report.ts` is a static import because the
// report screen already loads it, so a dynamic import would only add a warning.
export async function downloadReport(term = "Term 1", className = "JHS 2", schoolName = school) {
  const { renderReportPdf } = await import("./pdf");
  downloadBytes("student-report.pdf", await renderReportPdf(buildReport(term, className, schoolName)));
}

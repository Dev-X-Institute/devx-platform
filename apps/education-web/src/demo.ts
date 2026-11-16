import { useState } from "react";
import type { QuizQuestion } from "@devx/ai";
import type { Navigate } from "./App";

export const school = "DevX Demo School";
export const money = (amount: number) => `GH₵ ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const subjects = ["Mathematics", "English Language", "Integrated Science", "Social Studies", "ICT"];
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
interface DemoState { completed: number[]; quizScore: number | null; fees: number[]; products: Product[]; orders: Order[]; balance: number; drafts: QuizQuestion[]; published: boolean }
const initial: DemoState = { completed: [0, 1], quizScore: null, fees: [1200, 100, 80, 120], products: initialProducts, orders: [{ id: 1002, item: "School uniform", collected: false }, { id: 1001, item: "Exercise books", collected: true }], balance: 650, drafts: [], published: false };
const storageKey = "devx-education-demo-v1";
function readDemo(): DemoState {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as DemoState | null;
    if (saved && Array.isArray(saved.completed) && saved.completed.every(Number.isInteger)
      && Array.isArray(saved.fees) && saved.fees.length === 4 && saved.fees.every(n => Number.isFinite(n) && n >= 0)
      && Array.isArray(saved.products) && saved.products.every(p => typeof p.name === "string" && Number.isFinite(p.price) && Number.isFinite(p.stock))
      && Array.isArray(saved.orders) && Number.isFinite(saved.balance) && Array.isArray(saved.drafts)) return { ...initial, ...saved };
  } catch { /* Storage may be unavailable. */ }
  return initial;
}
export function useDemoData() {
  const [data, setData] = useState<DemoState>(readDemo);
  const update = (change: Partial<DemoState> | ((current: DemoState) => Partial<DemoState>)) => {
    setData(current => {
      const next = { ...current, ...(typeof change === "function" ? change(current) : change) };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep the preview usable. */ }
      return next;
    });
  };
  return { data, update };
}
export type Demo = ReturnType<typeof useDemoData>;
export interface ScreenProps { navigate: Navigate; demo: Demo; notify: (message: string) => void }
export function download(name: string, content: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
// Text-only PDF for the sample report, without a PDF library dependency.
export function downloadReport(term = "Term 1", className = "JHS 2") {
  const lines = ["DevX Education - School report", `${term}, ${className}, 2026`, "Student: Student 2", "Position: 4 of 34 | Attendance: 58 of 60 days", "", "Subject                         Class  Exam  Total  Grade", ...subjects.map((s, i) => `${s.padEnd(32)}${[27, 24, 26, 25, 28][i]}     ${[58, 52, 55, 54, 60][i]}    ${[85, 76, 81, 79, 88][i]}     ${i === 1 || i === 3 ? "B2" : "A1"}`), "", "Average: 81.8%", "Teacher: A strong term. Keep practising regularly.", "Head: Well done. Keep up the good work.", "", "Frontend preview - sample data"];
  const stream = `BT /F1 11 Tf 50 780 Td 18 TL ${lines.map((line, i) => `${i ? "T* " : ""}(${line.replace(/[\\()]/g, "\\$&")}) Tj`).join("\n")} ET`;
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>", `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  download("student-report.pdf", pdf, "application/pdf");
}

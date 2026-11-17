import { initialDemo, type DemoState } from "./demo";
export type PreviewMode = "demo" | "worst" | "empty" | "one" | "large" | "loading" | "error";
export function previewFixture(mode: PreviewMode): DemoState {
  const data = initialDemo();
  if (mode === "empty") return { ...data, students: [], study: [], payments: [], attempts: [], products: [], orders: [], completed: [], balance: 0 };
  if (mode === "one") return { ...data, students: data.students.filter(s => s.id === 2), payments: data.payments.filter(p => p.studentId === 2), attempts: data.attempts.filter(a => a.studentId === 2), products: data.products.slice(0, 1), orders: data.orders.slice(0, 1) };
  if (mode === "worst" || mode === "large") {
    data.schoolName = "DevX Demonstration School for Science, Technology and Creative Learning";
    data.students = data.students.map((s, i) => ({ ...s, name: ["Christopher Alexander Montgomery III", "Aleksandra Wiśniewska-Kowalczyk", "王秀英", "نور الهدى عبد الرحمن"][i % 4]!, contact: i % 3 ? "bartholomew.fitzgerald@northwind-industries-holdings.example.com" : null }));
    data.products = [{ id: 1, name: "School uniform — senior secondary ceremonial set with matching accessories", price: 100000, stock: 0, kind: "uniform" }, { id: 2, name: "Exercise books", price: 0.01, stock: 1, kind: "books" }, { id: 3, name: "Sportswear", price: 99999.99, stock: 100000, kind: "sports" }];
    data.orders = data.orders.map(o => ({ ...o, item: data.products[0]!.name }));
    if (mode === "large") { data.students = Array.from({ length: 1000 }, (_, i) => ({ ...data.students[i % 16]!, id: i + 1, name: `${data.students[i % 16]!.name} ${i + 1}` })); data.orders = Array.from({ length: 1000 }, (_, i) => ({ id: 1000 + i, item: data.products[i % 3]!.name, collected: i % 2 === 0 })); }
  }
  return data;
}

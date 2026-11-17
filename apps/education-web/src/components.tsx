import { useEffect, useRef, type ReactNode } from "react";
import { screens, type Navigate, type Screen } from "./App";
import { school, type Product } from "./demo";
import { Icon, type IconName } from "./icons";

export function Brand({ schoolName = false, name }: { schoolName?: boolean; name?: string }) {
  return <div className="brand"><span className="brand-mark">D</span><span dir="auto">{schoolName ? name ?? school : "DevX Education"}</span></div>;
}
export function ScreenPicker({ value, navigate }: { value: Screen; navigate: Navigate }) {
  return <label className="screen-picker">Explore screens<select value={value} onChange={e => navigate(e.target.value as Screen)}>{Object.entries(screens).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>;
}
export function PageHeader({ eyebrow, title, children, name = school }: { eyebrow: string; title: string; children?: ReactNode; name?: string }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div><div className="header-actions"><span className="school-name"><Icon name="school" size={18} /><span dir="auto">{name}</span></span>{children}</div></header>;
}
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Badge({ children, tone = "green" }: { children: ReactNode; tone?: "green" | "amber" | "red" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function ProgressBar({ value, label = "Course progress" }: { value: number; label?: string }) {
  const bounded = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  return <div className="progress-bar" role="progressbar" aria-label={label} aria-valuenow={Math.round(bounded)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${bounded}%` }} /></div>;
}
export function EmptyState({ icon = "book", title, description, children }: { icon?: IconName; title: string; description: string; children?: ReactNode }) {
  return <div className="empty-content"><span className="empty-icon"><Icon name={icon} size={28} /></span><h3>{title}</h3><p className="muted">{description}</p>{children}</div>;
}
export function Pagination({ page, count, size, onPage }: { page: number; count: number; size: number; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(count / size));
  return count > size ? <nav className="pagination" aria-label="Pagination"><p>{page * size + 1}–{Math.min((page + 1) * size, count)} of {count.toLocaleString()} records</p><button className="button outline compact" disabled={page === 0} onClick={() => onPage(page - 1)}>Previous</button><button className="button outline compact" disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>Next</button></nav> : null;
}
export function Stats({ values }: { values: [string, string | number][] }) {
  const iconFor = (label: string): IconName => /student/i.test(label) ? "students" : /fee/i.test(label) ? "fees" : /order/i.test(label) ? "shop" : /lesson/i.test(label) ? "book" : /quiz/i.test(label) ? "quiz" : "report";
  return <div className="stats-grid">{values.map(([label, value]) => <Card key={label} className="stat-card"><div className="stat-top"><p className="muted">{label}</p><span className="stat-icon"><Icon name={iconFor(label)} size={18} /></span></div><strong className="stat-value">{value}</strong></Card>)}</div>;
}
export function ClassSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="inline-label">Class<select value={value} onChange={e => onChange(e.target.value)}>{["JHS 1", "JHS 2", "JHS 3", "SHS 1"].map(c => <option key={c}>{c}</option>)}</select></label>;
}
export function Modal({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => previous?.focus();
  }, []);
  return <dialog ref={dialog} className="modal" aria-labelledby="modal-title" onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="modal-heading"><h2 id="modal-title">{title}</h2><button className="close-button" aria-label="Close dialog" onClick={close}><Icon name="close" /></button></div>{children}</dialog>;
}
export function ProductArt({ product }: { product: Product }) {
  return <div className="product-art" role="img" aria-label={`${product.name} illustration`}><svg viewBox="0 0 180 120" aria-hidden="true" fill="none">
    {product.kind === "books" ? <><rect x="42" y="27" width="78" height="75" rx="5" fill="#b8d5c7" transform="rotate(-9 42 27)" /><rect x="58" y="20" width="78" height="80" rx="5" fill="#fff" stroke="#0b7053" strokeWidth="3" /><path d="M72 20v80M85 40h37M85 50h37M85 60h24" stroke="#0b7053" strokeWidth="3" /><rect x="84" y="77" width="35" height="9" rx="2" fill="#f8b735" /></>
      : product.kind === "uniform" || product.kind === "sports" ? <><path d="m67 18-30 16-18 24 25 15 11-14v47h70V59l11 14 25-15-18-24-30-16c-8 12-38 12-46 0Z" fill={product.kind === "sports" ? "#0b7053" : "#fff"} stroke="#0b7053" strokeWidth="3" /><path d="m67 18 23 23 23-23M90 41v65" stroke={product.kind === "sports" ? "#fff" : "#0b7053"} strokeWidth="3" />{product.kind === "uniform" ? <path d="M105 51h13v15h-13z" fill="#e2f1ea" stroke="#0b7053" strokeWidth="2" /> : <path d="M55 80h70M55 89h70" stroke="#f8b735" strokeWidth="5" />}</>
        : <><rect x="48" y="28" width="84" height="73" rx="6" fill="#fff" stroke="#0b7053" strokeWidth="3" /><path d="M71 32v-8a19 19 0 0 1 38 0v8" stroke="#0b7053" strokeWidth="3" /></>}
  </svg></div>;
}

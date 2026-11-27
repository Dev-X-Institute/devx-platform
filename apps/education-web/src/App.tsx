import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EducationRole } from "@devx/core";
import { useEducationAuth } from "./auth";
import { SignIn, StudentHome, Course, Quiz, Progress } from "./screens/Learning";
import { TeacherDashboard, TeacherQuizzes, Students } from "./screens/Teaching";
import { AdminDashboard, Fees, Shop, Reports, ParentView } from "./screens/School";
import { Subjects } from "./screens/Subjects";
import { Grading } from "./screens/Grading";
import { Marks } from "./screens/Marks";
import { ActorPicker } from "./school/ActorPicker";
import { Brand, EmptyState, ScreenPicker } from "./components";
import { useDemoData } from "./demo";
import { Icon, type IconName } from "./icons";

export const screens = {
  "sign-in": "Sign in", "student-home": "Student home", course: "Course and lessons",
  quiz: "Quiz", teacher: "Teacher dashboard", admin: "Administrator dashboard",
  fees: "School fees", shop: "School shop", reports: "Report cards", parent: "Parent view",
  progress: "My progress", students: "Students", "teacher-quizzes": "Quizzes",
  subjects: "Subjects", grading: "Grading schemes", marks: "Marks",
} as const;
export type Screen = keyof typeof screens;
export type Navigate = (screen: Screen) => void;
const getScreen = (): Screen => {
  const value = window.location.hash.slice(1);
  return Object.hasOwn(screens, value) ? value as Screen : "sign-in";
};
const roleFor = (screen: Screen): EducationRole =>
  ["admin", "fees", "shop", "reports", "parent", "subjects", "grading"].includes(screen) ? "admin" :
  ["teacher", "teacher-quizzes", "students", "marks"].includes(screen) ? "teacher" : "student";
const landingFor = (role: EducationRole): Screen => role === "admin" ? "admin" : role === "teacher" ? "teacher" : role === "parent" ? "parent" : "student-home";
const allowedFor = (role: EducationRole): Screen[] => role === "admin"
  ? ["admin", "fees", "shop", "reports", "students", "subjects", "grading", "marks"]
  : role === "teacher" ? ["teacher", "teacher-quizzes", "students", "course", "quiz", "marks"]
    : role === "parent" ? ["parent"]
      : ["student-home", "course", "quiz", "progress"];
const navIcons: Partial<Record<Screen, IconName>> = { admin: "dashboard", teacher: "dashboard", "student-home": "home", course: "book", progress: "chart", "teacher-quizzes": "quiz", students: "students", fees: "fees", shop: "shop", reports: "report", subjects: "book", grading: "report", marks: "quiz" };
const PreviewTools = import.meta.env.DEV ? lazy(() => import("./PreviewTools")) : null;

export default function App() {
  const [screen, setScreen] = useState<Screen>(getScreen);
  const [role, setRole] = useState<EducationRole>(() => roleFor(getScreen()));
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; undo?: () => boolean } | null>(null);
  const [toastPaused, setToastPaused] = useState(false);
  const auth = useEducationAuth();
  const notify = (message: string, undo?: () => boolean) => setToast({ message, undo });
  const demo = useDemoData();
  const main = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const navigate: Navigate = (next) => {
    if (["admin", "teacher", "student-home", "progress", "fees", "shop", "reports", "parent", "teacher-quizzes", "subjects", "grading", "marks"].includes(next)) setRole(roleFor(next));
    else if (next === "students") setRole(current => current === "admin" ? "admin" : "teacher");
    if (next !== screen) window.location.hash = next;
    setMenuOpen(false);
  };
  useEffect(() => {
    const update = () => {
      const next = getScreen();
      setScreen(next);
      if (["admin", "teacher", "student-home", "progress", "fees", "shop", "reports", "parent", "teacher-quizzes", "subjects", "grading", "marks"].includes(next)) setRole(roleFor(next));
      else if (next === "students") setRole(current => current === "admin" ? "admin" : "teacher");
      setMenuOpen(false);
    };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  useEffect(() => {
    document.title = `${screens[screen]} | DevX Education`;
    window.scrollTo(0, 0);
    main.current?.focus();
  }, [screen]);
  useEffect(() => {
    if (!toast || toastPaused) return;
    const timer = window.setTimeout(() => setToast(null), 10000);
    return () => window.clearTimeout(timer);
  }, [toast, toastPaused]);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    sidebar.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setMenuOpen(false); requestAnimationFrame(() => menuButton.current?.focus()); }
      if (event.key === "Tab") { const elements = Array.from(sidebar.current?.querySelectorAll<HTMLElement>("a,button,select,summary") ?? []).filter(item => item.getClientRects().length > 0); const first = elements[0], last = elements.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);
  useEffect(() => { const query = window.matchMedia("(min-width: 701px)"); const close = () => { if (query.matches) setMenuOpen(false); }; query.addEventListener("change", close); return () => query.removeEventListener("change", close); }, []);
  const props = { navigate, demo, notify };
  let content;
  switch (screen) {
    case "sign-in": content = <SignIn navigate={navigate} onRole={setRole} auth={auth} />; break;
    case "student-home": content = <StudentHome {...props} />; break;
    case "course": content = <Course {...props} />; break;
    case "quiz": content = <Quiz {...props} />; break;
    case "progress": content = <Progress {...props} />; break;
    case "teacher": content = <TeacherDashboard {...props} />; break;
    case "teacher-quizzes": content = <TeacherQuizzes {...props} />; break;
    case "students": content = <Students {...props} />; break;
    case "admin": content = <AdminDashboard {...props} />; break;
    case "fees": content = <Fees {...props} />; break;
    case "shop": content = <Shop {...props} />; break;
    case "reports": content = <Reports {...props} />; break;
    case "parent": content = <ParentView {...props} />; break;
    case "subjects": content = <Subjects {...props} />; break;
    case "grading": content = <Grading {...props} />; break;
    case "marks": content = <Marks {...props} />; break;
  }
  const standalone = ["sign-in", "quiz", "parent"].includes(screen);
  if (auth.configured && auth.loading) return <main className="standalone" aria-live="polite">Checking your sign-in…</main>;
  if (auth.configured && !auth.session) return <SignIn navigate={navigate} onRole={setRole} auth={auth} />;
  if (auth.configured && auth.session && !auth.activeMembership) return <main className="standalone"><section className="sign-in-panel"><div className="sign-in-form"><h1>School access is not set up yet</h1><p className="muted">Your account is signed in, but it does not have an active school membership. Ask your school administrator to grant access.</p>{auth.error && <p role="status">{auth.error}</p>}<button className="button outline full" onClick={() => void auth.signOut()}>Sign out</button></div></section></main>;
  if (auth.configured && auth.session && auth.activeMembership) return <main className="standalone"><section className="sign-in-panel"><div className="sign-in-form"><Brand /><p className="eyebrow">Authenticated school workspace</p><h1>{auth.activeMembership.school_name}</h1><p className="muted">Signed in as {auth.session.user.email ?? "your account"} · {auth.activeMembership.role}</p>{auth.memberships.length > 1 && <label>Active school<select aria-label="Active school" value={auth.activeMembership.id} onChange={e => auth.selectMembership(e.target.value)}>{auth.memberships.map(item => <option key={item.id} value={item.id}>{item.school_name} · {item.role}</option>)}</select></label>}<p className="join-note muted">Authentication and school membership are connected. Learning records will appear here when the preview screens are connected to the protected database.</p>{auth.error && <p role="status">{auth.error}</p>}<button className="button outline full" onClick={() => void auth.signOut()}>Sign out</button></div></section></main>;
  const links: [string, Screen][] = role === "admin"
    ? [["Overview", "admin"], ["Fees", "fees"], ["Shop", "shop"], ["Report cards", "reports"], ["Subjects", "subjects"], ["Grading", "grading"], ["Marks", "marks"], ["Students", "students"]]
    : role === "teacher" ? [["Dashboard", "teacher"], ["Courses", "course"], ["Quizzes", "teacher-quizzes"], ["Marks", "marks"], ["Students", "students"]]
      : [["Home", "student-home"], ["My courses", "course"], ["Progress", "progress"]];
  return <>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Skip to content</a>
    {!standalone && <>
      <header className="mobile-header" inert={menuOpen}><Brand /><button ref={menuButton} className="button outline" aria-expanded={menuOpen} aria-controls="sidebar" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} />{menuOpen ? "Close" : "Menu"}</button></header>
      <aside ref={sidebar} id="sidebar" className={`sidebar ${menuOpen ? "open" : ""}`} role={menuOpen ? "dialog" : undefined} aria-modal={menuOpen ? true : undefined} aria-label={menuOpen ? "Navigation menu" : undefined}>
        <Brand />
        <button className="button outline menu-close" onClick={() => { setMenuOpen(false); requestAnimationFrame(() => menuButton.current?.focus()); }}><Icon name="close" />Close navigation</button>
        <div className="workspace-context"><span className="workspace-icon"><Icon name="school" size={22} /></span><div><strong>School workspace</strong><span>Term 1, 2026</span></div></div>
        <ActorPicker demo={demo} />
        <p className="nav-label">{role === "admin" ? "School management" : role === "teacher" ? "Teaching workspace" : "Your classroom"}</p>
        <nav aria-label="Main navigation">{links.map(([label, target]) => <a key={target} href={`#${target}`} className={screen === target ? "active" : ""} aria-current={screen === target ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon name={navIcons[target] ?? "dashboard"} />{label}{screen === target && <span className="nav-current" />}</a>)}<a className="sign-out" href="#sign-in" onClick={() => setMenuOpen(false)}><Icon name="logout" />Sign out</a></nav>
        <div className="sidebar-footer"><div className="profile-context"><span className="profile-avatar"><Icon name={role === "student" ? "book" : role === "teacher" ? "school" : "shield"} /></span><div><strong>{role === "admin" ? "Administrator" : role === "teacher" ? "Class teacher" : "Student"}</strong><span>{role === "student" ? "JHS 2" : "School workspace"}</span></div></div><span className="demo-label">Frontend preview</span><ScreenPicker value={screen} navigate={(next) => { if (next !== "students") setRole(roleFor(next)); navigate(next); }} /></div>
      </aside>
    </>}
    <main ref={main} id="main-content" tabIndex={-1} inert={menuOpen} className={standalone ? "standalone" : "main-content"}>
      {demo.storageError && <div className="storage-error" role="alert">Changes are available in this session, but browser storage could not save them.<button className="text-button" onClick={demo.retryStorage}>Retry saving</button></div>}
      {demo.status === "loading" ? <section className="record-state" aria-busy="true"><h1>Loading school records</h1><p className="muted" role="status">Preparing your workspace…</p><div className="loading-skeleton" /></section> : demo.status === "error" ? <section className="record-state"><h1>School records could not load</h1><EmptyState icon="report" title="Try loading your records again" description="Your saved preview records are still available."><button className="button primary" onClick={() => demo.setStatus("ready")}>Retry loading</button></EmptyState></section> : content}
    </main>
    {!standalone && !menuOpen && <nav className="bottom-nav" aria-label="Mobile navigation">{links.map(([label, target]) => <a key={target} href={`#${target}`} aria-current={screen === target ? "page" : undefined}><Icon name={navIcons[target] ?? "dashboard"} size={20} /><span>{label}</span></a>)}</nav>}
    {PreviewTools && <div className={`preview-tools-host ${standalone ? "standalone-tools" : ""}`} inert={menuOpen}><Suspense fallback={null}><PreviewTools demo={demo} /></Suspense></div>}
    {toast && <div className="toast" role="status" onMouseEnter={() => setToastPaused(true)} onMouseLeave={() => setToastPaused(false)} onFocus={() => setToastPaused(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setToastPaused(false); }}><Icon name="check" /><span>{toast.message}</span>{toast.undo && <button className="toast-undo" aria-label="Undo last change" onClick={() => { const restored = toast.undo!(); notify(restored ? "Change undone." : "Records changed again. Edit the record to make another change."); }}>Undo</button>}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="close" size={18} /></button></div>}
  </>;
}

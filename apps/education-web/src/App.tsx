import { useEffect, useRef, useState } from "react";
import type { EducationRole } from "@devx/core";
import { SignIn, StudentHome, Course, Quiz, Progress } from "./screens/Learning";
import { TeacherDashboard, TeacherQuizzes, Students } from "./screens/Teaching";
import { AdminDashboard, Fees, Shop, Reports, ParentView } from "./screens/School";
import { Brand, ScreenPicker } from "./components";
import { useDemoData } from "./demo";
import { Icon, type IconName } from "./icons";

export const screens = {
  "sign-in": "Sign in", "student-home": "Student home", course: "Course and lessons",
  quiz: "Quiz", teacher: "Teacher dashboard", admin: "Administrator dashboard",
  fees: "School fees", shop: "School shop", reports: "Report cards", parent: "Parent view",
  progress: "My progress", students: "Students", "teacher-quizzes": "Quizzes",
} as const;
export type Screen = keyof typeof screens;
export type Navigate = (screen: Screen) => void;
const getScreen = (): Screen => {
  const value = window.location.hash.slice(1);
  return Object.hasOwn(screens, value) ? value as Screen : "sign-in";
};
const roleFor = (screen: Screen): EducationRole =>
  ["admin", "fees", "shop", "reports", "parent"].includes(screen) ? "admin" :
  ["teacher", "teacher-quizzes", "students"].includes(screen) ? "teacher" : "student";
const navIcons: Partial<Record<Screen, IconName>> = { admin: "dashboard", teacher: "dashboard", "student-home": "home", course: "book", progress: "chart", "teacher-quizzes": "quiz", students: "students", fees: "fees", shop: "shop", reports: "report" };

export default function App() {
  const [screen, setScreen] = useState<Screen>(getScreen);
  const [role, setRole] = useState<EducationRole>(() => roleFor(getScreen()));
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const demo = useDemoData();
  const main = useRef<HTMLElement>(null);
  const navigate: Navigate = (next) => {
    if (["admin", "teacher", "student-home", "fees", "shop", "reports", "parent", "teacher-quizzes"].includes(next)) setRole(roleFor(next));
    if (next !== screen) window.location.hash = next;
    setMenuOpen(false);
  };
  useEffect(() => {
    const update = () => {
      const next = getScreen();
      setScreen(next);
      if (["admin", "teacher", "student-home", "fees", "shop", "reports", "parent", "teacher-quizzes"].includes(next)) setRole(roleFor(next));
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
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  const props = { navigate, demo, notify: setToast };
  let content;
  switch (screen) {
    case "sign-in": content = <SignIn navigate={navigate} onRole={setRole} />; break;
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
  }
  const standalone = ["sign-in", "quiz", "parent"].includes(screen);
  const links: [string, Screen][] = role === "admin"
    ? [["Overview", "admin"], ["Fees", "fees"], ["Shop", "shop"], ["Report cards", "reports"], ["Students", "students"]]
    : role === "teacher" ? [["Dashboard", "teacher"], ["Courses", "course"], ["Quizzes", "teacher-quizzes"], ["Students", "students"]]
      : [["Home", "student-home"], ["My courses", "course"], ["Progress", "progress"]];
  return <>
    <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); main.current?.focus(); main.current?.scrollIntoView(); }}>Skip to content</a>
    {!standalone && <>
      <header className="mobile-header"><Brand /><button className="button outline" aria-expanded={menuOpen} aria-controls="sidebar" onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? "close" : "menu"} />{menuOpen ? "Close" : "Menu"}</button></header>
      <aside id="sidebar" className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Brand />
        <div className="workspace-context"><span className="workspace-icon"><Icon name="school" size={22} /></span><div><strong>School workspace</strong><span>Term 1, 2026</span></div></div>
        <p className="nav-label">{role === "admin" ? "School management" : role === "teacher" ? "Teaching workspace" : "Your classroom"}</p>
        <nav aria-label="Main navigation">{links.map(([label, target]) => <a key={target} href={`#${target}`} className={screen === target ? "active" : ""} aria-current={screen === target ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon name={navIcons[target] ?? "dashboard"} />{label}{screen === target && <span className="nav-current" />}</a>)}<a className="sign-out" href="#sign-in" onClick={() => setMenuOpen(false)}><Icon name="logout" />Sign out</a></nav>
        <div className="sidebar-footer"><div className="profile-context"><span className="profile-avatar"><Icon name={role === "student" ? "book" : role === "teacher" ? "school" : "shield"} /></span><div><strong>{role === "admin" ? "Administrator" : role === "teacher" ? "Class teacher" : "Student"}</strong><span>{role === "student" ? "JHS 2" : "School workspace"}</span></div></div><span className="demo-label">Frontend preview</span><ScreenPicker value={screen} navigate={(next) => { setRole(roleFor(next)); navigate(next); }} /></div>
      </aside>
    </>}
    <main ref={main} id="main-content" tabIndex={-1} className={standalone ? "standalone" : "main-content"}>{content}</main>
    {toast && <div className="toast" role="status"><Icon name="check" />{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><Icon name="close" size={18} /></button></div>}
  </>;
}

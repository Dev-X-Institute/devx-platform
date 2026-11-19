import { useEffect, useRef, useState } from "react";
import type { EducationRole } from "@devx/core";
import { useEducationAuth } from "./auth";
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
const landingFor = (role: EducationRole): Screen => role === "admin" ? "admin" : role === "teacher" ? "teacher" : role === "parent" ? "parent" : "student-home";
const allowedFor = (role: EducationRole): Screen[] => role === "admin"
  ? ["admin", "fees", "shop", "reports", "students"]
  : role === "teacher" ? ["teacher", "teacher-quizzes", "students", "course", "quiz"]
    : role === "parent" ? ["parent"]
      : ["student-home", "course", "quiz", "progress"];
const navIcons: Partial<Record<Screen, IconName>> = { admin: "dashboard", teacher: "dashboard", "student-home": "home", course: "book", progress: "chart", "teacher-quizzes": "quiz", students: "students", fees: "fees", shop: "shop", reports: "report" };

export default function App() {
  const [screen, setScreen] = useState<Screen>(getScreen);
  const [role, setRole] = useState<EducationRole>(() => roleFor(getScreen()));
  const [menuOpen, setMenuOpen] = useState(false);
  const [toast, setToast] = useState("");
  const auth = useEducationAuth();
  const demo = useDemoData();
  const main = useRef<HTMLElement>(null);
  const navigate: Navigate = (next) => {
    if (auth.configured && auth.activeMembership && !allowedFor(auth.activeMembership.role).includes(next)) return;
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
  }
  const standalone = ["sign-in", "quiz", "parent"].includes(screen);
  if (auth.configured && auth.loading) return <main className="standalone" aria-live="polite">Checking your sign-in…</main>;
  if (auth.configured && !auth.session) return <SignIn navigate={navigate} onRole={setRole} auth={auth} />;
  if (auth.configured && auth.session && !auth.activeMembership) return <main className="standalone"><section className="sign-in-panel"><div className="sign-in-form"><h1>School access is not set up yet</h1><p className="muted">Your account is signed in, but it does not have an active school membership. Ask your school administrator to grant access.</p>{auth.error && <p role="status">{auth.error}</p>}<button className="button outline full" onClick={() => void auth.signOut()}>Sign out</button></div></section></main>;
  if (auth.configured && auth.session && auth.activeMembership) return <main className="standalone"><section className="sign-in-panel"><div className="sign-in-form"><Brand /><p className="eyebrow">Authenticated school workspace</p><h1>{auth.activeMembership.school_name}</h1><p className="muted">Signed in as {auth.session.user.email ?? "your account"} · {auth.activeMembership.role}</p>{auth.memberships.length > 1 && <label>Active school<select aria-label="Active school" value={auth.activeMembership.id} onChange={e => auth.selectMembership(e.target.value)}>{auth.memberships.map(item => <option key={item.id} value={item.id}>{item.school_name} · {item.role}</option>)}</select></label>}<p className="join-note muted">Authentication and school membership are connected. Learning records will appear here when the preview screens are connected to the protected database.</p>{auth.error && <p role="status">{auth.error}</p>}<button className="button outline full" onClick={() => void auth.signOut()}>Sign out</button></div></section></main>;
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
        <div className="workspace-context"><span className="workspace-icon"><Icon name="school" size={22} /></span><div>{auth.configured && auth.activeMembership ? <><strong>{auth.activeMembership.school_name}</strong><span>{auth.activeMembership.role}</span></> : <><strong>School workspace</strong><span>Term 1, 2026</span></>}</div></div>
        {auth.configured && auth.memberships.length > 1 && <label className="screen-picker">School<select aria-label="Active school" value={auth.activeMembership?.id ?? ""} onChange={e => auth.selectMembership(e.target.value)}>{auth.memberships.map(item => <option key={item.id} value={item.id}>{item.school_name}</option>)}</select></label>}
        <p className="nav-label">{role === "admin" ? "School management" : role === "teacher" ? "Teaching workspace" : "Your classroom"}</p>
        <nav aria-label="Main navigation">{links.map(([label, target]) => <a key={target} href={`#${target}`} className={screen === target ? "active" : ""} aria-current={screen === target ? "page" : undefined} onClick={() => setMenuOpen(false)}><Icon name={navIcons[target] ?? "dashboard"} />{label}{screen === target && <span className="nav-current" />}</a>)}<a className="sign-out" href={auth.configured ? "#sign-in" : "#sign-in"} onClick={e => { setMenuOpen(false); if (auth.configured) { e.preventDefault(); void auth.signOut(); } }}><Icon name="logout" />Sign out</a></nav>
        <div className="sidebar-footer"><div className="profile-context"><span className="profile-avatar"><Icon name={role === "student" ? "book" : role === "teacher" ? "school" : "shield"} /></span><div><strong>{role === "admin" ? "Administrator" : role === "teacher" ? "Class teacher" : "Student"}</strong><span>{role === "student" ? "JHS 2" : "School workspace"}</span></div></div><span className="demo-label">Frontend preview</span><ScreenPicker value={screen} navigate={(next) => { setRole(roleFor(next)); navigate(next); }} /></div>
      </aside>
    </>}
    <main ref={main} id="main-content" tabIndex={-1} className={standalone ? "standalone" : "main-content"}>{content}</main>
    {toast && <div className="toast" role="status"><Icon name="check" />{toast}<button aria-label="Dismiss notification" onClick={() => setToast("")}><Icon name="close" size={18} /></button></div>}
  </>;
}

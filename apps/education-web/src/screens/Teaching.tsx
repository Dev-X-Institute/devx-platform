import { useState } from "react";
import { MockAiProvider } from "@devx/ai";
import { Badge, Card, ClassSelect, EmptyState, PageHeader, Pagination, ProgressBar, Stats } from "../components";
import { lessons, money, studentBalance, type ScreenProps } from "../demo";
import { useFormValidation } from "../forms";
import { Icon } from "../icons";
import { AnalyticsPanel } from "../AnalyticsPanel";

const ai = new MockAiProvider();

export function TeacherDashboard({ demo, navigate, notify }: ScreenProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const form = useFormValidation();
  const students = demo.data.students.filter(s => s.className === "JHS 2");
  const generate = async () => {
    setError(""); setLoading(true);
    try {
      const drafts = await ai.generateQuiz(text, 5);
      const undo = demo.update({ drafts, published: false });
      notify("Five sample questions are ready for your review.", undo);
    } catch { setError("The draft could not be generated. Try again."); }
    finally { setLoading(false); }
  };
  return <><PageHeader eyebrow="Class dashboard" title="JHS 2 Integrated Science" />
    <Stats values={[["Students", students.length], ["Lessons published", lessons.length], ["Quizzes to review", demo.data.drafts.length && !demo.data.published ? 1 : 0], ["Quiz attempts recorded", demo.data.attempts.filter(a => students.some(s => s.id === a.studentId)).length]]} />
    <div className="teacher-layout"><div className="panel-stack"><AnalyticsPanel kind="performance" records={demo.data} /><Card><div className="card-heading"><h2>Student progress</h2><Icon name="students" /></div>{students.length ? <><div className="table-wrap"><table className="progress-table responsive-table"><caption className="sr-only">Student lesson progress</caption><tbody>{students.slice(0, 5).map(student => <tr key={student.id}><th scope="row" dir="auto">{student.name}</th><td data-label="Progress"><ProgressBar value={student.progress} label={`${student.name} progress`} /></td><td data-label="Completed">{student.progress}%</td><td data-label="Status"><Badge tone={student.progress < 40 ? "amber" : "green"}>{student.progress < 40 ? "Needs help" : "On track"}</Badge></td></tr>)}</tbody></table></div><button className="text-button" onClick={() => navigate("students")}>View all students</button></> : <EmptyState icon="students" title="No students enrolled" description="Your class progress will appear when students are added." />}</Card></div>
    <Card className="generator-card"><span className="note-icon"><Icon name="sparkles" size={23} /></span><h2>AI quiz generator</h2><p className="muted generator-intro">Turn a lesson into a draft you can review.</p><form noValidate aria-busy={loading} onSubmit={e => { e.preventDefault(); if (form.validate(e.currentTarget)) void generate(); }}><label className="muted">Paste lesson text<textarea {...form.props("lesson")} value={text} onChange={e => setText(e.target.value)} placeholder="Paste or write lesson content here" minLength={20} required rows={6} />{form.error("lesson")}</label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={loading}>{loading ? "Generating draft…" : "Generate draft questions"}</button></form><p className="muted generator-note">Drafts need your approval before students see them.</p><p className="demo-label">Preview uses a local sample generator.</p>{demo.data.drafts.length > 0 && <button className="button outline full" onClick={() => navigate("teacher-quizzes")}>Review {demo.data.drafts.length} draft questions</button>}</Card></div>
  </>;
}

export function TeacherQuizzes({ demo, navigate, notify }: ScreenProps) {
  const form = useFormValidation();
  const updateQuestion = (index: number, question: string) => demo.update(d => ({ published: false, drafts: d.drafts.map((q, i) => i === index ? { ...q, question } : q) }));
  return <><PageHeader eyebrow="JHS 2 Integrated Science" title="Quizzes" />
    <Card><div className="card-heading"><h2>Forces and motion quiz</h2><Badge>Published</Badge></div><p className="muted">5 questions · Due Friday</p><button className="button outline" onClick={() => navigate("quiz")}>Preview quiz</button></Card>
    <Card className="section-spaced"><div className="card-heading"><h2>Generated draft questions</h2>{demo.data.drafts.length > 0 && <Badge tone={demo.data.published ? "green" : "amber"}>{demo.data.published ? "Approved in preview" : "Needs review"}</Badge>}</div>
      {!demo.data.drafts.length ? <EmptyState icon="quiz" title="No draft questions yet" description="Paste lesson text in the quiz generator to create a sample draft."><button className="button primary" onClick={() => navigate("teacher")}>Open quiz generator</button></EmptyState> : <form noValidate onSubmit={e => { e.preventDefault(); if (!form.validate(e.currentTarget)) return; const undo = demo.update({ published: true }); notify("Draft approved in the local preview.", undo); }}><p className="muted">These are sample questions from the local adapter. Edit and review every question before approving.</p>{demo.data.drafts.map((q, index) => <fieldset className="draft-question" key={index}><legend>Question {index + 1}</legend><label>Question<input {...form.props(`question-${index}`)} required pattern=".*\S.*" value={q.question} onChange={e => updateQuestion(index, e.target.value)} />{form.error(`question-${index}`)}</label><div className="two-columns">{q.options.map((option, i) => <label key={i}>Option {String.fromCharCode(65 + i)}<input {...form.props(`option-${index}-${i}`)} required pattern=".*\S.*" value={option} onChange={e => demo.update(d => ({ published: false, drafts: d.drafts.map((item, n) => n === index ? { ...item, options: item.options.map((o, k) => k === i ? e.target.value : o) } : item) }))} />{form.error(`option-${index}-${i}`)}</label>)}</div><label>Correct answer<select value={q.answerIndex} onChange={e => demo.update(d => ({ published: false, drafts: d.drafts.map((item, n) => n === index ? { ...item, answerIndex: Number(e.target.value) } : item) }))}>{q.options.map((option, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}: {option}</option>)}</select></label></fieldset>)}<button className="button primary" disabled={demo.data.published}>{demo.data.published ? "Draft approved" : "Approve draft"}</button></form>}
    </Card>
  </>;
}

export function Students({ demo, navigate }: ScreenProps) {
  const [className, setClassName] = useState("JHS 2");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const matching = demo.data.students.filter(s => s.className === className && s.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(matching.length / 20) - 1));
  return <><PageHeader eyebrow="Student records" title="Students" name={demo.data.schoolName} /><div className="filters"><ClassSelect value={className} onChange={value => { setClassName(value); setPage(0); }} /><label className="search-label">Search students<input type="search" enterKeyHint="search" placeholder="Search by student name" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label></div><Card>{matching.length ? <><div className="table-wrap"><table className="responsive-table"><caption className="sr-only">Students in {className}</caption><thead><tr><th>Student</th><th>Class</th><th>Progress</th><th>Fee balance</th><th>Report</th></tr></thead><tbody>{matching.slice(currentPage * 20, (currentPage + 1) * 20).map(student => <tr key={student.id}><th scope="row" dir="auto">{student.name}</th><td data-label="Class">{student.className}</td><td data-label="Progress">{student.progress}%</td><td data-label="Fee balance">{money(studentBalance(demo.data, student.id))}</td><td data-label="Report"><button className="text-button" onClick={() => navigate("reports")}>View report</button></td></tr>)}</tbody></table></div><Pagination page={currentPage} count={matching.length} size={20} onPage={setPage} /></> : <EmptyState icon="students" title={search ? `No students match “${search}”` : "No students in this class"} description="Try another name or choose a different class." />}</Card></>;
}

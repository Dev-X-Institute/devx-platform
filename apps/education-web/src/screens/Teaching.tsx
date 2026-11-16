import { useState } from "react";
import { MockAiProvider } from "@devx/ai";
import { Badge, Card, ClassSelect, PageHeader, ProgressBar, Stats } from "../components";
import { lessons, money, type ScreenProps } from "../demo";
import { Icon } from "../icons";
import { AnalyticsPanel } from "../AnalyticsPanel";

const ai = new MockAiProvider();
const studentProgress = [82, 64, 31];

export function TeacherDashboard({ demo, navigate, notify }: ScreenProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const generate = async () => {
    setError(""); setLoading(true);
    try {
      const drafts = await ai.generateQuiz(text, 5);
      demo.update({ drafts, published: false });
      notify("Five sample questions are ready for your review.");
    } catch { setError("The draft could not be generated. Try again."); }
    finally { setLoading(false); }
  };
  return <><PageHeader eyebrow="Class dashboard" title="JHS 2 Integrated Science" />
    <Stats values={[["Students", 34], ["Lessons published", lessons.length], ["Quizzes to review", demo.data.drafts.length && !demo.data.published ? 3 : 2], ["Submissions to grade", 5]]} />
    <div className="teacher-layout"><div className="panel-stack"><AnalyticsPanel kind="performance" /><Card><div className="card-heading"><h2>Student progress</h2><Icon name="students" /></div><div className="table-wrap"><table className="progress-table"><caption className="sr-only">Student lesson progress and recent activity</caption><tbody>{studentProgress.map((progress, i) => <tr key={i}><th scope="row">Student {i + 1}</th><td><ProgressBar value={progress} label={`Student ${i + 1} progress`} /></td><td>{progress}%</td><td className="muted">{["Today", "Yesterday", "6 days ago"][i]}</td><td><Badge tone={i === 2 ? "amber" : "green"}>{i === 2 ? "Needs help" : "On track"}</Badge></td></tr>)}</tbody></table></div></Card></div>
    <Card className="generator-card"><span className="note-icon"><Icon name="sparkles" size={23} /></span><h2>AI quiz generator</h2><p className="muted generator-intro">Turn a lesson into a draft you can review.</p><form onSubmit={e => { e.preventDefault(); void generate(); }}><label className="muted">Paste lesson text<textarea value={text} onChange={e => setText(e.target.value)} placeholder="Paste or write lesson content here" minLength={20} required rows={6} /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button primary full" disabled={loading}>{loading ? "Generating draft…" : "Generate draft questions"}</button></form><p className="muted generator-note">Drafts need your approval before students see them.</p><p className="demo-label">Preview uses a local sample generator.</p>{demo.data.drafts.length > 0 && <button className="button outline full" onClick={() => navigate("teacher-quizzes")}>Review {demo.data.drafts.length} draft questions</button>}</Card></div>
  </>;
}

export function TeacherQuizzes({ demo, navigate, notify }: ScreenProps) {
  const updateQuestion = (index: number, question: string) => demo.update(d => ({ published: false, drafts: d.drafts.map((q, i) => i === index ? { ...q, question } : q) }));
  return <><PageHeader eyebrow="JHS 2 Integrated Science" title="Quizzes" />
    <Card><div className="card-heading"><h2>Forces and motion quiz</h2><Badge>Published</Badge></div><p className="muted">5 questions · Due Friday</p><button className="button outline" onClick={() => navigate("quiz")}>Preview quiz</button></Card>
    <Card className="section-spaced"><div className="card-heading"><h2>Generated draft questions</h2>{demo.data.drafts.length > 0 && <Badge tone={demo.data.published ? "green" : "amber"}>{demo.data.published ? "Approved in preview" : "Needs review"}</Badge>}</div>
      {!demo.data.drafts.length ? <><p className="muted">Paste your lesson text in the quiz generator to create a sample draft.</p><button className="button primary" onClick={() => navigate("teacher")}>Open quiz generator</button></> : <form onSubmit={e => { e.preventDefault(); demo.update({ published: true }); notify("Draft approved in the local preview."); }}><p className="muted">These are sample questions from the local adapter. Edit and review every question before approving.</p>{demo.data.drafts.map((q, index) => <fieldset className="draft-question" key={index}><legend>Question {index + 1}</legend><label>Question<input required value={q.question} onChange={e => updateQuestion(index, e.target.value)} /></label><div className="two-columns">{q.options.map((option, i) => <label key={i}>Option {String.fromCharCode(65 + i)}<input required value={option} onChange={e => demo.update(d => ({ published: false, drafts: d.drafts.map((item, n) => n === index ? { ...item, options: item.options.map((o, k) => k === i ? e.target.value : o) } : item) }))} /></label>)}</div><label>Correct answer<select value={q.answerIndex} onChange={e => demo.update(d => ({ published: false, drafts: d.drafts.map((item, n) => n === index ? { ...item, answerIndex: Number(e.target.value) } : item) }))}>{q.options.map((option, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}: {option}</option>)}</select></label></fieldset>)}<button className="button primary" disabled={demo.data.published}>{demo.data.published ? "Draft approved" : "Approve draft"}</button></form>}
    </Card>
  </>;
}

export function Students({ demo, navigate }: ScreenProps) {
  const [className, setClassName] = useState("JHS 2");
  const [search, setSearch] = useState("");
  const matching = [1, 2, 3, 4].filter(i => `Student ${i}`.toLowerCase().includes(search.toLowerCase()));
  return <><PageHeader eyebrow="Student records" title="Students" /><div className="filters"><ClassSelect value={className} onChange={setClassName} /><label className="search-label">Search students<input type="search" placeholder="Search by student name" value={search} onChange={e => setSearch(e.target.value)} /></label></div><Card><div className="table-wrap"><table><caption className="sr-only">Students in {className}</caption><thead><tr><th>Student</th><th>Class</th><th>Progress</th><th>Fee balance</th><th>Report</th></tr></thead><tbody>{matching.map(i => <tr key={i}><th scope="row">Student {i}</th><td>{className}</td><td>{[82, 64, 31, 55][i - 1]}%</td><td>{money(i === 1 ? 0 : i === 2 ? demo.data.balance : 1500)}</td><td><button className="text-button" onClick={() => navigate("reports")}>View report</button></td></tr>)}</tbody></table>{!matching.length && <p className="empty-state">No students match “{search}”. Try another name.</p>}</div></Card></>;
}

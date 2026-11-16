import { useState } from "react";
import type { EducationRole } from "@devx/core";
import type { Navigate } from "../App";
import { Brand, Card, PageHeader, ProgressBar, ScreenPicker } from "../components";
import { lessons, questions, school, type ScreenProps } from "../demo";

export function SignIn({ navigate, onRole }: { navigate: Navigate; onRole: (role: EducationRole) => void }) {
  const [role, setRole] = useState<EducationRole>("student");
  const enter = (selected: EducationRole) => { onRole(selected); navigate(selected === "student" ? "student-home" : selected === "teacher" ? "teacher" : "admin"); };
  return <div className="sign-in">
    <section className="sign-in-brand"><Brand /><div className="sign-in-message"><h1>Learning that fits every classroom.</h1><p>Lessons, quizzes and progress in one place for students and teachers.</p></div><p className="sign-in-school">{school}</p></section>
    <section className="sign-in-panel"><div className="sign-in-form"><h2>Welcome back</h2><p className="sign-in-subtitle muted">Sign in to continue.</p>
      <div className="role-tabs" aria-label="Sign-in role">{(["student", "teacher", "admin"] as const).map(r => <button key={r} className={role === r ? "selected" : ""} aria-pressed={role === r} onClick={() => setRole(r)}>{r === "admin" ? "Admin" : r.charAt(0).toUpperCase() + r.slice(1)}</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); enter(role); }}>
        <label>Email<input name="email" type="email" placeholder="you@school.edu.gh" autoComplete="username" required /></label>
        <label>Password<input name="password" type="password" placeholder="Your password" autoComplete="current-password" required /></label>
        <button className="button primary full" type="submit">Sign in as {role === "admin" ? "administrator" : role}</button>
      </form>
      <button className="text-button alternate-role" onClick={() => enter("teacher")}>Sign in as teacher</button><button className="text-button alternate-role" onClick={() => enter("admin")}>Sign in as administrator</button>
      <p className="join-note muted">New here? Join a class with your course code.</p>
      <div className="preview-entry"><p className="demo-label">Frontend preview · use any email and password</p><ScreenPicker value="sign-in" navigate={navigate} /></div>
    </div></section>
  </div>;
}

export function StudentHome({ navigate, demo }: ScreenProps) {
  const science = demo.data.completed.length >= 3 ? Math.round(demo.data.completed.length / 8 * 100) : 38;
  return <><PageHeader eyebrow="Student home" title="Good afternoon, [STUDENT NAME]" />
    <div className="home-top"><Card className="continue-card"><p className="card-kicker">Continue learning</p><h2>Integrated Science</h2><p className="lesson-subtitle">Lesson 3: Forces and motion</p><ProgressBar value={science} /><button className="button white" onClick={() => navigate("course")}>Resume lesson</button></Card>
      <Card className="due-card"><div><p className="card-kicker">Due Friday</p><h2>Forces and motion quiz</h2><p className="muted">5 questions</p></div><button className="text-button" onClick={() => navigate("quiz")}>{demo.data.quizScore !== null ? "Retake quiz" : "Start quiz"}</button></Card></div>
    <h2 className="section-heading">My courses</h2><div className="course-cards">{[["Mathematics", 72], ["English Language", 55], ["Integrated Science", science]].map(([title, value]) => <button className="card course-card" key={title} onClick={() => navigate(title === "Integrated Science" ? "course" : "progress")}><h3>{title}</h3><p className="muted">[TEACHER NAME]</p><ProgressBar value={Number(value)} label={`${title} progress`} /><p className="muted">{value}% complete</p></button>)}</div>
  </>;
}

export function Course({ navigate, demo, notify }: ScreenProps) {
  const [selected, setSelected] = useState(2);
  const [reading, setReading] = useState(false);
  const lesson = lessons[selected]!;
  const completed = demo.data.completed.includes(selected);
  return <><button className="text-button back-link" onClick={() => navigate("student-home")}>‹ Back to home</button><PageHeader eyebrow="JHS 2 · [TEACHER NAME]" title="Integrated Science" />
    <div className="course-layout"><div className="lesson-list"><Card><ProgressBar value={demo.data.completed.length / 8 * 100} /><p className="muted">{demo.data.completed.length} of 8 lessons complete</p></Card>
      {lessons.map((item, i) => <button key={item.title} className={`card lesson-item ${i === selected ? "selected" : ""}`} aria-pressed={i === selected} onClick={() => { setSelected(i); setReading(false); }}><span className={`lesson-number ${demo.data.completed.includes(i) ? "complete" : i === selected ? "current" : ""}`}>{i + 1}</span><span><strong>{item.title}</strong><span className="muted">{demo.data.completed.includes(i) ? "Completed" : i === selected ? "In progress, 12 min left" : "Not started"}</span></span></button>)}
    </div><Card className="lesson-detail"><p className="card-kicker">Lesson {selected + 1}</p><h2>{lesson.title}</h2><div className={`lesson-reading ${reading ? "expanded" : ""}`}>{reading ? <><h3>{lesson.title}</h3><p>{lesson.reading}</p><button className="text-button" onClick={() => setReading(false)}>Close reading</button></> : <button onClick={() => setReading(true)} className="reading-button"><svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12C18 8 9 8 5 10v27c5-2 13-2 19 2 6-4 14-4 19-2V10c-4-2-13-2-19 2Zm0 0v27" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg><span>Read the lesson</span><span className="reading-duration">12 minute reading</span></button>}</div><p className="lesson-summary muted">{lesson.summary}</p><div className="actions"><button className="button primary" disabled={completed} onClick={() => { demo.update(d => ({ completed: [...new Set([...d.completed, selected])] })); notify("Lesson marked complete. Your progress has been saved."); }}>{completed ? "Lesson completed" : "Mark lesson complete"}</button><button className="button outline" onClick={() => navigate("quiz")}>Take quiz</button></div></Card></div>
  </>;
}

export function Quiz({ navigate, demo, notify }: ScreenProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [finished, setFinished] = useState(false);
  const question = questions[index]!;
  const score = questions.reduce((sum, q, i) => sum + (answers[i] === q.answerIndex ? 1 : 0), 0);
  const finish = () => {
    const unanswered = questions.findIndex((_, i) => answers[i] === undefined);
    if (unanswered !== -1) { setIndex(unanswered); notify("Answer all five questions before finishing your quiz."); return; }
    demo.update({ quizScore: score }); setFinished(true);
  };
  return <div className="quiz-screen"><header className="quiz-header"><button className="text-button" onClick={() => navigate("course")}>× Exit quiz</button><strong>Forces and motion quiz</strong><span className="muted">{finished ? "Quiz complete" : `Question ${index + 1} of 5`}</span></header>
    <div className="quiz-content">{finished ? <Card className="quiz-result"><span className="result-symbol" aria-hidden="true">✓</span><h1>Quiz complete</h1><p className="score">{score} out of 5</p><p className="muted">{score >= 3 ? "Well done! Keep building on what you’ve learned." : "Review the lesson and try again. Every attempt helps you learn."}</p><div className="answer-review">{questions.map((q, i) => <div key={q.question}><strong>{i + 1}. {q.question}</strong><p className={answers[i] === q.answerIndex ? "correct" : "incorrect"}>Your answer: {q.options[answers[i]!] ?? "Not answered"}</p>{answers[i] !== q.answerIndex && <p>Correct answer: {q.options[q.answerIndex]}</p>}</div>)}</div><div className="actions"><button className="button primary" onClick={() => navigate("student-home")}>Back to home</button><button className="button outline" onClick={() => { setAnswers({}); setIndex(0); setFinished(false); }}>Try again</button></div></Card> : <>
      <nav className="question-steps" aria-label="Quiz questions">{questions.map((_, i) => <button key={i} className={i === index ? "current" : answers[i] !== undefined ? "answered" : ""} aria-current={i === index ? "step" : undefined} aria-label={`Question ${i + 1}${answers[i] !== undefined ? ", answered" : ""}`} onClick={() => setIndex(i)}>{i + 1}</button>)}</nav>
      <Card className="quiz-card"><fieldset><legend>{question.question}</legend><div className="quiz-options">{question.options.map((option, i) => <label key={option} className={`quiz-option ${answers[index] === i ? "selected" : ""}`}><input type="radio" name={`question-${index}`} value={i} checked={answers[index] === i} onChange={() => setAnswers(a => ({ ...a, [index]: i }))} /><span>{option}</span></label>)}</div></fieldset><div className="quiz-actions"><button className="button outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button><button className="button primary" disabled={answers[index] === undefined} onClick={() => index === 4 ? finish() : setIndex(index + 1)}>{index === 4 ? "Finish quiz" : "Next question"}</button></div></Card>
    </>}</div></div>;
}

export function Progress({ demo, navigate }: ScreenProps) {
  return <><PageHeader eyebrow="Student progress" title="My progress" /><div className="course-cards">{[["Mathematics", 72], ["English Language", 55], ["Integrated Science", demo.data.completed.length / 8 * 100]].map(([name, value]) => <Card key={name}><h2>{name}</h2><ProgressBar value={Number(value)} /><p className="muted">{Math.round(Number(value))}% complete</p></Card>)}</div><Card className="section-spaced"><h2>Quiz results</h2>{demo.data.quizScore === null ? <p className="muted">Complete your first quiz to see your result here.</p> : <div className="list-row"><strong>Forces and motion</strong><span>{demo.data.quizScore} / 5</span><span>{demo.data.quizScore * 20}%</span></div>}<button className="button outline" onClick={() => navigate("quiz")}>Take quiz</button></Card></>;
}

import { useEffect, useRef, useState } from "react";
import type { EducationRole } from "@devx/core";
import type { Navigate } from "../App";
import { Brand, Card, PageHeader, ProgressBar, ScreenPicker } from "../components";
import { lessons, questions, school, type ScreenProps } from "../demo";
import { Icon } from "../icons";
import { LearningArt, SubjectArt } from "../illustrations";
import { AnalyticsPanel } from "../AnalyticsPanel";
import { LessonDiagram } from "../LessonDiagram";
import { useFormValidation } from "../forms";

export function SignIn({ navigate, onRole }: { navigate: Navigate; onRole: (role: EducationRole) => void }) {
  const [role, setRole] = useState<EducationRole>("student");
  const validation = useFormValidation();
  const enter = (selected: EducationRole) => { onRole(selected); navigate(selected === "student" ? "student-home" : selected === "teacher" ? "teacher" : "admin"); };
  return <div className="sign-in">
    <section className="sign-in-brand"><Brand /><div className="sign-in-message"><LearningArt /><h1>Learning that fits every classroom.</h1><p>Lessons, quizzes and progress in one place for students and teachers.</p></div><p className="sign-in-school"><Icon name="school" />{school}</p></section>
    <section className="sign-in-panel"><div className="sign-in-form"><h2>Welcome back</h2><p className="sign-in-subtitle muted">Sign in to continue.</p>
      <div className="role-tabs" aria-label="Sign-in role">{(["student", "teacher", "admin"] as const).map(r => <button key={r} className={role === r ? "selected" : ""} aria-pressed={role === r} onClick={() => setRole(r)}><Icon name={r === "student" ? "book" : r === "teacher" ? "school" : "shield"} size={17} />{r === "admin" ? "Admin" : r.charAt(0).toUpperCase() + r.slice(1)}</button>)}</div>
      <form noValidate onSubmit={e => { e.preventDefault(); if (validation.validate(e.currentTarget)) enter(role); }}>
        <label>Email<input {...validation.props("email")} type="email" placeholder="you@school.edu.gh" autoComplete="username" autoCapitalize="none" required />{validation.error("email")}</label>
        <label>Password<input {...validation.props("password")} type="password" placeholder="Your password" autoComplete="current-password" required />{validation.error("password")}</label>
        <button className="button primary full" type="submit">Sign in as {role === "admin" ? "administrator" : role}</button>
      </form>
      <p className="join-note muted">Choose your role to explore your workspace.</p>
      <div className="preview-entry"><p className="demo-label">Frontend preview · use any email and password</p><ScreenPicker value="sign-in" navigate={navigate} /></div>
    </div></section>
  </div>;
}

export function StudentHome({ navigate, demo }: ScreenProps) {
  const science = Math.round(demo.data.completed.length / lessons.length * 100);
  return <><PageHeader eyebrow="Student home / JHS 2" title="A little progress, every day." />
    <div className="home-top"><Card className="continue-card"><div className="continue-copy"><p className="card-kicker"><Icon name="book" size={17} />Continue learning</p><h2>Integrated Science</h2><p className="lesson-subtitle">Lesson 3: Forces and motion</p><div className="hero-progress"><ProgressBar value={science} /><span>{science}% complete</span></div><button className="button white" onClick={() => navigate("course")}>Resume lesson<Icon name="next" size={18} /></button></div><LearningArt compact /></Card>
      <Card className="due-card"><div><div className="due-heading"><span className="due-icon"><Icon name="quiz" size={24} /></span><p className="due-label">Due Friday</p></div><h2>Forces and motion quiz</h2><p className="muted">5 questions to check your understanding.</p></div><button className="text-button" onClick={() => navigate("quiz")}>{demo.data.quizScore !== null ? "Retake quiz" : "Start quiz"}<Icon name="next" size={18} /></button></Card></div>
    <div className="section-title"><h2>My courses</h2><span className="muted">3 courses this term</span></div><div className="course-cards">{[["Mathematics", 72], ["English Language", 55], ["Integrated Science", science]].map(([title, value]) => <button className="card course-card" key={title} onClick={() => navigate(title === "Integrated Science" ? "course" : "progress")}><div className="course-card-top"><SubjectArt subject={String(title)} /><Icon name="arrow" size={19} /></div><h3>{title}</h3><p className="muted">JHS 2 / Class teacher</p><div className="course-progress-label"><span>Course progress</span><strong>{value}%</strong></div><ProgressBar value={Number(value)} label={`${title} progress`} /></button>)}</div>
    <div className="student-bottom"><AnalyticsPanel kind="activity" records={demo.data} /><Card className="learning-note"><span className="note-icon"><Icon name="sparkles" size={23} /></span><h2>Make space for learning.</h2><p className="muted">Short, regular practice helps you remember more. Pick one lesson and take it at your own pace.</p><div className="study-step"><Icon name="book" />Read the lesson</div><div className="study-step"><Icon name="quiz" />Check what you know</div><button className="button outline" onClick={() => navigate("progress")}>View my progress<Icon name="next" size={17} /></button></Card></div>
  </>;
}

export function Course({ navigate, demo, notify }: ScreenProps) {
  const [selected, setSelected] = useState(2);
  const [reading, setReading] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const finishStudy = useRef<(() => void) | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => () => { finishStudy.current?.(); finishStudy.current = null; }, []);
  const toggleReading = () => { if (reading) { finishStudy.current?.(); finishStudy.current = null; } else finishStudy.current = demo.startStudy(selected); setReading(!reading); };
  const lesson = lessons[selected]!;
  const completed = demo.data.completed.includes(selected);
  return <><button className="text-button back-link" onClick={() => navigate("student-home")}><Icon name="back" size={18} />Back to home</button><PageHeader eyebrow="JHS 2 / Class teacher" title="Integrated Science" />
    <button className="button outline lesson-menu-toggle" aria-expanded={listOpen} aria-controls="course-lessons" onClick={() => setListOpen(!listOpen)}><Icon name="book" />{listOpen ? "Hide lesson list" : `Choose lesson (${selected + 1} of ${lessons.length})`}</button>
    <div className="course-layout"><div id="course-lessons" className={`lesson-list ${listOpen ? "list-open" : ""}`}><Card><ProgressBar value={demo.data.completed.length / lessons.length * 100} /><p className="muted">{demo.data.completed.length} of {lessons.length} lessons complete</p></Card>
      {lessons.map((item, i) => <button key={item.title} className={`card lesson-item ${i === selected ? "selected" : ""}`} aria-pressed={i === selected} onClick={() => { finishStudy.current?.(); finishStudy.current = null; setSelected(i); setReading(false); setListOpen(false); if (window.matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => { heading.current?.focus(); heading.current?.scrollIntoView({ block: "start" }); }); }}><span className={`lesson-number ${demo.data.completed.includes(i) ? "complete" : i === selected ? "current" : ""}`}>{i + 1}</span><span><strong>{item.title}</strong><span className="muted">{demo.data.completed.includes(i) ? "Completed" : i === selected ? "Current lesson" : "Not started"}</span></span></button>)}
    </div><Card className="lesson-detail"><div ref={heading} tabIndex={-1}><p className="card-kicker">Lesson {selected + 1} of {lessons.length}</p><h2>{lesson.title}</h2></div><div className={`lesson-reading ${reading ? "expanded" : ""}`}>{reading ? <><h3>{lesson.title}</h3><p>{lesson.reading}</p><button className="text-button" onClick={toggleReading}>Close reading</button></> : <button onClick={toggleReading} className="reading-button"><Icon name="book" size={42} /><span>Read the lesson</span><span className="reading-duration">About 12 minutes</span></button>}</div><p className="lesson-summary muted">{lesson.summary}</p><LessonDiagram key={selected} lesson={selected} /><div className="actions"><button className="button primary" disabled={completed} onClick={() => { const undo = demo.update(d => { const ids = [...new Set([...d.completed, selected])]; return { completed: ids, students: d.students.map(s => s.id === 2 ? { ...s, progress: Math.round(ids.length / lessons.length * 100) } : s) }; }); notify("Lesson marked complete. Your progress has been saved.", undo); }}>{completed ? "Lesson completed" : "Mark lesson complete"}</button><button className="button outline" onClick={() => navigate("quiz")}>Take quiz</button></div></Card></div>
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
    demo.recordQuiz(score); setFinished(true);
  };
  return <div className="quiz-screen"><header className="quiz-header"><button className="text-button" onClick={() => navigate("course")}>× Exit quiz</button><strong>Forces and motion quiz</strong><span className="muted">{finished ? "Quiz complete" : `Question ${index + 1} of 5`}</span></header>
    <div className="quiz-content">{finished ? <Card className="quiz-result"><span className="result-symbol" aria-hidden="true">✓</span><h1>Quiz complete</h1><p className="score">{score} out of 5</p><p className="muted">{score >= 3 ? "Well done! Keep building on what you’ve learned." : "Review the lesson and try again. Every attempt helps you learn."}</p><div className="answer-review">{questions.map((q, i) => <div key={q.question}><strong>{i + 1}. {q.question}</strong><p className={answers[i] === q.answerIndex ? "correct" : "incorrect"}>Your answer: {q.options[answers[i]!] ?? "Not answered"}</p>{answers[i] !== q.answerIndex && <p>Correct answer: {q.options[q.answerIndex]}</p>}</div>)}</div><div className="actions"><button className="button primary" onClick={() => navigate("student-home")}>Back to home</button><button className="button outline" onClick={() => { setAnswers({}); setIndex(0); setFinished(false); }}>Try again</button></div></Card> : <>
      <nav className="question-steps" aria-label="Quiz questions">{questions.map((_, i) => <button key={i} className={i === index ? "current" : answers[i] !== undefined ? "answered" : ""} aria-current={i === index ? "step" : undefined} aria-label={`Question ${i + 1}${answers[i] !== undefined ? ", answered" : ""}`} onClick={() => setIndex(i)}>{i + 1}</button>)}</nav>
      <Card className="quiz-card"><fieldset><legend>{question.question}</legend><div className="quiz-options">{question.options.map((option, i) => <label key={option} className={`quiz-option ${answers[index] === i ? "selected" : ""}`}><input type="radio" name={`question-${index}`} value={i} checked={answers[index] === i} onChange={() => setAnswers(a => ({ ...a, [index]: i }))} /><span>{option}</span></label>)}</div></fieldset><div className="quiz-actions"><button className="button outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Previous</button><button className="button primary" disabled={answers[index] === undefined} onClick={() => index === 4 ? finish() : setIndex(index + 1)}>{index === 4 ? "Finish quiz" : "Next question"}</button></div></Card>
    </>}</div></div>;
}

export function Progress({ demo, navigate }: ScreenProps) {
  const courses: [string, number][] = [["Mathematics", 72], ["English Language", 55], ["Integrated Science", demo.data.completed.length / lessons.length * 100]];
  return <>
    <PageHeader eyebrow="Student progress" title="My progress" />
    <div className="course-cards">{courses.map(([name, value]) => <Card key={name}>
      <SubjectArt subject={name} /><h2>{name}</h2><ProgressBar value={value} /><p className="muted">{Math.round(value)}% complete</p>
    </Card>)}</div>
    <div className="student-bottom"><AnalyticsPanel kind="activity" records={demo.data} /><Card>
      <h2>Quiz results</h2>
      {demo.data.quizScore === null ? <div className="quiz-empty"><Icon name="quiz" size={36} /><p className="muted">Complete your first quiz to see your result here.</p></div> : <div className="list-row"><strong>Forces and motion</strong><span>{demo.data.quizScore} / 5</span><span>{demo.data.quizScore * 20}%</span></div>}
      <button className="button outline" onClick={() => navigate("quiz")}>Take quiz</button>
    </Card></div>
  </>;
}

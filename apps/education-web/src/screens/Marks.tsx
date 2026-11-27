import { useEffect, useState } from "react";
import { Card, ClassSelect, EmptyState, PageHeader } from "../components";
import type { ScreenProps } from "../demo";
import { computeSubjectScore, setMark, type MarkComponent, type SchoolState } from "../school";

const components: MarkComponent[] = ["assignment", "homework", "quiz", "exam"];
const componentLabel: Record<MarkComponent, string> = { assignment: "Assignment", homework: "Homework", quiz: "Quiz", exam: "Exam" };
const blankMarks = (): Record<MarkComponent, { score: string; max: string }> => ({
  assignment: { score: "", max: "" }, homework: { score: "", max: "" }, quiz: { score: "", max: "" }, exam: { score: "", max: "" },
});

export function Marks({ demo, notify }: ScreenProps) {
  const actor = demo.data.actor;
  const [className, setClassName] = useState("JHS 2");
  const [studentId, setStudentId] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [values, setValues] = useState(blankMarks);
  const term = "Term 1";
  const students = demo.data.students.filter(student => student.className === className);
  const student = students.find(item => item.id === studentId) ?? students[0];
  const activeStudentId = student?.id ?? 0;
  const availableSubjects = actor.role === "admin"
    ? demo.data.subjects
    : demo.data.subjects.filter(subject => demo.data.teacherAssignments.some(assignment => assignment.subjectId === subject.id && assignment.teacherId === actor.userId));
  const activeSubjectId = availableSubjects.find(subject => subject.id === subjectId)?.id ?? availableSubjects[0]?.id ?? "";
  const findMark = (component: MarkComponent) => demo.data.marks.find(mark => mark.studentId === activeStudentId && mark.subjectId === activeSubjectId && mark.component === component && mark.term === term);
  const score = activeStudentId && activeSubjectId ? computeSubjectScore(demo.data, activeStudentId, activeSubjectId, term) : null;

  useEffect(() => {
    const next = blankMarks();
    for (const component of components) {
      const mark = findMark(component);
      next[component] = { score: mark ? String(mark.score) : "", max: mark ? String(mark.max) : component === "exam" ? "100" : "25" };
    }
    setValues(next);
  }, [activeStudentId, activeSubjectId, term, demo.data.marks]);

  const save = () => {
    if (!student || !activeSubjectId) return;
    let next: SchoolState = demo.data;
    let savedCount = 0;
    try {
      for (const component of components) {
        const value = values[component];
        if (!value.score.trim() || !value.max.trim()) continue;
        next = setMark(next, actor, {
          studentId: activeStudentId,
          subjectId: activeSubjectId,
          component,
          score: Number(value.score),
          max: Number(value.max),
          term,
          className: student.className,
        });
        savedCount++;
      }
      if (!savedCount) { notify("Enter at least one mark before saving."); return; }
      const undo = demo.update(() => next);
      notify(`Saved ${savedCount} mark${savedCount === 1 ? "" : "s"}.`, undo);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Those marks could not be saved.");
    }
  };

  return <>
    <PageHeader eyebrow="Teaching / Term 1 marks" title="Subject marks" name={demo.data.schoolName} />
    <div className="school-admin-layout">
      <Card>
        <div className="card-heading"><h2>Enter marks</h2><span className="demo-label">{actor.role === "admin" ? "All subjects" : "Assigned subjects only"}</span></div>
        <div className="filters">
          <ClassSelect value={className} onChange={value => { setClassName(value); setStudentId(demo.data.students.find(item => item.className === value)?.id ?? 0); }} />
          <label className="inline-label">Student
            <select aria-label="Student" value={activeStudentId} onChange={event => setStudentId(Number(event.target.value))}>
              {students.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="inline-label">Subject
            <select aria-label="Subject" value={activeSubjectId} onChange={event => setSubjectId(event.target.value)}>
              {availableSubjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
        </div>
        {!availableSubjects.length ? <EmptyState icon="book" title="No assigned subjects" description="Ask an administrator to assign a subject to this teacher." />
          : !student ? <EmptyState icon="students" title="No students in this class" description="Choose another class to enter marks." />
            : <>
              <div className="mark-grid">{components.map(component => <div className="mark-row" key={component}>
                <strong>{componentLabel[component]}</strong>
                <label>Score<input aria-label={`${componentLabel[component]} score`} type="number" min="0" max={values[component].max || undefined} value={values[component].score} onChange={event => setValues(current => ({ ...current, [component]: { ...current[component], score: event.target.value } }))} /></label>
                <label>Maximum<input aria-label={`${componentLabel[component]} maximum`} type="number" min="1" value={values[component].max} onChange={event => setValues(current => ({ ...current, [component]: { ...current[component], max: event.target.value } }))} /></label>
              </div>)}</div>
              <button className="button primary section-spaced" onClick={save}>Save marks</button>
            </>}
      </Card>
      <Card>
        <div className="card-heading"><h2>Calculated result</h2><span className="demo-label">Live from saved marks</span></div>
        <dl className="mark-summary">
          <div><dt>Class score</dt><dd>{score?.classScore ?? "—"}</dd></div>
          <div><dt>Exam</dt><dd>{score?.exam ?? "—"}</dd></div>
          <div><dt>Total</dt><dd>{score?.total ?? "—"}</dd></div>
          <div><dt>Grade</dt><dd>{score?.grade || "—"}</dd></div>
        </dl>
        <p className="muted section-spaced">{score?.remark || "Enter class work and exam marks to calculate a result."}</p>
      </Card>
    </div>
  </>;
}

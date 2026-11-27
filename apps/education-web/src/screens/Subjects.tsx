import { useState } from "react";
import { Card, ClassSelect, EmptyState, PageHeader } from "../components";
import type { ScreenProps } from "../demo";
import { addSubject, assignFormMaster, assignTeacherToSubject, type SchoolState } from "../school";

const classes = ["JHS 1", "JHS 2", "JHS 3", "SHS 1"];

export function Subjects({ demo, notify }: ScreenProps) {
  const actor = demo.data.actor;
  const [name, setName] = useState("");
  const [className, setClassName] = useState(classes[0]!);
  const [formMasterId, setFormMasterId] = useState(demo.data.teachers[0]?.id ?? "");
  const [pickedTeachers, setPickedTeachers] = useState<Record<string, string>>({});

  const apply = (message: string, change: (state: SchoolState) => SchoolState) => {
    try {
      const next = change(demo.data);
      const undo = demo.update(() => next);
      notify(message, undo);
      return next;
    } catch (error) {
      notify(error instanceof Error ? error.message : "That change could not be saved.");
      return null;
    }
  };

  if (actor.role !== "admin") return <>
    <PageHeader eyebrow="School management / Subjects" title="Subjects" name={demo.data.schoolName} />
    <Card><EmptyState icon="shield" title="Administrator access required" description="Ask an administrator to manage subjects and teacher assignments." /></Card>
  </>;

  const teacherName = (teacherId: string | undefined) => demo.data.teachers.find(teacher => teacher.id === teacherId)?.name ?? "No teacher assigned";

  return <>
    <PageHeader eyebrow="School management / Subjects" title="Subjects and staffing" name={demo.data.schoolName} />
    <div className="school-admin-layout">
      <Card>
        <div className="card-heading"><h2>Subjects</h2><span className="demo-label">{demo.data.subjects.length} configured</span></div>
        <form className="inline-form" onSubmit={event => {
          event.preventDefault();
          const next = apply("Subject added.", state => addSubject(state, actor, name));
          if (!next) return;
          setName("");
          const added = next.subjects.at(-1);
          if (added) setPickedTeachers(current => ({ ...current, [added.id]: demo.data.teachers[0]?.id ?? "" }));
        }}>
          <label>Subject name<input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. French" /></label>
          <button className="button primary" type="submit">Add subject</button>
        </form>
        <div className="subject-list">{demo.data.subjects.map(subject => {
          const assignment = demo.data.teacherAssignments.find(item => item.subjectId === subject.id);
          const choice = pickedTeachers[subject.id] ?? assignment?.teacherId ?? demo.data.teachers[0]?.id ?? "";
          return <div className="subject-row" key={subject.id}>
            <div className="subject-row-heading"><strong>{subject.name}</strong><span className="demo-label">{teacherName(assignment?.teacherId)}</span></div>
            <div className="subject-row-actions">
              <label className="inline-label">Teacher for {subject.name}
                <select aria-label={`Teacher for ${subject.name}`} value={choice} onChange={event => setPickedTeachers(current => ({ ...current, [subject.id]: event.target.value }))}>
                  {demo.data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
                </select>
              </label>
              <button className="button outline compact" disabled={!choice} onClick={() => {
                const changed = apply(`${subject.name} teacher assigned.`, state => assignTeacherToSubject(state, actor, subject.id, choice));
                if (changed) setPickedTeachers(current => ({ ...current, [subject.id]: choice }));
              }}>Assign teacher</button>
            </div>
          </div>;
        })}</div>
      </Card>
      <Card>
        <div className="card-heading"><h2>Form masters</h2><span className="demo-label">Class responsibility</span></div>
        <div className="form-master-assign">
          <ClassSelect value={className} onChange={setClassName} />
          <label className="inline-label">Form master
            <select aria-label="Form master" value={formMasterId} onChange={event => setFormMasterId(event.target.value)}>
              {demo.data.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
            </select>
          </label>
          <button className="button primary" disabled={!formMasterId} onClick={() => apply(`${className} form master assigned.`, state => assignFormMaster(state, actor, className, formMasterId))}>Assign form master</button>
        </div>
        <ul className="form-master-list">{demo.data.formMasters.map(assignment => <li key={assignment.className}><strong>{assignment.className}</strong><span>{teacherName(assignment.teacherId)}</span></li>)}</ul>
      </Card>
    </div>
  </>;
}

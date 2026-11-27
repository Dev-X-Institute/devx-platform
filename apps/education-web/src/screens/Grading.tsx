import { useState } from "react";
import { Card, EmptyState, PageHeader } from "../components";
import type { ScreenProps } from "../demo";
import { gradeFor, saveGradingScheme, type GradeBand, type GradingScheme, type SchoolState } from "../school";

const emptyScheme: GradingScheme = {
  id: "",
  name: "New grading scheme",
  appliesTo: [],
  weights: { classScore: 40, exam: 60 },
  termDays: 60,
  bands: [],
};
const cloneScheme = (scheme: GradingScheme): GradingScheme => ({
  ...scheme,
  appliesTo: [...scheme.appliesTo],
  weights: { ...scheme.weights },
  bands: scheme.bands.map(band => ({ ...band })),
});

export function Grading({ demo, notify }: ScreenProps) {
  const actor = demo.data.actor;
  const [schemeId, setSchemeId] = useState(demo.data.gradingSchemes[0]?.id ?? "");
  const [draft, setDraft] = useState<GradingScheme>(() => cloneScheme(demo.data.gradingSchemes[0] ?? emptyScheme));

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
    <PageHeader eyebrow="School management / Grading" title="Grading schemes" name={demo.data.schoolName} />
    <Card><EmptyState icon="shield" title="Administrator access required" description="Ask an administrator to edit grading schemes." /></Card>
  </>;

  const previewTotal = Math.round(100 * (Number(draft.weights.classScore) || 0) / 100 + 50 * (Number(draft.weights.exam) || 0) / 100);
  const preview = gradeFor(draft, previewTotal);
  const updateBand = (index: number, patch: Partial<GradeBand>) => setDraft(current => ({ ...current, bands: current.bands.map((band, position) => position === index ? { ...band, ...patch } : band) }));

  return <>
    <PageHeader eyebrow="School management / Grading" title="Grading schemes" name={demo.data.schoolName} />
    <div className="school-admin-layout">
      <Card>
        <div className="card-heading"><h2>Scheme settings</h2><span className="demo-label">Admin editable</span></div>
        <label>Grading scheme
          <select aria-label="Grading scheme" value={schemeId} onChange={event => {
            const selected = demo.data.gradingSchemes.find(scheme => scheme.id === event.target.value);
            if (!selected) return;
            setSchemeId(selected.id);
            setDraft(cloneScheme(selected));
          }}>
            {demo.data.gradingSchemes.map(scheme => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}
          </select>
        </label>
        <div className="form-grid">
          <label>Class score weight (%)<input type="number" min="0" max="100" value={draft.weights.classScore} onChange={event => setDraft(current => ({ ...current, weights: { ...current.weights, classScore: Number(event.target.value) } }))} /></label>
          <label>Exam weight (%)<input type="number" min="0" max="100" value={draft.weights.exam} onChange={event => setDraft(current => ({ ...current, weights: { ...current.weights, exam: Number(event.target.value) } }))} /></label>
          <label>Term days<input type="number" min="1" value={draft.termDays} onChange={event => setDraft(current => ({ ...current, termDays: Number(event.target.value) }))} /></label>
        </div>
        <label className="section-spaced">Applies to (comma separated)
          <input value={draft.appliesTo.join(", ")} onChange={event => setDraft(current => ({ ...current, appliesTo: event.target.value.split(",").map(item => item.trim()).filter(Boolean) }))} />
        </label>
        <div className="card-heading section-spaced"><h2>Grade bands</h2><button className="button outline compact" onClick={() => setDraft(current => ({ ...current, bands: [...current.bands, { min: 0, max: 0, grade: "", remark: "" }] }))}>Add band</button></div>
        <div className="band-grid">{draft.bands.map((band, index) => <div className="band-row" key={`${band.grade}-${index}`}>
          <label>Min<input aria-label={`Minimum for band ${index + 1}`} type="number" value={band.min} onChange={event => updateBand(index, { min: Number(event.target.value) })} /></label>
          <label>Max<input aria-label={`Maximum for band ${index + 1}`} type="number" value={band.max} onChange={event => updateBand(index, { max: Number(event.target.value) })} /></label>
          <label>Grade<input aria-label={`Grade for band ${index + 1}`} value={band.grade} onChange={event => updateBand(index, { grade: event.target.value })} /></label>
          <label>Remark<input aria-label={`Remark for band ${index + 1}`} value={band.remark} onChange={event => updateBand(index, { remark: event.target.value })} /></label>
          <button className="button outline compact" disabled={draft.bands.length <= 1} aria-label={`Remove band ${index + 1}`} onClick={() => setDraft(current => ({ ...current, bands: current.bands.filter((_, position) => position !== index) }))}>Remove</button>
        </div>)}</div>
        <button className="button primary section-spaced" onClick={() => {
          const savedState = apply("Grading scheme saved.", state => saveGradingScheme(state, actor, { ...draft, termDays: Number(draft.termDays), weights: { classScore: Number(draft.weights.classScore), exam: Number(draft.weights.exam) } }));
          const savedScheme = savedState?.gradingSchemes.find(scheme => scheme.id === draft.id);
          if (savedScheme) { setSchemeId(savedScheme.id); setDraft(cloneScheme(savedScheme)); }
        }}>Save grading scheme</button>
      </Card>
      <Card>
        <div className="card-heading"><h2>Preview</h2><span className="demo-label">Class work 100%, exam 50%</span></div>
        <div className="grading-preview">
          <span className="muted">Total score</span>
          <strong>{previewTotal}% · {preview.grade || "—"}</strong>
          <span>{preview.remark || "No band matches this score."}</span>
        </div>
        <p className="muted section-spaced">The preview uses the same band lookup as the report card, so a saved scheme changes both together.</p>
      </Card>
    </div>
  </>;
}

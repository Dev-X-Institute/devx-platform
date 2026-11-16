import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Icon } from "./icons";

const activity = [
  { label: "Mon", minutes: 25, lessons: 1 }, { label: "Tue", minutes: 42, lessons: 2 },
  { label: "Wed", minutes: 30, lessons: 1 }, { label: "Thu", minutes: 55, lessons: 3 },
  { label: "Fri", minutes: 38, lessons: 2 }, { label: "Sat", minutes: 18, lessons: 1 }, { label: "Sun", minutes: 32, lessons: 2 },
];
const collection = [
  { label: "JHS 1", value: 78 }, { label: "JHS 2", value: 64 },
  { label: "JHS 3", value: 91 }, { label: "SHS 1", value: 55 },
];
const performance = [
  { label: "Living things", value: 82 }, { label: "Matter", value: 74 },
  { label: "Forces", value: 68 }, { label: "Energy", value: 86 },
];
export type AnalyticsProps = { kind: "activity" | "fees" | "performance" };
export default function Analytics({ kind }: AnalyticsProps) {
  const [metric, setMetric] = useState("minutes");
  const [sort, setSort] = useState("class");
  const id = useId().replace(/:/g, "");
  const isActivity = kind === "activity";
  const title = isActivity ? "Learning activity" : kind === "fees" ? "Fee collection by class" : "Class performance";
  const data = isActivity ? activity.map(row => ({ label: row.label, value: metric === "minutes" ? row.minutes : row.lessons })) : kind === "fees" ? (sort === "highest" ? [...collection].sort((a, b) => b.value - a.value) : collection) : performance;
  const unit = isActivity ? metric === "minutes" ? " min" : " lessons" : "%";
  const summary = isActivity ? metric === "minutes" ? "240 minutes of learning" : "12 lessons studied" : kind === "fees" ? "JHS 3 leads at 91%" : "Energy is strongest at 86%";
  return <section className="card analytics-card" aria-labelledby={`${id}-title`}>
    <div className="card-heading"><div><h2 id={`${id}-title`}>{title}</h2><p className="muted analytics-period">{isActivity ? "Weekly example" : "Term 1 example"}</p></div>
      {isActivity ? <label className="chart-filter"><span className="sr-only">Activity metric</span><select value={metric} onChange={e => setMetric(e.target.value)}><option value="minutes">Study time</option><option value="lessons">Lessons</option></select></label> : kind === "fees" ? <label className="chart-filter"><span className="sr-only">Collection order</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="class">Class order</option><option value="highest">Highest first</option></select></label> : <span className="chart-unit">Average score</span>}
    </div>
    <p className="chart-summary" aria-live="polite"><Icon name={isActivity ? "clock" : "chart"} size={18} />{summary}</p>
    <div className="chart-frame" role="group" aria-label={`${title}, ${summary}. Use the data table for all values.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {isActivity ? <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -24 }} accessibilityLayer>
          <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--green)" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} dy={8} /><YAxis domain={[0, metric === "minutes" ? 60 : 4]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} formatter={value => [`${value}${unit}`, metric === "minutes" ? "Study time" : "Lessons"]} />
          <Area type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2.5} fill={`url(#${id}-fill)`} isAnimationActive={false} dot={{ r: 3, fill: "var(--green)", stroke: "var(--white)", strokeWidth: 2 }} />
        </AreaChart> : <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} /><YAxis dataKey="label" type="category" width={kind === "performance" ? 85 : 50} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "var(--mint)", opacity: 0.5 }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} formatter={value => [`${value}%`, kind === "fees" ? "Collected" : "Average score"]} />
          <Bar dataKey="value" fill="var(--green)" radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}><LabelList dataKey="value" position="right" formatter={value => `${value}%`} fill="var(--ink)" fontSize={12} /></Bar>
        </BarChart>}
      </ResponsiveContainer>
    </div>
    <details className="chart-data"><summary>View data table <Icon name="next" size={16} /></summary><div className="table-wrap"><table><caption className="sr-only">{title}: sample data</caption><thead><tr><th scope="col">{isActivity ? "Day" : kind === "fees" ? "Class" : "Topic"}</th><th scope="col">{isActivity ? metric === "minutes" ? "Study time (minutes)" : "Lessons studied" : kind === "fees" ? "Fees collected (%)" : "Average score (%)"}</th></tr></thead><tbody>{data.map(row => <tr key={row.label}><th scope="row">{row.label}</th><td>{row.value}</td></tr>)}</tbody></table></div></details>
    <p className="demo-label chart-note">Sample analytics for this preview.</p>
  </section>;
}

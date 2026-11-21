import { useId, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Icon } from "./icons";
import { analyticsData, type AnalyticsKind } from "./analytics-data";
import { classes } from "./records";
import { csvCell, download, type DemoState } from "./demo";
import { EmptyState } from "./components";

export type AnalyticsProps = { kind: AnalyticsKind; records: DemoState };
export default function Analytics({ kind, records }: AnalyticsProps) {
  const [metric, setMetric] = useState("minutes");
  const [sort, setSort] = useState("class");
  const [days, setDays] = useState(7);
  const [className, setClassName] = useState(kind === "performance" ? "JHS 2" : "all");
  const id = useId().replace(/:/g, "");
  const isActivity = kind === "activity";
  const title = isActivity ? "Learning activity" : kind === "fees" ? "Fee collection by class" : "Class performance";
  const raw = analyticsData(records, kind, days, className, metric);
  const data = sort === "highest" ? [...raw].sort((a, b) => b.value - a.value) : raw;
  const total = Math.round(data.reduce((sum, row) => sum + row.value, 0) * 100) / 100;
  const best = [...data].sort((a, b) => b.value - a.value)[0];
  const empty = !data.length || (isActivity && total === 0);
  const unit = isActivity ? metric === "minutes" ? " min" : " lessons" : "%";
  const summary = isActivity ? metric === "minutes" ? `${total} minutes of learning` : `${total} lesson${total === 1 ? "" : "s"} studied` : best ? `${best.label} ${kind === "fees" ? "leads" : "is strongest"} at ${best.value}%` : "No records in this view";
  const exportData = () => download(`${kind}-analytics.csv`, ["Label,Date,Value,Unit", ...data.map(row => [row.label, row.date, row.value, unit.trim()].map(csvCell).join(","))].join("\n"));
  return <section className="card analytics-card" aria-labelledby={`${id}-title`}>
    <div className="card-heading"><div><h2 id={`${id}-title`}>{title}</h2><p className="muted analytics-period">{kind === "fees" ? "Current local balances" : `Last ${days} days`}</p></div><button className="text-button" aria-label="Export analytics" onClick={exportData} disabled={empty}><Icon name="download" size={17} />CSV</button></div>
    <div className="analytics-filters">{isActivity ? <label className="chart-filter">Activity metric<select value={metric} onChange={e => setMetric(e.target.value)}><option value="minutes">Study time</option><option value="lessons">Lessons</option></select></label> : <label className="chart-filter">Analytics class<select value={className} onChange={e => setClassName(e.target.value)}><option value="all">All classes</option>{classes.map(name => <option key={name}>{name}</option>)}</select></label>}
      {kind === "fees" ? <label className="chart-filter">Collection order<select value={sort} onChange={e => setSort(e.target.value)}><option value="class">Class order</option><option value="highest">Highest first</option></select></label> : <label className="chart-filter">Date range<select value={days} onChange={e => setDays(Number(e.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={1}>Today</option></select></label>}
    </div>
    <p className="chart-summary" aria-live="polite"><Icon name={isActivity ? "clock" : "chart"} size={18} />{summary}</p>
    {empty ? <EmptyState icon="chart" title="No activity yet" description={isActivity ? "Open a lesson to start building your learning history." : "Try another class or date range to see available records."} /> : <div className="chart-frame" role="group" aria-label={`${title}, ${summary}. Use the data table for all values.`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {isActivity ? <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -24 }} accessibilityLayer>
          <defs><linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.2} /><stop offset="100%" stopColor="var(--green)" stopOpacity={0.01} /></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis dataKey={days > 7 ? "date" : "label"} minTickGap={24} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} dy={8} /><YAxis domain={[0, "auto"]} allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} formatter={value => [`${value}${unit}`, metric === "minutes" ? "Study time" : "Lessons"]} />
          <Area type="monotone" dataKey="value" stroke="var(--green)" strokeWidth={2.5} fill={`url(#${id}-fill)`} isAnimationActive={false} dot={{ r: 3, fill: "var(--green)", stroke: "var(--white)", strokeWidth: 2 }} />
        </AreaChart> : <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, bottom: 0, left: 0 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 5" /><XAxis type="number" domain={[0, 100]} tickFormatter={value => `${value}%`} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} /><YAxis dataKey="label" type="category" width={kind === "performance" ? 85 : 50} tickFormatter={value => value === "Forces and motion" ? "Forces" : value} axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip cursor={{ fill: "var(--mint)", opacity: 0.5 }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", fontSize: 13 }} formatter={value => [`${value}%`, kind === "fees" ? "Collected" : "Average score"]} />
          <Bar dataKey="value" fill="var(--green)" radius={[0, 5, 5, 0]} barSize={18} isAnimationActive={false}><LabelList dataKey="value" position="right" formatter={value => `${value}%`} fill="var(--ink)" fontSize={12} /></Bar>
        </BarChart>}
      </ResponsiveContainer>
    </div>}
    <details className="chart-data"><summary>View data table <Icon name="next" size={16} /></summary><div className="table-wrap"><table><caption className="sr-only">{title}: local records</caption><thead><tr><th scope="col">{isActivity ? "Day" : kind === "fees" ? "Class" : "Topic"}</th><th scope="col">{isActivity ? metric === "minutes" ? "Study time (minutes)" : "Lessons studied" : kind === "fees" ? "Fees collected (%)" : "Average score (%)"}</th></tr></thead><tbody>{data.map(row => <tr key={`${row.date}-${row.label}`}><th scope="row">{isActivity && days > 7 ? row.date : row.label}</th><td>{Math.round(row.value * 100) / 100}</td></tr>)}</tbody></table></div></details>
    <p className="demo-label chart-note">Derived from local preview records. No backend connected.</p>
  </section>;
}

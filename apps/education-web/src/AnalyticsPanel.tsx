import { lazy, Suspense } from "react";
import type { AnalyticsProps } from "./Analytics";

const Analytics = lazy(() => import("./Analytics"));
export function AnalyticsPanel(props: AnalyticsProps) {
  return <Suspense fallback={<div className="card analytics-placeholder" role="status">Loading analytics…</div>}><Analytics {...props} /></Suspense>;
}

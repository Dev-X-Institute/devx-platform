export interface ReportRow {
  subject: string;
  classScore: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

export interface ReportModel {
  schoolName: string;
  term: string;
  className: string;
  year: number;
  student: string;
  position: string;
  attendance: string;
  monogram: string;
  rows: ReportRow[];
  average: number;
  teacherRemark: string;
  headRemark: string;
  generatedOn: string;
}

// Single source of truth for the sample report card. Scores are declared inline
// (rather than indexed from parallel arrays) so the model stays safe under
// noUncheckedIndexedAccess.
const rows: ReportRow[] = [
  { subject: "Mathematics", classScore: 27, exam: 58 },
  { subject: "English Language", classScore: 24, exam: 52 },
  { subject: "Integrated Science", classScore: 26, exam: 55 },
  { subject: "Social Studies", classScore: 25, exam: 54 },
  { subject: "ICT", classScore: 28, exam: 60 },
].map((row, i) => ({
  ...row,
  total: row.classScore + row.exam,
  grade: i === 1 || i === 3 ? "B2" : "A1",
  remark: i === 1 || i === 3 ? "Very good" : "Excellent",
}));

export const subjects: string[] = rows.map(row => row.subject);

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}

export function buildReport(term: string, className: string, schoolName: string, generatedOn = new Date().toISOString().slice(0, 10)): ReportModel {
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return {
    schoolName,
    term,
    className,
    year: 2026,
    student: "Student 2",
    position: "4 of 34",
    attendance: "58 of 60 days",
    monogram: initials(schoolName),
    rows,
    average: Math.round((total / rows.length) * 10) / 10,
    teacherRemark: "A strong term. Keep practising regularly.",
    headRemark: "Well done. Keep up the good work.",
    generatedOn,
  };
}

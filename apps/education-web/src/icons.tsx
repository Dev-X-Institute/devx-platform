import { ArrowDownToLine, ArrowLeft, ArrowUpRight, BookOpen, ChartNoAxesCombined, Check, ChevronRight, ClipboardCheck, Clock3, FileText, GraduationCap, House, LayoutDashboard, LogOut, Mail, Menu, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, TriangleAlert, Users, Wallet, X } from "lucide-react";

const icons = { download: ArrowDownToLine, back: ArrowLeft, arrow: ArrowUpRight, book: BookOpen, chart: ChartNoAxesCombined, check: Check, next: ChevronRight, quiz: ClipboardCheck, clock: Clock3, report: FileText, school: GraduationCap, home: House, dashboard: LayoutDashboard, logout: LogOut, mail: Mail, menu: Menu, plus: Plus, search: Search, shield: ShieldCheck, shop: ShoppingBag, sparkles: Sparkles, students: Users, fees: Wallet, alert: TriangleAlert, close: X };
export type IconName = keyof typeof icons;
export function Icon({ name, size = 20, className = "" }: { name: IconName; size?: number; className?: string }) {
  const Glyph = icons[name];
  return <Glyph size={size} strokeWidth={1.8} aria-hidden="true" className={`icon ${className}`} />;
}

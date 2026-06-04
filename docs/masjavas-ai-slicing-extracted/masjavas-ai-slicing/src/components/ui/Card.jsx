import { cn } from "../../utils";

export function Card({ children, className = "" }) {
  return (
    <div className={cn("rounded-[28px] border border-white/10 bg-white/[0.065] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}

export function Pill({ children, tone = "default" }) {
  const map = {
    default: "border-white/10 bg-white/[0.06] text-slate-200",
    soft: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    purple: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    blue: "border-blue-300/30 bg-blue-500/20 text-blue-100",
  };

  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", map[tone])}>{children}</span>;
}

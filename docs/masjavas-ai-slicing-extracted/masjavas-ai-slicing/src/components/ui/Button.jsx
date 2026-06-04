import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import { cn } from "../../utils";

export function PrimaryButton({ children, icon: Icon = ArrowRight, className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-500/20 transition hover:scale-[1.02]",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export function SecondaryButton({ children, icon: Icon = ArrowLeft, className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export function GhostButton({ children, icon: Icon = CircleHelp, className = "", ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

export function MiniButton({ children, className = "", ...props }) {
  return (
    <button
      className={cn(
        "rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

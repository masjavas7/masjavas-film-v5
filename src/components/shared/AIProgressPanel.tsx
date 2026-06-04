import * as React from "react";
import { Check, AlertTriangle, RefreshCw, ChevronRight } from "lucide-react";
import { Card } from "../ui/Card";
import { cn } from "../../utils";

interface AIProgressPanelProps {
  title: string;
  description: string;
  steps: string[];
  activeStep: number;
  status: "loading" | "success" | "error";
  progress?: number;
  errorMessage?: string;
  estimatedTime?: string;
  skipText?: string;
  onRetry?: () => void;
  onSkip?: () => void;
}

export const AIProgressPanel: React.FC<AIProgressPanelProps> = ({
  title,
  description,
  steps,
  activeStep,
  status,
  progress,
  errorMessage,
  estimatedTime,
  skipText,
  onRetry,
  onSkip
}) => {
  return (
    <Card className="max-w-xl mx-auto bg-black/40 border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl rounded-[32px] space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border",
          status === "error"
            ? "bg-rose-500/10 border-rose-500/25 text-rose-400"
            : "bg-blue-500/10 border-blue-500/20 text-blue-300"
        )}>
          {status === "error" ? (
            <AlertTriangle className="h-6 w-6" />
          ) : (
            <div className="relative flex items-center justify-center">
              <div className="absolute h-5 w-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
            </div>
          )}
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
          <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          {estimatedTime && status === "loading" && (
            <p className="text-xs text-blue-400 font-semibold mt-1 flex items-center gap-1.5 animate-pulse">
              <span>⏳</span>
              <span>{estimatedTime}</span>
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {status === "loading" && (
        <div className="space-y-2">
          <div className="w-full bg-slate-800/60 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className={cn(
                "bg-gradient-to-r from-blue-500 via-cyan-400 to-violet-500 h-full rounded-full transition-all duration-500",
                progress === undefined ? "w-1/3 animate-[shimmer_1.5s_infinite]" : ""
              )}
              style={{ width: progress !== undefined ? `${progress}%` : undefined }}
            />
          </div>
          {progress !== undefined && (
            <p className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">{progress}% selesai</p>
          )}
        </div>
      )}

      {/* Steps List */}
      <div className="rounded-2xl border border-white/5 bg-black/25 overflow-hidden divide-y divide-white/5">
        {steps.map((step, idx) => {
          const isCompleted = idx < activeStep;
          const isActive = idx === activeStep && status === "loading";
          const isPending = idx > activeStep;

          return (
            <div
              key={step}
              className={cn(
                "flex items-center justify-between p-4 transition-all duration-300 text-sm",
                isActive ? "bg-white/[0.02]" : "",
                isPending ? "opacity-35" : "opacity-100"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-lg border text-xs font-bold transition",
                  isCompleted
                    ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                    : isActive
                      ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                      : "bg-white/[0.03] border-white/5 text-slate-500"
                )}>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <span className={cn(
                  "font-medium",
                  isCompleted ? "text-slate-300 line-through decoration-slate-600" : "",
                  isActive ? "text-white font-bold" : "text-slate-400"
                )}>
                  {step}
                </span>
              </div>
              {isActive && (
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/10 animate-pulse">
                  Memproses
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Error Block */}
      {status === "error" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-xs text-rose-300 leading-relaxed font-mono">
            {errorMessage || "Terjadi kesalahan tidak dikenal saat memproses permintaan AI."}
          </div>
          
          <div className="flex gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex-grow flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] py-3 text-sm font-semibold text-white transition duration-200 border border-blue-400/20 shadow-lg shadow-blue-500/15"
              >
                <RefreshCw className="h-4 w-4 animate-spin-hover" />
                Coba lagi
              </button>
            )}
            {onSkip && (
              <button
                onClick={onSkip}
                className="flex-grow flex items-center justify-center gap-2 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] active:scale-[0.98] py-3 text-sm font-semibold text-slate-200 transition duration-200 border border-white/10"
              >
                {skipText || "Lewati langkah ini"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

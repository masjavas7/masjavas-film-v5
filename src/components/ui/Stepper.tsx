import * as React from "react";
import { CheckCircle2, Lock, Sparkles } from "lucide-react";
import { Card, Pill } from "./Card";
import { steps } from "../../data/appData";
import { cn } from "../../utils";

interface TopStepperProps {
  current?: number;
}

export const TopStepper: React.FC<TopStepperProps> = ({ current = 0 }) => {
  return (
    <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="flex min-w-[118px] items-center gap-2">
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                index === current
                  ? "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/40"
                  : index < current
                  ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
                  : "border-white/20 bg-white/[0.04] text-slate-400"
              )}
            >
              {index + 1}
            </div>
            <div>
              <p className={cn("text-sm font-semibold", index === current ? "text-white" : "text-slate-300")}>{step.label}</p>
              <p className="text-[11px] text-slate-500">{step.helper}</p>
            </div>
          </div>
          {index < steps.length - 1 && <div className="h-px w-8 bg-white/15" />}
        </div>
      ))}
    </div>
  );
};

interface StepperProps {
  current?: number;
}

export const Stepper: React.FC<StepperProps> = ({ current = 0 }) => {
  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Alur pembuatan video</p>
          <p className="mt-1 text-sm text-slate-400">Ikuti 8 langkah sederhana. Setelah satu tahap selesai, tombol berikutnya selalu muncul.</p>
        </div>
        <div className="self-start lg:self-auto">
          <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Otomatis dipandu</Pill>
        </div>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-8">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "rounded-2xl border p-3",
              index < current ? "border-emerald-300/25 bg-emerald-300/10" : index === current ? "border-blue-300/45 bg-blue-500/10" : "border-white/10 bg-black/20"
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-slate-500">{index + 1}</span>
              {index < current ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : index === current ? <Sparkles className="h-4 w-4 text-blue-200" /> : <Lock className="h-4 w-4 text-slate-500" />}
            </div>
            <p className="text-sm font-semibold text-white">{step.label}</p>
            <p className="mt-1 text-xs leading-4 text-slate-400">{step.helper}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};

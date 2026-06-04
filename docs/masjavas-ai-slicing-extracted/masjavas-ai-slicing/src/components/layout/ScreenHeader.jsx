import { CheckCircle2 } from "lucide-react";
import { Pill } from "../ui/Card";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

export function ScreenHeader({ badge, title, desc, cta, onNext, onBack, backLabel = "Kembali revisi" }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill tone="purple">{badge}</Pill>
          <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Siap digunakan</Pill>
        </div>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">{desc}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {onBack && <SecondaryButton onClick={onBack}>{backLabel}</SecondaryButton>}
        {onNext && <PrimaryButton onClick={onNext}>{cta}</PrimaryButton>}
      </div>
    </div>
  );
}

import * as React from "react";
import { CheckCircle2 } from "lucide-react";
import { Pill } from "../ui/Card";
import { PrimaryButton, SecondaryButton } from "../ui/Button";

interface ScreenHeaderProps {
  badge: string;
  title: string;
  desc: string;
  cta?: string;
  onNext?: () => void;
  onBack?: () => void;
  backLabel?: string;
  disabled?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  badge,
  title,
  desc,
  cta = "Lanjutkan",
  onNext,
  onBack,
  backLabel = "Kembali revisi",
  disabled
}) => {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between shrink-0">
      <div>
        <div className="mb-3 flex flex-wrap gap-2">
          <Pill tone="purple">{badge}</Pill>
          <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Siap digunakan</Pill>
        </div>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">{desc}</p>
      </div>
      <div className="flex flex-wrap gap-3 shrink-0">
        {onBack && <SecondaryButton onClick={onBack} disabled={disabled}>{backLabel}</SecondaryButton>}
        {onNext && <PrimaryButton onClick={onNext} disabled={disabled}>{cta}</PrimaryButton>}
      </div>
    </div>
  );
};

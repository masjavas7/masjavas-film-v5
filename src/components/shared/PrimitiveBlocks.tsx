import * as React from "react";
import { CheckCircle2, ChevronRight, Download, LucideIcon } from "lucide-react";
import { Pill, Card } from "../ui/Card";
import { PrimaryButton, SecondaryButton } from "../ui/Button";
import { cn } from "../../utils";

interface TipProps {
  text: string;
}

export const Tip: React.FC<TipProps> = ({ text }) => {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
};

interface CheckProps {
  text: string;
}

export const Check: React.FC<CheckProps> = ({ text }) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-200" />
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  );
};

interface QualityProps {
  label: string;
}

export const Quality: React.FC<QualityProps> = ({ label }) => {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="text-sm text-slate-300">{label}</span>
      <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Bagus</Pill>
    </div>
  );
};

interface ProjectCardProps {
  title: string;
  status: string;
  onOpen?: () => void;
  onDuplicate?: () => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  status,
  onOpen,
  onDuplicate
}) => {
  return (
    <Card>
      <div className="mb-4 aspect-video rounded-3xl bg-[radial-gradient(circle_at_40%_35%,rgba(34,211,238,0.22),transparent_24%),linear-gradient(135deg,#0f172a,#020617)]" />
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">{title}</h3>
        <Pill tone={status === "Selesai" ? "green" : status === "Preview siap" ? "soft" : "amber"}>{status}</Pill>
      </div>
      <div className="mt-5 flex gap-3">
        <PrimaryButton icon={ArrowRightIcon} onClick={onOpen}>Buka</PrimaryButton>
        <SecondaryButton onClick={onDuplicate}>Duplikat</SecondaryButton>
      </div>
    </Card>
  );
};

const ArrowRightIcon = () => (
  <span className="w-4 h-4 inline-flex items-center justify-center">→</span>
);

interface ChatBubbleProps {
  who: string;
  text: string;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ who, text }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{who}</p>
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
};

interface SettingsCardProps {
  title: string;
  items: string[];
}

export const SettingsCard: React.FC<SettingsCardProps> = ({ title, items }) => {
  return (
    <Card>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 cursor-pointer hover:bg-white/[0.04] transition">
            <span className="text-sm text-slate-300">{item}</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
        ))}
      </div>
    </Card>
  );
};

interface DownloadCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  onDownload?: () => void;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  icon: Icon,
  title,
  text,
  cta,
  onDownload
}) => {
  return (
    <Card>
      <Icon className="h-8 w-8 text-cyan-200" />
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-6">
        <PrimaryButton icon={Download} onClick={onDownload}>{cta}</PrimaryButton>
      </div>
    </Card>
  );
};

interface ChipGridProps {
  items: string[];
  active?: number;
  onChange?: (index: number) => void;
}

export const ChipGrid: React.FC<ChipGridProps> = ({ items, active = 0, onChange }) => {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, index) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange?.(index)}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-semibold transition active:scale-[0.98]",
            index === active
              ? "border-blue-300/45 bg-blue-500 text-white"
              : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
};

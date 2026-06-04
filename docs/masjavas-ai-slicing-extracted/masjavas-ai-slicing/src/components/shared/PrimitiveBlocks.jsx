import { CheckCircle2, ChevronRight, PlayCircle, RefreshCcw, Download } from "lucide-react";
import { Pill, Card } from "../ui/Card";
import { PrimaryButton, SecondaryButton } from "../ui/Button";
import { cn } from "../../utils";

export function Tip({ text }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200" />
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

export function Check({ text }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
      <CheckCircle2 className="h-5 w-5 text-emerald-200" />
      <p className="text-sm text-slate-300">{text}</p>
    </div>
  );
}

export function Quality({ label }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
      <span className="text-sm text-slate-300">{label}</span>
      <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" />Bagus</Pill>
    </div>
  );
}

export function ProjectCard({ title, status }) {
  return (
    <Card>
      <div className="mb-4 aspect-video rounded-3xl bg-[radial-gradient(circle_at_40%_35%,rgba(34,211,238,0.22),transparent_24%),linear-gradient(135deg,#0f172a,#020617)]" />
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-white">{title}</h3>
        <Pill tone={status === "Selesai" ? "green" : status === "Preview siap" ? "soft" : "amber"}>{status}</Pill>
      </div>
      <div className="mt-5 flex gap-3">
        <PrimaryButton>Buka</PrimaryButton>
        <SecondaryButton icon={RefreshCcw}>Duplikat</SecondaryButton>
      </div>
    </Card>
  );
}

export function ChatBubble({ who, text }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{who}</p>
      <p className="text-sm leading-6 text-slate-300">{text}</p>
    </div>
  );
}

export function SettingsCard({ title, items }) {
  return (
    <Card>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4">
            <span className="text-sm text-slate-300">{item}</span>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function DownloadCard({ icon: Icon, title, text, cta }) {
  return (
    <Card>
      <Icon className="h-8 w-8 text-cyan-200" />
      <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-6">
        <PrimaryButton icon={Download}>{cta}</PrimaryButton>
      </div>
    </Card>
  );
}

export function ChipGrid({ items, active = 0 }) {
  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, index) => (
        <button
          key={item}
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
            index === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]"
          )}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

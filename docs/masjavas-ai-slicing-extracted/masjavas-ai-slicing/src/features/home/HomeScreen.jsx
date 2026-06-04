import { Download, Layers3, Palette, PenLine, Plus, RefreshCcw, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Card, Pill } from "../../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Button";
import { platformPresets, durationPresets, tonePresets } from "../../data/appData";
import { cn } from "../../utils";

function PresetRow({ title, items, active }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={item}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold",
              index === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProjectStarterCard({ go }) {
  return (
    <Card className="p-6">
      <h3 className="text-2xl font-semibold">Mulai dari ide sederhana</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">Tulis ide bebas kamu di sini. Tidak perlu rapi, cukup ceritakan inti idenya saja.</p>
      <textarea
        className="mt-5 min-h-[150px] w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-300/50"
        placeholder="Contoh: Seorang pemuda menemukan pintu rahasia di perpustakaan tua yang membawanya ke dunia lain..."
      />
      <PresetRow title="Platform" items={platformPresets} active={0} />
      <PresetRow title="Durasi" items={durationPresets} active={1} />
      <PresetRow title="Nuansa" items={tonePresets} active={0} />
      <div className="mt-5">
        <PrimaryButton onClick={() => go("idea")} className="w-full">Buat Proyek Sekarang</PrimaryButton>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Aman dan privat. Hanya kamu yang bisa melihat proyek ini.</p>
    </Card>
  );
}

function BeginnerFlow() {
  const items = [
    ["Tulis ide bebas", "Ceritakan idemu dengan bahasa sendiri.", PenLine],
    ["Pilih preset", "Pilih gaya, durasi, dan nuansa.", Layers3],
    ["Review hasil AI", "Kami ubah idemu jadi cerita dan adegan.", WandSparkles],
    ["Preview & download", "Tonton, revisi, lalu download.", Download],
  ];

  return (
    <Card className="mt-8 bg-black/20">
      <h3 className="mb-5 text-lg font-semibold">Alur mudah untuk pemula</h3>
      <div className="grid gap-4 md:grid-cols-4">
        {items.map(([title, text, Icon], index) => (
          <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{index + 1}</div>
              <Icon className="h-5 w-5 text-blue-200" />
            </div>
            <p className="font-semibold text-white">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function IdeaCard({ title, tone }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
      <div className="aspect-[4/3] bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.2),transparent_22%),linear-gradient(135deg,#1e293b,#020617)]" />
      <div className="p-3">
        <p className="text-sm font-semibold text-white">{title}</p>
        <Pill tone="default">{tone}</Pill>
      </div>
    </div>
  );
}

function FeatureMini({ title, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <Icon className="mb-3 h-6 w-6 text-blue-200" />
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">Fokus ke ide, sistem membantu sisanya.</p>
    </div>
  );
}

export function HomeScreen({ go }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.065] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-10">
          <Pill tone="purple"><Sparkles className="h-3.5 w-3.5" /> Video sinematik, semudah menulis ide</Pill>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-white md:text-7xl">
            Ubah ide acak menjadi <span className="bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent">video siap download.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Tulis ide bebas, pilih gaya preset, tambah referensi jika punya, lalu ikuti langkah yang sudah disiapkan. Semua proses teknis kami urus di belakang layar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton icon={Plus} onClick={() => go("start")}>Mulai Proyek Baru</PrimaryButton>
            <SecondaryButton icon={PenLine} onClick={() => go("idea")}>Saya Sudah Punya Ide</SecondaryButton>
          </div>
          <BeginnerFlow />
        </div>
        <ProjectStarterCard go={go} />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-5 text-xl font-semibold">Contoh ide untuk memulai</h3>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
            {["Pintu Rahasia di Perpustakaan Tua", "Nelayan Kecil dan Laut yang Berubah", "Kota Masa Depan Tanpa Manusia", "Pesan Terakhir dari Planet Merah", "Penjaga Hutan yang Terakhir"].map((title, index) => (
              <IdeaCard key={title} title={title} tone={["Misterius", "Inspiratif", "Sinematik", "Sains Fiksi", "Petualangan"][index]} />
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 text-xl font-semibold">Kenapa mudah untuk pemula?</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {["Preset tinggal pilih", "Langkah berikutnya selalu jelas", "Bisa kembali revisi", "Semua teknis di belakang layar"].map((title, index) => (
              <FeatureMini key={title} title={title} icon={[Palette, PenLine, RefreshCcw, ShieldCheck][index]} />
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

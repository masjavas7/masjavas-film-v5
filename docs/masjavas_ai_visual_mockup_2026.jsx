import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clapperboard,
  Clock3,
  Download,
  Eye,
  FileText,
  Film,
  FolderOpen,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Layers3,
  Library,
  Lock,
  Menu,
  Mic2,
  Palette,
  PenLine,
  PlayCircle,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Video,
  WandSparkles,
} from "lucide-react";

const steps = [
  { id: "idea", label: "Tulis Ide", helper: "Ide & konsep cerita" },
  { id: "style", label: "Pilih Gaya", helper: "Visual & nuansa" },
  { id: "refs", label: "Referensi", helper: "Karakter, lokasi, objek" },
  { id: "script", label: "Review Cerita", helper: "Alur & struktur" },
  { id: "scenes", label: "Cek Adegan", helper: "Detail tiap adegan" },
  { id: "preview", label: "Preview", helper: "Lihat keseluruhan" },
  { id: "export", label: "Download", helper: "Ekspor hasil akhir" },
];

const nav = [
  { id: "home", label: "Homepage", icon: Home },
  { id: "start", label: "Mulai Proyek", icon: Plus },
  { id: "idea", label: "Tulis Ide", icon: PenLine },
  { id: "presets", label: "Pilih Preset", icon: Sparkles },
  { id: "references", label: "Referensi", icon: UploadCloud },
  { id: "review", label: "Review Cerita", icon: FileText },
  { id: "scenes", label: "Cek Adegan", icon: Clapperboard },
  { id: "preview", label: "Preview", icon: PlayCircle },
  { id: "export", label: "Download", icon: Download },
  { id: "library", label: "Proyek Saya", icon: Library },
  { id: "assistant", label: "Bantuan AI", icon: Bot },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

const platformPresets = ["YouTube 16:9", "TikTok 9:16", "Instagram 1:1", "Layar Lebar 21:9"];
const durationPresets = ["6 adegan · ±1 menit", "12 adegan · ±2 menit", "20 adegan · ±3–4 menit", "30 adegan · ±5–6 menit"];
const tonePresets = ["Sinematik", "Misterius", "Inspiratif", "Premium", "Komedi ringan"];

const referenceGroups = [
  { title: "Karakter utama", meta: "1 karakter", icon: "person", items: ["Wajah utama", "Close-up", "Ekspresi"] },
  { title: "Versi karakter lain", meta: "3 variasi", icon: "group", items: ["Basah", "Tegang", "Aksi"] },
  { title: "Lokasi utama", meta: "3 lokasi", icon: "pin", items: ["Terowongan", "Jalan basah", "Exit"] },
  { title: "Objek penting", meta: "4 objek", icon: "box", items: ["Motor", "Mobil", "Rambu"] },
  { title: "Style visual", meta: "3 gaya", icon: "palette", items: ["Noir", "Rainy", "Realistis"] },
  { title: "Suasana warna", meta: "3 palet", icon: "color", items: ["Biru", "Gelap", "Lampu"] },
];

const storyboardPanels = [
  ["0.0–1.25", "Wide shot", "Motor memasuki terowongan, hujan deras.", "—", "Rain, engine roar", "CUT"],
  ["1.25–2.50", "Medium close up", "Wiwi menoleh, mobil semakin dekat.", "Wiwi: Mereka dekat!", "Engine, tire splash", "CUT"],
  ["2.50–3.75", "Close up", "Hari fokus dan menarik gas lebih dalam.", "Hari: Tahan, Wi.", "Engine revs", "CUT"],
  ["3.75–5.00", "Low angle tracking", "Motor melaju kencang, air memercik.", "—", "Water splash", "MATCH CUT"],
  ["5.00–6.25", "Over shoulder", "Wiwi bersiap menahan pengejar.", "Wiwi: Saya tahan mereka!", "Heartbeat", "CUT"],
  ["6.25–7.50", "Dynamic tracking", "Motor menyalip celah sempit.", "Hari: Pegang erat!", "Metal scrape", "CUT"],
  ["7.50–8.75", "Inside car", "Pengejar kehilangan kontrol.", "Pengejar: Sial!", "Glass crack", "CUT"],
  ["8.75–10.00", "Rear tracking", "Motor keluar terowongan, masih dikejar.", "—", "Rain fades", "NEXT"],
];

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function Pill({ children, tone = "default" }) {
  const map = {
    default: "border-white/10 bg-white/[0.06] text-slate-200",
    soft: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    green: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
    amber: "border-amber-300/30 bg-amber-300/10 text-amber-100",
    purple: "border-violet-300/25 bg-violet-300/10 text-violet-100",
    blue: "border-blue-300/30 bg-blue-500/20 text-blue-100",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium", map[tone])}>{children}</span>;
}

function Card({ children, className = "" }) {
  return <div className={cx("rounded-[28px] border border-white/10 bg-white/[0.065] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl", className)}>{children}</div>;
}

function PrimaryButton({ children, icon: Icon = ArrowRight, className = "" }) {
  return <button className={cx("inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-500/20 transition hover:scale-[1.02]", className)}><Icon className="h-4 w-4" />{children}</button>;
}

function SecondaryButton({ children, icon: Icon = ArrowLeft, className = "" }) {
  return <button className={cx("inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-bold text-white transition hover:bg-white/[0.1]", className)}><Icon className="h-4 w-4" />{children}</button>;
}

function GhostButton({ children, icon: Icon = CircleHelp }) {
  return <button className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.06] hover:text-white"><Icon className="h-4 w-4" />{children}</button>;
}

function TopStepper({ current = 0 }) {
  return (
    <div className="hidden min-w-0 flex-1 items-center justify-center gap-2 xl:flex">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex min-w-[118px] items-center gap-2">
            <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold", index === current ? "border-blue-300 bg-blue-500 text-white shadow-lg shadow-blue-500/40" : index < current ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100" : "border-white/20 bg-white/[0.04] text-slate-400")}>{index + 1}</div>
            <div>
              <p className={cx("text-sm font-semibold", index === current ? "text-white" : "text-slate-300")}>{step.label}</p>
              <p className="text-[11px] text-slate-500">{step.helper}</p>
            </div>
          </div>
          {index < steps.length - 1 && <div className="h-px w-8 bg-white/15" />}
        </React.Fragment>
      ))}
    </div>
  );
}

function Stepper({ current = 0 }) {
  return (
    <Card className="mb-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Alur pembuatan video</p>
          <p className="mt-1 text-sm text-slate-400">Ikuti 7 langkah sederhana. Setelah satu tahap selesai, tombol berikutnya selalu muncul.</p>
        </div>
        <Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Otomatis dipandu</Pill>
      </div>
      <div className="mt-5 grid gap-2 md:grid-cols-4 xl:grid-cols-7">
        {steps.map((step, index) => (
          <div key={step.id} className={cx("rounded-2xl border p-3", index < current ? "border-emerald-300/25 bg-emerald-300/10" : index === current ? "border-blue-300/45 bg-blue-500/10" : "border-white/10 bg-black/20")}>
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
}

function AppShell({ active, setActive, children }) {
  return (
    <div className="min-h-screen bg-[#060816] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-15%] h-[560px] w-[560px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[20%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[35%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,56px_56px,56px_56px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-black/20 p-4 backdrop-blur-2xl lg:block">
          <button onClick={() => setActive("home")} className="mb-6 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-500 text-white"><Film className="h-6 w-6" /></div>
            <div><p className="text-sm font-semibold text-white">MASJAVAS AI</p><p className="text-xs text-slate-400">Video dibuat lebih mudah</p></div>
          </button>
          <div className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              return <button key={item.id} onClick={() => setActive(item.id)} className={cx("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition", active === item.id ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/[0.06] hover:text-white")}><Icon className="h-4 w-4" />{item.label}</button>;
            })}
          </div>
          <Card className="mt-5 p-4">
            <Pill tone="soft">Panduan pemula</Pill>
            <p className="mt-3 text-sm leading-6 text-slate-300">Mulai dari ide kasar. Referensi, storyboard, instruksi video, dan cek kesiapan akan disiapkan otomatis.</p>
          </Card>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/10 bg-[#060816]/80 px-4 py-4 backdrop-blur-2xl md:px-8">
            <button className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
            <TopStepper current={active === "references" ? 2 : active === "review" ? 3 : active === "scenes" ? 4 : active === "preview" ? 5 : active === "export" ? 6 : active === "presets" ? 1 : 0} />
            <div className="ml-auto flex items-center gap-3"><GhostButton icon={HelpCircle}>Bantuan</GhostButton><div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-sm font-bold">MJ</div></div>
          </header>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

function ScreenHeader({ badge, title, desc, cta, onNext, onBack, backLabel = "Kembali revisi" }) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-3 flex flex-wrap gap-2"><Pill tone="purple">{badge}</Pill><Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" /> Siap digunakan</Pill></div>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">{desc}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {onBack && <button onClick={onBack}><SecondaryButton>{backLabel}</SecondaryButton></button>}
        {onNext && <button onClick={onNext}><PrimaryButton>{cta}</PrimaryButton></button>}
      </div>
    </div>
  );
}

function HomeScreen({ go }) {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.065] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-10">
          <Pill tone="purple"><Sparkles className="h-3.5 w-3.5" /> Video sinematik, semudah menulis ide</Pill>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-white md:text-7xl">Ubah ide acak menjadi <span className="bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent">video siap download.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">Tulis ide bebas, pilih gaya preset, tambah referensi jika punya, lalu ikuti langkah yang sudah disiapkan. Semua proses teknis kami urus di belakang layar.</p>
          <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => go("start")}><PrimaryButton icon={Plus}>Mulai Proyek Baru</PrimaryButton></button><button onClick={() => go("idea")}><SecondaryButton icon={PenLine}>Saya Sudah Punya Ide</SecondaryButton></button></div>
          <BeginnerFlow />
        </div>
        <ProjectStarterCard go={go} />
      </section>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card><h3 className="mb-5 text-xl font-semibold">Contoh ide untuk memulai</h3><div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">{["Pintu Rahasia di Perpustakaan Tua", "Nelayan Kecil dan Laut yang Berubah", "Kota Masa Depan Tanpa Manusia", "Pesan Terakhir dari Planet Merah", "Penjaga Hutan yang Terakhir"].map((title, i) => <IdeaCard key={title} title={title} tone={["Misterius", "Inspiratif", "Sinematik", "Sains Fiksi", "Petualangan"][i]} />)}</div></Card>
        <Card><h3 className="mb-5 text-xl font-semibold">Kenapa mudah untuk pemula?</h3><div className="grid gap-4 sm:grid-cols-2">{["Preset tinggal pilih", "Langkah berikutnya selalu jelas", "Bisa kembali revisi", "Semua teknis di belakang layar"].map((x, i) => <FeatureMini key={x} title={x} icon={[Palette, ArrowRight, RefreshCcw, ShieldCheck][i]} />)}</div></Card>
      </section>
    </div>
  );
}

function ProjectStarterCard({ go }) {
  return <Card className="p-6"><h3 className="text-2xl font-semibold">Mulai dari ide sederhana</h3><p className="mt-2 text-sm leading-6 text-slate-400">Tulis ide bebas kamu di sini. Tidak perlu rapi, cukup ceritakan inti idenya saja.</p><textarea className="mt-5 min-h-[150px] w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-300/50" placeholder="Contoh: Seorang pemuda menemukan pintu rahasia di perpustakaan tua yang membawanya ke dunia lain..."/><PresetRow title="Platform" items={platformPresets} active={0}/><PresetRow title="Durasi" items={durationPresets} active={1}/><PresetRow title="Nuansa" items={tonePresets} active={0}/><div className="mt-5"><button onClick={() => go("idea")} className="w-full"><PrimaryButton className="w-full">Buat Proyek Sekarang</PrimaryButton></button></div><p className="mt-3 text-center text-xs text-slate-500">Aman dan privat. Hanya kamu yang bisa melihat proyek ini.</p></Card>;
}

function BeginnerFlow() {
  return <Card className="mt-8 bg-black/20"><h3 className="mb-5 text-lg font-semibold">Alur mudah untuk pemula</h3><div className="grid gap-4 md:grid-cols-4">{[["Tulis ide bebas", "Ceritakan idemu dengan bahasa sendiri.", PenLine], ["Pilih preset", "Pilih gaya, durasi, dan nuansa.", Layers3], ["Review hasil AI", "Kami ubah idemu jadi cerita dan adegan.", WandSparkles], ["Preview & download", "Tonton, revisi, lalu download.", Download]].map(([title, text, Icon], i) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-3 flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{i + 1}</div><Icon className="h-5 w-5 text-blue-200" /></div><p className="font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>)}</div></Card>;
}

function StartScreen({ go }) {
  return <div><ScreenHeader badge="Mulai" title="Pilih cara paling mudah untuk mulai" desc="User bisa mulai dari ide kosong, memakai contoh ide, atau melanjutkan proyek lama." cta="Tulis ide saya" onNext={() => go("idea")} /><div className="grid gap-6 lg:grid-cols-3"><ChoiceCard icon={PenLine} title="Tulis ide sendiri" text="Cocok jika sudah punya gambaran kasar." cta="Mulai menulis" onClick={() => go("idea")} /><ChoiceCard icon={Sparkles} title="Pakai contoh ide" text="Pilih contoh yang sudah disiapkan lalu ubah sedikit." cta="Lihat contoh" onClick={() => go("idea")} /><ChoiceCard icon={Library} title="Lanjutkan proyek" text="Buka draft atau project lama." cta="Buka proyek" onClick={() => go("library")} /></div></div>;
}

function IdeaScreen({ go }) {
  return <div><Stepper current={0}/><ScreenHeader badge="Langkah 1 dari 7" title="Tulis ide video seperti sedang bercerita" desc="Tidak perlu rapi. MASJAVAS akan membantu merapikan ide menjadi cerita yang enak ditonton." cta="Rapikan ide saya" onNext={() => go("presets")} /><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card><label><span className="mb-3 block text-sm font-semibold text-white">Ide video kamu</span><textarea className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-base leading-7 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/40" defaultValue={"Aku mau bikin video tentang Hari dan Wiwi yang dikejar di jalan hujan, lalu mereka masuk terowongan dan harus lolos dalam waktu sangat sempit."}/></label><div className="mt-5 flex flex-wrap gap-3"><button onClick={() => go("presets")}><PrimaryButton icon={WandSparkles}>Rapikan ide saya</PrimaryButton></button><SecondaryButton icon={Sparkles}>Berikan contoh ide</SecondaryButton></div></Card><Card><h3 className="text-xl font-semibold">Tips singkat</h3><div className="mt-5 space-y-3"><Tip text="Tulis topik utama, misalnya misteri, edukasi, kisah manusia, atau aksi."/><Tip text="Tulis suasana yang diinginkan: tenang, menegangkan, lucu, premium."/><Tip text="Tulis platform tujuan bila tahu: YouTube, TikTok, atau Reels."/><Tip text="Tidak perlu memikirkan prompt, scene, audio, atau rendering."/></div></Card></div></div>;
}

function PresetsScreen({ go }) {
  return <div><Stepper current={1}/><ScreenHeader badge="Langkah 2 dari 7" title="Pilih gaya video dengan preset siap pakai" desc="Semua opsi teknis disederhanakan menjadi pilihan yang mudah dipahami." cta="Lanjut tambah referensi" onBack={() => go("idea")} onNext={() => go("references")} backLabel="Kembali ubah ide" /><div className="space-y-6"><Section title="Gaya video"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[{ title: "Dokumenter Sinematik", desc: "Cocok untuk YouTube, sejarah, misteri, edukasi.", tag: "Paling aman" }, { title: "Shorts Cepat", desc: "Hook kuat, tempo cepat, cocok TikTok/Reels/Shorts.", tag: "Viral" }, { title: "Storytelling Emosional", desc: "Narasi hangat, dramatis ringan, cocok kisah manusia.", tag: "Human touch" }, { title: "Produk / Brand", desc: "Untuk promo produk, campaign, dan video komersial.", tag: "Bisnis" }].map((p, i) => <PresetCard key={p.title} {...p} active={i === 0}/>)}</div></Section><Section title="Platform"><ChipGrid items={platformPresets} active={0}/></Section><Section title="Panjang video"><ChipGrid items={durationPresets} active={1}/></Section><Section title="Suasana"><ChipGrid items={tonePresets} active={0}/></Section></div></div>;
}

function ReferencesScreen({ go }) {
  return <div><Stepper current={2}/><ScreenHeader badge="Langkah 3 dari 7" title="Referensi otomatis sudah disiapkan" desc="Berdasarkan Master Bible dan narasi, sistem menyiapkan referensi terbaik. User pemula cukup lanjut; upload manual hanya jika punya gambar sendiri." cta="Lanjut review cerita" onBack={() => go("presets")} onNext={() => go("review")} backLabel="Kembali pilih preset" /><div className="mb-5 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm text-slate-300"><Sparkles className="mr-2 inline h-4 w-4 text-blue-200" />Untuk pemula: <b className="text-white">cukup lanjut.</b> Kalau tidak punya gambar sendiri, biarkan sistem memakai referensi otomatis ini.</div><div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><Card><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">Referensi Otomatis <span className="text-slate-400">(sudah disiapkan)</span></h3><p className="mt-2 text-sm text-slate-400">Sistem memilih gambar paling pas untuk cerita kamu. Bebas dipakai atau diganti.</p></div><Pill tone="green">Semua siap</Pill></div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{referenceGroups.map((group) => <AutoReferenceGroup key={group.title} {...group}/>)}</div><div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">Referensi ini akan digunakan di semua adegan agar hasil video konsisten dan cerita terasa hidup.</div></Card><Card><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Punya gambar sendiri?</h3><Pill tone="purple">Opsional</Pill></div><p className="mt-2 text-sm leading-6 text-slate-400">Tidak wajib. Upload hanya jika kamu ingin mengganti atau menambahkan referensi.</p><div className="mt-5 rounded-3xl border border-dashed border-violet-300/40 bg-violet-400/5 p-8 text-center"><UploadCloud className="mx-auto h-12 w-12 text-violet-200"/><h4 className="mt-4 text-lg font-semibold">Upload gambar saya</h4><p className="mt-2 text-sm text-slate-400">JPG, PNG, WebP · maks. 20MB per file</p><div className="mt-5"><PrimaryButton icon={UploadCloud}>Pilih Gambar</PrimaryButton></div></div><div className="mt-5 space-y-3"><ManualSlot title="Ganti karakter utama" text="Pakai wajah atau sosok sendiri."/><ManualSlot title="Tambah lokasi asli" text="Tambahkan lokasi yang ingin dipakai."/><ManualSlot title="Tambah style / moodboard" text="Tambahkan gaya visual atau mood."/></div></Card></div></div>;
}

function ReviewScreen({ go }) {
  return <div><Stepper current={3}/><ScreenHeader badge="Langkah 4 dari 7" title="Review cerita yang sudah dirapikan AI" desc="Lihat versi bahasa manusia: pembuka, alur, dan narasi awal. Jika cocok, lanjut. Jika belum, revisi dulu." cta="Saya setuju, cek adegan" onBack={() => go("references")} onNext={() => go("scenes")} backLabel="Kembali ke referensi" /><div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"><Card><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Draft cerita</h3><Pill tone="green">Mudah dibaca</Pill></div><div className="mt-5 space-y-4 text-sm leading-7 text-slate-300"><p><b className="text-white">Pembuka:</b> Hari dan Wiwi masuk ke jalan basah saat mobil pengejar semakin dekat.</p><p><b className="text-white">Inti cerita:</b> Mereka masuk terowongan, mengambil risiko di celah sempit, dan berusaha lolos dari tabrakan.</p><p><b className="text-white">Akhir:</b> Mereka berhasil keluar untuk sementara, tetapi bahaya masih mengikuti di belakang.</p></div><div className="mt-5 flex flex-wrap gap-3"><SecondaryButton icon={RefreshCcw}>Minta AI revisi</SecondaryButton><SecondaryButton icon={Mic2}>Ubah gaya narasi</SecondaryButton></div></Card><Card><h3 className="text-xl font-semibold">Checklist sederhana</h3><div className="mt-5 space-y-3"><Check text="Cerita sudah punya pembuka menarik"/><Check text="Alur tidak membingungkan"/><Check text="Nada video sesuai preset"/><Check text="Siap dibuat menjadi adegan"/></div></Card></div></div>;
}

function ScenesScreen({ go }) {
  return <div><Stepper current={4}/><SceneComposer onBack={() => go("review")} onNext={() => go("preview")} /></div>;
}

function SceneComposer({ onBack, onNext }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4"><button onClick={onBack}><SecondaryButton icon={ArrowLeft}>Kembali</SecondaryButton></button><div><h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">Scene 05 — Split Second Escape</h1><p className="mt-1 text-sm text-emerald-300"><CheckCircle2 className="mr-1 inline h-4 w-4" />Adegan siap direview</p></div></div>
        <div className="flex flex-wrap gap-3"><SecondaryButton icon={ImageIcon}>Generate Storyboard</SecondaryButton><PrimaryButton icon={Video}>Generate Video</PrimaryButton><button onClick={onNext}><PrimaryButton icon={ArrowRight}>Lanjut Scene Berikutnya</PrimaryButton></button></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard icon={Clapperboard} label="Judul Adegan" value="Split Second Escape" />
        <SummaryCard icon={Mic2} label="Narasi Singkat" value="Hari & Wiwi hanya punya waktu beberapa detik untuk lolos dari terowongan." />
        <SummaryCard icon={Star} label="Emosi Utama" value="Tegang, panik, berjuang" />
        <SummaryCard icon={Clock3} label="Durasi Adegan" value="10 detik" />
        <SummaryCard icon={ShieldCheck} label="Tujuan Adegan" value="Menunjukkan bahaya yang semakin dekat dan keberanian mereka." />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[320px_1fr_300px]">
        <ReferenceColumn />
        <div className="space-y-5"><StoryboardPanel /><div className="grid gap-5 xl:grid-cols-[1fr_420px]"><VideoInstructionPanel /><SceneOutputPanel /></div></div>
        <RightGeneratePanel />
      </div>
    </div>
  );
}

function ReferenceColumn() {
  return <Card><h3 className="text-xl font-semibold">Referensi Gambar</h3><p className="mt-1 text-sm text-slate-400">Otomatis diambil dari Master Bible & narasi.</p><div className="mt-4 flex flex-wrap gap-2">{["Semua", "Karakter utama", "Lokasi", "Objek penting", "Style visual", "Dari scene sebelumnya"].map((x, i) => <button key={x} className={cx("rounded-xl border px-3 py-2 text-xs font-semibold", i === 0 ? "border-blue-300/40 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>{x}</button>)}</div><div className="mt-4 grid grid-cols-3 gap-3">{Array.from({ length: 9 }).map((_, i) => <ReferenceThumb key={i} index={i}/>)}</div><div className="mt-5 rounded-3xl border border-dashed border-white/20 bg-black/20 p-5 text-center"><UploadCloud className="mx-auto h-8 w-8 text-violet-200"/><p className="mt-3 text-sm font-semibold text-white">Upload gambar tambahan</p><p className="mt-1 text-xs text-slate-500">Opsional · PNG, JPG, WebP</p><button className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">Pilih Gambar</button></div><p className="mt-4 text-xs leading-5 text-slate-500">Tips: Tambahkan referensi jika ingin wajah, lokasi, atau style lebih akurat.</p></Card>;
}

function StoryboardPanel() {
  return <Card><div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">Storyboard Otomatis</h3><p className="mt-1 text-sm text-slate-400">Dihasilkan otomatis dari narasi, referensi, dan gaya visual kamu.</p></div><SecondaryButton icon={Eye}>Buka di layar penuh</SecondaryButton></div><div className="rounded-3xl border border-white/20 bg-zinc-100 p-3 text-zinc-950 shadow-inner"><div className="mb-2 grid grid-cols-[1.1fr_1fr_0.8fr_1fr_0.8fr] gap-px overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900 text-xs"><div className="bg-zinc-100 p-2 font-black tracking-widest">STORYBOARD</div><div className="bg-zinc-100 p-2"><b>SCENE:</b> 05 — SPLIT SECOND ESCAPE</div><div className="bg-zinc-100 p-2"><b>DURASI:</b> 10 DETIK</div><div className="bg-zinc-100 p-2"><b>LOKASI:</b> TEROWONGAN / JALAN BASAH</div><div className="bg-zinc-100 p-2"><b>WAKTU:</b> MALAM / HUJAN</div></div><p className="mb-2 rounded-lg border border-zinc-900 bg-white p-2 text-xs"><b>RINGKASAN ADEGAN:</b> Hari & Wiwi harus lolos dari terowongan sebelum pengejar menabrak mereka.</p><div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">{storyboardPanels.map((panel, i) => <StoryboardCell key={i} index={i + 1} data={panel}/>)}</div></div><p className="mt-3 text-xs text-slate-500">Storyboard adalah panduan visual. Detail bisa disesuaikan sebelum generate video.</p></Card>;
}

function VideoInstructionPanel() {
  return <Card><h3 className="text-xl font-semibold">Instruksi Video</h3><p className="mt-1 text-sm text-slate-400">Berikan arahan sederhana untuk hasil video yang kamu inginkan.</p><div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">Buat video aksi sinematik dengan hujan deras, jalanan basah, dan terowongan gelap. Fokus pada kejar-kejaran intens, percikan air, refleksi cahaya mobil, dan ekspresi tegang. Jaga ritme cepat dengan potongan dinamis.<div className="mt-3 text-right text-xs text-slate-500">312 / 1000</div></div><div className="mt-4 flex flex-wrap gap-2"><MiniButton>Buat lebih sinematik</MiniButton><MiniButton>Buat lebih dramatis</MiniButton><MiniButton>Lebih realistis</MiniButton><MiniButton>Reset otomatis</MiniButton></div></Card>;
}

function SceneOutputPanel() {
  return <Card><h3 className="text-xl font-semibold">Hasil Scene</h3><p className="mt-1 text-sm text-slate-400">Preview hasil video untuk scene ini.</p><div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]"><div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.25),transparent_16%),radial-gradient(circle_at_70%_60%,rgba(34,211,238,0.22),transparent_25%),linear-gradient(135deg,#0f172a,#020617)]"><PlayCircle className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/90"/><span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs">0:10</span></div><div className="flex flex-col gap-2"><SecondaryButton icon={Eye}>Preview</SecondaryButton><SecondaryButton icon={RefreshCcw}>Generate ulang</SecondaryButton><PrimaryButton icon={CheckCircle2}>Gunakan hasil ini</PrimaryButton></div></div></Card>;
}

function RightGeneratePanel() {
  return <div className="space-y-5"><Card><h3 className="text-xl font-semibold">Pengaturan Video</h3><SettingGroup title="Mode" items={["Video", "Agent (Beta)"]} active={0}/><SettingGroup title="Durasi Video" items={["10s", "15s", "20s", "30s"]} active={0}/><SettingGroup title="Kualitas" items={["Draft", "Standar", "Tinggi"]} active={2}/><div className="mt-5"><p className="mb-2 text-sm font-semibold text-white">Rasio Aspek</p><div className="space-y-2">{["2:3  Tall", "3:2  Wide", "1:1  Square", "9:16  Vertical", "16:9  Widescreen"].map((x, i) => <button key={x} className={cx("flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm", i === 4 ? "border-blue-300/40 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}><span>{x}</span>{i === 4 && <CheckCircle2 className="h-4 w-4"/>}</button>)}</div></div></Card><Card><h3 className="text-xl font-semibold">Cek Sebelum Generate</h3><p className="mt-1 text-sm text-slate-400">Pastikan semua siap untuk hasil terbaik.</p><div className="mt-5 space-y-3">{["Narasi siap", "Referensi lengkap", "Storyboard siap", "Instruksi video siap", "Rasio dipilih", "Kualitas dipilih"].map((x) => <Check key={x} text={x}/>)}</div><p className="mt-5 text-sm font-semibold text-emerald-300">Semua siap! Kamu bisa generate video.</p></Card></div>;
}

function PreviewScreen({ go }) {
  return <div><Stepper current={5}/><ScreenHeader badge="Langkah 6 dari 7" title="Tonton preview, lalu pilih lanjut atau revisi" desc="Yang terlihat hanya preview, catatan kualitas, dan tombol tindakan jelas." cta="Saya suka, siapkan download" onBack={() => go("scenes")} onNext={() => go("export")} backLabel="Kembali ubah adegan" /><div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]"><Card><div className="aspect-video rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_40%_35%,rgba(34,211,238,0.32),transparent_24%),radial-gradient(circle_at_70%_68%,rgba(168,85,247,0.24),transparent_28%),linear-gradient(135deg,#0f172a,#020617)] p-5"><div className="flex h-full flex-col justify-between"><Pill tone="soft">Preview video</Pill><PlayCircle className="mx-auto h-16 w-16 text-white/85"/><div className="flex justify-between text-xs text-slate-400"><span>00:00</span><span>02:00</span></div></div></div><div className="mt-5 flex flex-wrap gap-3"><PrimaryButton icon={PlayCircle}>Putar preview</PrimaryButton><SecondaryButton icon={RefreshCcw}>Revisi bagian tertentu</SecondaryButton></div></Card><Card><h3 className="text-xl font-semibold">Hasil pemeriksaan sederhana</h3><div className="mt-5 space-y-3"><Quality label="Narasi enak didengar"/><Quality label="Karakter konsisten"/><Quality label="Subtitle sinkron"/><Quality label="Durasi sesuai"/></div></Card></div></div>;
}

function ExportScreen({ go }) {
  return <div><Stepper current={6}/><ScreenHeader badge="Langkah 7 dari 7" title="Video siap diunduh" desc="Semua pengecekan selesai di balik layar. User tinggal memilih format hasil." cta="Download MP4" onBack={() => go("preview")} onNext={() => go("home")} backLabel="Kembali ke preview" /><div className="grid gap-6 xl:grid-cols-3"><DownloadCard icon={Video} title="Video MP4" text="File final siap upload." cta="Download MP4"/><DownloadCard icon={FileText} title="Subtitle" text="SRT/VTT untuk upload manual." cta="Download subtitle"/><DownloadCard icon={FolderOpen} title="Paket edit" text="Folder aset untuk editor video." cta="Download paket"/></div></div>;
}

function LibraryScreen() {
  return <div><ScreenHeader badge="Proyek Saya" title="Semua project mudah ditemukan dan dilanjutkan" desc="Status dibuat sederhana: Draft, Perlu review, Preview siap, atau Sudah selesai." cta="Buat proyek baru" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{["Misteri Kota Laut", "Iklan Kopi Premium", "Kisah Penemu Muda", "Shorts Fakta Unik", "Dokumenter Gunung", "Brand Launch"].map((x, i) => <ProjectCard key={x} title={x} status={i % 3 === 0 ? "Preview siap" : i % 3 === 1 ? "Perlu review" : "Selesai"}/>)}</div></div>;
}

function AssistantScreen() {
  return <div><ScreenHeader badge="Bantuan AI" title="Asisten menjawab dengan bahasa sederhana" desc="Asisten memberi saran berikutnya, menjelaskan masalah tanpa istilah teknis, dan menawarkan tombol tindakan." cta="Tanya asisten" /><div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><Card><h3 className="text-xl font-semibold">Saran saat ini</h3><div className="mt-5 space-y-3"><Tip text="Ide kamu sudah cukup. Lanjut pilih gaya video."/><Tip text="Referensi otomatis sudah siap, upload manual bisa dilewati."/><Tip text="Setiap scene punya panel lengkap sebelum generate video."/></div></Card><Card><h3 className="text-xl font-semibold">Chat bantuan</h3><div className="mt-5 space-y-4"><Chat who="AI" text="Kamu tidak perlu mengatur bagian teknis. Pilih saja gaya video, review referensi, lalu cek setiap adegan."/><Chat who="User" text="Saya bingung di bagian referensi."/><Chat who="AI" text="Kalau belum punya gambar sendiri, cukup klik lanjut. Sistem sudah membuat referensi otomatis dari cerita kamu."/><PrimaryButton icon={ArrowRight}>Pakai saran AI dan lanjut</PrimaryButton></div></Card></div></div>;
}

function SettingsScreen() {
  return <div><ScreenHeader badge="Pengaturan" title="Pengaturan dibuat sederhana" desc="Provider, validasi, dan proses teknis tetap di belakang layar." cta="Simpan pengaturan" /><div className="grid gap-6 xl:grid-cols-3"><SettingsCard title="Akun" items={["Nama workspace", "Email login", "Bahasa aplikasi"]}/><SettingsCard title="Preferensi Video" items={["Format default", "Gaya narasi favorit", "Preset sering dipakai"]}/><SettingsCard title="Paket" items={["Kuota video", "Riwayat download", "Upgrade paket"]}/></div></div>;
}

function PresetRow({ title, items, active }) { return <div className="mt-5"><p className="mb-2 text-sm font-semibold text-white">{title}</p><div className="flex flex-wrap gap-2">{items.map((item, i) => <button key={item} className={cx("rounded-xl border px-3 py-2 text-xs font-semibold", i === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>{item}</button>)}</div></div>; }
function IdeaCard({ title, tone }) { return <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><div className="aspect-[4/3] bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.2),transparent_22%),linear-gradient(135deg,#1e293b,#020617)]"/><div className="p-3"><p className="text-sm font-semibold text-white">{title}</p><Pill tone="default">{tone}</Pill></div></div>; }
function FeatureMini({ title, icon: Icon }) { return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><Icon className="mb-3 h-6 w-6 text-blue-200"/><p className="font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-slate-400">Fokus ke ide, sistem membantu sisanya.</p></div>; }
function ChoiceCard({ icon: Icon, title, text, cta, onClick }) { return <Card><Icon className="h-8 w-8 text-cyan-200"/><h3 className="mt-5 text-2xl font-semibold text-white">{title}</h3><p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-400">{text}</p><button className="mt-6" onClick={onClick}><PrimaryButton>{cta}</PrimaryButton></button></Card>; }
function Tip({ text }) { return <div className="flex gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-200"/><p className="text-sm leading-6 text-slate-300">{text}</p></div>; }
function Section({ title, children }) { return <Card><h3 className="mb-4 text-xl font-semibold text-white">{title}</h3>{children}</Card>; }
function PresetCard({ title, desc, tag, active }) { return <div className={cx("rounded-3xl border p-5 transition", active ? "border-blue-300/45 bg-blue-500/10" : "border-white/10 bg-black/20 hover:bg-white/[0.05]")}><div className="mb-4 flex items-center justify-between"><Pill tone={active ? "soft" : "default"}>{tag}</Pill>{active && <CheckCircle2 className="h-5 w-5 text-blue-200"/>}</div><h4 className="text-lg font-semibold text-white">{title}</h4><p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p></div>; }
function ChipGrid({ items, active = 0 }) { return <div className="flex flex-wrap gap-3">{items.map((item, i) => <button key={item} className={cx("rounded-2xl border px-4 py-3 text-sm font-semibold transition", i === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]")}>{item}</button>)}</div>; }
function AutoReferenceGroup({ title, meta, items }) { return <div className="rounded-3xl border border-white/10 bg-black/20 p-4"><div className="mb-3 flex items-center justify-between"><div><p className="font-semibold text-white">{title}</p><p className="text-xs text-slate-500">{meta}</p></div><CheckCircle2 className="h-5 w-5 text-emerald-200"/></div><div className="grid grid-cols-3 gap-2">{items.map((x, i) => <div key={x} className="aspect-[3/4] rounded-xl border border-white/10 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.25),transparent_25%),linear-gradient(135deg,#1e293b,#020617)] p-2"><span className="rounded-lg bg-black/40 px-2 py-1 text-[10px] text-slate-300">{x}</span></div>)}</div></div>; }
function ManualSlot({ title, text }) { return <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4"><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-xs text-slate-500">{text}</p></div><button className="rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]">+ Gambar</button></div>; }
function SummaryCard({ icon: Icon, label, value }) { return <Card className="p-4"><div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200"><Icon className="h-5 w-5"/></div><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 text-sm leading-5 text-slate-200">{value}</p></div></div></Card>; }
function ReferenceThumb({ index }) { return <div className="aspect-square rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.2),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.25),transparent_26%),linear-gradient(135deg,#111827,#020617)] p-2"><span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white">Auto</span></div>; }
function StoryboardCell({ index, data }) { return <div className="overflow-hidden rounded-lg border border-zinc-900 bg-white text-[9px]"><div className="relative aspect-[16/9] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.35),transparent_18%),radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.35),transparent_25%),linear-gradient(135deg,#111,#555,#222)]"><span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center bg-black text-xs font-bold text-white">{index}</span></div><table className="w-full border-t border-zinc-900"><tbody>{[["WAKTU", data[0]], ["SHOT", data[1]], ["AKSI", data[2]], ["DIALOG", data[3]], ["SFX", data[4]], ["TRANSISI", data[5]]].map(([k, v]) => <tr key={k} className="border-b border-zinc-300"><td className="w-16 border-r border-zinc-300 px-1 py-1 font-bold">{k}</td><td className="px-1 py-1 italic">{v}</td></tr>)}</tbody></table></div>; }
function MiniButton({ children }) { return <button className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/[0.1]">{children}</button>; }
function SettingGroup({ title, items, active }) { return <div className="mt-5"><p className="mb-2 text-sm font-semibold text-white">{title}</p><div className="flex flex-wrap gap-2">{items.map((item, i) => <button key={item} className={cx("rounded-xl border px-3 py-2 text-xs font-semibold", i === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>{item}</button>)}</div></div>; }
function Check({ text }) { return <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"><CheckCircle2 className="h-5 w-5 text-emerald-200"/><p className="text-sm text-slate-300">{text}</p></div>; }
function Quality({ label }) { return <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><span className="text-sm text-slate-300">{label}</span><Pill tone="green"><CheckCircle2 className="h-3.5 w-3.5" />Bagus</Pill></div>; }
function DownloadCard({ icon: Icon, title, text, cta }) { return <Card><Icon className="h-8 w-8 text-cyan-200"/><h3 className="mt-5 text-xl font-semibold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p><div className="mt-6"><PrimaryButton icon={Download}>{cta}</PrimaryButton></div></Card>; }
function ProjectCard({ title, status }) { return <Card><div className="mb-4 aspect-video rounded-3xl bg-[radial-gradient(circle_at_40%_35%,rgba(34,211,238,0.22),transparent_24%),linear-gradient(135deg,#0f172a,#020617)]"/><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-white">{title}</h3><Pill tone={status === "Selesai" ? "green" : status === "Preview siap" ? "soft" : "amber"}>{status}</Pill></div><div className="mt-5 flex gap-3"><PrimaryButton icon={ArrowRight}>Buka</PrimaryButton><SecondaryButton icon={RefreshCcw}>Duplikat</SecondaryButton></div></Card>; }
function Chat({ who, text }) { return <div className="rounded-2xl border border-white/10 bg-black/20 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{who}</p><p className="text-sm leading-6 text-slate-300">{text}</p></div>; }
function SettingsCard({ title, items }) { return <Card><h3 className="text-xl font-semibold text-white">{title}</h3><div className="mt-5 space-y-3">{items.map(i => <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4"><span className="text-sm text-slate-300">{i}</span><ChevronRight className="h-4 w-4 text-slate-500"/></div>)}</div></Card>; }

export default function MasjavasRevisedBeginnerMockup() {
  const [active, setActive] = useState("home");
  const go = (id) => setActive(id);
  const screens = useMemo(() => ({
    home: <HomeScreen go={go} />,
    start: <StartScreen go={go} />,
    idea: <IdeaScreen go={go} />,
    presets: <PresetsScreen go={go} />,
    references: <ReferencesScreen go={go} />,
    review: <ReviewScreen go={go} />,
    scenes: <ScenesScreen go={go} />,
    preview: <PreviewScreen go={go} />,
    export: <ExportScreen go={go} />,
    library: <LibraryScreen />,
    assistant: <AssistantScreen />,
    settings: <SettingsScreen />,
  }), []);
  return <AppShell active={active} setActive={setActive}>{screens[active]}</AppShell>;
}

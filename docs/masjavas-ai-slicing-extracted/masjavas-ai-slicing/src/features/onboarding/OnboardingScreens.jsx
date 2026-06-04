import { Library, Mic2, PenLine, RefreshCcw, Sparkles, WandSparkles } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Stepper } from "../../components/navigation/Stepper";
import { ChipGrid, Tip, Check } from "../../components/shared/PrimitiveBlocks";
import { platformPresets, durationPresets, tonePresets, presetCards } from "../../data/appData";
import { cn } from "../../utils";

function ChoiceCard({ icon: Icon, title, text, cta, onClick }) {
  return (
    <Card>
      <Icon className="h-8 w-8 text-cyan-200" />
      <h3 className="mt-5 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-6"><PrimaryButton onClick={onClick}>{cta}</PrimaryButton></div>
    </Card>
  );
}

function PresetCard({ title, desc, tag, active }) {
  return (
    <div className={cn("rounded-3xl border p-5 transition", active ? "border-blue-300/45 bg-blue-500/10" : "border-white/10 bg-black/20 hover:bg-white/[0.05]")}>
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-200">{tag}</span>
      </div>
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
}

function Section({ title, children }) {
  return <Card><h3 className="mb-4 text-xl font-semibold text-white">{title}</h3>{children}</Card>;
}

export function StartScreen({ go }) {
  return (
    <div>
      <ScreenHeader badge="Mulai" title="Pilih cara paling mudah untuk mulai" desc="User bisa mulai dari ide kosong, memakai contoh ide, atau melanjutkan proyek lama." cta="Tulis ide saya" onNext={() => go("idea")} />
      <div className="grid gap-6 lg:grid-cols-3">
        <ChoiceCard icon={PenLine} title="Tulis ide sendiri" text="Cocok jika sudah punya gambaran kasar." cta="Mulai menulis" onClick={() => go("idea")} />
        <ChoiceCard icon={Sparkles} title="Pakai contoh ide" text="Pilih contoh yang sudah disiapkan lalu ubah sedikit." cta="Lihat contoh" onClick={() => go("idea")} />
        <ChoiceCard icon={Library} title="Lanjutkan proyek" text="Buka draft atau project lama." cta="Buka proyek" onClick={() => go("library")} />
      </div>
    </div>
  );
}

export function IdeaScreen({ go }) {
  return (
    <div>
      <Stepper current={0} />
      <ScreenHeader badge="Langkah 1 dari 7" title="Tulis ide video seperti sedang bercerita" desc="Tidak perlu rapi. MASJAVAS akan membantu merapikan ide menjadi cerita yang enak ditonton." cta="Rapikan ide saya" onNext={() => go("presets")} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <label>
            <span className="mb-3 block text-sm font-semibold text-white">Ide video kamu</span>
            <textarea
              className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-base leading-7 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-300/40"
              defaultValue="Aku mau bikin video tentang Hari dan Wiwi yang dikejar di jalan hujan, lalu mereka masuk terowongan dan harus lolos dalam waktu sangat sempit."
            />
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton icon={WandSparkles} onClick={() => go("presets")}>Rapikan ide saya</PrimaryButton>
            <SecondaryButton icon={Sparkles}>Berikan contoh ide</SecondaryButton>
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Tips singkat</h3>
          <div className="mt-5 space-y-3">
            <Tip text="Tulis topik utama, misalnya misteri, edukasi, kisah manusia, atau aksi." />
            <Tip text="Tulis suasana yang diinginkan: tenang, menegangkan, lucu, premium." />
            <Tip text="Tulis platform tujuan bila tahu: YouTube, TikTok, atau Reels." />
            <Tip text="Tidak perlu memikirkan prompt, scene, audio, atau rendering." />
          </div>
        </Card>
      </div>
    </div>
  );
}

export function PresetsScreen({ go }) {
  return (
    <div>
      <Stepper current={1} />
      <ScreenHeader badge="Langkah 2 dari 7" title="Pilih gaya video dengan preset siap pakai" desc="Semua opsi teknis disederhanakan menjadi pilihan yang mudah dipahami." cta="Lanjut tambah referensi" onBack={() => go("idea")} onNext={() => go("references")} backLabel="Kembali ubah ide" />
      <div className="space-y-6">
        <Section title="Gaya video">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {presetCards.map((preset, index) => <PresetCard key={preset.title} {...preset} active={index === 0} />)}
          </div>
        </Section>
        <Section title="Platform"><ChipGrid items={platformPresets} active={0} /></Section>
        <Section title="Panjang video"><ChipGrid items={durationPresets} active={1} /></Section>
        <Section title="Suasana"><ChipGrid items={tonePresets} active={0} /></Section>
      </div>
    </div>
  );
}

export function ReviewScreen({ go }) {
  return (
    <div>
      <Stepper current={3} />
      <ScreenHeader badge="Langkah 4 dari 7" title="Review cerita yang sudah dirapikan AI" desc="Lihat versi bahasa manusia: pembuka, alur, dan narasi awal. Jika cocok, lanjut. Jika belum, revisi dulu." cta="Saya setuju, cek adegan" onBack={() => go("references")} onNext={() => go("scenes")} backLabel="Kembali ke referensi" />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Draft cerita</h3><span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">Mudah dibaca</span></div>
          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <p><b className="text-white">Pembuka:</b> Hari dan Wiwi masuk ke jalan basah saat mobil pengejar semakin dekat.</p>
            <p><b className="text-white">Inti cerita:</b> Mereka masuk terowongan, mengambil risiko di celah sempit, dan berusaha lolos dari tabrakan.</p>
            <p><b className="text-white">Akhir:</b> Mereka berhasil keluar untuk sementara, tetapi bahaya masih mengikuti di belakang.</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3"><SecondaryButton icon={RefreshCcw}>Minta AI revisi</SecondaryButton><SecondaryButton icon={Mic2}>Ubah gaya narasi</SecondaryButton></div>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Checklist sederhana</h3>
          <div className="mt-5 space-y-3">
            <Check text="Cerita sudah punya pembuka menarik" />
            <Check text="Alur tidak membingungkan" />
            <Check text="Nada video sesuai preset" />
            <Check text="Siap dibuat menjadi adegan" />
          </div>
        </Card>
      </div>
    </div>
  );
}

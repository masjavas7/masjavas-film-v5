import { CheckCircle2, Sparkles, UploadCloud } from "lucide-react";
import { Card, Pill } from "../../components/ui/Card";
import { PrimaryButton } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Stepper } from "../../components/navigation/Stepper";
import { referenceGroups } from "../../data/appData";

function AutoReferenceGroup({ title, meta, items }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="text-xs text-slate-500">{meta}</p>
        </div>
        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item}
            className="aspect-[3/4] rounded-xl border border-white/10 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.18),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(59,130,246,0.25),transparent_25%),linear-gradient(135deg,#1e293b,#020617)] p-2"
          >
            <span className="rounded-lg bg-black/40 px-2 py-1 text-[10px] text-slate-300">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ManualSlot({ title, text }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
      </div>
      <button className="rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1]">+ Gambar</button>
    </div>
  );
}

export function ReferencesScreen({ go }) {
  return (
    <div>
      <Stepper current={2} />
      <ScreenHeader
        badge="Langkah 3 dari 7"
        title="Referensi otomatis sudah disiapkan"
        desc="Berdasarkan Master Bible dan narasi, sistem menyiapkan referensi terbaik. User pemula cukup lanjut; upload manual hanya jika punya gambar sendiri."
        cta="Lanjut review cerita"
        onBack={() => go("presets")}
        onNext={() => go("review")}
        backLabel="Kembali pilih preset"
      />

      <div className="mb-5 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm text-slate-300">
        <Sparkles className="mr-2 inline h-4 w-4 text-blue-200" />
        Untuk pemula: <b className="text-white">cukup lanjut.</b> Kalau tidak punya gambar sendiri, biarkan sistem memakai referensi otomatis ini.
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold">Referensi Otomatis <span className="text-slate-400">(sudah disiapkan)</span></h3>
              <p className="mt-2 text-sm text-slate-400">Sistem memilih gambar paling pas untuk cerita kamu. Bebas dipakai atau diganti.</p>
            </div>
            <Pill tone="green">Semua siap</Pill>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {referenceGroups.map((group) => <AutoReferenceGroup key={group.title} {...group} />)}
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
            Referensi ini akan digunakan di semua adegan agar hasil video konsisten dan cerita terasa hidup.
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3"><h3 className="text-xl font-semibold">Punya gambar sendiri?</h3><Pill tone="purple">Opsional</Pill></div>
          <p className="mt-2 text-sm leading-6 text-slate-400">Tidak wajib. Upload hanya jika kamu ingin mengganti atau menambahkan referensi.</p>

          <div className="mt-5 rounded-3xl border border-dashed border-violet-300/40 bg-violet-400/5 p-8 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-violet-200" />
            <h4 className="mt-4 text-lg font-semibold">Upload gambar saya</h4>
            <p className="mt-2 text-sm text-slate-400">JPG, PNG, WebP · maks. 20MB per file</p>
            <div className="mt-5"><PrimaryButton icon={UploadCloud}>Pilih Gambar</PrimaryButton></div>
          </div>

          <div className="mt-5 space-y-3">
            <ManualSlot title="Ganti karakter utama" text="Pakai wajah atau sosok sendiri." />
            <ManualSlot title="Tambah lokasi asli" text="Tambahkan lokasi yang ingin dipakai." />
            <ManualSlot title="Tambah style / moodboard" text="Tambahkan gaya visual atau mood." />
          </div>
        </Card>
      </div>
    </div>
  );
}

import {
  ArrowLeft, ArrowRight, CheckCircle2, Clapperboard, Clock3, Eye, Image as ImageIcon,
  Mic2, PlayCircle, RefreshCcw, ShieldCheck, Star, UploadCloud, Video
} from "lucide-react";
import { Card } from "../../components/ui/Card";
import { PrimaryButton, SecondaryButton, MiniButton } from "../../components/ui/Button";
import { Stepper } from "../../components/navigation/Stepper";
import { Check } from "../../components/shared/PrimitiveBlocks";
import { storyboardPanels } from "../../data/appData";
import { cn } from "../../utils";

function SummaryCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-200"><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-sm leading-5 text-slate-200">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function ReferenceThumb() {
  return (
    <div className="aspect-square rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.2),transparent_22%),radial-gradient(circle_at_70%_70%,rgba(34,211,238,0.25),transparent_26%),linear-gradient(135deg,#111827,#020617)] p-2">
      <span className="rounded-lg bg-black/50 px-2 py-1 text-[10px] text-white">Auto</span>
    </div>
  );
}

function ReferenceColumn() {
  return (
    <Card>
      <h3 className="text-xl font-semibold">Referensi Gambar</h3>
      <p className="mt-1 text-sm text-slate-400">Otomatis diambil dari Master Bible & narasi.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Semua", "Karakter utama", "Lokasi", "Objek penting", "Style visual", "Dari scene sebelumnya"].map((item, index) => (
          <button key={item} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold", index === 0 ? "border-blue-300/40 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>{item}</button>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">{Array.from({ length: 9 }).map((_, index) => <ReferenceThumb key={index} />)}</div>
      <div className="mt-5 rounded-3xl border border-dashed border-white/20 bg-black/20 p-5 text-center">
        <UploadCloud className="mx-auto h-8 w-8 text-violet-200" />
        <p className="mt-3 text-sm font-semibold text-white">Upload gambar tambahan</p>
        <p className="mt-1 text-xs text-slate-500">Opsional · PNG, JPG, WebP</p>
        <button className="mt-4 rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-bold text-white">Pilih Gambar</button>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">Tips: Tambahkan referensi jika ingin wajah, lokasi, atau style lebih akurat.</p>
    </Card>
  );
}

function StoryboardCell({ index, data }) {
  const rows = [["WAKTU", data[0]], ["SHOT", data[1]], ["AKSI", data[2]], ["DIALOG", data[3]], ["SFX", data[4]], ["TRANSISI", data[5]]];

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-900 bg-white text-[9px]">
      <div className="relative aspect-[16/9] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.35),transparent_18%),radial-gradient(circle_at_70%_80%,rgba(0,0,0,0.35),transparent_25%),linear-gradient(135deg,#111,#555,#222)]">
        <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center bg-black text-xs font-bold text-white">{index}</span>
      </div>
      <table className="w-full border-t border-zinc-900">
        <tbody>
          {rows.map(([key, value]) => (
            <tr key={key} className="border-b border-zinc-300">
              <td className="w-16 border-r border-zinc-300 px-1 py-1 font-bold">{key}</td>
              <td className="px-1 py-1 italic">{value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StoryboardPanel() {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Storyboard Otomatis</h3>
          <p className="mt-1 text-sm text-slate-400">Dihasilkan otomatis dari narasi, referensi, dan gaya visual kamu.</p>
        </div>
        <SecondaryButton icon={Eye}>Buka di layar penuh</SecondaryButton>
      </div>

      <div className="rounded-3xl border border-white/20 bg-zinc-100 p-3 text-zinc-950 shadow-inner">
        <div className="mb-2 grid grid-cols-[1.1fr_1fr_0.8fr_1fr_0.8fr] gap-px overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900 text-xs">
          <div className="bg-zinc-100 p-2 font-black tracking-widest">STORYBOARD</div>
          <div className="bg-zinc-100 p-2"><b>SCENE:</b> 05 — SPLIT SECOND ESCAPE</div>
          <div className="bg-zinc-100 p-2"><b>DURASI:</b> 10 DETIK</div>
          <div className="bg-zinc-100 p-2"><b>LOKASI:</b> TEROWONGAN / JALAN BASAH</div>
          <div className="bg-zinc-100 p-2"><b>WAKTU:</b> MALAM / HUJAN</div>
        </div>
        <p className="mb-2 rounded-lg border border-zinc-900 bg-white p-2 text-xs"><b>RINGKASAN ADEGAN:</b> Hari & Wiwi harus lolos dari terowongan sebelum pengejar menabrak mereka.</p>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {storyboardPanels.map((panel, index) => <StoryboardCell key={index} index={index + 1} data={panel} />)}
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Storyboard adalah panduan visual. Detail bisa disesuaikan sebelum generate video.</p>
    </Card>
  );
}

function VideoInstructionPanel() {
  return (
    <Card>
      <h3 className="text-xl font-semibold">Instruksi Video</h3>
      <p className="mt-1 text-sm text-slate-400">Berikan arahan sederhana untuk hasil video yang kamu inginkan.</p>
      <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-300">
        Buat video aksi sinematik dengan hujan deras, jalanan basah, dan terowongan gelap. Fokus pada kejar-kejaran intens, percikan air, refleksi cahaya mobil, dan ekspresi tegang. Jaga ritme cepat dengan potongan dinamis.
        <div className="mt-3 text-right text-xs text-slate-500">312 / 1000</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <MiniButton>Buat lebih sinematik</MiniButton>
        <MiniButton>Buat lebih dramatis</MiniButton>
        <MiniButton>Lebih realistis</MiniButton>
        <MiniButton>Reset otomatis</MiniButton>
      </div>
    </Card>
  );
}

function SceneOutputPanel() {
  return (
    <Card>
      <h3 className="text-xl font-semibold">Hasil Scene</h3>
      <p className="mt-1 text-sm text-slate-400">Preview hasil video untuk scene ini.</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[1fr_160px]">
        <div className="relative aspect-video overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_45%_35%,rgba(255,255,255,0.25),transparent_16%),radial-gradient(circle_at_70%_60%,rgba(34,211,238,0.22),transparent_25%),linear-gradient(135deg,#0f172a,#020617)]">
          <PlayCircle className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 text-white/90" />
          <span className="absolute bottom-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs">0:10</span>
        </div>
        <div className="flex flex-col gap-2">
          <SecondaryButton icon={Eye}>Preview</SecondaryButton>
          <SecondaryButton icon={RefreshCcw}>Generate ulang</SecondaryButton>
          <PrimaryButton icon={CheckCircle2}>Gunakan hasil ini</PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

function SettingGroup({ title, items, active }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button key={item} className={cn("rounded-xl border px-3 py-2 text-xs font-semibold", index === active ? "border-blue-300/45 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>{item}</button>
        ))}
      </div>
    </div>
  );
}

function RightGeneratePanel() {
  return (
    <div className="space-y-5">
      <Card>
        <h3 className="text-xl font-semibold">Pengaturan Video</h3>
        <SettingGroup title="Mode" items={["Video", "Agent (Beta)"]} active={0} />
        <SettingGroup title="Durasi Video" items={["10s", "15s", "20s", "30s"]} active={0} />
        <SettingGroup title="Kualitas" items={["Draft", "Standar", "Tinggi"]} active={2} />
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-white">Rasio Aspek</p>
          <div className="space-y-2">
            {["2:3  Tall", "3:2  Wide", "1:1  Square", "9:16  Vertical", "16:9  Widescreen"].map((item, index) => (
              <button key={item} className={cn("flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm", index === 4 ? "border-blue-300/40 bg-blue-500 text-white" : "border-white/10 bg-black/20 text-slate-300")}>
                <span>{item}</span>{index === 4 && <CheckCircle2 className="h-4 w-4" />}
              </button>
            ))}
          </div>
        </div>
      </Card>
      <Card>
        <h3 className="text-xl font-semibold">Cek Sebelum Generate</h3>
        <p className="mt-1 text-sm text-slate-400">Pastikan semua siap untuk hasil terbaik.</p>
        <div className="mt-5 space-y-3">
          {["Narasi siap", "Referensi lengkap", "Storyboard siap", "Instruksi video siap", "Rasio dipilih", "Kualitas dipilih"].map((item) => <Check key={item} text={item} />)}
        </div>
        <p className="mt-5 text-sm font-semibold text-emerald-300">Semua siap! Kamu bisa generate video.</p>
      </Card>
    </div>
  );
}

function SceneComposer({ onBack, onNext }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-center gap-4">
          <SecondaryButton icon={ArrowLeft} onClick={onBack}>Kembali</SecondaryButton>
          <div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white md:text-4xl">Scene 05 — Split Second Escape</h1>
            <p className="mt-1 text-sm text-emerald-300"><CheckCircle2 className="mr-1 inline h-4 w-4" />Adegan siap direview</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <SecondaryButton icon={ImageIcon}>Generate Storyboard</SecondaryButton>
          <PrimaryButton icon={Video}>Generate Video</PrimaryButton>
          <PrimaryButton icon={ArrowRight} onClick={onNext}>Lanjut Scene Berikutnya</PrimaryButton>
        </div>
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
        <div className="space-y-5">
          <StoryboardPanel />
          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <VideoInstructionPanel />
            <SceneOutputPanel />
          </div>
        </div>
        <RightGeneratePanel />
      </div>
    </div>
  );
}

export function ScenesScreen({ go }) {
  return (
    <div>
      <Stepper current={4} />
      <SceneComposer onBack={() => go("review")} onNext={() => go("preview")} />
    </div>
  );
}

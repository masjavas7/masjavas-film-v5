import { PlayCircle, RefreshCcw } from "lucide-react";
import { Card, Pill } from "../../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Stepper } from "../../components/navigation/Stepper";
import { Quality } from "../../components/shared/PrimitiveBlocks";

export function PreviewScreen({ go }) {
  return (
    <div>
      <Stepper current={5} />
      <ScreenHeader
        badge="Langkah 6 dari 7"
        title="Tonton preview, lalu pilih lanjut atau revisi"
        desc="Yang terlihat hanya preview, catatan kualitas, dan tombol tindakan jelas."
        cta="Saya suka, siapkan download"
        onBack={() => go("scenes")}
        onNext={() => go("export")}
        backLabel="Kembali ubah adegan"
      />
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <div className="aspect-video rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_40%_35%,rgba(34,211,238,0.32),transparent_24%),radial-gradient(circle_at_70%_68%,rgba(168,85,247,0.24),transparent_28%),linear-gradient(135deg,#0f172a,#020617)] p-5">
            <div className="flex h-full flex-col justify-between">
              <Pill tone="soft">Preview video</Pill>
              <PlayCircle className="mx-auto h-16 w-16 text-white/85" />
              <div className="flex justify-between text-xs text-slate-400"><span>00:00</span><span>02:00</span></div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton icon={PlayCircle}>Putar preview</PrimaryButton>
            <SecondaryButton icon={RefreshCcw}>Revisi bagian tertentu</SecondaryButton>
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Hasil pemeriksaan sederhana</h3>
          <div className="mt-5 space-y-3">
            <Quality label="Narasi enak didengar" />
            <Quality label="Karakter konsisten" />
            <Quality label="Subtitle sinkron" />
            <Quality label="Durasi sesuai" />
          </div>
        </Card>
      </div>
    </div>
  );
}

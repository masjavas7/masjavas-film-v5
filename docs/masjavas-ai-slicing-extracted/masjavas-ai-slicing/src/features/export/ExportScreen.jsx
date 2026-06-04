import { FileText, FolderOpen, Video } from "lucide-react";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { Stepper } from "../../components/navigation/Stepper";
import { DownloadCard } from "../../components/shared/PrimitiveBlocks";

export function ExportScreen({ go }) {
  return (
    <div>
      <Stepper current={6} />
      <ScreenHeader
        badge="Langkah 7 dari 7"
        title="Video siap diunduh"
        desc="Semua pengecekan selesai di balik layar. User tinggal memilih format hasil."
        cta="Download MP4"
        onBack={() => go("preview")}
        onNext={() => go("home")}
        backLabel="Kembali ke preview"
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <DownloadCard icon={Video} title="Video MP4" text="File final siap upload." cta="Download MP4" />
        <DownloadCard icon={FileText} title="Subtitle" text="SRT/VTT untuk upload manual." cta="Download subtitle" />
        <DownloadCard icon={FolderOpen} title="Paket edit" text="Folder aset untuk editor video." cta="Download paket" />
      </div>
    </div>
  );
}

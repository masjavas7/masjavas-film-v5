import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { ProjectCard } from "../../components/shared/PrimitiveBlocks";
import { projectCards } from "../../data/appData";

export function LibraryScreen() {
  return (
    <div>
      <ScreenHeader badge="Proyek Saya" title="Semua project mudah ditemukan dan dilanjutkan" desc="Status dibuat sederhana: Draft, Perlu review, Preview siap, atau Sudah selesai." cta="Buat proyek baru" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projectCards.map((title, index) => (
          <ProjectCard key={title} title={title} status={index % 3 === 0 ? "Preview siap" : index % 3 === 1 ? "Perlu review" : "Selesai"} />
        ))}
      </div>
    </div>
  );
}

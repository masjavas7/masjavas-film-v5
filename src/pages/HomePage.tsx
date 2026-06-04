import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Download, Layers3, Palette, PenLine, Plus, RefreshCcw, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Card, Pill } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { platformPresets, durationPresets, tonePresets } from "../data/appData";
import { cn } from "../utils";

interface PresetRowProps {
  title: string;
  items: string[];
  active: number;
  onChange: (index: number) => void;
}

const PresetRow: React.FC<PresetRowProps> = ({ title, items, active, onChange }) => {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold text-white">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item, index) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(index)}
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]",
              index === active
                ? "border-blue-300/45 bg-blue-500 text-white"
                : "border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
};

const ProjectStarterCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    ideaText,
    setIdeaText,
    aspectRatioIndex,
    setAspectRatioIndex,
    durationPresetIndex,
    setDurationPresetIndex,
    tonePresetIndex,
    setTonePresetIndex,
    setStep,
    resetProjectArtifacts
  } = useProjectFlowStore();

  const [localIdea, setLocalIdea] = React.useState(ideaText || "");
  const [isEditingIdea, setIsEditingIdea] = React.useState(false);
  const debouncedSaveRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveIdea = React.useCallback((val: string) => {
    setIdeaText(val);
  }, [setIdeaText]);

  const debouncedSaveIdea = React.useCallback((val: string) => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    debouncedSaveRef.current = setTimeout(() => {
      saveIdea(val);
    }, 800);
  }, [saveIdea]);

  React.useEffect(() => {
    return () => {
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
    };
  }, []);

  // Sync from store only when the user is not actively editing
  React.useEffect(() => {
    if (!isEditingIdea) {
      setLocalIdea(ideaText || "");
    }
  }, [ideaText, isEditingIdea]);

  const handleStartProject = () => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    const finalIdea = localIdea.trim();
    resetProjectArtifacts();
    setIdeaText(finalIdea);
    setStep(1); // Set step in store (style/preset)
    navigate("/presets");
  };

  return (
    <Card className="p-6 bg-white/[0.05] backdrop-blur-xl">
      <h3 className="text-2xl font-semibold">Mulai dari ide sederhana</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Tulis ide bebas kamu di sini. Tidak perlu rapi, cukup ceritakan inti idenya saja.
      </p>
      <textarea
        className="mt-5 min-h-[150px] w-full rounded-3xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-650 focus:border-blue-500/50 transition focus:ring-1 focus:ring-blue-500/20"
        placeholder="Contoh: Seorang pemuda menemukan pintu rahasia di perpustakaan tua yang membawanya ke dunia lain..."
        value={localIdea}
        onFocus={() => setIsEditingIdea(true)}
        onBlur={() => {
          setIsEditingIdea(false);
          saveIdea(localIdea);
        }}
        onChange={(e) => {
          const val = e.target.value;
          setLocalIdea(val);
          debouncedSaveIdea(val);
        }}
      />
      <PresetRow
        title="Platform"
        items={platformPresets}
        active={aspectRatioIndex === 4 ? 0 : aspectRatioIndex === 3 ? 1 : aspectRatioIndex === 2 ? 2 : 3}
        onChange={(idx) => {
          // Map home selection index back to standard index of ratios
          // YouTube (16:9 widescreen) = index 4, TikTok (9:16 vertical) = index 3, Instagram (1:1 square) = index 2
          if (idx === 0) setAspectRatioIndex(4); // 16:9
          else if (idx === 1) setAspectRatioIndex(3); // 9:16
          else if (idx === 2) setAspectRatioIndex(2); // 1:1
          else setAspectRatioIndex(0); // layarsemi-wide
        }}
      />
      <PresetRow
        title="Durasi"
        items={durationPresets}
        active={durationPresetIndex}
        onChange={setDurationPresetIndex}
      />
      <PresetRow
        title="Nuansa"
        items={tonePresets}
        active={tonePresetIndex}
        onChange={setTonePresetIndex}
      />
      <div className="mt-5">
        <PrimaryButton onClick={handleStartProject} className="w-full" icon={Plus}>
          Lanjut
        </PrimaryButton>
      </div>
      <p className="mt-3 text-center text-xs text-slate-500">Aman dan privat. Hanya kamu yang bisa melihat proyek ini.</p>
    </Card>
  );
};

const BeginnerFlow: React.FC = () => {
  const items = [
    { title: "Tulis ide bebas", text: "Ceritakan idemu dengan bahasa sendiri.", icon: PenLine },
    { title: "Pilih preset", text: "Pilih gaya, durasi, dan nuansa.", icon: Layers3 },
    { title: "Review hasil AI", text: "Kami ubah idemu jadi cerita dan adegan.", icon: WandSparkles },
    { title: "Preview & download", text: "Tonton, revisi, lalu download.", icon: Download },
  ];

  return (
    <Card className="mt-8 bg-black/20 border-white/5">
      <h3 className="mb-5 text-lg font-semibold">Alur mudah untuk pemula</h3>
      <div className="grid gap-4 md:grid-cols-4">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-sm font-bold">{index + 1}</div>
                <Icon className="h-5 w-5 text-blue-200" />
              </div>
              <p className="font-semibold text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">{item.text}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

interface IdeaCardProps {
  title: string;
  tone: string;
}

const IdeaCard: React.FC<IdeaCardProps> = ({ title, tone }) => {
  const { setIdeaText, resetProject } = useProjectFlowStore();
  const navigate = useNavigate();

  const handleUseIdea = () => {
    resetProject();
    setIdeaText(`Ide cerita: ${title}. Bernuansa ${tone}.`);
    navigate("/start");
  };

  return (
    <div
      onClick={handleUseIdea}
      className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 cursor-pointer hover:border-blue-500/50 hover:scale-[1.02] transition group"
    >
      <div className="aspect-[4/3] bg-[radial-gradient(circle_at_40%_35%,rgba(255,255,255,0.2),transparent_22%),linear-gradient(135deg,#1e293b,#020617)] group-hover:opacity-85 transition" />
      <div className="p-3">
        <p className="text-sm font-semibold text-white truncate">{title}</p>
        <div className="mt-1">
          <Pill tone="default">{tone}</Pill>
        </div>
      </div>
    </div>
  );
};

interface FeatureMiniProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  desc?: string;
}

const FeatureMini: React.FC<FeatureMiniProps> = ({ title, icon: Icon, desc = "Akurasi visual tinggi yang diselaraskan dengan storyboard sinematik." }) => {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <Icon className="mb-3 h-6 w-6 text-cyan-200" />
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
};

import { useProjectLibraryStore } from "../stores/projectLibraryStore";
import { Clock, Play, Trash2, AlertTriangle, ArrowRight } from "lucide-react";
import { ProjectDetailModal } from "../components/project/ProjectDetailModal";

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { resetProject } = useProjectFlowStore();
  const { projects, loadProjects, openProject, deleteProject } = useProjectLibraryStore();
  const [projectToDelete, setProjectToDelete] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [selectedProjectSummary, setSelectedProjectSummary] = React.useState<any | null>(null);
  const [hasBackupAvailable, setHasBackupAvailable] = React.useState<boolean>(false);
  const [projectToRestore, setProjectToRestore] = React.useState<string | null>(null);
  const [backupTimeStr, setBackupTimeStr] = React.useState<string | null>(null);

  React.useEffect(() => {
    loadProjects();
  }, []);

  const handleStartNew = () => {
    resetProject();
    navigate("/start");
  };

  const handleGoIdea = () => {
    resetProject();
    navigate("/idea");
  };

  const handleContinue = async (id: string) => {
    setSelectedProjectSummary(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    setHasBackupAvailable(false);
    setProjectToRestore(null);
    setBackupTimeStr(null);
    try {
      const nextPath = await openProject(id);
      navigate(nextPath);
    } catch (err: any) {
      console.error("[HomePage] Gagal membuka proyek:", err);
      const msg = err.response?.data?.message || err.message || "";
      const hasBackup = err.hasBackup || false;

      if (hasBackup) {
        setHasBackupAvailable(true);
        setProjectToRestore(id);
        if (err.backupTime) {
          try {
            const date = new Date(err.backupTime);
            const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const day = date.getDate();
            const month = months[date.getMonth()];
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            setBackupTimeStr(`Backup terakhir: ${day} ${month}, ${hours}:${minutes}`);
          } catch (e) {
            setBackupTimeStr(null);
          }
        }
      }

      if (msg.includes("rusak") || msg.includes("belum lengkap") || err.status === 422) {
        setErrorMessage("Project tidak bisa dibuka. File project rusak atau belum lengkap.");
      } else {
        setErrorMessage("Gagal membuka project. Koneksi server terputus atau file belum siap.");
      }
    }
  };

  const handleRestore = async () => {
    if (!projectToRestore) return;
    const id = projectToRestore;
    setErrorMessage(null);
    setSuccessMessage(null);
    setHasBackupAvailable(false);
    setProjectToRestore(null);
    setBackupTimeStr(null);
    try {
      await useProjectLibraryStore.getState().restoreBackup(id);
      setSuccessMessage("Project berhasil dipulihkan dari backup.");
      // Reload projects list to reflect in UI
      await loadProjects();
      // Automatically open the project after successful restoration
      const nextPath = await openProject(id);
      navigate(nextPath);
    } catch (e) {
      setErrorMessage("Gagal memulihkan proyek dari backup.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (projectToDelete) {
      try {
        await deleteProject(projectToDelete);
        setProjectToDelete(null);
      } catch (err) {
        setErrorMessage("Gagal menghapus proyek.");
      }
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Baru saja";
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === "exported") return "Sudah diekspor";
    if (status === "ready_to_export") return "Siap diekspor";
    if (status === "in_progress") return "Sedang dibuat";
    return "Draft";
  };

  const getStatusColor = (status: string) => {
    if (status === "exported") return "green";
    if (status === "ready_to_export") return "soft";
    if (status === "in_progress") return "blue";
    return "amber";
  };

  return (
    <div className="space-y-8">
      {errorMessage && (
        <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-455">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Proyek Tidak Bisa Dibuka</h4>
              <p className="text-xs text-slate-400">{errorMessage}</p>
              {backupTimeStr && (
                <p className="text-[11px] text-amber-400/90 font-medium mt-1">{backupTimeStr}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            {hasBackupAvailable && (
              <button
                onClick={handleRestore}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-lg shadow-amber-500/15 transition active:scale-95"
              >
                Pulihkan dari Backup
              </button>
            )}
            <button
              onClick={() => {
                setErrorMessage(null);
                setHasBackupAvailable(false);
                setProjectToRestore(null);
                setBackupTimeStr(null);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-350 hover:bg-white/[0.06] transition"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Proyek Berhasil Dipulihkan</h4>
              <p className="text-xs text-slate-400">{successMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-350 hover:bg-white/[0.06] transition"
          >
            Tutup
          </button>
        </div>
      )}

      {/* 1. Proyek Terakhir Section */}
      {projects.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-400" />
              Proyek Terakhir
            </h2>
            <button
              onClick={() => navigate("/library")}
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
            >
              Lihat Semua Proyek ({projects.length})
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 3).map((p) => {
              // Calculate scene percentage progress
              const total = p.sceneCount || 0;
              const completed = p.completedScenes || 0;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Card key={p.id} className="bg-white/[0.04] hover:bg-white/[0.06] transition flex flex-col justify-between p-5 border-white/5 relative overflow-hidden group">
                  {/* Aspect Ratio Glow indicator background */}
                  <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden pointer-events-none opacity-45">
                    <div className="absolute top-[-25px] right-[-25px] h-[50px] w-[50px] rounded-full bg-blue-500/20 blur-md" />
                  </div>

                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-white group-hover:text-blue-300 transition line-clamp-1">
                          {p.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Diakses {formatTime(p.lastOpenedAt)}
                        </p>
                      </div>
                      <Pill tone={getStatusColor(p.status) as any}>{getStatusLabel(p.status)}</Pill>
                    </div>

                    {/* Progress strip */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-medium text-slate-400">
                        <span>Adegan: {completed} / {total}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-violet-500 h-1 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/5 font-semibold uppercase tracking-wider">
                      Format: {p.aspectRatio || "16:9"}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setProjectToDelete(p.id)}
                        className="rounded-xl border border-white/10 bg-black/20 p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20 transition active:scale-95"
                        title="Hapus Proyek"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <PrimaryButton
                        icon={Play}
                        onClick={() => setSelectedProjectSummary(p)}
                        className="py-1.5 px-3 text-xs"
                      >
                        Lanjut
                      </PrimaryButton>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Hero Section */}
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[34px] border border-white/10 bg-white/[0.065] p-8 shadow-2xl shadow-black/20 backdrop-blur-xl md:p-10">
          <Pill tone="purple"><Sparkles className="h-3.5 w-3.5" /> Cinematic Intelligence for Effortless Video Creation</Pill>
          <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-[-0.055em] text-white md:text-7xl">
            Ubah Ide Menjadi <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">Video Sinematik Siap Tayang.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            Dari konsep mentah ke video premium dalam alur kerja AI yang terpandu. Menyatukan visi kreatif Anda dengan keandalan asisten produksi sinematik cerdas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton icon={Plus} onClick={handleStartNew}>
              Mulai Proyek Baru
            </PrimaryButton>
            <SecondaryButton icon={PenLine} onClick={handleGoIdea}>
              Saya Sudah Punya Ide
            </SecondaryButton>
          </div>
          <BeginnerFlow />
        </div>
        <ProjectStarterCard />
      </section>

      {/* 3. Sample Ideas & Mini Features */}
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <h3 className="mb-5 text-xl font-semibold">Contoh ide untuk memulai</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
            {[
              "Pintu Rahasia di Perpustakaan Tua",
              "Nelayan Kecil dan Laut yang Berubah",
              "Kota Masa Depan Tanpa Manusia",
              "Pesan Terakhir dari Planet Merah",
              "Penjaga Hutan yang Terakhir"
            ].map((title, index) => (
              <IdeaCard
                key={title}
                title={title}
                tone={["Misterius", "Inspiratif", "Sinematik", "Sains Fiksi", "Petualangan"][index]}
              />
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="mb-5 text-xl font-semibold">Alur Produksi Sinematik Terpandu</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { title: "Nuansa & Gaya Premium", desc: "Konfigurasi preset nuansa sinematik yang dirancang oleh kurator profesional." },
              { title: "Alur Kerja AI Terpandu", desc: "Sistem membimbing Anda langkah-demi-langkah dari ide kasar hingga video final." },
              { title: "Fleksibilitas Revisi Adegan", desc: "Bebas mengubah narasi, storyboard, atau instruksi visual kapan saja." },
              { title: "Produksi Studio Tanpa Hambatan", desc: "Seluruh penanganan teknis rendering dan validasi diselesaikan di balik layar." }
            ].map((item, index) => (
              <FeatureMini
                key={item.title}
                title={item.title}
                desc={item.desc}
                icon={[Palette, PenLine, RefreshCcw, ShieldCheck][index]}
              />
            ))}
          </div>
        </Card>
      </section>

      {/* 4. Delete Confirmation Modal Dialog */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <Card className="max-w-md w-full p-6 bg-slate-900 border-white/10 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-450 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Hapus project ini?</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Proyek yang dihapus tidak bisa dikembalikan, kecuali masih ada backup manual. Semua ide, storyboard, dan hasil video adegan di server akan dihapus secara permanen.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="flex-1 rounded-2xl border border-white/10 bg-black/20 hover:bg-white/[0.04] py-3 text-sm font-semibold text-slate-300 transition active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 rounded-2xl bg-rose-600 hover:bg-rose-500 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                Hapus
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* 5. Project Detail Summary Modal Dialog */}
      {selectedProjectSummary && (
        <ProjectDetailModal
          project={selectedProjectSummary}
          isOpen={true}
          onClose={() => setSelectedProjectSummary(null)}
          onContinue={handleContinue}
          onDeleteInit={(id) => setProjectToDelete(id)}
        />
      )}
    </div>
  );
};


import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Library,
  Search,
  SlidersHorizontal,
  Clock,
  Play,
  Trash2,
  AlertTriangle,
  Plus,
  ArrowUpDown,
  ShieldCheck
} from "lucide-react";
import { Card, Pill } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { useProjectLibraryStore } from "../stores/projectLibraryStore";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { ProjectDetailModal } from "../components/project/ProjectDetailModal";

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetProject } = useProjectFlowStore();
  const { projects, loadProjects, openProject, deleteProject, isLoading } = useProjectLibraryStore();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("Semua");
  const [sortBy, setSortBy] = React.useState<"lastOpenedAt" | "updatedAt" | "title">("lastOpenedAt");
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

  const handleCreateNew = () => {
    resetProject();
    navigate("/start");
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
      console.error("[LibraryPage] Gagal melanjutkan proyek:", err);
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
      // Automatically open the restored project
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

  // Filter and Sort projects
  const processedProjects = React.useMemo(() => {
    let result = [...projects];

    // Search query filtering
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query)
      );
    }

    // Status filtering
    if (statusFilter !== "Semua") {
      result = result.filter((p) => {
        if (statusFilter === "Selesai") return p.status === "exported" || p.status === "ready_to_export";
        if (statusFilter === "Sedang dibuat") return p.status === "in_progress";
        return p.status === "draft";
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      }
      return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
    });

    return result;
  }, [projects, searchQuery, statusFilter, sortBy]);

  return (
    <div className="space-y-6 flex-1 flex flex-col">
      <ScreenHeader
        badge="Workspace Library"
        title="Proyek Saya"
        desc="Kelola, lanjutkan, atau hapus workspace video kamu. Semuanya tersimpan aman di server lokal."
        cta="Buat Proyek Baru"
        onNext={handleCreateNew}
        backLabel="Homepage"
        onBack={() => navigate("/")}
      />

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

      {/* Control Bar: Search & Filters */}
      <Card className="bg-white/[0.04] p-4 border-white/5 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari proyek berdasarkan judul..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-black/35 pl-10 pr-4 py-2.5 text-sm text-slate-200 outline-none placeholder:text-slate-650 focus:border-blue-500/50 transition focus:ring-1 focus:ring-blue-500/10"
          />
        </div>

        {/* Filters and Sorting dropdowns */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-400 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50 transition"
            >
              <option value="Semua">Semua Status</option>
              <option value="Draft">Draft</option>
              <option value="Sedang dibuat">Sedang dibuat</option>
              <option value="Selesai">Siap / Selesai</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="h-4 w-4 text-slate-500" />
            <span className="text-xs text-slate-400 font-medium">Urutan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-blue-500/50 transition"
            >
              <option value="lastOpenedAt">Terakhir Dibuka</option>
              <option value="updatedAt">Terakhir Diupdate</option>
              <option value="title">Judul (A-Z)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Catalog View */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] text-center space-y-3">
          <div className="h-10 w-10 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Memuat katalog proyek...</p>
        </div>
      ) : processedProjects.length === 0 ? (
        <Card className="bg-white/[0.04] p-12 text-center max-w-md mx-auto space-y-6 my-auto shrink-0 border-white/5 shadow-2xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-500/10 border border-blue-500/20 text-blue-300 mx-auto">
            <Library className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Belum ada project</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              {searchQuery.trim().length > 0
                ? "Tidak ada proyek yang cocok dengan kata kunci pencarian Anda."
                : "Mulai buat proyek video sinematik pertama Anda semudah menulis naskah ide cerita."}
            </p>
          </div>
          <div className="pt-2">
            <PrimaryButton icon={Plus} onClick={handleCreateNew} className="w-full">
              {searchQuery.trim().length > 0 ? "Reset Pencarian" : "Buat Proyek Baru"}
            </PrimaryButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {processedProjects.map((p) => {
            const total = p.sceneCount || 0;
            const completed = p.completedScenes || 0;
            const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <Card
                key={p.id}
                className="bg-white/[0.04] hover:bg-white/[0.06] border-white/5 transition p-5 flex flex-col justify-between h-full group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition line-clamp-1">
                      {p.title}
                    </h3>
                    <Pill tone={getStatusColor(p.status) as any}>{getStatusLabel(p.status)}</Pill>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5 font-light">
                    <Clock className="h-3.5 w-3.5" />
                    Dibuka: {formatTime(p.lastOpenedAt)}
                  </p>

                  {/* Scene Progress section */}
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                      <span>Progres Produksi adegan</span>
                      <span>{completed} / {total} adegan</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-violet-500 h-1.5 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between gap-3">
                  <div className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold text-slate-400 border border-white/5 select-none">
                    {p.aspectRatio || "16:9"}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(p.id);
                      }}
                      className="rounded-xl border border-white/10 bg-black/20 p-2.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20 transition active:scale-95"
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
      )}

      {/* Delete Confirmation Modal Dialog */}
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

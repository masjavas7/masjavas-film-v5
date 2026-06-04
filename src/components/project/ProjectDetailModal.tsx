import * as React from "react";
import { X, Play, Trash2, Copy, Edit2, Check, Clock, CheckCircle } from "lucide-react";
import { Card, Pill } from "../ui/Card";
import { PrimaryButton } from "../ui/Button";
import { ProjectMetadata } from "../../services/projectService";
import { useProjectLibraryStore } from "../../stores/projectLibraryStore";
import { cn } from "../../utils";

interface ProjectDetailModalProps {
  project: ProjectMetadata;
  isOpen: boolean;
  onClose: () => void;
  onContinue: (id: string) => Promise<void>;
  onDeleteInit: (id: string) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onContinue,
  onDeleteInit,
}) => {
  const duplicateProject = useProjectLibraryStore((state) => state.duplicateProject);
  const renameProject = useProjectLibraryStore((state) => state.renameProject);
  
  const [isEditing, setIsEditing] = React.useState(false);
  const [newTitle, setNewTitle] = React.useState(project.title);
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [renameError, setRenameError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setNewTitle(project.title);
    setIsEditing(false);
    setRenameError(null);
  }, [project]);

  if (!isOpen) return null;

  const handleRenameSave = async () => {
    if (!newTitle.trim()) {
      setRenameError("Nama proyek tidak boleh kosong.");
      return;
    }
    try {
      setRenameError(null);
      await renameProject(project.id, newTitle.trim());
      setIsEditing(false);
    } catch (e) {
      setRenameError("Gagal mengubah nama proyek.");
    }
  };

  const handleDuplicate = async () => {
    try {
      setIsDuplicating(true);
      await duplicateProject(project.id);
      setIsDuplicating(false);
      onClose();
    } catch (e) {
      setIsDuplicating(false);
      alert("Gagal menduplikasi proyek.");
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
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

  const percent = project.sceneCount > 0 
    ? Math.round((project.completedScenes / project.sceneCount) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={onClose} 
      />
      
      <Card className="relative max-w-xl w-full p-6 bg-slate-900/90 border-white/10 shadow-2xl space-y-6 z-10 overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
        {/* Top Decorative Lights */}
        <div className="absolute top-0 right-0 h-24 w-24 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute top-[-30px] right-[-30px] h-[70px] w-[70px] rounded-full bg-blue-500/35 blur-xl" />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-blue-550/40 bg-black/45 text-white text-lg font-bold outline-none placeholder:text-slate-600 focus:border-blue-500 transition focus:ring-1 focus:ring-blue-500/20"
                    placeholder="Masukkan nama proyek..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRenameSave();
                      if (e.key === "Escape") setIsEditing(false);
                    }}
                  />
                  <button
                    onClick={handleRenameSave}
                    className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition active:scale-95"
                    title="Simpan"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="p-2 rounded-xl border border-white/10 bg-black/20 hover:bg-white/[0.06] text-slate-300 transition active:scale-95"
                    title="Batal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {renameError && <p className="text-xs text-rose-450 font-medium">{renameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h3 className="text-xl font-extrabold text-white tracking-tight leading-7 break-all">
                  {project.title}
                </h3>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 rounded-lg border border-white/5 bg-white/[0.02] text-slate-400 opacity-70 hover:opacity-100 hover:bg-white/[0.06] transition shrink-0"
                  title="Ubah Nama"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
              </div>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Pill tone={getStatusColor(project.status) as any}>
                {getStatusLabel(project.status)}
              </Pill>
              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Terakhir dibuka: {formatTime(project.lastOpenedAt)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/[0.04] p-2 hover:bg-white/[0.08] text-slate-350 transition active:scale-95 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Rasio Aspek</span>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/15">
                <span className="text-xs font-bold">{project.aspectRatio}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {project.aspectRatio === "9:16" ? "Vertikal" : project.aspectRatio === "1:1" ? "Kotak" : "Widescreen"}
                </p>
                <p className="text-[10px] text-slate-550">Format video proyek</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">Status Ekspor</span>
            <div className="mt-2 flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center border",
                project.status === "exported" 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15" 
                  : "bg-slate-800 text-slate-500 border-white/5"
              )}>
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  {project.status === "exported" ? "Siap Didownload" : "Belum Diekspor"}
                </p>
                <p className="text-[10px] text-slate-550">Kompilasi video final</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Adegan */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-350">
            <span className="flex items-center gap-1">
              Progres Produksi Adegan
            </span>
            <span>{project.completedScenes} / {project.sceneCount} Adegan Selesai ({percent}%)</span>
          </div>
          <div className="w-full bg-slate-850 rounded-full h-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicate}
              disabled={isDuplicating}
              className={cn(
                "flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition active:scale-95 disabled:opacity-50",
                isDuplicating && "cursor-wait"
              )}
            >
              <Copy className="h-3.5 w-3.5" />
              {isDuplicating ? "Menyalin..." : "Duplikat"}
            </button>
            <button
              onClick={() => {
                onDeleteInit(project.id);
                onClose();
              }}
              className="rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20 transition active:scale-95"
              title="Hapus Proyek"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.04] transition"
            >
              Kembali
            </button>
            <PrimaryButton
              icon={Play}
              onClick={() => onContinue(project.id)}
              className="flex-1 sm:flex-initial py-2.5 px-5 text-xs font-bold"
            >
              Lanjut Bekerja
            </PrimaryButton>
          </div>
        </div>
      </Card>
    </div>
  );
};

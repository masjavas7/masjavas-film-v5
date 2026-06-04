/**
 * MediaHandlingModal.tsx
 * Dialog selector untuk memilih strategi penanganan ratio mismatch:
 * - Fit with Blur Background (recommended)
 * - Crop Center
 * - Letterbox / Black Bars
 */

import * as React from "react";
import { Layers, Crop, LayoutTemplate, X, Sparkles, Info } from "lucide-react";
import { MediaHandlingStrategy } from "../../services/exportService";
import { cn } from "../../utils";

interface MediaHandlingOption {
  id: MediaHandlingStrategy;
  label: string;
  icon: React.ElementType;
  recommended?: boolean;
  description: string;
  preview: string; // emoji/icon representation
  pros: string[];
  cons: string[];
}

const OPTIONS: MediaHandlingOption[] = [
  {
    id: 'fit_blur',
    label: 'Fit with Blur',
    icon: Layers,
    recommended: true,
    description: 'Video ditempatkan di tengah dengan latar belakang blur elegan dari video yang sama.',
    preview: '🌫️',
    pros: ['Mengisi seluruh frame', 'Tampilan modern & sinematik', 'Tidak ada teks/elemen terpotong'],
    cons: ['Area tepi sedikit buram']
  },
  {
    id: 'crop_center',
    label: 'Crop Tengah',
    icon: Crop,
    description: 'Area tengah video diambil untuk mengisi frame target. Bagian tepi terpotong.',
    preview: '✂️',
    pros: ['Tidak ada area kosong', 'Kualitas penuh di area tengah'],
    cons: ['Bagian tepi video terpotong', 'Objek di tepi bisa hilang']
  },
  {
    id: 'letterbox',
    label: 'Letterbox / Bar Hitam',
    icon: LayoutTemplate,
    description: 'Video diposisikan di tengah dengan bilah hitam mengisi area kosong.',
    preview: '⬛',
    pros: ['Tidak ada konten terpotong', 'Tampilan video asli terjaga penuh'],
    cons: ['Ada area hitam di sisi frame', 'Tampilan kurang premium']
  }
];

interface MediaHandlingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (strategy: MediaHandlingStrategy) => void;
  projectRatio: string;    // e.g. "16:9", "9:16", "1:1"
  isExporting?: boolean;
}

export const MediaHandlingModal: React.FC<MediaHandlingModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectRatio,
  isExporting = false
}) => {
  const [selected, setSelected] = React.useState<MediaHandlingStrategy>('fit_blur');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selected);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-handling-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/20 border border-violet-500/30">
              <Layers className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 id="media-handling-modal-title" className="text-lg font-bold text-white">
                Strategi Penanganan Video
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pilih cara memproses video adegan ke rasio project {projectRatio}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-6 mt-4 flex items-start gap-2.5 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3.5">
          <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200 leading-relaxed">
            Beberapa video adegan memiliki rasio berbeda dari project ({projectRatio}).
            Pilih strategi FFmpeg untuk menyeragamkan semua video ke rasio project target.
          </p>
        </div>

        {/* Strategy options */}
        <div className="p-6 space-y-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = selected === option.id;

            return (
              <button
                key={option.id}
                onClick={() => setSelected(option.id)}
                className={cn(
                  "w-full text-left rounded-2xl border p-4 transition-all",
                  isSelected
                    ? "border-violet-500/50 bg-violet-500/10 shadow-[0_0_0_1px_rgba(139,92,246,0.2)]"
                    : "border-white/8 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/15"
                )}
                aria-pressed={isSelected}
              >
                <div className="flex items-start gap-3.5">
                  {/* Radio indicator */}
                  <div className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-all",
                    isSelected
                      ? "border-violet-500 bg-violet-500"
                      : "border-slate-600 bg-transparent"
                  )}>
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Icon className={cn("h-4 w-4 shrink-0", isSelected ? "text-violet-400" : "text-slate-400")} />
                      <span className="font-semibold text-white text-sm">{option.label}</span>
                      <span className="text-base">{option.preview}</span>
                      {option.recommended && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                          <Sparkles className="h-2.5 w-2.5" />
                          DISARANKAN
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{option.description}</p>
                    
                    {isSelected && (
                      <div className="mt-2.5 flex gap-4">
                        <div>
                          <p className="text-[10px] font-semibold text-emerald-400 mb-1">✓ Keuntungan</p>
                          <ul className="space-y-0.5">
                            {option.pros.map((pro) => (
                              <li key={pro} className="text-[10px] text-slate-400">{pro}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-amber-400 mb-1">⚠ Pertimbangan</p>
                          <ul className="space-y-0.5">
                            {option.cons.map((con) => (
                              <li key={con} className="text-[10px] text-slate-400">{con}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            Batal
          </button>
          <button
            id="media-handling-confirm-btn"
            onClick={handleConfirm}
            disabled={isExporting}
            className={cn(
              "flex items-center gap-2 rounded-2xl px-6 py-2.5 text-sm font-bold text-white transition",
              isExporting
                ? "bg-violet-700/50 cursor-not-allowed"
                : "bg-violet-600 hover:bg-violet-500 active:scale-[0.98]"
            )}
          >
            <Layers className="h-4 w-4" />
            {isExporting ? "Memulai Ekspor..." : "Mulai Ekspor"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaHandlingModal;

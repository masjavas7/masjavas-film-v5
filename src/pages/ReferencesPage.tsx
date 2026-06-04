import * as React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2, RefreshCw, Sparkles, UploadCloud } from "lucide-react";
import { Card, Pill } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { referenceService } from "../services/referenceService";
import { AIProgressPanel } from "../components/shared/AIProgressPanel";
import { presetCards, tonePresets } from "../data/appData";

// Helper to strictly identify real vs fallback reference images
export const isReferenceReal = (ref: any): boolean => {
  if (!ref) return false;
  if (ref.isReal !== true) return false;
  
  const caption = (ref.description || ref.title || ref.category || "").toLowerCase();
  if (caption.includes("visual rendering fallback") || caption.includes("fallback visual") || caption.includes("placeholder")) {
    return false;
  }
  
  const url = (ref.imageUrl || ref.url || "").toLowerCase();
  if (!url) return false;
  if (
    url.includes("placeholder") || 
    url.includes("unsplash.com") || 
    url.includes("picsum.photos") || 
    url.includes("dummy") || 
    url.includes("temp_fallback") ||
    url.includes("fallback")
  ) {
    return false;
  }
  
  return true;
};

interface ManualSlotProps {
  title: string;
  text: string;
  onAdd: () => void;
}

const ManualSlot: React.FC<ManualSlotProps> = ({ title, text, onAdd }) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{text}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="rounded-xl border border-dashed border-white/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white hover:bg-white/[0.1] active:scale-[0.98] transition"
      >
        + Gambar
      </button>
    </div>
  );
};

export const ReferencesPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    references = [],
    addReference,
    addManualReference,
    setReferences,
    setStep,
    reviewNarration,
    ideaText,
    activeProjectId,
    loadingStates,
    errorMessages,
    setReferencesStatus,
    selectedPreset,
    tonePresetIndex,
    aspectRatio,
    storyDraft
  } = useProjectFlowStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [activeProgressStep, setActiveProgressStep] = React.useState(0);
  const [warningBanner, setWarningBanner] = React.useState<string | null>(null);
  const hasTriedAutoLoad = React.useRef(false);

  const loadRefs = async () => {
    const autoRefs = (references || []).filter((r) => r?.type === "auto");
    if (autoRefs.length > 0) {
      setReferencesStatus("success");
      return;
    }

    setReferencesStatus("loading");
    setActiveProgressStep(0); // Membaca cerita
    setWarningBanner(null);

    const activePreset = selectedPreset !== null ? presetCards[selectedPreset] : presetCards[0];
    const selectedStyle = activePreset?.title || "";
    const selectedTone = tonePresets[tonePresetIndex] || "";
    
    setActiveProgressStep(1); // Menentukan karakter dan lokasi
    await new Promise((r) => setTimeout(r, 600));
    
    setActiveProgressStep(2); // Membuat gambar referensi
    const result = await referenceService.getAutomaticReferences(activeProjectId, {
      narration: reviewNarration || "",
      ideaText: ideaText || "",
      storyDraft: storyDraft || null,
      selectedStyle,
      selectedTone,
      aspectRatio: aspectRatio || "16:9"
    });
    
    setActiveProgressStep(3); // Menyimpan referensi
    await new Promise((r) => setTimeout(r, 500));

    console.log(`[ReferencesPage] Result: status=${result.status} refs=${result.references.length} warnings=${result.warnings.length}`);

    if (result.status === 'error') {
      // True error — no references at all
      setReferencesStatus("error", result.errorMessage || "Referensi gagal dibuat. Coba ulang.");
    } else if (result.status === 'partial' || result.status === 'partial_with_fallback') {
      // Partial success — some references made, some failed/fallback
      setReferences(result.references);
      const fallbackCount = (result.references || []).filter((r: any) => !isReferenceReal(r)).length;
      if (fallbackCount > 0) {
        setWarningBanner(`${fallbackCount} referensi masih menggunakan gambar placeholder. Klik tombol regenerasi untuk menghasilkan ulang dari AI.`);
      } else {
        setWarningBanner(result.warnings.join(' ') || 'Beberapa referensi gagal dibuat, tapi yang berhasil sudah tersedia.');
      }
      setReferencesStatus("success");
    } else if (result.status === 'fallback_only') {
      // All fallback — no real output
      setReferences(result.references);
      setWarningBanner('Semua referensi masih menggunakan gambar placeholder. GrokPI belum menghasilkan output nyata. Coba regenerasi.');
      setReferencesStatus("success");
    } else {
      // Full success
      setReferences(result.references);
      // Check if any fallback slipped through
      const fallbackCount = (result.references || []).filter((r: any) => !isReferenceReal(r)).length;
      if (fallbackCount > 0) {
        setWarningBanner(`${fallbackCount} referensi masih menggunakan gambar placeholder.`);
      }
      setReferencesStatus("success");
    }
  };

  React.useEffect(() => {
    // Only auto-load once. Retry is handled explicitly by button clicks.
    if (!hasTriedAutoLoad.current) {
      hasTriedAutoLoad.current = true;
      loadRefs();
    }
  }, []); // Empty deps — no infinite re-render

  const handleNext = () => {
    setStep(3); // Review Cerita step
    navigate("/review");
  };

  const handleBack = () => {
    setStep(1); // Pilih Preset step
    navigate("/presets");
  };

  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedRef = await referenceService.uploadProjectReference(activeProjectId, file, "Style");
      addReference(uploadedRef);
      addManualReference(uploadedRef);
    } catch (err) {
      console.error("Gagal mengunggah file:", err);
      alert("Gagal mengunggah gambar referensi.");
    }
  };

  const status = loadingStates?.references || "idle";
  const errorMsg = errorMessages?.references;

  if (status === "loading") {
    return (
      <div className="space-y-6">
        <Stepper current={2} />
        <AIProgressPanel
          title="AI sedang menyiapkan referensi"
          description="Membuat gambar karakter dan lokasi..."
          estimatedTime="Biasanya selesai dalam 30–90 detik."
          steps={[
            "Membaca cerita",
            "Menentukan karakter dan lokasi",
            "Membuat gambar referensi",
            "Menyimpan referensi"
          ]}
          activeStep={activeProgressStep}
          status="loading"
        />
      </div>
    );
  }

  if (status === "error") {
    const isMissingStory = errorMsg?.includes("Belum ada ide cerita");
    
    if (isMissingStory) {
      return (
        <div className="space-y-6">
          <Stepper current={2} />
          <Card className="max-w-xl mx-auto bg-black/40 border-white/10 p-6 md:p-8 backdrop-blur-xl shadow-2xl rounded-[32px] text-center space-y-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border bg-amber-500/10 border-amber-500/25 text-amber-400 mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white tracking-tight">Ide cerita kosong</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {errorMsg}
              </p>
            </div>
            <button
              onClick={() => {
                setStep(0);
                navigate("/idea");
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] py-3 text-sm font-semibold text-white transition duration-200 border border-blue-400/20 shadow-lg shadow-blue-500/15"
            >
              Kembali tulis ide
            </button>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Stepper current={2} />
        <AIProgressPanel
          title="AI sedang menyiapkan referensi"
          description="Membuat gambar karakter dan lokasi..."
          steps={[
            "Membaca cerita",
            "Menentukan karakter dan lokasi",
            "Membuat gambar referensi",
            "Menyimpan referensi"
          ]}
          activeStep={activeProgressStep}
          status="error"
          errorMessage={errorMsg || "Referensi otomatis gagal dibuat."}
          skipText="Lewati"
          onRetry={() => {
            loadRefs();
          }}
          onSkip={() => {
            setReferencesStatus("success");
          }}
        />
      </div>
    );
  }

  const autoRefs = (references || []).filter((r) => r?.type === "auto");
  const manualRefs = (references || []).filter((r) => r?.type === "manual");
  const isEmpty = autoRefs.length === 0;

  // Compute fallback status for dynamic headline
  const refFallbackCount = autoRefs.filter(r => !isReferenceReal(r)).length;
  const refRealCount = autoRefs.filter(r => isReferenceReal(r)).length;
  const isAllFallback = autoRefs.length > 0 && refFallbackCount === autoRefs.length;
  const isAllReal = autoRefs.length > 0 && refRealCount === autoRefs.length;
  const isMixed = refFallbackCount > 0 && refRealCount > 0;

  const refTitle = isAllFallback
    ? "Referensi sementara sudah dibuat"
    : isAllReal
      ? "Referensi otomatis siap dipakai"
      : isMixed
        ? "Referensi campuran tersedia"
        : "Referensi otomatis sudah disiapkan";

  const refDesc = isAllFallback
    ? "Provider gambar belum berhasil membuat referensi real. Kamu bisa lanjut sebagai draft, upload gambar sendiri, atau coba generate ulang."
    : isMixed
      ? `${refRealCount} referensi real dan ${refFallbackCount} sementara. Kamu bisa generate ulang yang sementara atau lanjut dengan yang ada.`
      : "Berdasarkan Master Bible dan narasi, sistem menyiapkan referensi terbaik. User pemula cukup lanjut; upload manual hanya jika punya gambar sendiri.";

  return (
    <div className="space-y-6">
      <Stepper current={2} />
      <ScreenHeader
        badge="Langkah 3 dari 7"
        title={refTitle}
        desc={refDesc}
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
      />

      {/* Honest fallback notice or beginner tip */}
      {isAllFallback ? (
        <div className="mb-5 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-100">Semua referensi masih draft visual.</p>
            <p className="mt-1 text-xs text-amber-200/80 leading-relaxed">
              Provider gambar sedang tidak tersedia. Referensi sementara tetap bisa dipakai untuk melanjutkan, atau coba generate ulang untuk hasil real.
            </p>
            <button
              type="button"
              onClick={() => { hasTriedAutoLoad.current = false; loadRefs(); }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 px-4 py-1.5 text-xs font-bold transition active:scale-[0.97]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Generate Ulang Referensi Real
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-blue-300/20 bg-blue-500/10 p-4 text-sm text-slate-300 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-200 shrink-0 mt-0.5" />
          <p>
            Untuk pemula: <b className="text-white">cukup lanjut.</b> Kalau tidak punya gambar sendiri, biarkan sistem memakai referensi otomatis ini.
          </p>
        </div>
      )}

      {/* Partial success warning banner */}
      {warningBanner && (
        <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm text-amber-200 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
          <p>{warningBanner}</p>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/[0.05]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Referensi Otomatis{" "}
                <span className="text-slate-400 font-normal">
                  {isAllFallback ? "(draft sementara)" : isAllReal ? "(siap dipakai)" : "(sudah disiapkan)"}
                </span>
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {isAllFallback
                  ? "Gambar ini masih placeholder. Kamu bisa generate ulang atau upload sendiri."
                  : "Sistem memilih gambar paling pas untuk cerita kamu. Bebas dipakai atau diganti."
                }
              </p>
            </div>
            {isAllFallback ? (
              <Pill tone="amber">Draft Visual</Pill>
            ) : isMixed ? (
              <Pill tone="amber">{refRealCount} Real · {refFallbackCount} Draft</Pill>
            ) : (
              <Pill tone="green">Semua Real</Pill>
            )}
          </div>

          {isEmpty ? (
            <div className="py-16 text-center space-y-4 max-w-sm mx-auto">
              <Sparkles className="h-12 w-12 text-slate-500 mx-auto animate-pulse" />
              <div>
                <h4 className="text-base font-bold text-white">Belum ada referensi otomatis</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Belum ada referensi. Kamu bisa lanjut atau upload gambar sendiri.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadRefs();
                }}
                className="rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 px-5 py-2.5 text-xs font-bold transition active:scale-[0.98]"
              >
                Coba buat referensi otomatis
              </button>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              {autoRefs.map((ref) => (
                <div key={ref.id} className="rounded-3xl border border-white/10 bg-black/20 p-4 flex flex-col justify-between">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white text-sm line-clamp-1">{ref.title}</p>
                      <span className="inline-block mt-1 text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">
                        {ref.category}
                      </span>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-emerald-200 shrink-0" />
                  </div>
                  
                  <div 
                    className="aspect-[3/4] rounded-xl border border-white/10 bg-cover bg-center relative group overflow-hidden mb-3" 
                    style={{ backgroundImage: `url(${ref.imageUrl})`, backgroundColor: "#1e293b" }}
                  >
                    {/* Provider Evidence Badge */}
                    <div className={`absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase border backdrop-blur-md ${
                      isReferenceReal(ref)
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                        : 'bg-amber-500/20 text-amber-300 border-amber-400/30'
                    }`}>
                      {isReferenceReal(ref) ? '✓ REAL' : '⚠ FALLBACK'}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition duration-200 p-3 flex items-end">
                      <p className="text-[10px] text-slate-200 leading-normal">{ref.description}</p>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[32px] line-clamp-2">
                    {ref.description}
                  </p>

                  {/* Regeneration button for fallback items */}
                  {!isReferenceReal(ref) && (
                    <button
                      type="button"
                      onClick={() => loadRefs()}
                      className="mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/25 px-3 py-1.5 text-[10px] font-bold transition active:scale-[0.97]"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Regenerasi
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User manual items display if they uploaded custom items */}
          {manualRefs.length > 0 && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <h4 className="text-sm font-semibold text-white mb-3">Gambar Anda (Gambar Saya):</h4>
              <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                {manualRefs.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-white/10 bg-black/20 p-2 text-center space-y-2">
                    <div
                      className="aspect-square rounded-xl border border-white/10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${r.imageUrl})`, backgroundColor: "#1e293b" }}
                    />
                    <p className="text-[10px] text-slate-300 font-semibold truncate px-1">{r.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-400">
            Referensi ini akan digunakan di semua adegan agar hasil video konsisten dan cerita terasa hidup.
          </div>
        </Card>

        <Card className="bg-white/[0.05]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-white">Punya gambar sendiri?</h3>
            <Pill tone="purple">Opsional</Pill>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-400 font-light">
            Tidak wajib. Upload hanya jika kamu ingin mengganti atau menambahkan referensi.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleManualUpload}
            className="hidden"
            accept="image/*"
          />

          <div className="mt-5 rounded-3xl border border-dashed border-violet-300/40 bg-violet-400/5 p-8 text-center">
            <UploadCloud className="mx-auto h-12 w-12 text-violet-200 animate-pulse" />
            <h4 className="mt-4 text-lg font-semibold text-white">Upload gambar saya</h4>
            <p className="mt-2 text-sm text-slate-400">JPG, PNG, WebP · maks. 20MB per file</p>
            <div className="mt-5">
              <PrimaryButton icon={UploadCloud} onClick={() => fileInputRef.current?.click()}>
                Pilih Gambar
              </PrimaryButton>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ManualSlot
              title="Ganti karakter utama"
              text="Pakai wajah atau sosok sendiri."
              onAdd={() => fileInputRef.current?.click()}
            />
            <ManualSlot
              title="Tambah lokasi asli"
              text="Tambahkan lokasi yang ingin dipakai."
              onAdd={() => fileInputRef.current?.click()}
            />
            <ManualSlot
              title="Tambah style / moodboard"
              text="Tambahkan gaya visual atau mood."
              onAdd={() => fileInputRef.current?.click()}
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

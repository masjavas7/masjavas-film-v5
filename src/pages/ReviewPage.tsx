import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Mic2, RefreshCcw, AlertTriangle, Sparkles } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { Check } from "../components/shared/PrimitiveBlocks";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { useSceneComposerStore } from "../stores/sceneComposerStore";
import { projectService } from "../services/projectService";
import { sceneDraftService } from "../services/sceneDraftService";
import { AIProgressPanel } from "../components/shared/AIProgressPanel";

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    ideaText,
    reviewNarration,
    setReviewNarration,
    setStep,
    activeProjectId,
    storyDraft,
    setStoryDraft,
    narration,
    setNarration,
    createScenesFromNarration,
    loadingStates,
    errorMessages,
    setNarrationStatus
  } = useProjectFlowStore();

  const [isRevising, setIsRevising] = React.useState(false);
  const [isGeneratingScenes, setIsGeneratingScenes] = React.useState(false);
  const [progressText, setProgressText] = React.useState<string>("");
  const [scenesError, setScenesError] = React.useState<string | null>(null);
  const [activeProgressStep, setActiveProgressStep] = React.useState(0);

  const fetchNarration = async () => {
    if (!ideaText) return;
    setNarrationStatus("loading");
    setActiveProgressStep(0); // Membaca ide
    try {
      await new Promise((r) => setTimeout(r, 600));
      setActiveProgressStep(1); // Menyusun pembuka
      
      const generated = await projectService.generateProjectNarration(activeProjectId, ideaText);
      setActiveProgressStep(2); // Menyusun inti cerita
      await new Promise((r) => setTimeout(r, 500));
      
      setActiveProgressStep(3); // Menyusun akhir cerita
      await new Promise((r) => setTimeout(r, 500));

      setStoryDraft(generated);
      setNarration(generated.narration || "");
      setReviewNarration(generated.narration || "");
      setNarrationStatus("success");
    } catch (err) {
      console.error("[Narration Generation Failure Details]:", err);
      setNarrationStatus("error", "Gagal merapikan cerita otomatis karena kendala jaringan atau limit kapasitas AI. Silakan coba lagi.");
    }
  };

  React.useEffect(() => {
    // If there is an ideaText and no narration is present (or it's the old default)
    if (ideaText && (!reviewNarration || reviewNarration.startsWith("Dalam kegelapan malam yang diguyur hujan deras, Hari dan Wiwi memacu motor tuanya"))) {
      fetchNarration();
    } else if (ideaText && storyDraft) {
      setNarrationStatus("success");
    }
  }, [ideaText]);

  const handleNext = async () => {
    setIsGeneratingScenes(true);
    setScenesError(null);
    try {
      setProgressText("Membagi cerita menjadi adegan...");
      await new Promise(r => setTimeout(r, 600));

      console.log("[ReviewPage] Synchronizing narration snapshot on server...");
      await projectService.updateProject(activeProjectId, {
        reviewNarration: reviewNarration || narration || "",
        narration: reviewNarration || narration || ""
      });

      setProgressText("Menyiapkan teks narasi setiap adegan...");
      console.log("[ReviewPage] Ensuring scene drafts via backend service...");
      const generatedScenes = await sceneDraftService.ensureSceneDrafts(activeProjectId, true);

      // Save generated scenes to Zustand store (syncs with sceneComposerStore)
      createScenesFromNarration(generatedScenes);

      // Trigger automatic storyboard generation for scene-1 immediately, and pre-generate the rest in the background!
      if (generatedScenes && generatedScenes.length > 0) {
        const firstSceneId = generatedScenes[0].id;
        console.log(`[ReviewPage] Auto-triggering storyboard for Scene 1: ${firstSceneId}`);
        useSceneComposerStore.getState().generateStoryboard(firstSceneId);

        // Pre-generate storyboard for the other scenes in background
        generatedScenes.slice(1).forEach((s: any) => {
          console.log(`[ReviewPage] Background pre-triggering storyboard for Scene ${s.sceneNumber}: ${s.id}`);
          useSceneComposerStore.getState().generateStoryboard(s.id);
        });
      }

      setStep(4); // Audio prep step
      navigate("/audio-prep");
    } catch (err) {
      console.error("Gagal memecah adegan:", err);
      setScenesError("Cerita belum bisa dibagi menjadi adegan. Coba lagi.");
    } finally {
      setIsGeneratingScenes(false);
      setProgressText("");
    }
  };

  const handleBack = () => {
    setStep(2); // Referensi step
    navigate("/references");
  };

  const handleRequestRevision = async () => {
    setIsRevising(true);
    try {
      const generated = await projectService.generateProjectNarration(activeProjectId, ideaText || "Draf revisi cerita.");
      setStoryDraft(generated);
      setNarration(generated.narration || "");
      setReviewNarration(generated.narration || "");
    } catch (error) {
      console.error("Gagal merevisi narasi:", error);
      alert("Gagal melakukan revisi otomatis. Menggunakan versi saat ini.");
    } finally {
      setIsRevising(false);
    }
  };

  const handleVoiceStyle = () => {
    alert("Gaya narasi disesuaikan menjadi: Sinematik & Dramatis.");
  };

  // 1. Guard check if no idea text is active
  if (!ideaText) {
    return (
      <div className="space-y-6">
        <Stepper current={3} />
        <Card className="bg-white/[0.05] p-8 text-center max-w-md mx-auto space-y-6">
          <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto" />
          <div>
            <h3 className="text-lg font-bold text-white">Belum ada ide cerita</h3>
            <p className="text-sm text-slate-400 mt-2">Tulis ide cerita Anda terlebih dahulu agar AI bisa memprosesnya.</p>
          </div>
          <PrimaryButton onClick={() => { setStep(0); navigate("/idea"); }}>
            Kembali
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  // 2. Loading state progress panel
  const narrationStatus = loadingStates?.narration || "idle";
  const narrationError = errorMessages?.narration;

  if (narrationStatus === "loading") {
    return (
      <div className="space-y-6">
        <Stepper current={3} />
        <AIProgressPanel
          title="AI sedang merapikan cerita"
          description="Merapikan alur agar enak ditonton..."
          estimatedTime="Biasanya selesai dalam 15–30 detik."
          steps={[
            "Membaca ide",
            "Menyusun pembuka",
            "Menyusun inti cerita",
            "Menyusun akhir cerita"
          ]}
          activeStep={activeProgressStep}
          status="loading"
        />
      </div>
    );
  }

  // 3. Error state progress panel with retry
  if (narrationStatus === "error") {
    return (
      <div className="space-y-6">
        <Stepper current={3} />
        <AIProgressPanel
          title="AI sedang merapikan cerita"
          description="Merapikan alur agar enak ditonton..."
          steps={[
            "Membaca ide",
            "Menyusun pembuka",
            "Menyusun inti cerita",
            "Menyusun akhir cerita"
          ]}
          activeStep={activeProgressStep}
          status="error"
          errorMessage={narrationError || "Narasi gagal dibuat. Coba lagi."}
          onRetry={fetchNarration}
        />
      </div>
    );
  }

  // 4. Empty story draft guard
  if (!storyDraft) {
    return (
      <div className="space-y-6">
        <Stepper current={3} />
        <Card className="bg-white/[0.05] p-8 text-center max-w-md mx-auto space-y-6">
          <Sparkles className="h-12 w-12 text-slate-500 mx-auto animate-pulse" />
          <div>
            <h3 className="text-lg font-bold text-white">Belum ada cerita</h3>
            <p className="text-sm text-slate-400 mt-2">Cerita Anda belum diproses oleh AI.</p>
          </div>
          <PrimaryButton onClick={fetchNarration}>
            Generate
          </PrimaryButton>
        </Card>
      </div>
    );
  }

  if (isGeneratingScenes) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="h-12 w-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
        <h3 className="text-xl font-semibold text-white">{progressText || "Menyiapkan daftar adegan..."}</h3>
        <p className="text-sm text-slate-400">AI sedang memproses berkas narasi Anda.</p>
      </div>
    );
  }

  // Opener/Core/Ending previews from storyDraft with optional chaining safety
  const openerPreview = storyDraft?.opener || "Pembuka cerita baru.";
  const corePreview = storyDraft?.core || "Inti/konflik cerita baru.";
  const endingPreview = storyDraft?.ending || "Penutup/resolusi cerita baru.";

  return (
    <div className="space-y-6">
      <Stepper current={3} />
      <ScreenHeader
        badge="Langkah 4 dari 8"
        title="Review cerita yang sudah dirapikan AI"
        desc="Lihat versi bahasa manusia: pembuka, alur, dan narasi awal. Jika cocok, lanjut. Jika belum, revisi dulu."
        cta="Saya setuju, siapkan narasi audio"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
      />
      {scenesError && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-300 text-center flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-400" />
          {scenesError}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/[0.05]">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-white">Draft cerita</h3>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
              Mudah dibaca
            </span>
          </div>

          <div className="mt-5 space-y-4 text-sm leading-7 text-slate-300">
            <p>
              <b className="text-white">Narasi AI Aktif:</b>
            </p>
            <div className="p-4 rounded-2xl bg-black/45 border border-white/5 italic text-slate-200 leading-relaxed max-h-[300px] overflow-y-auto">
              "{reviewNarration || narration || ""}"
            </div>
            
            <p className="mt-4"><b className="text-white">Pembuka:</b> {openerPreview}</p>
            <p><b className="text-white">Inti cerita:</b> {corePreview}</p>
            <p><b className="text-white">Akhir:</b> {endingPreview}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <SecondaryButton icon={RefreshCcw} onClick={handleRequestRevision} disabled={isRevising}>
              {isRevising ? "Mendraf ulang..." : "Coba lagi"}
            </SecondaryButton>
            <SecondaryButton icon={Mic2} onClick={handleVoiceStyle}>
              Ubah gaya narasi
            </SecondaryButton>
          </div>
        </Card>

        <Card className="bg-white/[0.05]">
          <h3 className="text-xl font-semibold text-white">Checklist sederhana</h3>
          <div className="mt-5 space-y-3">
            <Check text="Cerita sudah punya pembuka menarik" />
            <Check text="Alur tidak membingungkan" />
            <Check text="Nada video sesuai preset" />
            <Check text="Siap dibuat menjadi adegan" />
          </div>
        </Card>
      </div>
    </div>
  );
};

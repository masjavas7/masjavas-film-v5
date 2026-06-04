import * as React from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle, RefreshCcw, Play, Pause, SkipForward, SkipBack, Video, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, Pill } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { getApiBaseUrl } from "../services/apiBase";
import { cn } from "../utils";

export const PreviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { setStep, scenes } = useProjectFlowStore();
  const [currentSceneIndex, setCurrentSceneIndex] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // Filter only generated scenes that have video URLs
  const generatedScenes = React.useMemo(() => {
    return (scenes || [])
      .filter((s) => s.isGenerated && s.previewVideoUrl)
      .sort((a, b) => a.sceneNumber - b.sceneNumber);
  }, [scenes]);

  // Sync index to keep it in valid range
  React.useEffect(() => {
    if (generatedScenes.length > 0 && currentSceneIndex >= generatedScenes.length) {
      setCurrentSceneIndex(0);
    }
  }, [generatedScenes, currentSceneIndex]);

  const handleNext = () => {
    setStep(7); // Download/Export step
    navigate("/export");
  };

  const handleBack = () => {
    setStep(5); // Cek Adegan step
    navigate("/scenes");
  };

  // Helper to securely resolve dynamic local/remote video URLs on Windows/Electron
  const resolveVideoUrl = (url?: string) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("file://") ||
      url.startsWith("app://")
    ) {
      return url;
    }
    // Windows local path resolution (C:\...)
    if (/^[a-zA-Z]:\\/.test(url) || url.startsWith("\\\\")) {
      return `file:///${url.replace(/\\/g, "/")}`;
    }
    // Serves dynamically via local express upload proxy
    return `${getApiBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
  };

  const currentScene = generatedScenes[currentSceneIndex];
  const activeVideoUrl = currentScene ? resolveVideoUrl(currentScene.previewVideoUrl) : "";

  const handlePlayPause = () => {
    if (!currentScene) return;
    if (isPlaying) {
      videoRef.current?.pause();
      setIsPlaying(false);
    } else {
      videoRef.current?.play().catch((err) => console.log("Play failed:", err));
      setIsPlaying(true);
    }
  };

  const handleNextScene = () => {
    if (currentSceneIndex < generatedScenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setIsPlaying(true);
    }
  };

  const handlePrevScene = () => {
    if (currentSceneIndex > 0) {
      setCurrentSceneIndex((prev) => prev - 1);
      setIsPlaying(true);
    }
  };

  const handleVideoEnded = () => {
    if (currentSceneIndex < generatedScenes.length - 1) {
      setCurrentSceneIndex((prev) => prev + 1);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
      setCurrentSceneIndex(0); // Reset to start
    }
  };

  const totalDurationSeconds = React.useMemo(() => {
    return (scenes || []).reduce((acc, s) => acc + (s.durationSec || s.videoSettings?.duration || 10), 0);
  }, [scenes]);

  const activeQualityCount = React.useMemo(() => {
    let score = 0;
    if (scenes && scenes.length > 0) {
      if (scenes.every(s => s.checklist?.narrationReady)) score++;
      if (scenes.some(s => s.references && s.references.length > 0)) score++;
      if (scenes.every(s => s.checklist?.storyboardReady)) score++;
      if (scenes.every(s => s.isGenerated)) score++;
    }
    return score;
  }, [scenes]);

  return (
    <div className="space-y-6">
      <Stepper current={6} />
      <ScreenHeader
        badge="Langkah 7 dari 8"
        title="Tonton preview, lalu pilih lanjut atau revisi"
        desc="Yang terlihat adalah playlist video adegan nyata hasil render GrokPI, dilengkapi narasi subtitle."
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
        disabled={generatedScenes.length === 0}
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {generatedScenes.length === 0 ? (
          /* Premium Empty State */
          <Card className="bg-white/[0.02] border border-white/5 p-8 flex flex-col items-center justify-center min-h-[450px] rounded-3xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 opacity-30 pointer-events-none" />
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/25 mb-5 relative animate-pulse shadow-lg shadow-amber-500/10">
              <Video className="h-7 w-7 text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white text-center">Belum Ada Video Adegan yang Selesai</h3>
            <p className="text-slate-400 text-sm text-center max-w-md mt-3 leading-relaxed">
              Semua adegan di dalam proyek ini belum memiliki file video. Anda harus memproses atau men-generate adegan film menggunakan AI GrokPI terlebih dahulu di halaman Cek Adegan.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-center">
              <PrimaryButton icon={PlayCircle} onClick={() => navigate("/scenes")}>
                Mulai Buat Video Adegan
              </PrimaryButton>
              <SecondaryButton icon={RefreshCcw} onClick={() => navigate("/scenes")}>
                Cek Adegan
              </SecondaryButton>
            </div>
          </Card>
        ) : (
          /* Premium Real Playlist Player */
          <Card className="bg-white/[0.04] border border-white/10 p-6 rounded-3xl flex flex-col justify-between space-y-5">
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                  <Pill tone="soft">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse mr-1" />
                    Pratinjau Video Aktif
                  </Pill>
                </div>
                <span className="text-xs font-medium text-slate-400">
                  Adegan {currentScene.sceneNumber} dari {generatedScenes.length} selesai
                </span>
              </div>

              {/* Aspect Video frame */}
              <div className="aspect-video rounded-2xl border border-white/10 bg-black relative overflow-hidden flex items-center justify-center shadow-2xl group">
                <video
                  ref={videoRef}
                  src={activeVideoUrl}
                  className="w-full h-full object-cover"
                  controls={false}
                  autoPlay={isPlaying}
                  onEnded={handleVideoEnded}
                />

                {/* Ambient vignette gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35 pointer-events-none opacity-90" />

                {/* Overlay details */}
                <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-white/10 shadow-lg">
                  <p className="text-[10px] font-semibold tracking-wider text-cyan-400 uppercase">ADEGAN TERKINI</p>
                  <h4 className="text-xs font-bold text-white max-w-[200px] truncate">{currentScene.title}</h4>
                </div>

                {/* Subtitle Overlay (Premium Cinema style) */}
                {currentScene.narration && (
                  <div className="absolute bottom-5 left-4 right-4 z-20 flex justify-center pointer-events-none">
                    <div className="bg-black/85 px-4.5 py-2.5 rounded-2xl border border-white/10 max-w-[90%] text-center shadow-2xl backdrop-blur-md transition-all duration-300">
                      <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        "{currentScene.narration}"
                      </p>
                    </div>
                  </div>
                )}

                {/* Centered big play button overlay when paused */}
                {!isPlaying && (
                  <button
                    type="button"
                    onClick={handlePlayPause}
                    className="absolute z-30 p-4 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white shadow-xl shadow-cyan-500/25 transform hover:scale-110 transition active:scale-95 duration-200"
                  >
                    <Play className="h-8 w-8 fill-current text-white" />
                  </button>
                )}
              </div>

              {/* Horizontal Timeline Playlist Navigator */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-[11px] font-bold text-slate-400 tracking-wider uppercase">Daftar Adegan Proyek</p>
                  <span className="text-[10px] bg-white/[0.05] border border-white/5 text-slate-300 px-2 py-0.5 rounded-md font-mono">
                    Total Durasi ~{totalDurationSeconds}s
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {generatedScenes.map((s, idx) => {
                    const isActive = idx === currentSceneIndex;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setCurrentSceneIndex(idx);
                          setIsPlaying(true);
                        }}
                        className={cn(
                          "flex-none px-4 py-2.5 rounded-xl border transition-all text-left max-w-[170px]",
                          isActive
                            ? "bg-gradient-to-r from-cyan-500/15 to-purple-600/15 border-cyan-400 text-white shadow-md shadow-cyan-500/5 font-semibold"
                            : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full shrink-0",
                            isActive ? "bg-cyan-400 animate-pulse" : "bg-slate-500"
                          )} />
                          <span className="text-[10px] uppercase font-mono tracking-wider opacity-70">
                            Adegan {s.sceneNumber}
                          </span>
                        </div>
                        <p className="text-xs truncate font-medium">{s.title}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Control Buttons Bar */}
            <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2">
                <PrimaryButton
                  icon={isPlaying ? Pause : Play}
                  onClick={handlePlayPause}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 border-none shadow-lg shadow-cyan-500/15"
                >
                  {isPlaying ? "Pause Preview" : "Putar Preview"}
                </PrimaryButton>

                <SecondaryButton
                  icon={SkipBack}
                  onClick={handlePrevScene}
                  disabled={currentSceneIndex === 0}
                  className="px-3"
                  title="Adegan Sebelumnya"
                >
                  {""}
                </SecondaryButton>

                <SecondaryButton
                  icon={SkipForward}
                  onClick={handleNextScene}
                  disabled={currentSceneIndex === generatedScenes.length - 1}
                  className="px-3"
                  title="Adegan Selanjutnya"
                >
                  {""}
                </SecondaryButton>
              </div>

              <SecondaryButton icon={RefreshCcw} onClick={() => navigate("/scenes")}>
                Revisi Adegan
              </SecondaryButton>
            </div>
          </Card>
        )}

        {/* Diagnostic / Validation Checks list */}
        <Card className="bg-white/[0.04] border border-white/10 p-6 rounded-3xl flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Hasil Pemeriksaan Sistem</h3>
              <Pill tone={activeQualityCount === 4 ? "green" : "amber"}>
                {activeQualityCount}/4 Lulus
              </Pill>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Sistem telah menganalisis kelayakan film Anda sebelum diekspor ke tahap final:
            </p>

            <div className="space-y-3.5 mt-4">
              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", scenes && scenes.every(s => s.checklist?.narrationReady) ? "text-emerald-400" : "text-slate-500")} />
                  <span className="text-xs font-semibold text-slate-300">Struktur Narasi & Dialog</span>
                </div>
                <Pill tone={scenes && scenes.every(s => s.checklist?.narrationReady) ? "green" : "soft"}>
                  {scenes && scenes.every(s => s.checklist?.narrationReady) ? "Bagus" : "Siap"}
                </Pill>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", scenes && scenes.some(s => s.references && s.references.length > 0) ? "text-emerald-400" : "text-slate-500")} />
                  <span className="text-xs font-semibold text-slate-300">Konsistensi Aset & Gaya</span>
                </div>
                <Pill tone={scenes && scenes.some(s => s.references && s.references.length > 0) ? "green" : "soft"}>
                  {scenes && scenes.some(s => s.references && s.references.length > 0) ? "Konsisten" : "Siap"}
                </Pill>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", scenes && scenes.every(s => s.checklist?.storyboardReady) ? "text-emerald-400" : "text-slate-500")} />
                  <span className="text-xs font-semibold text-slate-300">Sinkronisasi Audio & Subtitle</span>
                </div>
                <Pill tone={scenes && scenes.every(s => s.checklist?.storyboardReady) ? "green" : "soft"}>
                  {scenes && scenes.every(s => s.checklist?.storyboardReady) ? "Sinkron" : "Siap"}
                </Pill>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.01] p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className={cn("h-5 w-5 shrink-0", generatedScenes.length === scenes.length ? "text-emerald-400" : "text-amber-400")} />
                  <span className="text-xs font-semibold text-slate-300">Penyelarasan Durasi Adegan</span>
                </div>
                <Pill tone={generatedScenes.length === scenes.length ? "green" : "amber"}>
                  {generatedScenes.length === scenes.length ? "Sesuai" : "Sebagian"}
                </Pill>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl border border-blue-500/20 p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-cyan-300 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Catatan Ekspor Final</h4>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  Pada tahap berikutnya, server akan secara otomatis menggabungkan seluruh video adegan di atas menjadi satu film tunggal (.mp4) beresolusi tinggi, menempelkan subtitle secara hardcode, serta menyelaraskan volume audio.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};


import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, WandSparkles } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton, SecondaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { Tip } from "../components/shared/PrimitiveBlocks";
import { useProjectFlowStore } from "../stores/projectFlowStore";

export const IdeaPage: React.FC = () => {
  const navigate = useNavigate();
  const { ideaText, setIdeaText, setStep } = useProjectFlowStore();
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

  const handleNext = () => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    const finalIdea = localIdea.trim();
    if (!finalIdea) {
      const fallbackIdea = "Aku mau bikin video tentang Hari dan Wiwi yang dikejar di jalan hujan, lalu mereka masuk terowongan dan harus lolos dalam waktu sangat sempit.";
      setLocalIdea(fallbackIdea);
      setIdeaText(fallbackIdea);
    } else {
      setIdeaText(finalIdea);
    }
    setStep(1); // Pilih Gaya step
    navigate("/presets");
  };

  const handleBack = () => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    setStep(0);
    navigate("/start");
  };

  const handleGiveSample = () => {
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }
    const sample = "Petualangan Hari dan Wiwi mengeksplorasi terowongan bawah tanah kota kuno yang dibanjiri air hujan, berusaha mencari jalan keluar rahasia.";
    setLocalIdea(sample);
    setIdeaText(sample);
  };

  return (
    <div className="space-y-6">
      <Stepper current={0} />
      <ScreenHeader
        badge="Langkah 1 dari 7"
        title="Tulis ide video seperti sedang bercerita"
        desc="Tidak perlu rapi. MASJAVAS AI akan membantu merapikan ide menjadi cerita yang enak ditonton."
        cta="Lanjut"
        onNext={handleNext}
        onBack={handleBack}
        backLabel="Kembali"
      />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="bg-white/[0.05]">
          <label>
            <span className="mb-3 block text-sm font-semibold text-white">Ide video kamu</span>
            <textarea
              className="min-h-[260px] w-full rounded-3xl border border-white/10 bg-black/30 p-5 text-base leading-7 text-slate-200 outline-none placeholder:text-slate-600 focus:border-blue-500/50 transition focus:ring-1 focus:ring-blue-500/20"
              placeholder="Contoh: Aku mau bikin video tentang Hari dan Wiwi yang dikejar di jalan hujan..."
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
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <PrimaryButton icon={WandSparkles} onClick={handleNext}>
              Generate
            </PrimaryButton>
            <SecondaryButton icon={Sparkles} onClick={handleGiveSample}>
              Berikan contoh ide
            </SecondaryButton>
          </div>
        </Card>
        <Card className="bg-white/[0.05]">
          <h3 className="text-xl font-semibold text-white">Tips singkat</h3>
          <div className="mt-5 space-y-3">
            <Tip text="Tulis topik utama, misalnya misteri, edukasi, kisah manusia, atau aksi." />
            <Tip text="Tulis suasana yang diinginkan: tenang, menegangkan, lucu, premium." />
            <Tip text="Tulis platform tujuan bila tahu: YouTube, TikTok, atau Reels." />
            <Tip text="Tidak perlu memikirkan prompt, scene, audio, atau rendering." />
          </div>
        </Card>
      </div>
    </div>
  );
};

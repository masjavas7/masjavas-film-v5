import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/ui/Card";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { Stepper } from "../components/ui/Stepper";
import { ChipGrid } from "../components/shared/PrimitiveBlocks";
import { useProjectFlowStore } from "../stores/projectFlowStore";
import { platformPresets, durationPresets, tonePresets, presetCards } from "../data/appData";
import { cn } from "../utils";

interface PresetCardProps {
  title: string;
  desc: string;
  tag: string;
  active: boolean;
  onClick: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({ title, desc, tag, active, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl border p-5 transition cursor-pointer active:scale-[0.98]",
        active
          ? "border-blue-300/45 bg-blue-500/10 shadow-lg shadow-blue-500/5"
          : "border-white/10 bg-black/20 hover:bg-white/[0.05] hover:border-white/20"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-slate-200">
          {tag}
        </span>
      </div>
      <h4 className="text-lg font-semibold text-white">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-400">{desc}</p>
    </div>
  );
};

export const PresetsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    selectedPreset,
    setSelectedPreset,
    aspectRatioIndex,
    setAspectRatioIndex,
    durationPresetIndex,
    setDurationPresetIndex,
    tonePresetIndex,
    setTonePresetIndex,
    setStep
  } = useProjectFlowStore();

  const handleNext = () => {
    setStep(2); // Referensi step
    navigate("/references");
  };

  const handleBack = () => {
    setStep(0); // Tulis Ide step
    navigate("/idea");
  };

  return (
    <div className="space-y-6">
      <Stepper current={1} />
      <ScreenHeader
        badge="Langkah 2 dari 7"
        title="Pilih gaya video dengan preset siap pakai"
        desc="Semua opsi teknis disederhanakan menjadi pilihan yang mudah dipahami."
        cta="Lanjut"
        onBack={handleBack}
        onNext={handleNext}
        backLabel="Kembali"
      />
      
      <div className="space-y-6">
        <Card className="bg-white/[0.05]">
          <h3 className="mb-4 text-xl font-semibold text-white">Gaya video</h3>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {presetCards.map((preset, index) => (
              <PresetCard
                key={preset.title}
                title={preset.title}
                desc={preset.desc}
                tag={preset.tag}
                active={selectedPreset === index || (selectedPreset === null && index === 0)}
                onClick={() => setSelectedPreset(index)}
              />
            ))}
          </div>
        </Card>

        <Card className="bg-white/[0.05]">
          <h3 className="mb-4 text-xl font-semibold text-white">Platform</h3>
          <ChipGrid
            items={platformPresets}
            active={aspectRatioIndex === 4 ? 0 : aspectRatioIndex === 3 ? 1 : aspectRatioIndex === 2 ? 2 : 3}
            onChange={(idx) => {
              if (idx === 0) setAspectRatioIndex(4);
              else if (idx === 1) setAspectRatioIndex(3);
              else if (idx === 2) setAspectRatioIndex(2);
              else setAspectRatioIndex(0);
            }}
          />
        </Card>

        <Card className="bg-white/[0.05]">
          <h3 className="mb-4 text-xl font-semibold text-white">Panjang video</h3>
          <ChipGrid
            items={durationPresets}
            active={durationPresetIndex}
            onChange={setDurationPresetIndex}
          />
        </Card>

        <Card className="bg-white/[0.05]">
          <h3 className="mb-4 text-xl font-semibold text-white">Suasana</h3>
          <ChipGrid
            items={tonePresets}
            active={tonePresetIndex}
            onChange={setTonePresetIndex}
          />
        </Card>
      </div>
    </div>
  );
};

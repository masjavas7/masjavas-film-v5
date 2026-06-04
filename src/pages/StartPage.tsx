import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Library, PenLine, Sparkles, LucideIcon } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { useProjectFlowStore } from "../stores/projectFlowStore";

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  onClick: () => void;
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({ icon: Icon, title, text, cta, onClick }) => {
  return (
    <Card className="flex flex-col h-full bg-white/[0.05]">
      <Icon className="h-8 w-8 text-cyan-200" />
      <h3 className="mt-5 text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-3 min-h-[52px] text-sm leading-6 text-slate-400">{text}</p>
      <div className="mt-auto pt-6">
        <PrimaryButton onClick={onClick} className="w-full">
          {cta}
        </PrimaryButton>
      </div>
    </Card>
  );
};

export const StartPage: React.FC = () => {
  const navigate = useNavigate();
  const { setIdeaText, setStep } = useProjectFlowStore();

  const handleStartOwn = () => {
    setStep(0); // Tulis Ide step
    navigate("/idea");
  };

  const handleUseSample = () => {
    setIdeaText("Petualangan Hari dan Wiwi mengeksplorasi reruntuhan kota bawah laut kuno yang bercahaya neon, diburu monster gurita mekanik raksasa.");
    setStep(0); // Tulis Ide step
    navigate("/idea");
  };

  const handleOpenLibrary = () => {
    navigate("/library");
  };

  return (
    <div className="space-y-6">
      <ScreenHeader
        badge="Mulai"
        title="Pilih Cara Memulai Produksi Sinematik Anda"
        desc="Pilih opsi untuk memulai: tulis ide baru dari nol, gunakan cetak biru inspirasi sinematik, atau kelola katalog proyek premium Anda."
        cta="Lanjut"
        onNext={handleStartOwn}
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ChoiceCard
          icon={PenLine}
          title="Tulis Ide Sinematik Baru"
          text="Mulai lembar kerja baru untuk menjabarkan konsep ide orisinal Anda dari awal."
          cta="Lanjut"
          onClick={handleStartOwn}
        />
        <ChoiceCard
          icon={Sparkles}
          title="Gunakan Cetak Biru Inspirasi"
          text="Gunakan template skenario yang telah dikurasi oleh tim sutradara kami untuk memulai."
          cta="Lanjut"
          onClick={handleUseSample}
        />
        <ChoiceCard
          icon={Library}
          title="Kelola Proyek Studio"
          text="Buka kembali draf alur kerja sinematik yang sedang Anda kembangkan di studio."
          cta="Lanjut"
          onClick={handleOpenLibrary}
        />
      </div>
    </div>
  );
};

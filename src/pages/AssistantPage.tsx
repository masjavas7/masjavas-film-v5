import * as React from "react";
import { Send } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { ChatBubble, Tip } from "../components/shared/PrimitiveBlocks";

interface Message {
  id: string;
  who: "AI" | "User";
  text: string;
}

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: "1", who: "AI", text: "Halo! Saya asisten MASJAVAS AI. Ada yang bisa saya bantu untuk proyek video sinematik kamu?" },
    { id: "2", who: "User", text: "Saya bingung di bagian referensi." },
    { id: "3", who: "AI", text: "Untuk pemula, kamu cukup klik lanjut. Sistem sudah membuat referensi otomatis berdasarkan ide dan jalan cerita kamu. Upload manual hanya jika ingin memakai gambar sendiri." }
  ]);
  const [inputValue, setInputValue] = React.useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      who: "User",
      text: inputValue
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponseText =
        inputValue.toLowerCase().includes("storyboard")
          ? "Storyboard dibuat otomatis untuk membantumu memvisualisasikan adegan per detik. Kamu bisa melihat aksi, dialog, sfx, dan shot size di setiap panelnya sebelum membuat video."
          : "Tentu, terus ikuti petunjuk visual di layar. MASJAVAS AI dirancang agar semua bagian teknis diurus di belakang layar, sehingga kamu tinggal mereview hasilnya.";

      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        who: "AI",
        text: aiResponseText
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const handleQuickAction = () => {
    alert("Saran AI diterapkan!");
  };

  return (
    <div>
      <ScreenHeader
        badge="Bantuan AI"
        title="Asisten menjawab dengan bahasa sederhana"
        desc="Asisten memberi saran berikutnya, menjelaskan masalah tanpa istilah teknis, dan menawarkan tombol tindakan."
        cta="Tanya asisten"
        onNext={handleQuickAction}
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-white/[0.05]">
          <h3 className="text-xl font-semibold text-white">Saran saat ini</h3>
          <div className="mt-5 space-y-3">
            <Tip text="Ide kamu sudah cukup. Lanjut pilih gaya video." />
            <Tip text="Referensi otomatis sudah siap, upload manual bisa dilewati." />
            <Tip text="Setiap scene punya panel lengkap sebelum generate video." />
          </div>
        </Card>
        <Card className="bg-white/[0.05] flex flex-col min-h-[450px]">
          <h3 className="text-xl font-semibold text-white mb-4">Chat bantuan</h3>
          <div className="space-y-4 flex-1 overflow-y-auto max-h-[300px] mb-4 pr-2">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} who={msg.who} text={msg.text} />
            ))}
          </div>
          <div className="flex gap-2 mt-auto pt-4 border-t border-white/10">
            <input
              type="text"
              placeholder="Tanyakan sesuatu ke asisten AI..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1 rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50 transition"
            />
            <PrimaryButton icon={Send} onClick={handleSend} className="px-4 py-3">
              Kirim
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
};

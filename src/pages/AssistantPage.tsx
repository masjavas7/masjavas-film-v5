import * as React from "react";
import { Send, Sparkles } from "lucide-react";
import { Card } from "../components/ui/Card";
import { PrimaryButton } from "../components/ui/Button";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { ChatBubble, Tip } from "../components/shared/PrimitiveBlocks";
import { sendAssistantChat } from "../services/aiFeaturesService";
import { useProjectLibraryStore } from "../stores/projectLibraryStore";

interface Message {
  id: string;
  who: "AI" | "User";
  text: string;
}

export const AssistantPage: React.FC = () => {
  const activeProjectId = useProjectLibraryStore((s) => s.activeProjectId);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: "1",
      who: "AI",
      text: "Halo! Saya asisten MASJAVAS AI. Tanya rekomendasi proyek, ringkasan film, genre, atau ketik: cari legenda jawa"
    }
  ]);
  const [inputValue, setInputValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      who: "User",
      text: inputValue
    };

    setMessages((prev) => [...prev, userMsg]);
    const sent = inputValue;
    setInputValue("");
    setLoading(true);

    try {
      const data = await sendAssistantChat(sent, activeProjectId);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        who: "AI",
        text: data.reply || "Tidak ada respons."
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          who: "AI",
          text: "Server tidak tersedia. Pastikan backend berjalan di port 3000."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <ScreenHeader
        badge="Bantuan AI"
        title="Asisten produksi film"
        desc="Rekomendasi proyek, pencarian natural language, ringkasan & klasifikasi genre."
        cta="Kirim pesan"
        onNext={handleSend}
      />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="bg-white/[0.05]">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            Perintah cepat
          </h3>
          <div className="mt-5 space-y-3">
            <Tip text='Ketik: "rekomendasi proyek"' />
            <Tip text='Ketik: "ringkas film ini" (butuh proyek aktif)' />
            <Tip text='Ketik: "cari legenda jawa"' />
            <Tip text='Ketik: "klasifikasi genre"' />
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Tulis pertanyaan..."
              className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40"
              disabled={loading}
            />
            <PrimaryButton icon={Send} onClick={handleSend} disabled={loading}>
              {loading ? "..." : "Kirim"}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
};
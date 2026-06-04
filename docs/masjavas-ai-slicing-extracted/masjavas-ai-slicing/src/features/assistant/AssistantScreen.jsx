import { ArrowRight } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { PrimaryButton } from "../../components/ui/Button";
import { ScreenHeader } from "../../components/layout/ScreenHeader";
import { ChatBubble, Tip } from "../../components/shared/PrimitiveBlocks";

export function AssistantScreen() {
  return (
    <div>
      <ScreenHeader badge="Bantuan AI" title="Asisten menjawab dengan bahasa sederhana" desc="Asisten memberi saran berikutnya, menjelaskan masalah tanpa istilah teknis, dan menawarkan tombol tindakan." cta="Tanya asisten" />
      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h3 className="text-xl font-semibold">Saran saat ini</h3>
          <div className="mt-5 space-y-3">
            <Tip text="Ide kamu sudah cukup. Lanjut pilih gaya video." />
            <Tip text="Referensi otomatis sudah siap, upload manual bisa dilewati." />
            <Tip text="Setiap scene punya panel lengkap sebelum generate video." />
          </div>
        </Card>
        <Card>
          <h3 className="text-xl font-semibold">Chat bantuan</h3>
          <div className="mt-5 space-y-4">
            <ChatBubble who="AI" text="Kamu tidak perlu mengatur bagian teknis. Pilih saja gaya video, review referensi, lalu cek setiap adegan." />
            <ChatBubble who="User" text="Saya bingung di bagian referensi." />
            <ChatBubble who="AI" text="Kalau belum punya gambar sendiri, cukup klik lanjut. Sistem sudah membuat referensi otomatis dari cerita kamu." />
            <PrimaryButton icon={ArrowRight}>Pakai saran AI dan lanjut</PrimaryButton>
          </div>
        </Card>
      </div>
    </div>
  );
}

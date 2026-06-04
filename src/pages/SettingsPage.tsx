import * as React from "react";
import { ScreenHeader } from "../components/layout/ScreenHeader";
import { SettingsCard } from "../components/shared/PrimitiveBlocks";
import { getApiBaseUrl } from "../services/apiBase";
import { Loader2 } from "lucide-react";

export const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = React.useState("");
  const [apiBaseUrl, setApiBaseUrl] = React.useState("");
  const [geminiApiKey, setGeminiApiKey] = React.useState("");
  const [geminiBaseUrl, setGeminiBaseUrl] = React.useState("");
  const [storyboardDelaySec, setStoryboardDelaySec] = React.useState(10);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isTestingGrok, setIsTestingGrok] = React.useState(false);
  const [isTestingGemini, setIsTestingGemini] = React.useState(false);

  // Muat pengaturan dari backend saat halaman dimuat
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${getApiBaseUrl()}/api/settings`);
        if (!response.ok) throw new Error("Gagal mengambil pengaturan.");
        const data = await response.json();
        
        setApiKey(data.apiKeyMasked || "");
        setApiBaseUrl(data.apiBaseUrl || "https://www.grokpi.masjavas.my.id/v1");
        setGeminiApiKey(data.geminiApiKeyMasked || "");
        setGeminiBaseUrl(data.geminiBaseUrl || "https://generativelanguage.googleapis.com");
        setStoryboardDelaySec(data.storyboardDelaySec !== undefined ? Number(data.storyboardDelaySec) : 10);
      } catch (err) {
        console.error("[SettingsPage] Error loading settings:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleTestGrokpi = async () => {
    setIsTestingGrok(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings/test-grokpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiBaseUrl })
      });
      const data = await response.json();
      alert(data.message || (response.ok ? "Koneksi GrokPI Sukses!" : "Koneksi GrokPI Gagal."));
    } catch (err: any) {
      alert("Kesalahan Jaringan: " + (err.message || "Gagal menghubungi backend proxy."));
    } finally {
      setIsTestingGrok(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings/test-gemini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey, geminiBaseUrl })
      });
      const data = await response.json();
      alert(data.message || (response.ok ? "Koneksi Gemini Sukses!" : "Koneksi Gemini Gagal."));
    } catch (err: any) {
      alert("Kesalahan Jaringan: " + (err.message || "Gagal menghubungi backend proxy."));
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, apiBaseUrl, geminiApiKey, geminiBaseUrl, storyboardDelaySec })
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyimpan pengaturan.");
      }

      alert("Pengaturan berhasil disimpan!");

      // Refresh data settings dari server
      const refreshResponse = await fetch(`${getApiBaseUrl()}/api/settings`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setApiKey(data.apiKeyMasked || "");
        setApiBaseUrl(data.apiBaseUrl || "");
        setGeminiApiKey(data.geminiApiKeyMasked || "");
        setGeminiBaseUrl(data.geminiBaseUrl || "");
        setStoryboardDelaySec(data.storyboardDelaySec !== undefined ? Number(data.storyboardDelaySec) : 10);
      }
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ScreenHeader
        badge="Pengaturan"
        title="Konfigurasi Workspace Desktop"
        desc="Kelola preferensi, kredensial AI generator, dan penyimpanan lokal di balik layar."
        cta={isSaving ? "Menyimpan..." : "Simpan pengaturan"}
        onNext={handleSave}
        disabled={isLoading || isSaving}
      />

      {isLoading ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-12 text-center flex flex-col items-center justify-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-slate-400">Memuat konfigurasi workspace...</p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form Kredensial API */}
          <div className="lg:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-6">
            <div className="border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-white">Kredensial AI Provider (GrokPI)</h3>
              <p className="text-xs text-slate-500 mt-1">Konfigurasikan kunci akses Anda untuk memproses video & cerita.</p>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">GrokPI API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Masukkan sk-... API key Anda"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-blue-500 focus:outline-none transition font-mono"
              />
              
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestGrokpi}
                  disabled={isTestingGrok}
                  className="px-3 py-1.5 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-300 border border-blue-500/20 rounded-xl transition"
                >
                  {isTestingGrok ? "Menguji..." : "Tes Koneksi / Kesehatan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApiKey("");
                    alert("Kredensial dikosongkan. Klik 'Simpan pengaturan' untuk menerapkan perubahan.");
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 rounded-xl transition"
                >
                  Hapus Key
                </button>
              </div>

              <p className="text-[10px] text-slate-500 pt-1">
                Kunci API disimpan secara lokal di folder data pengguna dan tidak pernah dikirim ke pihak luar selain GrokPI API.
              </p>
            </div>

            <div className="space-y-2 pb-6 border-b border-white/5">
              <label className="text-xs font-semibold text-slate-400">GrokPI Base URL</label>
              <input
                type="text"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="https://www.grokpi.masjavas.my.id/v1"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-blue-500 focus:outline-none transition font-mono"
              />
              <p className="text-[10px] text-slate-500">
                URL Endpoint default adalah https://www.grokpi.masjavas.my.id/v1.
              </p>
            </div>

            <div className="space-y-2 pb-6 border-b border-white/5">
              <label className="text-xs font-semibold text-slate-400">Jeda Storyboard (detik)</label>
              <input
                type="number"
                min={5}
                max={30}
                value={storyboardDelaySec}
                onChange={(e) => setStoryboardDelaySec(Number(e.target.value))}
                placeholder="10"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-blue-500 focus:outline-none transition font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Waktu tunggu dalam detik antar frame storyboard untuk menghindari pembatasan kuota (rate limit) AI provider (kisaran 5–30 detik).
              </p>
            </div>

            {/* Form Gemini TTS */}
            <div className="pt-2 border-b border-white/5 pb-4">
              <h3 className="text-base font-bold text-white">Kredensial Gemini TTS (Google AI Studio)</h3>
              <p className="text-xs text-slate-500 mt-1">Konfigurasikan akses TTS narasi suara untuk serial film sinematik Anda.</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Gemini / AI Studio API Key</label>
              <input
                type="password"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                placeholder="Masukkan API key Gemini / AI Studio Anda"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-blue-500 focus:outline-none transition font-mono"
              />

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestGemini}
                  disabled={isTestingGemini}
                  className="px-3 py-1.5 text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 text-blue-300 border border-blue-500/20 rounded-xl transition"
                >
                  {isTestingGemini ? "Menguji..." : "Tes Koneksi / Kesehatan"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGeminiApiKey("");
                    alert("Kredensial dikosongkan. Klik 'Simpan pengaturan' untuk menerapkan perubahan.");
                  }}
                  className="px-3 py-1.5 text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-300 border border-rose-500/20 rounded-xl transition"
                >
                  Hapus Key
                </button>
              </div>

              <p className="text-[10px] text-slate-500 pt-1">
                Kunci akses Google AI Studio / Gemini aman disimpan secara lokal.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400">Gemini TTS Base URL (Direct API)</label>
              <input
                type="text"
                value={geminiBaseUrl}
                onChange={(e) => setGeminiBaseUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com"
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white placeholder-slate-700 focus:border-blue-500 focus:outline-none transition font-mono"
              />
              <p className="text-[10px] text-slate-500">
                Endpoint resmi default adalah https://generativelanguage.googleapis.com.
              </p>
            </div>
          </div>

          {/* Cards Pendukung */}
          <div className="space-y-6">
            <SettingsCard
              title="Penyimpanan Lokal"
              items={[
                "Format berkas: JSON",
                "Lokasi: AppData/Roaming/MASJAVAS AI",
                "Fitur: Auto-backup & Corruption guard"
              ]}
            />
            <SettingsCard
              title="Integrasi FFmpeg"
              items={[
                "Transkoder: Bundled FFmpeg.exe",
                "Audio: Loudnorm normalization",
                "Subtitle: Soft-sub SRT multiplexing"
              ]}
            />
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white">Log Diagnostik</h4>
                <p className="text-xs text-slate-500 mt-1">Periksa riwayat error dan aktivitas AI di desktop.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await fetch(`${getApiBaseUrl()}/api/debug/open-logs`, {
                      method: "POST"
                    });
                    if (!response.ok) throw new Error("Gagal membuka folder logs.");
                  } catch (err: any) {
                    alert(err.message || "Gagal membuka folder logs.");
                  }
                }}
                className="w-full rounded-2xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/20 py-3 text-xs font-bold transition active:scale-[0.98]"
              >
                Buka Folder Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

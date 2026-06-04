import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clapperboard,
  Clock3,
  Download,
  FileText,
  Film,
  Home,
  Image as ImageIcon,
  Library,
  Lock,
  Mic2,
  Palette,
  PenLine,
  PlayCircle,
  Plus,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Video,
  WandSparkles
} from "lucide-react";

export const steps = [
  { id: "idea", label: "Tulis Ide", helper: "Ide & konsep cerita" },
  { id: "style", label: "Pilih Gaya", helper: "Visual & nuansa" },
  { id: "refs", label: "Referensi", helper: "Karakter, lokasi, objek" },
  { id: "script", label: "Review Cerita", helper: "Alur & struktur" },
  { id: "audio", label: "Narasi Audio", helper: "Suara narator semua adegan" },
  { id: "scenes", label: "Cek Adegan", helper: "Detail tiap adegan" },
  { id: "preview", label: "Preview", helper: "Lihat keseluruhan" },
  { id: "export", label: "Download", helper: "Ekspor hasil akhir" },
];

export const navItems = [
  { id: "home", label: "Homepage", icon: Home, route: "/" },
  { id: "start", label: "Mulai Proyek", icon: Plus, route: "/start" },
  { id: "idea", label: "Tulis Ide", icon: PenLine, route: "/idea" },
  { id: "presets", label: "Pilih Preset", icon: Sparkles, route: "/presets" },
  { id: "references", label: "Referensi", icon: UploadCloud, route: "/references" },
  { id: "review", label: "Review Cerita", icon: FileText, route: "/review" },
  { id: "audio", label: "Narasi Audio", icon: Mic2, route: "/audio-prep" },
  { id: "scenes", label: "Cek Adegan", icon: Clapperboard, route: "/scenes" },
  { id: "preview", label: "Preview", icon: PlayCircle, route: "/preview" },
  { id: "export", label: "Download", icon: Download, route: "/export" },
  { id: "library", label: "Proyek Saya", icon: Library, route: "/library" },
  { id: "assistant", label: "Bantuan AI", icon: Bot, route: "/assistant" },
  { id: "settings", label: "Pengaturan", icon: Settings, route: "/settings" },
];

export const stepIndexByScreen: Record<string, number> = {
  home: 0,
  start: 0,
  idea: 0,
  presets: 1,
  references: 2,
  review: 3,
  "audio-prep": 4,
  scenes: 5,
  preview: 6,
  export: 7,
  library: 0,
  assistant: 0,
  settings: 0,
};

export const platformPresets = ["YouTube 16:9", "TikTok 9:16", "Instagram 1:1", "Layar Lebar 21:9"];
export const durationPresets = ["6 adegan · ±1 menit", "12 adegan · ±2 menit", "20 adegan · ±3–4 menit", "30 adegan · ±5–6 menit"];
export const tonePresets = ["Sinematik", "Misterius", "Inspiratif", "Premium", "Komedi ringan"];

export const presetCards = [
  { title: "Dokumenter Sinematik", desc: "Cocok untuk YouTube, sejarah, misteri, edukasi.", tag: "Paling aman" },
  { title: "Shorts Cepat", desc: "Hook kuat, tempo cepat, cocok TikTok/Reels/Shorts.", tag: "Viral" },
  { title: "Storytelling Emosional", desc: "Narasi hangat, dramatis ringan, cocok kisah manusia.", tag: "Human touch" },
  { title: "Produk / Brand", desc: "Untuk promo produk, campaign, dan video komersial.", tag: "Bisnis" },
];

export const referenceGroups = [
  { title: "Karakter utama", meta: "1 karakter", items: ["Wajah utama", "Close-up", "Ekspresi"] },
  { title: "Versi karakter lain", meta: "3 variasi", items: ["Basah", "Tegang", "Aksi"] },
  { title: "Lokasi utama", meta: "3 lokasi", items: ["Terowongan", "Jalan basah", "Exit"] },
  { title: "Objek penting", meta: "4 objek", items: ["Motor", "Mobil", "Rambu"] },
  { title: "Style visual", meta: "3 gaya", items: ["Noir", "Rainy", "Realistis"] },
  { title: "Suasana warna", meta: "3 palet", items: ["Biru", "Gelap", "Lampu"] },
];

export const storyboardPanelsMock = [
  { timeCode: "0.0–1.25", shotType: "Wide shot", action: "Motor memasuki terowongan, hujan deras.", dialogue: "—", sfx: "Rain, engine roar", transition: "CUT" },
  { timeCode: "1.25–2.50", shotType: "Medium close up", action: "Wiwi menoleh, mobil semakin dekat.", dialogue: "Wiwi: Mereka dekat!", sfx: "Engine, tire splash", transition: "CUT" },
  { timeCode: "2.50–3.75", shotType: "Close up", action: "Hari fokus dan menarik gas lebih dalam.", dialogue: "Hari: Tahan, Wi.", sfx: "Engine revs", transition: "CUT" },
  { timeCode: "3.75–5.00", shotType: "Low angle tracking", action: "Motor melaju kencang, air memercik.", dialogue: "—", sfx: "Water splash", transition: "MATCH CUT" },
  { timeCode: "5.00–6.25", shotType: "Over shoulder", action: "Wiwi bersiap menahan pengejar.", dialogue: "Wiwi: Saya tahan mereka!", sfx: "Heartbeat", transition: "CUT" },
  { timeCode: "6.25–7.50", shotType: "Dynamic tracking", action: "Motor menyalip celah sempit.", dialogue: "Hari: Pegang erat!", sfx: "Metal scrape", transition: "CUT" },
  { timeCode: "7.50–8.75", shotType: "Inside car", action: "Pengejar kehilangan kontrol.", dialogue: "Pengejar: Sial!", sfx: "Glass crack", transition: "CUT" },
  { timeCode: "8.75–10.00", shotType: "Rear tracking", action: "Motor keluar terowongan, masih dikejar.", dialogue: "—", sfx: "Rain fades", transition: "NEXT" },
];

export const projectCards = ["Misteri Kota Laut", "Iklan Kopi Premium", "Kisah Penemu Muda", "Shorts Fakta Unik", "Dokumenter Gunung", "Brand Launch"];
export const iconSet = { ArrowRight, CheckCircle2, Clock3, Film, ImageIcon, Lock, Mic2, Palette, RefreshCcw, ShieldCheck, Star, Video, WandSparkles };

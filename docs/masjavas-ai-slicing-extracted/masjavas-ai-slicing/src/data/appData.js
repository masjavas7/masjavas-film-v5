import {
  ArrowRight, Bot, CheckCircle2, Clapperboard, Clock3, Download, FileText,
  Film, Home, Image as ImageIcon, Library, Lock, Mic2, Palette, PenLine,
  PlayCircle, Plus, RefreshCcw, Settings, ShieldCheck, Sparkles, Star,
  UploadCloud, Video, WandSparkles
} from "lucide-react";

export const steps = [
  { id: "idea", label: "Tulis Ide", helper: "Ide & konsep cerita" },
  { id: "style", label: "Pilih Gaya", helper: "Visual & nuansa" },
  { id: "refs", label: "Referensi", helper: "Karakter, lokasi, objek" },
  { id: "script", label: "Review Cerita", helper: "Alur & struktur" },
  { id: "scenes", label: "Cek Adegan", helper: "Detail tiap adegan" },
  { id: "preview", label: "Preview", helper: "Lihat keseluruhan" },
  { id: "export", label: "Download", helper: "Ekspor hasil akhir" },
];

export const navItems = [
  { id: "home", label: "Homepage", icon: Home },
  { id: "start", label: "Mulai Proyek", icon: Plus },
  { id: "idea", label: "Tulis Ide", icon: PenLine },
  { id: "presets", label: "Pilih Preset", icon: Sparkles },
  { id: "references", label: "Referensi", icon: UploadCloud },
  { id: "review", label: "Review Cerita", icon: FileText },
  { id: "scenes", label: "Cek Adegan", icon: Clapperboard },
  { id: "preview", label: "Preview", icon: PlayCircle },
  { id: "export", label: "Download", icon: Download },
  { id: "library", label: "Proyek Saya", icon: Library },
  { id: "assistant", label: "Bantuan AI", icon: Bot },
  { id: "settings", label: "Pengaturan", icon: Settings },
];

export const stepIndexByScreen = {
  home: 0, start: 0, idea: 0, presets: 1, references: 2,
  review: 3, scenes: 4, preview: 5, export: 6,
  library: 0, assistant: 0, settings: 0,
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

export const storyboardPanels = [
  ["0.0–1.25", "Wide shot", "Motor memasuki terowongan, hujan deras.", "—", "Rain, engine roar", "CUT"],
  ["1.25–2.50", "Medium close up", "Wiwi menoleh, mobil semakin dekat.", "Wiwi: Mereka dekat!", "Engine, tire splash", "CUT"],
  ["2.50–3.75", "Close up", "Hari fokus dan menarik gas lebih dalam.", "Hari: Tahan, Wi.", "Engine revs", "CUT"],
  ["3.75–5.00", "Low angle tracking", "Motor melaju kencang, air memercik.", "—", "Water splash", "MATCH CUT"],
  ["5.00–6.25", "Over shoulder", "Wiwi bersiap menahan pengejar.", "Wiwi: Saya tahan mereka!", "Heartbeat", "CUT"],
  ["6.25–7.50", "Dynamic tracking", "Motor menyalip celah sempit.", "Hari: Pegang erat!", "Metal scrape", "CUT"],
  ["7.50–8.75", "Inside car", "Pengejar kehilangan kontrol.", "Pengejar: Sial!", "Glass crack", "CUT"],
  ["8.75–10.00", "Rear tracking", "Motor keluar terowongan, masih dikejar.", "—", "Rain fades", "NEXT"],
];

export const projectCards = ["Misteri Kota Laut", "Iklan Kopi Premium", "Kisah Penemu Muda", "Shorts Fakta Unik", "Dokumenter Gunung", "Brand Launch"];
export const iconSet = { ArrowRight, CheckCircle2, Clock3, Film, ImageIcon, Lock, Mic2, Palette, RefreshCcw, ShieldCheck, Star, Video, WandSparkles };

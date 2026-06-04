import * as React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { HelpCircle, Menu, X, Cloud, CloudOff, CloudLightning } from "lucide-react";
import { navItems, stepIndexByScreen } from "../../data/appData";
import { Card, Pill } from "../ui/Card";
import { GhostButton } from "../ui/Button";
import { TopStepper } from "../ui/Stepper";
import { cn } from "../../utils";
import { useProjectLibraryStore } from "../../stores/projectLibraryStore";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  const autosaveStatus = useProjectLibraryStore((state) => state.autosaveStatus);
  const activeProjectId = useProjectLibraryStore((state) => state.activeProjectId);
  const localDraftToSync = useProjectLibraryStore((state) => state.localDraftToSync);
  const syncLocalDraftToServer = useProjectLibraryStore((state) => state.syncLocalDraftToServer);
  const discardLocalDraft = useProjectLibraryStore((state) => state.discardLocalDraft);

  // Extract step key based on current pathname
  const getCurrentId = () => {
    const path = location.pathname;
    if (path === "/") return "home";
    if (path.startsWith("/scenes")) return "scenes";
    const segment = path.split("/")[1];
    return segment || "home";
  };

  const currentId = getCurrentId();
  const activeStepIndex = stepIndexByScreen[currentId] ?? 0;

  const handleNavClick = (route: string) => {
    navigate(route);
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand logo */}
      <button
        onClick={() => handleNavClick("/")}
        className="mb-6 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left hover:bg-white/[0.09] transition"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg shadow-cyan-500/5">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-6 w-6">
            <defs>
              <linearGradient id="logo-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="50%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path
              d="M20 75V25L50 52L80 25V75"
              stroke="url(#logo-glow)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neon-glow)"
            />
            <path
              d="M20 75V25L50 52L80 25V75"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.95"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white tracking-wide">MASJAVAS AI</p>
          <p className="text-[10px] text-cyan-400 tracking-wider font-semibold uppercase mt-0.5">Sinematik Siap Tayang</p>
        </div>
      </button>

      {/* Nav Menu */}
      <div className="space-y-1 flex-1 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.route)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
                isActive
                  ? "bg-white text-slate-950 font-semibold"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Info Card */}
      <Card className="mt-5 p-4 shrink-0 bg-white/[0.04] backdrop-blur-md">
        <Pill tone="soft">Panduan pemula</Pill>
        <p className="mt-3 text-xs leading-5 text-slate-300">
          Mulai dari ide kasar. Referensi, storyboard, instruksi video, dan cek kesiapan akan disiapkan otomatis.
        </p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#060816] text-slate-100 relative">
      {/* Background visual glow mesh */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div className="absolute left-[-10%] top-[-15%] h-[560px] w-[560px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[20%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[35%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,56px_56px,56px_56px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr] z-10">
        {/* Desktop Sidebar */}
        <aside className="hidden border-r border-white/10 bg-black/20 p-4 backdrop-blur-2xl lg:block h-screen sticky top-0">
          <SidebarContent />
        </aside>

        {/* Mobile Drawer (Hamburger Slide-out Overlay) */}
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop click to close */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMobileOpen(false)}
            />
            {/* Drawer container */}
            <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-[#060816]/95 border-r border-white/10 p-4 shadow-2xl flex flex-col justify-between z-10 transition-transform">
              <div className="absolute right-4 top-4">
                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-xl border border-white/10 bg-white/[0.06] p-2 hover:bg-white/[0.1] text-slate-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="h-full pt-10">
                <SidebarContent />
              </div>
            </aside>
          </div>
        )}

        {/* Main Area */}
        <main className="min-w-0 flex flex-col min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/10 bg-[#060816]/80 px-4 py-4 backdrop-blur-2xl md:px-8">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 hover:bg-white/[0.1] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <TopStepper current={activeStepIndex} />
            
            <div className="ml-auto flex items-center gap-3">
              {/* Autosave Status Badge */}
              {activeProjectId && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider select-none shrink-0 transition-all",
                    autosaveStatus === "saving" ? "bg-amber-550/5 border-amber-500/20 text-amber-400" :
                    autosaveStatus === "error" ? "bg-rose-550/5 border-rose-500/20 text-rose-400 font-bold" :
                    "bg-emerald-550/5 border-emerald-500/20 text-emerald-400"
                  )}
                  title={
                    autosaveStatus === "saving" ? "AI sedang menyimpan progres ke server..." :
                    autosaveStatus === "error" ? "Koneksi server terputus. Progres disimpan sementara di penyimpanan lokal browser." :
                    "Seluruh progres aman tersimpan di server lokal."
                  }
                >
                  {autosaveStatus === "saving" ? (
                    <>
                      <CloudLightning className="h-3 w-3 animate-bounce" />
                      <span>Menyimpan</span>
                    </>
                  ) : autosaveStatus === "error" ? (
                    <>
                      <CloudOff className="h-3 w-3 animate-pulse" />
                      <span>Lokal Draft</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="h-3 w-3" />
                      <span>Tersimpan</span>
                    </>
                  )}
                </div>
              )}

              <GhostButton icon={HelpCircle} onClick={() => navigate("/assistant")}>Bantuan</GhostButton>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-sm font-bold text-slate-950">
                MJ
              </div>
            </div>
          </header>

          {/* Local Draft Sync Banner */}
          {localDraftToSync && (
            <div className="mx-4 mt-4 md:mx-8 md:mt-6 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                  <CloudLightning className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Ada draf lokal yang belum tersimpan</h4>
                  <p className="text-xs text-slate-450">
                    Draf lokal untuk proyek "{localDraftToSync.projectFlow?.projectName || 'Tanpa Nama'}" lebih baru dari versi server. Simpan sekarang?
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  onClick={discardLocalDraft}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white transition"
                >
                  Abaikan
                </button>
                <button
                  onClick={syncLocalDraftToServer}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 shadow-lg shadow-amber-500/10 transition"
                >
                  Simpan ke Server
                </button>
              </div>
            </div>
          )}

          {/* Content page */}
          <div className="p-4 md:p-8 flex-1 flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};


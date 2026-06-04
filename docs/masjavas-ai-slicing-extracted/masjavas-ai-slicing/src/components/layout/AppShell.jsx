import { Film, HelpCircle, Menu } from "lucide-react";
import { navItems, stepIndexByScreen } from "../../data/appData";
import { Card, Pill } from "../ui/Card";
import { GhostButton } from "../ui/Button";
import { TopStepper } from "../navigation/Stepper";
import { cn } from "../../utils";

export function AppShell({ active, setActive, children }) {
  return (
    <div className="min-h-screen bg-[#060816] text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-15%] h-[560px] w-[560px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute right-[-12%] top-[20%] h-[520px] w-[520px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute bottom-[-15%] left-[35%] h-[520px] w-[520px] rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_34%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:100%_100%,56px_56px,56px_56px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 bg-black/20 p-4 backdrop-blur-2xl lg:block">
          <button onClick={() => setActive("home")} className="mb-6 flex w-full items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.06] p-4 text-left">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 via-blue-500 to-violet-500 text-white">
              <Film className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">MASJAVAS AI</p>
              <p className="text-xs text-slate-400">Video dibuat lebih mudah</p>
            </div>
          </button>

          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition",
                    active === item.id ? "bg-white text-slate-950" : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <Card className="mt-5 p-4">
            <Pill tone="soft">Panduan pemula</Pill>
            <p className="mt-3 text-sm leading-6 text-slate-300">Mulai dari ide kasar. Referensi, storyboard, instruksi video, dan cek kesiapan akan disiapkan otomatis.</p>
          </Card>
        </aside>

        <main className="min-w-0">
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-white/10 bg-[#060816]/80 px-4 py-4 backdrop-blur-2xl md:px-8">
            <button className="rounded-2xl border border-white/10 bg-white/[0.06] p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
            <TopStepper current={stepIndexByScreen[active] ?? 0} />
            <div className="ml-auto flex items-center gap-3">
              <GhostButton icon={HelpCircle}>Bantuan</GhostButton>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-sm font-bold">MJ</div>
            </div>
          </header>
          <div className="p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";

const HomePage = lazy(() => import("./pages/HomePage").then((m) => ({ default: m.HomePage })));
const StartPage = lazy(() => import("./pages/StartPage").then((m) => ({ default: m.StartPage })));
const IdeaPage = lazy(() => import("./pages/IdeaPage").then((m) => ({ default: m.IdeaPage })));
const PresetsPage = lazy(() => import("./pages/PresetsPage").then((m) => ({ default: m.PresetsPage })));
const ReferencesPage = lazy(() => import("./pages/ReferencesPage").then((m) => ({ default: m.ReferencesPage })));
const ReviewPage = lazy(() => import("./pages/ReviewPage").then((m) => ({ default: m.ReviewPage })));
const AudioPrepPage = lazy(() => import("./pages/AudioPrepPage").then((m) => ({ default: m.AudioPrepPage })));
const ScenesListPage = lazy(() => import("./pages/ScenesListPage").then((m) => ({ default: m.ScenesListPage })));
const SceneComposerPage = lazy(() => import("./pages/SceneComposerPage").then((m) => ({ default: m.SceneComposerPage })));
const PreviewPage = lazy(() => import("./pages/PreviewPage").then((m) => ({ default: m.PreviewPage })));
const ExportPage = lazy(() => import("./pages/ExportPage").then((m) => ({ default: m.ExportPage })));
const LibraryPage = lazy(() => import("./pages/LibraryPage").then((m) => ({ default: m.LibraryPage })));
const AssistantPage = lazy(() => import("./pages/AssistantPage").then((m) => ({ default: m.AssistantPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-slate-400 text-sm">
      Memuat halaman…
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/start" element={<StartPage />} />
            <Route path="/idea" element={<IdeaPage />} />
            <Route path="/presets" element={<PresetsPage />} />
            <Route path="/references" element={<ReferencesPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/audio-prep" element={<AudioPrepPage />} />
            <Route path="/scenes" element={<ScenesListPage />} />
            <Route path="/scenes/:sceneId" element={<SceneComposerPage />} />
            <Route path="/preview" element={<PreviewPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/assistant" element={<AssistantPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </AppErrorBoundary>
  );
}
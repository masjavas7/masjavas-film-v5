import { Routes, Route, Navigate } from "react-router-dom";
import { AppShell } from "./components/layout/AppShell";
import { AppErrorBoundary } from "./components/system/AppErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { StartPage } from "./pages/StartPage";
import { IdeaPage } from "./pages/IdeaPage";
import { PresetsPage } from "./pages/PresetsPage";
import { ReferencesPage } from "./pages/ReferencesPage";
import { ReviewPage } from "./pages/ReviewPage";
import { AudioPrepPage } from "./pages/AudioPrepPage";
import { ScenesListPage } from "./pages/ScenesListPage";
import { SceneComposerPage } from "./pages/SceneComposerPage";
import { PreviewPage } from "./pages/PreviewPage";
import { ExportPage } from "./pages/ExportPage";
import { LibraryPage } from "./pages/LibraryPage";
import { AssistantPage } from "./pages/AssistantPage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/idea" element={<IdeaPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/references" element={<ReferencesPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/audio-prep" element={<AudioPrepPage />} />
          
          {/* Scenes routing */}
          <Route path="/scenes" element={<ScenesListPage />} />
          <Route path="/scenes/:sceneId" element={<SceneComposerPage />} />
          
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/export" element={<ExportPage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          
          {/* Fallback to homepage */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </AppErrorBoundary>
  );
}

import { useMemo, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { HomeScreen } from "./features/home/HomeScreen";
import { StartScreen, IdeaScreen, PresetsScreen, ReviewScreen } from "./features/onboarding/OnboardingScreens";
import { ReferencesScreen } from "./features/references/ReferencesScreen";
import { ScenesScreen } from "./features/scenes/SceneComposer";
import { PreviewScreen } from "./features/preview/PreviewScreen";
import { ExportScreen } from "./features/export/ExportScreen";
import { LibraryScreen } from "./features/library/LibraryScreen";
import { AssistantScreen } from "./features/assistant/AssistantScreen";
import { SettingsScreen } from "./features/settings/SettingsScreen";

export default function App() {
  const [active, setActive] = useState("home");
  const go = (id) => setActive(id);

  const screens = useMemo(() => ({
    home: <HomeScreen go={go} />,
    start: <StartScreen go={go} />,
    idea: <IdeaScreen go={go} />,
    presets: <PresetsScreen go={go} />,
    references: <ReferencesScreen go={go} />,
    review: <ReviewScreen go={go} />,
    scenes: <ScenesScreen go={go} />,
    preview: <PreviewScreen go={go} />,
    export: <ExportScreen go={go} />,
    library: <LibraryScreen />,
    assistant: <AssistantScreen />,
    settings: <SettingsScreen />,
  }), []);

  return <AppShell active={active} setActive={setActive}>{screens[active]}</AppShell>;
}

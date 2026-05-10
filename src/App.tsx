import { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { Canvas } from './features/canvas/Canvas';
import { SettingsDialog } from './components/SettingsDialog';
import { GlobalErrorDialog } from './components/GlobalErrorDialog';
import { ProjectManager } from './features/project/ProjectManager';
import { useThemeStore } from './stores/themeStore';
import { useProjectStore } from './stores/projectStore';
import { useSettingsStore } from './stores/settingsStore';
import {
  subscribeOpenGlobalErrorDialog,
  type GlobalErrorDialogDetail,
} from './features/app/errorDialogEvents';
import {
  subscribeOpenSettingsDialog,
  type SettingsCategory,
} from './features/settings/settingsEvents';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppContextProvider } from './contexts/AppStateContext';

function toRgbCssValue(hexColor: string): string {
  const hex = hexColor.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return '59 130 246';
  }
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

function App() {
  const { theme } = useThemeStore();
  const uiRadiusPreset = useSettingsStore((state) => state.uiRadiusPreset);
  const themeTonePreset = useSettingsStore((state) => state.themeTonePreset);
  const accentColor = useSettingsStore((state) => state.accentColor);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialCategory, setSettingsInitialCategory] = useState<SettingsCategory>('general');
  const [globalError, setGlobalError] = useState<GlobalErrorDialogDetail | null>(null);

  const isHydrated = useProjectStore((state) => state.isHydrated);
  const hydrate = useProjectStore((state) => state.hydrate);
  const currentProjectId = useProjectStore((state) => state.currentProjectId);
  const closeProject = useProjectStore((state) => state.closeProject);

  useEffect(() => {
    const initCapacitorStatusBar = async () => {
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#111227' });
      } catch {
        // Not running in Capacitor
      }
    };
    void initCapacitorStatusBar();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.uiRadius = uiRadiusPreset;
  }, [uiRadiusPreset]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.themeTone = themeTonePreset;
  }, [themeTonePreset]);

  useEffect(() => {
    const root = document.documentElement;
    const isMac =
      typeof navigator !== 'undefined'
      && /(Mac|iPhone|iPad|iPod)/i.test(`${navigator.platform} ${navigator.userAgent}`);
    root.dataset.platform = isMac ? 'macos' : 'default';
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const normalized = accentColor.startsWith('#') ? accentColor : `#${accentColor}`;
    root.style.setProperty('--accent', normalized);
    root.style.setProperty('--accent-rgb', toRgbCssValue(normalized));
  }, [accentColor]);

  useEffect(() => {
    const applyScreenOrientationLock = async () => {
      try {
        const isCapacitor = (window as any).Capacitor !== undefined;
        
        if (isCapacitor) {
          const ScreenOrientation = (window as any).Capacitor.Plugins.ScreenOrientation;
          if (ScreenOrientation) {
            await ScreenOrientation.lock({ orientation: 'portrait' });
            return;
          }
        }

        if ('screen' in window && 'orientation' in screen) {
          const screenOrientation = screen.orientation as any;
          if ('lock' in screenOrientation) {
            await screenOrientation.lock('portrait-primary');
          }
        }
      } catch (error) {
        console.log('[App] Screen orientation lock not supported:', error);
      }
    };
    void applyScreenOrientationLock();
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    const unsubscribe = subscribeOpenGlobalErrorDialog((detail) => {
      setGlobalError(detail);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeOpenSettingsDialog(({ category }) => {
      setSettingsInitialCategory(category ?? 'general');
      setShowSettings(true);
    });
    return unsubscribe;
  }, []);

  if (!isHydrated) {
    return (
      <ReactFlowProvider>
        <div className="w-full h-full bg-bg-dark" />
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <AppContextProvider>
        <div className="w-full h-full flex flex-col bg-bg-dark">
          <MobileHeader
            showBackButton={!!currentProjectId}
            onBackClick={closeProject}
            onSettingsClick={() => {
              setSettingsInitialCategory('general');
              setShowSettings(true);
            }}
          />

          <main className="flex-1 relative">
            {currentProjectId ? <Canvas /> : <ProjectManager />}
          </main>

          <SettingsDialog
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            initialCategory={settingsInitialCategory}
            onCheckUpdate={async () => 'up-to-date'}
          />
          <GlobalErrorDialog
            isOpen={Boolean(globalError)}
            title={globalError?.title ?? ''}
            message={globalError?.message ?? ''}
            details={globalError?.details}
            copyText={globalError?.copyText}
            onClose={() => setGlobalError(null)}
          />
        </div>
      </AppContextProvider>
    </ReactFlowProvider>
  );
}

interface MobileHeaderProps {
  showBackButton: boolean;
  onBackClick: () => void;
  onSettingsClick: () => void;
}

function MobileHeader({ showBackButton, onBackClick, onSettingsClick }: MobileHeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-bg-primary border-b border-border-default">
      <div className="flex items-center gap-3">
        {showBackButton ? (
          <button
            onClick={onBackClick}
            className="p-2 -ml-2 rounded-lg hover:bg-bg-secondary transition-colors"
            aria-label="返回"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        ) : null}
        <h1 className="text-lg font-semibold text-text-primary">ArtFlow UI</h1>
      </div>
      <button
        onClick={onSettingsClick}
        className="p-2 -mr-2 rounded-lg hover:bg-bg-secondary transition-colors"
        aria-label="设置"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>
  );
}

export default App;

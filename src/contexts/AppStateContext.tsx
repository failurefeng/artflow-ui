import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isRunningInCapacitor } from '@/webApi/platform';

interface AppState {
  isActive: boolean;
  lastActiveTime: number;
}

interface AppContextValue extends AppState {
  onAppResume: (callback: () => void) => () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    return {
      isActive: true,
      lastActiveTime: Date.now(),
      onAppResume: () => () => {},
    };
  }
  return context;
}

export function AppContextProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    isActive: true,
    lastActiveTime: Date.now(),
  });

  const resumeCallbacksRef = useRef<Set<() => void>>(new Set());
  const lastActiveTimeRef = useRef<number>(Date.now());
  const isCapacitor = isRunningInCapacitor();

  const onAppResume = useCallback((callback: () => void) => {
    resumeCallbacksRef.current.add(callback);

    return () => {
      resumeCallbacksRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const triggerResume = () => {
      console.log('[AppState] App resumed, triggering callbacks');
      lastActiveTimeRef.current = Date.now();
      setState({
        isActive: true,
        lastActiveTime: lastActiveTimeRef.current,
      });
      resumeCallbacksRef.current.forEach(cb => {
        try {
          cb();
        } catch (e) {
          console.error('[AppState] Callback error:', e);
        }
      });
    };

    if (isCapacitor) {
      const initCapacitorApp = async () => {
        try {
          await CapacitorApp.addListener('resume', () => {
            console.log('[AppState] Capacitor resume event');
            triggerResume();
          });

          await CapacitorApp.addListener('appStateChange', (appState) => {
            console.log('[AppState] Capacitor appStateChange:', appState.isActive);
            if (!appState.isActive) {
              setState(prev => ({
                isActive: false,
                lastActiveTime: prev.lastActiveTime,
              }));
            } else {
              triggerResume();
            }
          });

          console.log('[AppState] Capacitor App listeners registered');
        } catch (e) {
          console.error('[AppState] Failed to initialize Capacitor App listeners:', e);
        }
      };

      initCapacitorApp();

      cleanup = () => {
        CapacitorApp.removeAllListeners();
      };
    } else {
      const handleVisibilityChange = () => {
        const isNowActive = !document.hidden;
        console.log('[AppState] Visibility changed, isActive:', isNowActive);

        if (isNowActive) {
          triggerResume();
        } else {
          setState(prev => ({
            isActive: false,
            lastActiveTime: prev.lastActiveTime,
          }));
        }
      };

      if (typeof document !== 'undefined' && 'hidden' in document) {
        document.addEventListener('visibilitychange', handleVisibilityChange);
        console.log('[AppState] Web visibility listener registered');

        cleanup = () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, [isCapacitor]);

  const value: AppContextValue = {
    ...state,
    onAppResume,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

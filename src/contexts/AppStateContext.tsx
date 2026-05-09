import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';

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

  const onAppResume = useCallback((callback: () => void) => {
    resumeCallbacksRef.current.add(callback);

    return () => {
      resumeCallbacksRef.current.delete(callback);
    };
  }, []);

  useEffect(() => {
    let isActive = true;
    let hidden: string | undefined;
    let visibilityChange: string | undefined;

    const handleVisibilityChange = () => {
      const wasActive = isActive;
      isActive = !document.hidden;
      
      console.log('[AppState] Visibility changed, isActive:', isActive);

      if (isActive) {
        lastActiveTimeRef.current = Date.now();
        setState({
          isActive: true,
          lastActiveTime: lastActiveTimeRef.current,
        });

        if (!wasActive) {
          console.log('[AppState] App resumed, triggering callbacks');
          resumeCallbacksRef.current.forEach(cb => {
            try {
              cb();
            } catch (e) {
              console.error('[AppState] Callback error:', e);
            }
          });
        }
      } else {
        setState(prev => ({
          isActive: false,
          lastActiveTime: prev.lastActiveTime,
        }));
      }
    };

    if (typeof document !== 'undefined') {
      hidden = hidden ?? 'hidden';
      visibilityChange = visibilityChange ?? 'visibilitychange';

      if (hidden in document) {
        const actualHidden = hidden as 'hidden';
        const actualVisibilityChange = visibilityChange as 'visibilitychange';
        
        document.addEventListener(actualVisibilityChange, handleVisibilityChange);
        
        isActive = !document[actualHidden];
        console.log('[AppState] Initial visibility, isActive:', isActive);
        
        return () => {
          document.removeEventListener(actualVisibilityChange, handleVisibilityChange);
        };
      }
    }

    return () => {};
  }, []);

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

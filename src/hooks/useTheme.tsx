import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ipcService } from '@/services/ipcService';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    void ipcService.settings.get('tema').then((value) => {
      if (value === 'dark' || value === 'light') setThemeState(value);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function setTheme(next: Theme): void {
    setThemeState(next);
    void ipcService.settings.set('tema', next);
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import type { Bilingual, Locale } from '@/types';

interface LocaleContextValue {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (l: Locale) => void;
  toggleLocale: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  /** Resolve a bilingual value to the active locale. */
  t2: (value: Bilingual | undefined | null) => string;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n: i18next } = useTranslation();
  const [locale, setLocaleState] = useState<Locale>(
    (localStorage.getItem('iimas_locale') as Locale) ?? 'en',
  );
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('iimas_theme') as 'dark' | 'light') ?? 'dark',
  );

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.classList.toggle('font-arabic', locale === 'ar');
    i18next.changeLanguage(locale);
    localStorage.setItem('iimas_locale', locale);
  }, [locale, dir, i18next]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('iimas_theme', theme);
  }, [theme]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);
  const toggleLocale = useCallback(
    () => setLocaleState((p) => (p === 'en' ? 'ar' : 'en')),
    [],
  );
  const toggleTheme = useCallback(
    () => setTheme((p) => (p === 'dark' ? 'light' : 'dark')),
    [],
  );

  const t2 = useCallback(
    (value: Bilingual | undefined | null) =>
      !value ? '' : value[locale] ?? value.en ?? '',
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({ locale, dir, setLocale, toggleLocale, theme, toggleTheme, t2 }),
    [locale, dir, setLocale, toggleLocale, theme, toggleTheme, t2],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}

// Ensure i18n is initialized (side-effect import).
void i18n;

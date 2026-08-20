"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  dirFor,
  getDictionary,
  isLocale,
  type Dictionary,
  type Locale,
} from "./dictionary";

/**
 * Locale state.
 *
 * The language is a client-side preference stored in localStorage rather than
 * a routing segment. That keeps a single canonical URL per report — which
 * matters, because report links get shared and an /ar/ prefix would fragment
 * them — while still letting the whole document flip direction.
 */

interface LocaleContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "cv-intelligence.locale";

export function LocaleProvider({
  children,
  initialLocale = "en",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  // Restore the stored preference after hydration. Reading localStorage
  // during render would desynchronise the server and client markup.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isLocale(stored ?? undefined)) {
        setLocaleState(stored as Locale);
        return;
      }
      // Fall back to the browser's language on a first visit.
      if (navigator.language?.toLowerCase().startsWith("ar")) {
        setLocaleState("ar");
      }
    } catch {
      // Private browsing modes can throw on storage access.
    }
  }, []);

  // Direction and language live on <html>, so native form controls, text
  // selection and scrollbars all follow the language, not just our layout.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dirFor(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the in-memory state still applies.
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: dirFor(locale),
      t: getDictionary(locale),
      setLocale,
      toggleLocale: () => setLocale(locale === "en" ? "ar" : "en"),
    }),
    [locale, setLocale],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}

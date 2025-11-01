import i18next, { type TOptions } from "i18next";

import en from "./locales/en.json";
import cs from "./locales/cs.json";
import jp from "./locales/jp.json";

const STORAGE_KEY = "ft_transcendence.language";
const DEFAULT_LANGUAGE = "en";

const resources = {
  en: { translation: en },
  cs: { translation: cs },
  jp: { translation: jp },
} as const;

export type SupportedLanguage = keyof typeof resources;
export type LanguageChangeHandler = (language: SupportedLanguage) => void;

const listeners = new Set<LanguageChangeHandler>();

const isSupportedLanguage = (value: unknown): value is SupportedLanguage =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(resources, value);

const readStoredLanguage = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredLanguage = (language: SupportedLanguage): void => {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    /* istanbul ignore next -- storage write failures can be ignored */
  }
};

const getStoredLanguage = (): SupportedLanguage | null => {
  const stored = readStoredLanguage();
  return stored && isSupportedLanguage(stored) ? stored : null;
};

const getBrowserLanguage = (): SupportedLanguage | null => {
  if (typeof navigator === "undefined") {
    return null;
  }

  const [language] = navigator.language.split("-");
  return language && isSupportedLanguage(language) ? language : null;
};

const getInitialLanguage = (): SupportedLanguage =>
  getStoredLanguage() ?? getBrowserLanguage() ?? DEFAULT_LANGUAGE;

export const supportedLanguages = Object.keys(resources) as SupportedLanguage[];

export const initI18n = async (): Promise<void> => {
  if (i18next.isInitialized) {
    return;
  }

  await i18next.init({
    lng: getInitialLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    resources,
    interpolation: {
      escapeValue: false,
    },
  });
};

export const translate = (key: string, options?: TOptions): string =>
  i18next.t(key, options);

export const getCurrentLanguage = (): SupportedLanguage =>
  isSupportedLanguage(i18next.resolvedLanguage)
    ? i18next.resolvedLanguage
    : DEFAULT_LANGUAGE;

export const setLanguage = async (
  language: SupportedLanguage,
): Promise<void> => {
  if (!isSupportedLanguage(language)) {
    throw new Error(`Unsupported language requested: ${language}`);
  }

  if (language === getCurrentLanguage()) {
    return;
  }

  await i18next.changeLanguage(language);
  writeStoredLanguage(language);
  listeners.forEach((listener) => listener(language));
};

export const onLanguageChange = (
  handler: LanguageChangeHandler,
): (() => void) => {
  listeners.add(handler);
  return () => listeners.delete(handler);
};

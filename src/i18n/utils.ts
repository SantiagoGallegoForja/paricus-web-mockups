import en from './locales/en.json';
import es from './locales/es.json';

type Translations = typeof en;

const translations: Record<string, Translations> = { en, es };

export function t(key: string, lang: string = 'en'): string {
  const keys = key.split('.');
  let value: any = translations[lang] || translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  return typeof value === 'string' ? value : key;
}

export function tArray(key: string, lang: string = 'en'): string[] {
  const keys = key.split('.');
  let value: any = translations[lang] || translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  return Array.isArray(value) ? value : [];
}

export function tObject(key: string, lang: string = 'en'): Record<string, any> {
  const keys = key.split('.');
  let value: any = translations[lang] || translations.en;

  for (const k of keys) {
    value = value?.[k];
    if (value === undefined) break;
  }

  return typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function getLocalizedPath(path: string, lang: string): string {
  if (lang === 'en') return path;
  return `/${lang}${path}`;
}

export function getAlternateLocale(lang: string): string {
  return lang === 'en' ? 'es' : 'en';
}

export function getAlternatePath(currentPath: string, currentLang: string): string {
  const newLang = getAlternateLocale(currentLang);

  if (currentLang === 'en') {
    // Going from EN to ES: add /es prefix
    return `/${newLang}${currentPath}`;
  } else {
    // Going from ES to EN: remove /es prefix
    return currentPath.replace(/^\/es/, '') || '/';
  }
}

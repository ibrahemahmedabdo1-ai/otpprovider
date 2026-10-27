import { cookies } from 'next/headers';

export const LANGS = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'ru', name: 'Русский', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'id', name: 'Indonesia', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
] as const;
export type Lang = (typeof LANGS)[number]['code'];

import { DICT } from './dict';

export function currentLang(): Lang {
  const c = cookies().get('lang')?.value;
  return (LANGS.find((l) => l.code === c)?.code ?? 'en') as Lang;
}
export const dirOf = (l: Lang) => LANGS.find((x) => x.code === l)!.dir;

/** English text is the key. Missing translations fall back to the English text itself. */
export function translate(lang: Lang, text: string): string {
  if (lang === 'en') return text;
  return DICT[lang]?.[text] ?? text;
}

export function getT() {
  const lang = currentLang();
  return { lang, dir: dirOf(lang), t: (s: string) => translate(lang, s) };
}

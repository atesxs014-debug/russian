import ru from './data/ru.json';
import en from './data/en.json';
import de from './data/de.json';
import fr from './data/fr.json';
import it from './data/it.json';
import type { LevelId } from './theme';

export type LangCode = 'ru' | 'en' | 'de' | 'fr' | 'it';

export type LangMeta = {
  code: LangCode;
  name: string; // Türkçe adı
  native: string;
  flag: string;
  locale: string; // cihaz TTS yedeği için
  alphabetTitle: string;
};

export const LANGS: LangMeta[] = [
  { code: 'ru', name: 'Rusça', native: 'Русский', flag: '🇷🇺', locale: 'ru-RU', alphabetTitle: 'Alfabe' },
  { code: 'en', name: 'İngilizce', native: 'English', flag: '🇬🇧', locale: 'en-GB', alphabetTitle: 'Sesler' },
  { code: 'de', name: 'Almanca', native: 'Deutsch', flag: '🇩🇪', locale: 'de-DE', alphabetTitle: 'Sesler' },
  { code: 'fr', name: 'Fransızca', native: 'Français', flag: '🇫🇷', locale: 'fr-FR', alphabetTitle: 'Sesler' },
  { code: 'it', name: 'İtalyanca', native: 'Italiano', flag: '🇮🇹', locale: 'it-IT', alphabetTitle: 'Sesler' },
];

export const langMeta = (code: LangCode) => LANGS.find((l) => l.code === code) ?? LANGS[0];

export type Word = { t: string; tr: string; read: string; e?: string; g?: 'm' | 'f' | 'n' };
/** Compact vocab entry in the JSON packs: [text, Turkish, reading, emoji?, gender?] */
type VocabTuple = [string, string, string, string?, string?];
export type Letter = {
  id: string;
  upper: string;
  lower: string;
  name: string; // seslendirilecek metin
  sound: string;
  hint: string;
  words: Word[];
};
export type Rule = { title: string; text: string; examples: Word[] };
export type Pair = { a: string; b: string; tip: string };
export type Lesson = {
  id: string;
  kind: 'letters' | 'reading' | 'compare' | 'vocab';
  title: string;
  subtitle: string;
  intro: string;
  letters?: Letter[];
  rules?: Rule[];
  words?: Word[];
  pairs?: Pair[];
  v?: VocabTuple[];
};
export type Unit = { id: string; level: LevelId; title: string; subtitle: string; lessons: Lesson[] };
export type Upcoming = { level: LevelId; title: string };
export type Quote = { t: string; tr: string };

export type Course = {
  lang: LangCode;
  units: Unit[];
  upcoming: Upcoming[];
  quotes: Quote[];
  letters: Record<string, Letter>;
  words: Record<string, Word>;
};

/** Removes the stress mark (U+0301) so text can be used as a key / for TTS. */
export function plain(s: string): string {
  return s.replace(/́/g, '').trim();
}

export const letterLabel = (l: Letter) => (l.lower ? `${l.upper} ${l.lower}` : l.upper);
export const letterItemId = (l: Letter) => `L:${l.id}`;
export const wordItemId = (w: Word) => `W:${plain(w.t).toLowerCase()}`;

const RAW: Record<LangCode, unknown> = { ru, en, de, fr, it };
const cache: Partial<Record<LangCode, Course>> = {};

export function getCourse(lang: LangCode): Course {
  if (cache[lang]) return cache[lang]!;
  const raw = RAW[lang] as { units: Unit[]; upcoming: Upcoming[]; quotes: Quote[] };
  // expand compact vocab tuples into regular word lists
  raw.units.forEach((u) =>
    u.lessons.forEach((ls) => {
      if (ls.v && !ls.words)
        ls.words = ls.v.map(([t, tr, read, e, g]) => ({ t, tr, read, e: e || undefined, g: (g || undefined) as Word['g'] }));
    }),
  );
  const letters: Record<string, Letter> = {};
  const words: Record<string, Word> = {};
  const addW = (w: Word) => (words[wordItemId(w)] = words[wordItemId(w)] ?? w);
  raw.units.forEach((u) =>
    u.lessons.forEach((ls) => {
      ls.letters?.forEach((l) => {
        letters[letterItemId(l)] = l;
        l.words.forEach(addW);
      });
      ls.words?.forEach(addW);
    }),
  );
  const c: Course = { lang, units: raw.units, upcoming: raw.upcoming, quotes: raw.quotes ?? [], letters, words };
  cache[lang] = c;
  return c;
}

/** Every item (letters + words) a lesson teaches, deduplicated. */
export function lessonItems(lesson: Lesson): string[] {
  const ids = new Set<string>();
  lesson.letters?.forEach((l) => {
    ids.add(letterItemId(l));
    l.words.forEach((w) => ids.add(wordItemId(w)));
  });
  lesson.words?.forEach((w) => ids.add(wordItemId(w)));
  lesson.pairs?.forEach((p) => {
    ids.add(`L:${p.a}`);
    ids.add(`L:${p.b}`);
  });
  return [...ids];
}

export function unitItems(unit: Unit): string[] {
  return [...new Set(unit.lessons.flatMap(lessonItems))];
}

export function findLesson(course: Course, id: string): { unit: Unit; lesson: Lesson; index: number; unitIndex: number } | null {
  for (let ui = 0; ui < course.units.length; ui++) {
    const unit = course.units[ui];
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index, unitIndex: ui };
  }
  return null;
}

export function quoteOfDay(course: Course): Quote | null {
  if (!course.quotes.length) return null;
  const d = new Date();
  const day = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  return course.quotes[day % course.quotes.length];
}

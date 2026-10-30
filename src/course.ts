import ru from './data/ru.json';
import en from './data/en.json';
import de from './data/de.json';
import fr from './data/fr.json';
import it from './data/it.json';
import gru from './data/grammar/ru.json';
import gen from './data/grammar/en.json';
import gde from './data/grammar/de.json';
import gfr from './data/grammar/fr.json';
import git from './data/grammar/it.json';
import xru from './data/examples/ru.json';
import xen from './data/examples/en.json';
import xde from './data/examples/de.json';
import xfr from './data/examples/fr.json';
import xit from './data/examples/it.json';
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

/** x: example sentence [target, Turkish]. */
export type Word = { t: string; tr: string; read: string; e?: string; g?: 'm' | 'f' | 'n'; x?: [string, string] };
/** Compact vocab entry in the JSON packs: [text, Turkish, reading, emoji?, gender?] */
type VocabTuple = [string, string, string, string?, string?];
export type Letter = {
  id: string;
  upper: string;
  lower: string;
  name: string; // harfin adı (Rusça) ya da örnek kelime
  /** What the sound button says: the letter/letter-group itself. */
  say?: string;
  sound: string;
  hint: string;
  words: Word[];
};
export type Rule = { title: string; text: string; examples: Word[] };
export type Pair = { a: string; b: string; tip: string };
/** Fill-in-the-blank drill: `s` contains ___ where `a` goes; `o` are wrong options. */
export type Drill = { s: string; a: string; o: string[]; tr: string; why?: string };
export type DialogLine = { p: 0 | 1; t: string; tr: string };
export type Dialog = { who: [string, string]; lines: DialogLine[] };
export type TextQ = { q: string; a: string; o: string[] };
export type ReadText = { t: string; tr: string; gloss: [string, string][]; qs: TextQ[] };
export type LessonKind = 'letters' | 'reading' | 'compare' | 'vocab' | 'grammar' | 'dialog' | 'text';
export type Lesson = {
  id: string;
  kind: LessonKind;
  title: string;
  subtitle: string;
  intro: string;
  letters?: Letter[];
  rules?: Rule[];
  words?: Word[];
  pairs?: Pair[];
  v?: VocabTuple[];
  drills?: Drill[];
  dialog?: Dialog;
  text?: ReadText;
};
export type UnitKind = 'vocab' | 'grammar' | 'dialog' | 'text';
export type Unit = { id: string; level: LevelId; title: string; subtitle: string; lessons: Lesson[]; kind?: UnitKind };
export type Upcoming = { level: LevelId; title: string };
export type Quote = { t: string; tr: string };

export type Course = {
  lang: LangCode;
  units: Unit[];
  upcoming: Upcoming[];
  quotes: Quote[];
  letters: Record<string, Letter>;
  words: Record<string, Word>;
  drills: Record<string, Drill>;
  lines: Record<string, { line: DialogLine; lesson: Lesson; index: number }>;
};

/** Removes the stress mark (U+0301) so text can be used as a key / for TTS. */
export function plain(s: string): string {
  return s.replace(/́/g, '').trim();
}

export const letterSay = (l: Letter) => l.say ?? (l.lower || l.upper).toLowerCase();
export const letterLabel = (l: Letter) => (l.lower ? `${l.upper} ${l.lower}` : l.upper);
export const letterItemId = (l: Letter) => `L:${l.id}`;
export const wordItemId = (w: Word) => `W:${plain(w.t).toLowerCase()}`;
export const drillItemId = (lessonId: string, i: number) => `G:${lessonId}:${i}`;
export const lineItemId = (lessonId: string, i: number) => `D:${lessonId}:${i}`;
/** Sentence with the blank filled in. */
export const drillFull = (d: Drill) => d.s.replace('___', d.a);

/** "Ayrı dersler" mode: grammar units don't block the main path. Set by the store. */
let grammarSeparate = false;
export const setGrammarMode = (m: 'embedded' | 'separate') => (grammarSeparate = m === 'separate');
export const unitOptional = (u: Unit) => grammarSeparate && u.kind === 'grammar';

const RAW: Record<LangCode, unknown> = { ru, en, de, fr, it };
type GrammarPack = { units: { after: string; unit: Unit }[]; upcoming?: Upcoming[] };
const GRAMMAR: Record<LangCode, unknown> = { ru: gru, en: gen, de: gde, fr: gfr, it: git };
const EXAMPLES: Record<LangCode, Record<string, [string, string]>> = { ru: xru, en: xen, de: xde, fr: xfr, it: xit } as never;

function mergeGrammar(units: Unit[], g: GrammarPack): Unit[] {
  const out = [...units];
  g.units.forEach(({ after, unit }) => {
    if (out.some((u) => u.id === unit.id)) return;
    const at = after === 'end' ? -1 : out.findIndex((u) => u.id === after);
    if (at < 0) out.push(unit);
    else out.splice(at + 1, 0, unit);
  });
  return out;
}
const cache: Partial<Record<LangCode, Course>> = {};

export function getCourse(lang: LangCode): Course {
  if (cache[lang]) return cache[lang]!;
  const base = RAW[lang] as { units: Unit[]; upcoming: Upcoming[]; quotes: Quote[] };
  const gp = GRAMMAR[lang] as GrammarPack;
  const raw = { ...base, units: mergeGrammar(base.units, gp), upcoming: gp.upcoming ?? base.upcoming };
  // expand compact vocab tuples into regular word lists
  raw.units.forEach((u) =>
    u.lessons.forEach((ls) => {
      if (ls.v && !ls.words)
        ls.words = ls.v.map(([t, tr, read, e, g]) => ({ t, tr, read, e: e || undefined, g: (g || undefined) as Word['g'] }));
    }),
  );
  const letters: Record<string, Letter> = {};
  const words: Record<string, Word> = {};
  const drills: Course['drills'] = {};
  const lines: Course['lines'] = {};
  const ex = EXAMPLES[lang] ?? {};
  const addW = (w: Word) => {
    const x = ex[plain(w.t).toLowerCase()];
    if (x && !w.x) w.x = x;
    words[wordItemId(w)] = words[wordItemId(w)] ?? w;
  };
  raw.units.forEach((u) =>
    u.lessons.forEach((ls) => {
      ls.letters?.forEach((l) => {
        letters[letterItemId(l)] = l;
        l.words.forEach(addW);
      });
      ls.words?.forEach(addW);
      ls.rules?.forEach((r) => r.examples.forEach(addW));
      ls.drills?.forEach((d, i) => (drills[drillItemId(ls.id, i)] = d));
      ls.dialog?.lines.forEach((line, i) => (lines[lineItemId(ls.id, i)] = { line, lesson: ls, index: i }));
      ls.text?.gloss.forEach(([t, tr]) => addW({ t, tr, read: '' }));
    }),
  );
  const c: Course = { lang, units: raw.units, upcoming: raw.upcoming, quotes: raw.quotes ?? [], letters, words, drills, lines };
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
  // (older 'reading' lessons keep their rule examples out of review, as before)
  if (lesson.kind === 'grammar') lesson.rules?.forEach((r) => r.examples.forEach((w) => ids.add(wordItemId(w))));
  lesson.drills?.forEach((_, i) => ids.add(drillItemId(lesson.id, i)));
  lesson.dialog?.lines.forEach((_, i) => ids.add(lineItemId(lesson.id, i)));
  lesson.text?.gloss.forEach(([t]) => ids.add(wordItemId({ t, tr: '', read: '' })));
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

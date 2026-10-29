import raw from './data/course.json';
import type { LevelId } from './theme';

export type Word = { ru: string; tr: string; read: string };
export type Letter = {
  id: string;
  upper: string;
  lower: string;
  name: string;
  sound: string;
  hint: string;
  words: Word[];
};
export type Rule = { title: string; text: string; examples: Word[] };
export type Lesson = {
  id: string;
  kind: 'letters' | 'reading';
  title: string;
  subtitle: string;
  intro: string;
  letters?: Letter[];
  rules?: Rule[];
  words?: Word[];
};
export type Unit = {
  id: string;
  level: LevelId;
  title: string;
  subtitle: string;
  lessons: Lesson[];
};
export type Upcoming = { level: LevelId; title: string };

export const UNITS = (raw as unknown as { units: Unit[] }).units;
export const UPCOMING = (raw as unknown as { upcoming: Upcoming[] }).upcoming;

/** Removes the stress mark (U+0301) so text can be used as a key / for TTS. */
export function plain(s: string): string {
  return s.replace(/́/g, '').trim();
}

export const letterItemId = (l: Letter) => `L:${l.id}`;
export const wordItemId = (w: Word) => `W:${plain(w.ru).toLowerCase()}`;

/** Every item (letters + words) a lesson teaches, deduplicated. */
export function lessonItems(lesson: Lesson): string[] {
  const ids = new Set<string>();
  lesson.letters?.forEach((l) => {
    ids.add(letterItemId(l));
    l.words.forEach((w) => ids.add(wordItemId(w)));
  });
  lesson.words?.forEach((w) => ids.add(wordItemId(w)));
  return [...ids];
}

export function unitItems(unit: Unit): string[] {
  return [...new Set(unit.lessons.flatMap(lessonItems))];
}

// ---------- lookup tables ----------
export const LETTERS: Record<string, Letter> = {};
export const WORDS: Record<string, Word> = {};
UNITS.forEach((u) =>
  u.lessons.forEach((ls) => {
    ls.letters?.forEach((l) => {
      LETTERS[letterItemId(l)] = l;
      l.words.forEach((w) => (WORDS[wordItemId(w)] = WORDS[wordItemId(w)] ?? w));
    });
    ls.words?.forEach((w) => (WORDS[wordItemId(w)] = WORDS[wordItemId(w)] ?? w));
  }),
);

export function findLesson(id: string): { unit: Unit; lesson: Lesson; index: number } | null {
  for (const unit of UNITS) {
    const index = unit.lessons.findIndex((l) => l.id === id);
    if (index >= 0) return { unit, lesson: unit.lessons[index], index };
  }
  return null;
}

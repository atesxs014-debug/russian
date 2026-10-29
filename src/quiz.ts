import { LETTERS, WORDS, Lesson, Letter, Unit, Word, letterItemId, lessonItems, plain, unitItems, wordItemId } from './course';

export type Question = {
  key: string;
  /** Key of the original question when this one is a re-queued retry. */
  origin?: string;
  itemId: string;
  instruction: string;
  /** Big text shown in the prompt area (a letter or a word). */
  display?: string;
  /** Text spoken when the question appears (listening questions). */
  audio?: string;
  /** Text spoken after answering, to reinforce the correct form. */
  audioAfter?: string;
  options: string[];
  answer: string;
  optionsAreRussian: boolean;
  explain: string;
};

/** Latin look-alikes: the classic beginner mistakes, used as distractors. */
const TRAPS: Record<string, string> = { v: 'b', n: 'h', r: 'p', s: 'k', u: 'y', h: 'ks', ye: 'e', i: 'n', ya: 'r', zh: 'ks', p: 'n', ch: 'h' };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}
const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

function options(answer: string, pool: string[], extra: string[] = [], n = 4): string[] {
  const distractors = shuffle([...new Set([...extra, ...shuffle(pool)])].filter((x) => x !== answer));
  return shuffle([answer, ...distractors.slice(0, n - 1)]);
}

let seq = 0;
const k = () => `q${++seq}`;

// ---------- question builders ----------
function letterSound(l: Letter, pool: Letter[]): Question {
  const trap = TRAPS[l.id];
  return {
    key: k(),
    itemId: letterItemId(l),
    instruction: 'Bu harf nasıl okunur?',
    display: `${l.upper} ${l.lower}`,
    audioAfter: l.name,
    options: options(l.sound, pool.map((x) => x.sound), trap ? [trap] : []),
    answer: l.sound,
    optionsAreRussian: false,
    explain: `${l.upper} → "${l.sound}". ${l.hint}`,
  };
}

function soundLetter(l: Letter, pool: Letter[]): Question {
  return {
    key: k(),
    itemId: letterItemId(l),
    instruction: 'Duyduğun harfi seç',
    audio: l.name,
    options: options(l.upper, pool.map((x) => x.upper)),
    answer: l.upper,
    optionsAreRussian: true,
    explain: `Bu "${l.sound}" sesini veren ${l.upper} harfiydi.`,
  };
}

function wordRead(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Bu kelimeyi oku: nasıl okunur?',
    display: w.ru,
    audioAfter: w.ru,
    options: options(w.read, pool.map((x) => x.read)),
    answer: w.read,
    optionsAreRussian: false,
    explain: `${w.ru} = "${w.read}" (${w.tr})`,
  };
}

function wordListen(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Duyduğun kelimeyi seç',
    audio: w.ru,
    options: options(w.ru, pool.map((x) => x.ru)),
    answer: w.ru,
    optionsAreRussian: true,
    explain: `Duyduğun: ${w.ru} — "${w.read}" (${w.tr})`,
  };
}

function wordMeaning(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Bu kelimenin anlamı ne?',
    display: w.ru,
    audio: w.ru,
    options: options(w.tr, pool.map((x) => x.tr)),
    answer: w.tr,
    optionsAreRussian: false,
    explain: `${w.ru} = ${w.tr}`,
  };
}

// ---------- pools ----------
function lettersUpTo(unit: Unit, lessonIndex: number): Letter[] {
  return unit.lessons.slice(0, lessonIndex + 1).flatMap((l) => l.letters ?? []);
}
function wordsOf(lesson: Lesson): Word[] {
  const m = new Map<string, Word>();
  lesson.letters?.forEach((l) => l.words.forEach((w) => m.set(wordItemId(w), w)));
  lesson.words?.forEach((w) => m.set(wordItemId(w), w));
  return [...m.values()];
}
const allLetters = () => Object.values(LETTERS);
const allWords = () => Object.values(WORDS);

/** Lesson quiz: every letter twice (read + listen) and every word once. */
export function lessonQuiz(unit: Unit, lessonIndex: number): Question[] {
  const lesson = unit.lessons[lessonIndex];
  const letters = lesson.letters ?? [];
  const letterPool = letters.length >= 4 ? [...letters, ...lettersUpTo(unit, lessonIndex)] : allLetters();
  const words = wordsOf(lesson);
  const wordPool = [...words, ...allWords()];
  const qs: Question[] = [];
  letters.forEach((l) => {
    qs.push(letterSound(l, letterPool.slice(0, Math.max(letters.length, 6))));
    qs.push(soundLetter(l, letterPool));
  });
  words.forEach((w, i) => {
    const fn = lesson.kind === 'reading' ? (i % 2 ? wordListen : wordRead) : pick([wordRead, wordListen, wordMeaning]);
    qs.push(fn(w, words.length >= 4 ? words : wordPool));
  });
  return shuffle(qs);
}

/** Unit test: every letter and word of the unit, mixed. */
export function unitQuiz(unit: Unit): Question[] {
  return questionsFor(unitItems(unit));
}

/** Questions for an arbitrary list of item ids (used by daily review and tests). */
export function questionsFor(ids: string[]): Question[] {
  const lp = allLetters();
  const wp = allWords();
  return shuffle(
    ids.map((id) => {
      if (id.startsWith('L:')) {
        const l = LETTERS[id];
        return pick([letterSound, soundLetter])(l, lp);
      }
      const w = WORDS[id];
      return pick([wordRead, wordListen, wordMeaning])(w, wp);
    }).filter(Boolean),
  );
}

/** Same question with options reshuffled — used when a wrong answer is re-queued. */
export function requeue(q: Question): Question {
  return { ...q, origin: q.origin ?? q.key, key: k(), options: shuffle(q.options) };
}

export { lessonItems, plain };

import { Course, Lesson, Letter, Unit, Word, letterItemId, letterLabel, unitItems, wordItemId } from './course';

export type Question = {
  key: string;
  /** Key of the original question when this one is a re-queued retry. */
  origin?: string;
  itemId: string;
  instruction: string;
  display?: string;
  /** Text spoken automatically when the question appears (listening questions). */
  audio?: string;
  /** Text spoken after answering, to reinforce the correct form. */
  audioAfter?: string;
  options: string[];
  answer: string;
  optionsAreTarget: boolean;
  /** Shown after the first wrong pick; the learner gets a second try. */
  hint: string;
  explain: string;
};

/** Latin look-alikes for Cyrillic: the classic beginner mistakes, used as distractors. */
const TRAPS_RU: Record<string, string> = { v: 'b', n: 'h', r: 'p', s: 'k', u: 'y', h: 'ks', ye: 'e', i: 'n', ya: 'r', zh: 'ks', p: 'n', ch: 'h' };

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
  const distractors = [...new Set([...extra, ...shuffle(pool)])].filter((x) => x !== answer);
  return shuffle([answer, ...distractors.slice(0, n - 1)]);
}

let seq = 0;
const k = () => `q${++seq}`;
const spaced = (s: string) => s.replace(/́/g, '').split('').join(' ');

type Ctx = { lang: string };

// ---------- builders ----------
function letterSound(c: Ctx, l: Letter, pool: Letter[], forced?: string[]): Question {
  const trap = c.lang === 'ru' ? TRAPS_RU[l.id] : undefined;
  const ex = l.words[0];
  return {
    key: k(),
    itemId: letterItemId(l),
    instruction: c.lang === 'ru' ? 'Bu harf nasıl okunur?' : 'Bu harf/grup nasıl okunur?',
    display: letterLabel(l),
    audioAfter: l.name,
    options: forced ?? options(l.sound, pool.map((x) => x.sound), trap ? [trap] : []),
    answer: l.sound,
    optionsAreTarget: false,
    hint: `Örnek kelimeyi düşün: ${ex.t} (${ex.tr})`,
    explain: `${letterLabel(l)} → "${l.sound}". ${l.hint}`,
  };
}

function soundLetter(c: Ctx, l: Letter, pool: Letter[], forced?: string[]): Question {
  return {
    key: k(),
    itemId: letterItemId(l),
    instruction: c.lang === 'ru' ? 'Duyduğun harfi seç' : 'Duyduğun kelimedeki sesi seç',
    audio: l.name,
    options: forced ?? options(letterLabel(l), pool.map(letterLabel)),
    answer: letterLabel(l),
    optionsAreTarget: true,
    hint: `Bu ses Türkçede "${l.sound}" gibi.`,
    explain: c.lang === 'ru' ? `Bu, "${l.sound}" sesini veren ${l.upper} harfiydi.` : `"${l.name}" kelimesindeki ses: ${letterLabel(l)} → "${l.sound}"`,
  };
}

function wordRead(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Bu kelime nasıl okunur?',
    display: w.t,
    audioAfter: w.t,
    options: options(w.read, pool.map((x) => x.read)),
    answer: w.read,
    optionsAreTarget: false,
    hint: `Harf harf oku: ${spaced(w.t)}`,
    explain: `${w.t} = "${w.read}" (${w.tr})`,
  };
}

function wordListen(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Duyduğun kelimeyi seç',
    audio: w.t,
    options: options(w.t, pool.map((x) => x.t)),
    answer: w.t,
    optionsAreTarget: true,
    hint: `Anlamı: ${w.tr}`,
    explain: `Duyduğun: ${w.t} — "${w.read}" (${w.tr})`,
  };
}

function wordMeaning(w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: 'Bu kelimenin anlamı ne?',
    display: w.t,
    audio: w.t,
    options: options(w.tr, pool.map((x) => x.tr)),
    answer: w.tr,
    optionsAreTarget: false,
    hint: `Okunuşu: ${w.read}`,
    explain: `${w.t} = ${w.tr}`,
  };
}

// ---------- pools ----------
function wordsOf(lesson: Lesson): Word[] {
  const m = new Map<string, Word>();
  lesson.letters?.forEach((l) => l.words.forEach((w) => m.set(wordItemId(w), w)));
  lesson.words?.forEach((w) => m.set(wordItemId(w), w));
  return [...m.values()];
}

/** Lesson quiz: every letter twice (read + listen) and every word once. */
export function lessonQuiz(course: Course, unit: Unit, lessonIndex: number): Question[] {
  const c = { lang: course.lang };
  const lesson = unit.lessons[lessonIndex];
  const allLetters = Object.values(course.letters);
  const allWords = Object.values(course.words);
  const qs: Question[] = [];

  if (lesson.kind === 'compare') {
    lesson.pairs?.forEach((p) => {
      const a = course.letters[`L:${p.a}`];
      const b = course.letters[`L:${p.b}`];
      if (!a || !b) return;
      [a, b].forEach((x) => {
        const other = x === a ? b : a;
        qs.push(soundLetter(c, x, allLetters, shuffle([letterLabel(x), letterLabel(other)])));
        qs.push(letterSound(c, x, allLetters, shuffle([x.sound, other.sound])));
      });
    });
    return shuffle(qs);
  }

  const letters = lesson.letters ?? [];
  const earlier = unit.lessons.slice(0, lessonIndex + 1).flatMap((l) => l.letters ?? []);
  const letterPool = letters.length >= 4 ? [...letters, ...earlier] : allLetters;
  const words = wordsOf(lesson);
  letters.forEach((l) => {
    qs.push(letterSound(c, l, letterPool));
    qs.push(soundLetter(c, l, letterPool));
  });
  words.forEach((w, i) => {
    const pool = words.length >= 4 ? words : allWords;
    const fn = lesson.kind === 'reading' ? (i % 2 ? wordListen : wordRead) : pick([wordRead, wordListen, wordMeaning]);
    qs.push(fn(w, pool));
  });
  return shuffle(qs);
}

export function unitQuiz(course: Course, unit: Unit): Question[] {
  return questionsFor(course, unitItems(unit));
}

/** Questions for an arbitrary list of item ids (daily review, tests, weak points). */
export function questionsFor(course: Course, ids: string[]): Question[] {
  const c = { lang: course.lang };
  const lp = Object.values(course.letters);
  const wp = Object.values(course.words);
  const out: Question[] = [];
  ids.forEach((id) => {
    if (id.startsWith('L:')) {
      const l = course.letters[id];
      if (l) out.push(pick([letterSound, soundLetter])(c, l, lp));
    } else {
      const w = course.words[id];
      if (w) out.push(pick([wordRead, wordListen, wordMeaning])(w, wp));
    }
  });
  return shuffle(out);
}

export function requeue(q: Question): Question {
  return { ...q, origin: q.origin ?? q.key, key: k(), options: shuffle(q.options) };
}

import {
  Course,
  DialogLine,
  Drill,
  Lesson,
  Letter,
  Unit,
  Word,
  drillFull,
  drillItemId,
  letterItemId,
  letterLabel,
  letterSay,
  lineItemId,
  unitItems,
  wordItemId,
} from './course';
import { t } from './i18n';
import type { LevelId } from './theme';

export type Question = {
  key: string;
  /** Key of the original question when this one is a re-queued retry. */
  origin?: string;
  itemId: string;
  instruction: string;
  display?: string;
  /** Small line under the display (e.g. a Turkish sentence to complete). */
  sub?: string;
  /** Text spoken automatically when the question appears (listening questions). */
  audio?: string;
  /** Text spoken after answering, to reinforce the correct form. */
  audioAfter?: string;
  /** Voice for dialogue lines (1 = male). */
  voice?: 0 | 1;
  options: string[];
  answer: string;
  optionsAreTarget: boolean;
  /** 'type': the learner writes the answer with the language keyboard. */
  input?: 'type';
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
  const distractors = [...new Set([...extra, ...shuffle(pool)])].filter((x) => x && x !== answer);
  return shuffle([answer, ...distractors.slice(0, n - 1)]);
}

let seq = 0;
const k = () => `q${++seq}`;
const spaced = (s: string) => s.replace(/́/g, '').split('').join(' ');
const BLANK = '＿＿＿';

type Ctx = { lang: string; level?: LevelId };

// ---------- letters ----------
function letterSound(c: Ctx, l: Letter, pool: Letter[], forced?: string[]): Question {
  const trap = c.lang === 'ru' ? TRAPS_RU[l.id] : undefined;
  const ex = l.words[0];
  return {
    key: k(),
    itemId: letterItemId(l),
    instruction: c.lang === 'ru' ? 'Bu harf nasıl okunur?' : 'Bu harf/grup nasıl okunur?',
    display: letterLabel(l),
    audioAfter: letterSay(l),
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
    instruction: c.lang === 'ru' ? 'Duyduğun harfi seç' : 'Duyduğun harfi / sesi seç',
    audio: letterSay(l),
    options: forced ?? options(letterLabel(l), pool.map(letterLabel)),
    answer: letterLabel(l),
    optionsAreTarget: true,
    hint: `Bu ses Türkçede "${l.sound}" gibi.`,
    explain: `Bu, "${l.sound}" sesini veren ${letterLabel(l)} idi. Örnek: ${l.words[0]?.t ?? l.name}`,
  };
}

// ---------- words ----------
const readOf = (w: Word) => (w.read ? ` — "${w.read}"` : '');

function wordRead(c: Ctx, w: Word, pool: Word[]): Question {
  if (!w.read) return wordMeaning(c, w, pool);
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: t('read', c.lang, c.level),
    display: w.t,
    audioAfter: w.t,
    options: options(w.read, pool.map((x) => x.read)),
    answer: w.read,
    optionsAreTarget: false,
    hint: `Harf harf oku: ${spaced(w.t)}`,
    explain: `${w.t} = "${w.read}" (${w.tr})`,
  };
}

function wordListen(c: Ctx, w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: t('listen', c.lang, c.level),
    audio: w.t,
    options: options(w.t, pool.map((x) => x.t)),
    answer: w.t,
    optionsAreTarget: true,
    hint: `Anlamı: ${w.tr}`,
    explain: `Duyduğun: ${w.t}${readOf(w)} (${w.tr})`,
  };
}

function wordMeaning(c: Ctx, w: Word, pool: Word[]): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: t('meaning', c.lang, c.level),
    display: w.t,
    audio: w.t,
    options: options(w.tr, pool.map((x) => x.tr)),
    answer: w.tr,
    optionsAreTarget: false,
    hint: w.read ? `Okunuşu: ${w.read}` : `İlk harfi: ${w.t.slice(0, 1)}…`,
    explain: `${w.t} = ${w.tr}`,
  };
}

/** Dictation: hear the word, write it. */
function wordDictation(c: Ctx, w: Word): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: t('dictation', c.lang, c.level),
    audio: w.t,
    sub: w.tr,
    options: [],
    answer: w.t.replace(/́/g, ''),
    optionsAreTarget: true,
    input: 'type',
    hint: `${w.t.replace(/́/g, '').length} harf, "${w.t.slice(0, 1)}" ile başlıyor`,
    explain: `${w.t}${readOf(w)} (${w.tr})`,
  };
}

/** Translation: see the Turkish meaning, write the word. */
function wordTranslate(c: Ctx, w: Word): Question {
  return {
    key: k(),
    itemId: wordItemId(w),
    instruction: t('translate', c.lang, c.level),
    display: w.tr,
    options: [],
    answer: w.t.replace(/́/g, ''),
    optionsAreTarget: false,
    input: 'type',
    audioAfter: w.t,
    hint: `İlk harfler: ${w.t.replace(/́/g, '').slice(0, 2)}…`,
    explain: `${w.tr} = ${w.t}${readOf(w)}`,
  };
}

const typeable = (w: Word) => {
  const s = w.t.replace(/́/g, '');
  return s.length >= 2 && s.length <= 18 && !/[…/()]/.test(s);
};

// ---------- grammar drills ----------
function drillPick(c: Ctx, lessonId: string, i: number, d: Drill): Question {
  return {
    key: k(),
    itemId: drillItemId(lessonId, i),
    instruction: t('fill', c.lang, c.level),
    display: d.s.replace('___', BLANK),
    sub: d.tr,
    audioAfter: drillFull(d),
    options: shuffle([d.a, ...d.o.slice(0, 3)]),
    answer: d.a,
    optionsAreTarget: true,
    hint: d.why ?? `Anlamı: ${d.tr}`,
    explain: `${drillFull(d)} — ${d.tr}${d.why ? `\n${d.why}` : ''}`,
  };
}

function drillType(c: Ctx, lessonId: string, i: number, d: Drill): Question {
  return { ...drillPick(c, lessonId, i, d), key: k(), options: [], input: 'type', hint: d.why ? `${d.why} · ilk harf: ${d.a.slice(0, 1)}` : `İlk harf: ${d.a.slice(0, 1)}` };
}

// ---------- dialogue lines ----------
function lineMeaning(c: Ctx, id: string, line: DialogLine, all: DialogLine[]): Question {
  return {
    key: k(),
    itemId: id,
    instruction: t('lineMeaning', c.lang, c.level),
    display: line.t,
    audio: line.t,
    voice: line.p,
    options: options(line.tr, all.map((x) => x.tr)),
    answer: line.tr,
    optionsAreTarget: false,
    hint: 'Anahtar kelimeleri yakala, cümlenin hepsini çevirmeye çalışma.',
    explain: `${line.t} = ${line.tr}`,
  };
}

function lineReply(c: Ctx, id: string, prev: DialogLine, line: DialogLine, all: DialogLine[]): Question {
  return {
    key: k(),
    itemId: id,
    instruction: t('reply', c.lang, c.level),
    display: prev.t,
    sub: prev.tr,
    audio: prev.t,
    voice: prev.p,
    audioAfter: line.t,
    options: options(line.t, all.filter((x) => x !== prev).map((x) => x.t), [], 3),
    answer: line.t,
    optionsAreTarget: true,
    hint: `Cevabın anlamı: ${line.tr}`,
    explain: `${line.t} — ${line.tr}`,
  };
}

function lineQ(c: Ctx, course: Course, id: string): Question | null {
  const e = course.lines[id];
  if (!e) return null;
  const all = e.lesson.dialog!.lines;
  const prev = all[e.index - 1];
  return prev && Math.random() < 0.6 ? lineReply(c, id, prev, e.line, all) : lineMeaning(c, id, e.line, all);
}

// ---------- pools ----------
function wordsOf(lesson: Lesson): Word[] {
  const m = new Map<string, Word>();
  lesson.letters?.forEach((l) => l.words.forEach((w) => m.set(wordItemId(w), w)));
  lesson.words?.forEach((w) => m.set(wordItemId(w), w));
  return [...m.values()];
}

/** Lesson quiz: every letter twice (read + listen), every word twice, plus writing questions. */
export function lessonQuiz(course: Course, unit: Unit, lessonIndex: number): Question[] {
  const c: Ctx = { lang: course.lang, level: unit.level };
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

  if (lesson.kind === 'vocab') {
    const words = lesson.words ?? [];
    const pool = words.length >= 4 ? words : [...words, ...allWords];
    words.forEach((w, i) => {
      qs.push(wordMeaning(c, w, pool));
      qs.push((i % 2 ? wordListen : wordRead)(c, w, pool));
    });
    // writing: one dictation in every lesson, plus one translation from the "Orta" level on
    const tw = shuffle(words.filter(typeable));
    if (tw[0]) qs.push(wordDictation(c, tw[0]));
    if (tw[1] && unit.level !== 'baslangic') qs.push(wordTranslate(c, tw[1]));
    return shuffle(qs);
  }

  if (lesson.kind === 'grammar') {
    const ex = (lesson.rules ?? []).flatMap((r) => r.examples);
    const exPool = [...ex, ...allWords];
    ex.forEach((w) => qs.push(wordMeaning(c, w, exPool)));
    const drills = lesson.drills ?? [];
    const typed = new Set(shuffle(drills.map((_, i) => i)).slice(0, 2));
    drills.forEach((d, i) => qs.push((typed.has(i) ? drillType : drillPick)(c, lesson.id, i, d)));
    return shuffle(qs);
  }

  if (lesson.kind === 'dialog' && lesson.dialog) {
    const all = lesson.dialog.lines;
    all.forEach((line, i) => {
      const id = lineItemId(lesson.id, i);
      qs.push(lineMeaning(c, id, line, all));
      if (i > 0) qs.push(lineReply(c, id, all[i - 1], line, all));
    });
    return shuffle(qs);
  }

  if (lesson.kind === 'text' && lesson.text) {
    const tx = lesson.text;
    const gloss = tx.gloss.map(([t2, tr]) => ({ t: t2, tr, read: '' }));
    gloss.forEach((w) => qs.push(wordMeaning(c, w, [...gloss, ...allWords])));
    const comp = tx.qs.map(
      (x): Question => ({
        key: k(),
        itemId: `T:${lesson.id}`,
        instruction: t('textQ', c.lang, c.level),
        display: x.q,
        options: shuffle([x.a, ...x.o]),
        answer: x.a,
        optionsAreTarget: true,
        hint: 'Metne bir daha göz at: cevap metnin içinde geçiyor.',
        explain: `${x.q} → ${x.a}`,
      }),
    );
    return [...shuffle(qs), ...comp];
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
    qs.push(fn(c, w, pool));
  });
  return shuffle(qs);
}

export function unitQuiz(course: Course, unit: Unit): Question[] {
  return questionsFor(course, unitItems(unit), unit.level);
}

/** Questions for an arbitrary list of item ids (daily review, tests, weak points). */
export function questionsFor(course: Course, ids: string[], level?: LevelId): Question[] {
  const c: Ctx = { lang: course.lang, level };
  const lp = Object.values(course.letters);
  const wp = Object.values(course.words);
  const out: Question[] = [];
  ids.forEach((id) => {
    if (id.startsWith('L:')) {
      const l = course.letters[id];
      if (l) out.push(pick([letterSound, soundLetter])(c, l, lp));
    } else if (id.startsWith('G:')) {
      const d = course.drills[id];
      const [, lessonId, i] = id.split(':');
      if (d) out.push((Math.random() < 0.25 ? drillType : drillPick)(c, lessonId, Number(i), d));
    } else if (id.startsWith('D:')) {
      const q = lineQ(c, course, id);
      if (q) out.push(q);
    } else {
      const w = course.words[id];
      if (!w) return;
      // about one in six word reviews is written (dictation) to keep spelling fresh
      if (typeable(w) && Math.random() < 0.17) out.push(wordDictation(c, w));
      else out.push(pick([wordRead, wordListen, wordMeaning])(c, w, wp));
    }
  });
  return shuffle(out);
}

export function requeue(q: Question): Question {
  return { ...q, origin: q.origin ?? q.key, key: k(), options: shuffle(q.options) };
}

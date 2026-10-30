import { Course, lessonItems, unitItems, unitOptional } from './course';

export const PASS = 0.9; // %90 olmadan geçiş yok
export const RETRY_MINUTES = 15; // sınavdan kalınca bekleme
const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // kutu → gün (normal tekrar sıklığı)
/** Bir öğe 5 başarılı tekrardan sonra "tam öğrenildi" sayılır. */
export const MASTERED_BOX = 6;
/** Ünite sınavı, tüm öğeler ertesi gün en az bir kez tekrarlanmadan açılmaz. */
export const TEST_MIN_BOX = 2;

export type ItemStat = { box: number; due: string; right: number; wrong: number };
export type Score = { best: number; attempts: number; passedAt?: string; lastFailAt?: string; perfect?: boolean };
export type Progress = {
  version: 1;
  lessons: Record<string, Score>;
  tests: Record<string, Score>;
  items: Record<string, ItemStat>;
  streak: { count: number; last?: string; best?: number; freezes?: { month: string; used: number } };
  xp: number;
  /** Lesson saved mid-way, to resume after the app is closed. */
  resume?: { lessonId: string; card: number };
  /** Words whose speaking check was skipped ("Şu an konuşamam"); the lesson isn't passed until done. */
  speakDebt?: Record<string, string[]>;
  updatedAt: string;
};

export function emptyProgress(): Progress {
  return { version: 1, lessons: {}, tests: {}, items: {}, streak: { count: 0 }, xp: 0, updatedAt: new Date().toISOString() };
}

// ---------- dates (local) ----------
export function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

// ---------- SRS ----------
export function dueItems(p: Progress): string[] {
  const t = today();
  return Object.entries(p.items)
    .filter(([, s]) => s.due <= t)
    .map(([id]) => id);
}

export function masteredCount(p: Progress): number {
  return Object.values(p.items).filter((s) => s.box >= MASTERED_BOX).length;
}

/** Weakest items: most mistakes relative to correct answers. */
export function weakItems(p: Progress, n = 20): string[] {
  return Object.entries(p.items)
    .filter(([, s]) => s.wrong > 0)
    .sort(([, a], [, b]) => b.wrong / (b.right + 1) - a.wrong / (a.right + 1))
    .slice(0, n)
    .map(([id]) => id);
}

function enroll(p: Progress, ids: string[]) {
  const tomorrow = today(1);
  ids.forEach((id) => {
    if (!p.items[id]) p.items[id] = { box: 1, due: tomorrow, right: 0, wrong: 0 };
  });
}

/** Adds a single item (e.g. a word tapped in a reading text) to the review cycle. */
export function addToReview(p: Progress, id: string): Progress {
  const next = clone(p);
  enroll(next, [id]);
  return touch(next);
}

export function applyReview(p: Progress, firstTry: Record<string, boolean>): Progress {
  const next = clone(p);
  Object.entries(firstTry).forEach(([id, ok]) => {
    const s = next.items[id];
    if (!s) return;
    if (ok) {
      s.right += 1;
      s.box = Math.min(s.box + 1, INTERVALS.length - 1);
      s.due = today(INTERVALS[s.box]);
    } else {
      s.wrong += 1;
      s.box = 1;
      s.due = today(1);
    }
  });
  next.xp += Object.values(firstTry).filter(Boolean).length * 2;
  return touch(next);
}

function tally(p: Progress, firstTry: Record<string, boolean>) {
  Object.entries(firstTry).forEach(([id, ok]) => {
    const s = p.items[id];
    if (!s) return;
    if (ok) s.right += 1;
    else {
      s.wrong += 1;
      if (s.box > 1) {
        s.box = 1;
        s.due = today(1);
      }
    }
  });
}

export function applyLesson(course: Course, p: Progress, lessonId: string, score: number, firstTry: Record<string, boolean>, skippedSpeech: string[] = []): Progress {
  const next = clone(p);
  const prev = next.lessons[lessonId] ?? { best: 0, attempts: 0 };
  if (skippedSpeech.length) {
    next.speakDebt = next.speakDebt ?? {};
    next.speakDebt[lessonId] = [...new Set([...(next.speakDebt[lessonId] ?? []), ...skippedSpeech])];
  }
  const owes = (next.speakDebt?.[lessonId]?.length ?? 0) > 0;
  const passed = score >= PASS && !owes;
  next.lessons[lessonId] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    passedAt: prev.passedAt ?? (passed ? today() : undefined),
    perfect: prev.perfect || score === 1,
  };
  tally(next, firstTry);
  if (passed) {
    const found = course.units.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
    if (found) enroll(next, lessonItems(found));
  }
  if (next.resume?.lessonId === lessonId) delete next.resume;
  next.xp += Math.round(score * 20) + (score === 1 ? 10 : 0);
  return touch(next);
}

/** Marks one skipped word as spoken; when none remain and the quiz was passed, the lesson is passed. */
export function paySpeakDebt(course: Course, p: Progress, lessonId: string, word: string): Progress {
  const next = clone(p);
  const left = (next.speakDebt?.[lessonId] ?? []).filter((w) => w !== word);
  if (next.speakDebt) {
    if (left.length) next.speakDebt[lessonId] = left;
    else delete next.speakDebt[lessonId];
  }
  const sc = next.lessons[lessonId];
  if (!left.length && sc && sc.best >= PASS && !sc.passedAt) {
    sc.passedAt = today();
    const found = course.units.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
    if (found) enroll(next, lessonItems(found));
  }
  return touch(next);
}

export const speakDebtTotal = (p: Progress) => Object.values(p.speakDebt ?? {}).reduce((n, a) => n + a.length, 0);

export function applyTest(p: Progress, unitId: string, score: number, firstTry: Record<string, boolean>): Progress {
  const next = clone(p);
  const prev = next.tests[unitId] ?? { best: 0, attempts: 0 };
  const passed = score >= PASS;
  next.tests[unitId] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    passedAt: prev.passedAt ?? (passed ? today() : undefined),
    lastFailAt: passed ? prev.lastFailAt : new Date().toISOString(),
    perfect: prev.perfect || score === 1,
  };
  tally(next, firstTry);
  next.xp += Math.round(score * 50) + (score === 1 ? 25 : 0);
  return touch(next);
}

/** Updates the streak; a monthly allowance of 2 "freezes" bridges a single missed day. */
export function bumpStreak(p: Progress): { progress: Progress; firstToday: boolean } {
  const t = today();
  if (p.streak.last === t) return { progress: p, firstToday: false };
  const next = clone(p);
  const month = t.slice(0, 7);
  const fr = next.streak.freezes?.month === month ? next.streak.freezes : { month, used: 0 };
  let count = 1;
  if (p.streak.last) {
    const gap = daysBetween(p.streak.last, t);
    if (gap === 1) count = p.streak.count + 1;
    else if (gap === 2 && fr.used < 2) {
      fr.used += 1;
      count = p.streak.count + 1;
    }
  }
  next.streak = { count, last: t, best: Math.max(p.streak.best ?? 0, count), freezes: fr };
  return { progress: touch(next), firstToday: true };
}

export function saveResume(p: Progress, lessonId: string, card: number): Progress {
  const next = clone(p);
  next.resume = { lessonId, card };
  return next;
}

// ---------- unlock rules ----------
export type LockState = { open: true } | { open: false; reason: string };

export function unitOpen(course: Course, p: Progress, unitIndex: number): boolean {
  // optional units ("Ayrı dersler" grammar) never block the path
  let j = unitIndex - 1;
  while (j >= 0 && unitOptional(course.units[j])) j--;
  if (j < 0) return true;
  return !!p.tests[course.units[j].id]?.passedAt;
}

export function lessonLock(course: Course, p: Progress, unitIndex: number, lessonIndex: number): LockState {
  const unit = course.units[unitIndex];
  const lesson = unit.lessons[lessonIndex];
  if (p.lessons[lesson.id]?.passedAt) return { open: true };
  if (!unitOpen(course, p, unitIndex)) return { open: false, reason: 'Önceki ünitenin sınavını geçmelisin.' };
  if (lessonIndex > 0 && !p.lessons[unit.lessons[lessonIndex - 1].id]?.passedAt)
    return { open: false, reason: 'Önceki dersi %90 ile geçmelisin.' };
  if (dueItems(p).length > 0) return { open: false, reason: 'Önce bugünkü tekrarı bitir.' };
  return { open: true };
}

export function minutesUntilRetry(s?: Score): number {
  if (!s?.lastFailAt || s.passedAt) return 0;
  const left = RETRY_MINUTES - (Date.now() - Date.parse(s.lastFailAt)) / 60000;
  return Math.max(0, Math.ceil(left));
}

export function testLock(course: Course, p: Progress, unitIndex: number): LockState {
  const unit = course.units[unitIndex];
  const sc = p.tests[unit.id];
  if (sc?.passedAt) return { open: true };
  if (!unit.lessons.every((l) => p.lessons[l.id]?.passedAt)) return { open: false, reason: 'Ünitedeki tüm dersleri geçmelisin.' };
  if (dueItems(p).length > 0) return { open: false, reason: 'Önce bugünkü tekrarı bitir.' };
  const wait = minutesUntilRetry(sc);
  if (wait > 0) return { open: false, reason: `Sınava ${wait} dakika sonra tekrar girebilirsin. Bu sürede yanlışlarını tekrar et.` };
  const weak = unitItems(unit).filter((id) => (p.items[id]?.box ?? 0) < TEST_MIN_BOX);
  if (weak.length > 0) return { open: false, reason: `${weak.length} öğe henüz pekişmedi. Yarınki tekrardan sonra sınav açılır.` };
  return { open: true };
}

export function unitProgress(p: Progress, unit: { id: string; lessons: { id: string }[] }): number {
  const steps = unit.lessons.length + 1;
  const done = unit.lessons.filter((l) => p.lessons[l.id]?.passedAt).length + (p.tests[unit.id]?.passedAt ? 1 : 0);
  return done / steps;
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}
function touch(p: Progress): Progress {
  p.updatedAt = new Date().toISOString();
  return p;
}

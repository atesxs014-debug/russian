import { UNITS, Unit, lessonItems, unitItems } from './course';

export const PASS = 0.9; // %90 olmadan geçiş yok
const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // kutu → gün
/** A unit's final test only opens once every item reached this box (= reviewed on a later day). */
export const TEST_MIN_BOX = 2;

export type ItemStat = { box: number; due: string; right: number; wrong: number };
export type Score = { best: number; attempts: number; passedAt?: string };
export type Progress = {
  version: 1;
  lessons: Record<string, Score>;
  tests: Record<string, Score>;
  items: Record<string, ItemStat>;
  streak: { count: number; last?: string };
  xp: number;
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

// ---------- SRS ----------
export function dueItems(p: Progress): string[] {
  const t = today();
  return Object.entries(p.items)
    .filter(([, s]) => s.due <= t)
    .map(([id]) => id);
}

/** Items enter the review cycle once a lesson is passed: first review tomorrow. */
function enroll(p: Progress, ids: string[]) {
  const tomorrow = today(1);
  ids.forEach((id) => {
    if (!p.items[id]) p.items[id] = { box: 1, due: tomorrow, right: 0, wrong: 0 };
  });
}

/** Records the result of a question during a review session. */
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
  return touch(next);
}

/** Counts right/wrong during lessons/tests without moving SRS boxes. */
function tally(p: Progress, firstTry: Record<string, boolean>) {
  Object.entries(firstTry).forEach(([id, ok]) => {
    const s = p.items[id];
    if (!s) return;
    if (ok) s.right += 1;
    else {
      s.wrong += 1;
      // a mistake on something "known" sends it back to tomorrow's review
      if (s.box > 1) {
        s.box = 1;
        s.due = today(1);
      }
    }
  });
}

export function applyLesson(p: Progress, lessonId: string, score: number, firstTry: Record<string, boolean>): Progress {
  const next = clone(p);
  const prev = next.lessons[lessonId] ?? { best: 0, attempts: 0 };
  const passed = score >= PASS;
  next.lessons[lessonId] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    passedAt: prev.passedAt ?? (passed ? today() : undefined),
  };
  tally(next, firstTry);
  if (passed) {
    const found = UNITS.flatMap((u) => u.lessons).find((l) => l.id === lessonId);
    if (found) enroll(next, lessonItems(found));
  }
  next.xp += Math.round(score * 20);
  return touch(next);
}

export function applyTest(p: Progress, unitId: string, score: number, firstTry: Record<string, boolean>): Progress {
  const next = clone(p);
  const prev = next.tests[unitId] ?? { best: 0, attempts: 0 };
  next.tests[unitId] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    passedAt: prev.passedAt ?? (score >= PASS ? today() : undefined),
  };
  tally(next, firstTry);
  next.xp += Math.round(score * 50);
  return touch(next);
}

export function bumpStreak(p: Progress): Progress {
  const t = today();
  if (p.streak.last === t) return p;
  const next = clone(p);
  next.streak = { count: p.streak.last === today(-1) ? p.streak.count + 1 : 1, last: t };
  return touch(next);
}

// ---------- unlock rules ----------
export type LockState =
  | { open: true }
  | { open: false; reason: string };

export function unitOpen(p: Progress, unitIndex: number): boolean {
  if (unitIndex === 0) return true;
  const prev = UNITS[unitIndex - 1];
  return !!p.tests[prev.id]?.passedAt;
}

export function lessonLock(p: Progress, unitIndex: number, lessonIndex: number): LockState {
  const unit = UNITS[unitIndex];
  const lesson = unit.lessons[lessonIndex];
  if (p.lessons[lesson.id]?.passedAt) return { open: true }; // tekrar çalışmak her zaman serbest
  if (!unitOpen(p, unitIndex)) return { open: false, reason: 'Önceki ünitenin sınavını geçmelisin.' };
  if (lessonIndex > 0 && !p.lessons[unit.lessons[lessonIndex - 1].id]?.passedAt)
    return { open: false, reason: 'Önceki dersi %90 ile geçmelisin.' };
  if (dueItems(p).length > 0) return { open: false, reason: 'Önce bugünkü tekrarı bitir.' };
  return { open: true };
}

export function testLock(p: Progress, unitIndex: number): LockState {
  const unit = UNITS[unitIndex];
  if (p.tests[unit.id]?.passedAt) return { open: true };
  if (!unit.lessons.every((l) => p.lessons[l.id]?.passedAt))
    return { open: false, reason: 'Ünitedeki tüm dersleri geçmelisin.' };
  if (dueItems(p).length > 0) return { open: false, reason: 'Önce bugünkü tekrarı bitir.' };
  const weak = unitItems(unit).filter((id) => (p.items[id]?.box ?? 0) < TEST_MIN_BOX);
  if (weak.length > 0)
    return { open: false, reason: `${weak.length} öğe henüz pekişmedi. Yarınki tekrardan sonra sınav açılır.` };
  return { open: true };
}

export function unitProgress(p: Progress, unit: Unit): number {
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

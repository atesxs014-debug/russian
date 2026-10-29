import { Course, Unit } from './course';
import { Progress, dueItems, lessonLock, testLock, unitOpen } from './progress';
import { findLesson } from './course';

export type NextLesson = { unitIndex: number; lessonIndex: number; lessonId: string; title: string; unit: Unit; locked: boolean; reason?: string };

/** The first lesson not yet passed, in course order (it may be locked behind review). */
export function nextLesson(course: Course, p: Progress): NextLesson | null {
  for (let ui = 0; ui < course.units.length; ui++) {
    if (!unitOpen(course, p, ui)) return null;
    const unit = course.units[ui];
    for (let li = 0; li < unit.lessons.length; li++) {
      const ls = unit.lessons[li];
      if (p.lessons[ls.id]?.passedAt) continue;
      const lock = lessonLock(course, p, ui, li);
      return { unitIndex: ui, lessonIndex: li, lessonId: ls.id, title: ls.title, unit, locked: !lock.open, reason: lock.open ? undefined : lock.reason };
    }
    if (!p.tests[unit.id]?.passedAt) return null; // waiting for the unit test
  }
  return null;
}

/** Unit the learner is currently working on (for the progress strip). */
export function currentUnitIndex(course: Course, p: Progress): number {
  for (let ui = 0; ui < course.units.length; ui++) {
    if (!p.tests[course.units[ui].id]?.passedAt) return ui;
  }
  return course.units.length - 1;
}

export type Today =
  | { kind: 'review'; count: number; next: NextLesson | null }
  | { kind: 'speak'; lessonId: string; title: string; count: number }
  | { kind: 'resume'; next: NextLesson; card: number }
  | { kind: 'lesson'; next: NextLesson }
  | { kind: 'test'; unitIndex: number; unit: Unit }
  | { kind: 'wait'; reason: string; unitIndex: number }
  | { kind: 'done' };

/** The single most important thing to do right now (shown in the "Bugün" card). */
export function today(course: Course, p: Progress): Today {
  const due = dueItems(p).length;
  const next = nextLesson(course, p);
  if (due > 0) return { kind: 'review', count: due, next };
  const debt = Object.entries(p.speakDebt ?? {}).find(([, w]) => w.length);
  if (debt) return { kind: 'speak', lessonId: debt[0], title: findLesson(course, debt[0])?.lesson.title ?? '', count: debt[1].length };
  if (next && p.resume?.lessonId === next.lessonId && p.resume.card > 0) return { kind: 'resume', next, card: p.resume.card };
  if (next && !next.locked) return { kind: 'lesson', next };
  const ui = currentUnitIndex(course, p);
  const unit = course.units[ui];
  if (unit && !p.tests[unit.id]?.passedAt && unit.lessons.every((l) => p.lessons[l.id]?.passedAt)) {
    const t = testLock(course, p, ui);
    return t.open ? { kind: 'test', unitIndex: ui, unit } : { kind: 'wait', reason: t.reason, unitIndex: ui };
  }
  return { kind: 'done' };
}

export function accuracy(p: Progress): number | null {
  let r = 0;
  let w = 0;
  Object.values(p.items).forEach((s) => {
    r += s.right;
    w += s.wrong;
  });
  return r + w ? r / (r + w) : null;
}

import type { Progress } from './progress';
import { MASTERED_BOX } from './progress';

export type Badge = { id: string; icon: string; title: string; desc: string; done: (s: Stats) => boolean };
type Stats = { lessons: number; perfect: number; tests: number; streak: number; mastered: number; items: number; xpTotal: number; langs: number; speakFree: boolean };

export function stats(p: Progress, xpTotal: number, langs: number): Stats {
  const ls = Object.values(p.lessons);
  return {
    lessons: ls.filter((l) => l.passedAt).length,
    perfect: ls.filter((l) => l.perfect).length,
    tests: Object.values(p.tests).filter((t) => t.passedAt).length,
    streak: Math.max(p.streak.count, p.streak.best ?? 0),
    mastered: Object.values(p.items).filter((s) => s.box >= MASTERED_BOX).length,
    items: Object.keys(p.items).length,
    xpTotal,
    langs,
    speakFree: Object.values(p.speakDebt ?? {}).every((x) => !x.length),
  };
}

/** Badges are earned per language (streak / XP / languages count across). */
export const BADGES: Badge[] = [
  { id: 'first', icon: '🌱', title: 'İlk adım', desc: 'İlk dersi geç', done: (s) => s.lessons >= 1 },
  { id: 'l10', icon: '📗', title: 'Çalışkan', desc: '10 ders geç', done: (s) => s.lessons >= 10 },
  { id: 'l50', icon: '📚', title: 'Kitap kurdu', desc: '50 ders geç', done: (s) => s.lessons >= 50 },
  { id: 'l100', icon: '🏛️', title: 'Akademisyen', desc: '100 ders geç', done: (s) => s.lessons >= 100 },
  { id: 'l200', icon: '👑', title: 'Usta', desc: '200 ders geç', done: (s) => s.lessons >= 200 },
  { id: 'p5', icon: '⭐', title: 'Kusursuz', desc: '5 dersi %100 ile geç', done: (s) => s.perfect >= 5 },
  { id: 'p25', icon: '🌟', title: 'Mükemmeliyetçi', desc: '25 dersi %100 ile geç', done: (s) => s.perfect >= 25 },
  { id: 't1', icon: '🏆', title: 'İlk kupa', desc: 'Bir ünite sınavını geç', done: (s) => s.tests >= 1 },
  { id: 't10', icon: '🥇', title: 'Şampiyon', desc: '10 ünite sınavını geç', done: (s) => s.tests >= 10 },
  { id: 's3', icon: '🔥', title: 'Isınma', desc: '3 günlük seri', done: (s) => s.streak >= 3 },
  { id: 's7', icon: '📅', title: 'Bir hafta', desc: '7 günlük seri', done: (s) => s.streak >= 7 },
  { id: 's30', icon: '🗓️', title: 'Bir ay', desc: '30 günlük seri', done: (s) => s.streak >= 30 },
  { id: 's100', icon: '💎', title: 'Yüz gün', desc: '100 günlük seri', done: (s) => s.streak >= 100 },
  { id: 'm50', icon: '🧠', title: 'Hafıza', desc: '50 öğeyi tam öğren', done: (s) => s.mastered >= 50 },
  { id: 'm300', icon: '🧩', title: 'Fil hafızası', desc: '300 öğeyi tam öğren', done: (s) => s.mastered >= 300 },
  { id: 'm1000', icon: '🚀', title: 'Kelime avcısı', desc: '1000 öğeyi tam öğren', done: (s) => s.mastered >= 1000 },
  { id: 'x1000', icon: '⚡', title: 'Bin XP', desc: 'Toplam 1000 XP', done: (s) => s.xpTotal >= 1000 },
  { id: 'x5000', icon: '🌋', title: 'Beş bin XP', desc: 'Toplam 5000 XP', done: (s) => s.xpTotal >= 5000 },
  { id: 'poly', icon: '🌍', title: 'Çok dilli', desc: 'İkinci bir dile başla', done: (s) => s.langs >= 2 },
  { id: 'poly3', icon: '🗺️', title: 'Dünya vatandaşı', desc: '3 dile başla', done: (s) => s.langs >= 3 },
];

export function earned(p: Progress, xpTotal: number, langs: number): Badge[] {
  const s = stats(p, xpTotal, langs);
  return BADGES.filter((b) => b.done(s));
}

import type { Course } from '../course';

export const SPEAK_PASS = 80; // her öğe 80+ puan

export type SpeakResult = {
  score: number; // 0–100
  heard: string;
  /** Target characters (as displayed, stress marks removed) with a flag per char. */
  chars: { ch: string; wrong: boolean }[];
  tips: string[];
};

const PUNCT = /[.,!?¿¡«»"“”„'’…:;()\-–—]/g;

function norm(s: string, lang: string): string {
  let t = s.replace(/́/g, '').toLowerCase().replace(PUNCT, ' ');
  if (lang === 'ru') t = t.replace(/ё/g, 'е');
  return t.replace(/\s+/g, ' ').trim();
}

/** Levenshtein alignment; returns distance and which target indices were wrong. */
function align(a: string, b: string): { dist: number; wrong: boolean[] } {
  const n = a.length;
  const m = b.length;
  const d: number[][] = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Array(m + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  const wrong = new Array(n).fill(false);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) wrong[i - 1] = true;
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      wrong[i - 1] = true; // missing in what we heard
      i--;
    } else {
      // extra sound: blame the neighbouring target letter
      if (i > 0) wrong[i - 1] = true;
      j--;
    }
  }
  return { dist: d[n][m], wrong };
}

/** Scores what Whisper heard against the target text. */
export function scoreSpeech(target: string, heard: string, lang: string, course: Course): SpeakResult {
  const display = target.replace(/́/g, '');
  const t = norm(target, lang);
  const h = norm(heard, lang);
  // compare without spaces so "доброе утро" ≈ "доброеутро"
  const tc = t.replace(/ /g, '');
  const hc = h.replace(/ /g, '');
  const { dist, wrong } = hc ? align(tc, hc) : { dist: tc.length, wrong: new Array(tc.length).fill(true) };
  const score = tc.length ? Math.max(0, Math.round((1 - dist / Math.max(tc.length, hc.length || 1)) * 100)) : 0;

  // map flags back onto the displayed text (skip spaces/punctuation)
  const chars: SpeakResult['chars'] = [];
  let k = 0;
  for (const ch of display) {
    const n = norm(ch, lang);
    if (n && n !== ' ') {
      chars.push({ ch, wrong: !!wrong[k] && score < 100 });
      k++;
    } else chars.push({ ch, wrong: false });
  }

  // mouth/tongue tips from the letter/sound cards that cover the wrong letters
  const tips: string[] = [];
  if (score < 100) {
    const wrongText = chars.filter((c) => c.wrong).map((c) => norm(c.ch, lang)).join('');
    Object.values(course.letters).forEach((l) => {
      if (tips.length >= 2) return;
      const keys = `${l.upper} ${l.lower}`
        .toLowerCase()
        .split(/[\s·,()]+/)
        .map((x) => x.replace(/[_-]/g, ''))
        .filter((x) => x && x.length <= 4);
      const hit = keys.some((key) => (key.length === 1 ? wrongText.includes(key) : tc.includes(key) && [...key].some((c) => wrongText.includes(c))));
      if (hit) tips.push(`${l.upper}: ${l.hint}`);
    });
  }
  return { score, heard, chars, tips };
}

import type { LevelId } from './theme';

/**
 * Interface strings. At the "Yüksek" level the lesson/quiz screens switch to the
 * target language (Turkish stays in small print where it helps).
 */
export type Key =
  | 'meaning'
  | 'listen'
  | 'read'
  | 'fill'
  | 'reply'
  | 'dictation'
  | 'translate'
  | 'textQ'
  | 'lineMeaning'
  | 'next'
  | 'back'
  | 'start'
  | 'startQuiz'
  | 'check'
  | 'correct'
  | 'wrong'
  | 'hintTitle'
  | 'continue'
  | 'sayFirst';

const TR: Record<Key, string> = {
  meaning: 'Bu kelimenin anlamı ne?',
  listen: 'Duyduğun kelimeyi seç',
  read: 'Bu kelime nasıl okunur?',
  fill: 'Boşluğu doldur',
  reply: 'Buna en uygun cevap hangisi?',
  dictation: 'Duyduğunu yaz',
  translate: 'Bunu hedef dilde yaz',
  textQ: 'Metne göre cevapla',
  lineMeaning: 'Bu cümle ne demek?',
  next: 'İleri',
  back: 'Geri',
  start: 'Başla',
  startQuiz: 'Sınava başla',
  check: 'Kontrol et',
  correct: 'Doğru!',
  wrong: 'Yanlış — sonra tekrar gelecek',
  hintTitle: 'İpucu — bir hakkın daha var',
  continue: 'Devam',
  sayFirst: 'Önce söyle',
};

const T: Record<string, Partial<Record<Key, string>>> = {
  ru: {
    meaning: 'Что значит это слово?',
    listen: 'Выбери слово, которое ты слышишь',
    read: 'Как читается это слово?',
    fill: 'Заполни пропуск',
    reply: 'Какой ответ подходит лучше всего?',
    dictation: 'Напиши, что ты слышишь',
    translate: 'Напиши по-русски',
    textQ: 'Ответь по тексту',
    lineMeaning: 'Что значит эта фраза?',
    next: 'Дальше',
    back: 'Назад',
    start: 'Начать',
    startQuiz: 'Начать тест',
    check: 'Проверить',
    correct: 'Правильно!',
    wrong: 'Неправильно — вернёмся позже',
    hintTitle: 'Подсказка — ещё одна попытка',
    continue: 'Дальше',
    sayFirst: 'Сначала скажи',
  },
  en: {
    meaning: 'What does this word mean?',
    listen: 'Choose the word you hear',
    read: 'How do you pronounce this word?',
    fill: 'Fill in the gap',
    reply: 'Which reply fits best?',
    dictation: 'Write what you hear',
    translate: 'Write it in English',
    textQ: 'Answer from the text',
    lineMeaning: 'What does this sentence mean?',
    next: 'Next',
    back: 'Back',
    start: 'Start',
    startQuiz: 'Start the test',
    check: 'Check',
    correct: 'Correct!',
    wrong: 'Wrong — it will come back',
    hintTitle: 'Hint — one more try',
    continue: 'Continue',
    sayFirst: 'Say it first',
  },
  de: {
    meaning: 'Was bedeutet dieses Wort?',
    listen: 'Wähle das Wort, das du hörst',
    read: 'Wie spricht man dieses Wort aus?',
    fill: 'Fülle die Lücke',
    reply: 'Welche Antwort passt am besten?',
    dictation: 'Schreib, was du hörst',
    translate: 'Schreib es auf Deutsch',
    textQ: 'Antworte nach dem Text',
    lineMeaning: 'Was bedeutet dieser Satz?',
    next: 'Weiter',
    back: 'Zurück',
    start: 'Los',
    startQuiz: 'Test starten',
    check: 'Prüfen',
    correct: 'Richtig!',
    wrong: 'Falsch — kommt später wieder',
    hintTitle: 'Tipp — noch ein Versuch',
    continue: 'Weiter',
    sayFirst: 'Sag es zuerst',
  },
  fr: {
    meaning: 'Que veut dire ce mot ?',
    listen: 'Choisis le mot que tu entends',
    read: 'Comment se prononce ce mot ?',
    fill: 'Complète le trou',
    reply: 'Quelle réponse convient le mieux ?',
    dictation: "Écris ce que tu entends",
    translate: 'Écris-le en français',
    textQ: "Réponds d'après le texte",
    lineMeaning: 'Que veut dire cette phrase ?',
    next: 'Suivant',
    back: 'Retour',
    start: 'Commencer',
    startQuiz: 'Commencer le test',
    check: 'Vérifier',
    correct: 'Correct !',
    wrong: 'Faux — ça reviendra',
    hintTitle: 'Indice — encore un essai',
    continue: 'Continuer',
    sayFirst: "Dis-le d'abord",
  },
  it: {
    meaning: 'Che cosa significa questa parola?',
    listen: 'Scegli la parola che senti',
    read: 'Come si pronuncia questa parola?',
    fill: 'Completa lo spazio',
    reply: 'Quale risposta va meglio?',
    dictation: 'Scrivi quello che senti',
    translate: 'Scrivilo in italiano',
    textQ: 'Rispondi in base al testo',
    lineMeaning: 'Che cosa significa questa frase?',
    next: 'Avanti',
    back: 'Indietro',
    start: 'Inizia',
    startQuiz: 'Inizia il test',
    check: 'Controlla',
    correct: 'Giusto!',
    wrong: 'Sbagliato — tornerà più tardi',
    hintTitle: 'Suggerimento — un altro tentativo',
    continue: 'Continua',
    sayFirst: 'Prima dillo',
  },
};

/** UI string; in "Yüksek" units it comes in the language being learned. */
export function t(key: Key, lang: string, level?: LevelId): string {
  if (level === 'yuksek') return T[lang]?.[key] ?? TR[key];
  return TR[key];
}

// ---------- typed answers ----------
const ARTICLES = /^(the|a|an|der|die|das|den|dem|ein|eine|le|la|les|l'|un|une|des|il|lo|i|gli|l’|uno|una|un')\s*/;

/** Lower-case, no stress marks/punctuation, ё→е, single spaces. */
export function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/́/g, '')
    .replace(/ё/g, 'е')
    .replace(/[’`]/g, "'")
    .replace(/[.,!?¿¡;:«»"“”()…—–-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}

/** 'ok' exact (articles optional), 'near' one letter off (gets the hint/second try), 'no' otherwise. */
export function checkTyped(typed: string, answer: string): 'ok' | 'near' | 'no' {
  const a = norm(answer);
  const x = norm(typed);
  if (!x) return 'no';
  if (x === a || x.replace(ARTICLES, '') === a.replace(ARTICLES, '')) return 'ok';
  if (a.length >= 4 && lev(x, a) <= Math.max(1, Math.floor(a.length / 8))) return 'near';
  return 'no';
}

// ---------- on-screen keyboards (Cyrillic, umlauts, accents) ----------
export const KEYBOARD: Record<string, string[]> = {
  ru: ['йцукенгшщзхъ', 'фывапролджэё', 'ячсмитьбю'],
  en: ['qwertyuiop', 'asdfghjkl', "zxcvbnmé'"],
  de: ['qwertzuiopü', 'asdfghjklöä', "yxcvbnmßé'"],
  fr: ['azertyuiopé', 'qsdfghjklmè', "wxcvbnçàù'", 'êâîôûëïœ'],
  it: ['qwertyuiopè', 'asdfghjklòà', "zxcvbnmìùé'"],
};

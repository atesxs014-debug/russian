import { StyleSheet } from 'react-native';

const DARK = {
  bg: '#0D1120',
  bg2: '#121731',
  card: '#181E3A',
  cardHi: '#212849',
  line: '#2A3258',
  text: '#F3F5FF',
  sub: '#9AA3C7',
  dim: '#5D668C',
  primary: '#6C8CFF',
  primaryDark: '#4A66D9',
  accent: '#FF5C5C',
  good: '#35D08A',
  goodBg: '#123A2C',
  bad: '#FF5C6C',
  badBg: '#3F1622',
  gold: '#F6BE4A',
  goldBg: '#3A2E12',
  onPrimary: '#0B0F1E',
  male: '#6CA8FF',
  female: '#FF7A9C',
  neuter: '#4FD1A5',
};

const LIGHT: typeof DARK = {
  bg: '#F5F6FB',
  bg2: '#ECEEF7',
  card: '#FFFFFF',
  cardHi: '#E6E9F5',
  line: '#D8DCEB',
  text: '#121731',
  sub: '#5A6386',
  dim: '#98A0BF',
  primary: '#4A66D9',
  primaryDark: '#3550BE',
  accent: '#E5484D',
  good: '#16A36A',
  goodBg: '#DDF6EA',
  bad: '#D93A4C',
  badBg: '#FBE3E6',
  gold: '#C98A0B',
  goldBg: '#FBF0D6',
  onPrimary: '#FFFFFF',
  male: '#2F6FD6',
  female: '#D6336C',
  neuter: '#11906A',
};

/** Accent palettes unlocked with XP. */
export const ACCENTS: { id: string; name: string; xp: number; dark: string; light: string }[] = [
  { id: 'blue', name: 'Mavi', xp: 0, dark: '#6C8CFF', light: '#4A66D9' },
  { id: 'mint', name: 'Nane', xp: 300, dark: '#3DD6B0', light: '#0F9C7E' },
  { id: 'violet', name: 'Mor', xp: 700, dark: '#A88BFF', light: '#7254E0' },
  { id: 'coral', name: 'Mercan', xp: 1200, dark: '#FF8A6C', light: '#E0603F' },
  { id: 'gold', name: 'Altın', xp: 2000, dark: '#F6BE4A', light: '#B9800A' },
];

export const C = { ...DARK };
export let fontScale = 1;
let version = 0;

export function applyTheme(scheme: 'light' | 'dark', accentId = 'blue', scale = 1) {
  const base = scheme === 'light' ? LIGHT : DARK;
  const acc = ACCENTS.find((a) => a.id === accentId) ?? ACCENTS[0];
  Object.assign(C, base, { primary: scheme === 'light' ? acc.light : acc.dark });
  fontScale = scale;
  version++;
}

/** Font size scaled by the user's text-size setting. */
export const fs = (n: number) => Math.round(n * fontScale);

/** Like StyleSheet.create, but recomputed whenever the theme or font size changes. */
export function themed<T extends StyleSheet.NamedStyles<T>>(fn: () => T): T {
  let v = -1;
  let cache = {} as T;
  return new Proxy({} as T, {
    get(_t, prop) {
      if (v !== version) {
        cache = StyleSheet.create(fn());
        v = version;
      }
      return (cache as Record<string | symbol, unknown>)[prop];
    },
  });
}

export const R = { sm: 10, md: 16, lg: 24, xl: 32 };

export const LEVELS = [
  { id: 'baslangic', title: 'Başlangıç', sub: 'A1 – A2' },
  { id: 'orta', title: 'Orta', sub: 'B1' },
  { id: 'yuksek', title: 'Yüksek', sub: 'B2 – C1' },
] as const;

export type LevelId = (typeof LEVELS)[number]['id'];

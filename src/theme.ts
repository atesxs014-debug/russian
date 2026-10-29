import { StyleSheet } from 'react-native';

// Lavanta (tema 8). Telefon karanlık moddayken koyu lavanta eşi kullanılır.
const DARK = {
  bg: '#15111F',
  bg2: '#1B1628',
  card: '#221B33',
  cardHi: '#2C2442',
  line: '#352B4D',
  bar: '#120E1A',
  text: '#F3EFFF',
  sub: '#A99FC2',
  dim: '#6E6588',
  primary: '#A48BFF',
  primaryDark: '#8A6CF5',
  accent: '#FF8A5C',
  good: '#3DD39A',
  goodBg: '#12352A',
  bad: '#FF6B80',
  badBg: '#3D1825',
  gold: '#F6BE4A',
  goldBg: '#3A2E12',
  onPrimary: '#170F2E',
  male: '#7DB0FF',
  female: '#FF86A8',
  neuter: '#5FDDB3',
};

const LIGHT: typeof DARK = {
  bg: '#F4F1FB',
  bg2: '#ECE7F8',
  card: '#FFFFFF',
  cardHi: '#EFEAFB',
  line: '#E3DCF2',
  bar: '#FFFFFF',
  text: '#1F1633',
  sub: '#635A78',
  dim: '#9A92B0',
  primary: '#6A48E8',
  primaryDark: '#5536CC',
  accent: '#D9582A',
  good: '#13915F',
  goodBg: '#DDF4EA',
  bad: '#D23A4F',
  badBg: '#FBE3E7',
  gold: '#B9760A',
  goldBg: '#FCEFD6',
  onPrimary: '#FFFFFF',
  male: '#2F6FD6',
  female: '#D6336C',
  neuter: '#11906A',
};

/** Accent palettes unlocked with XP. */
export const ACCENTS: { id: string; name: string; xp: number; dark: string; light: string }[] = [
  { id: 'blue', name: 'Lavanta', xp: 0, dark: '#A48BFF', light: '#6A48E8' },
  { id: 'mint', name: 'Nane', xp: 300, dark: '#3DD6B0', light: '#0F8A70' },
  { id: 'violet', name: 'Okyanus', xp: 700, dark: '#6CA8FF', light: '#2F6FD6' },
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

// ---- Manrope (Sora'ya benzer, Kiril + Türkçe destekli) ----
const FAMILY: Record<string, string> = {
  '400': 'Manrope_400Regular',
  normal: 'Manrope_400Regular',
  '500': 'Manrope_500Medium',
  '600': 'Manrope_600SemiBold',
  '700': 'Manrope_700Bold',
  bold: 'Manrope_700Bold',
  '800': 'Manrope_800ExtraBold',
  '900': 'Manrope_800ExtraBold',
};
let fontsReady = false;
export const setFontsReady = (ok: boolean) => (fontsReady = ok);
/** Font family for a weight; undefined (system font) if the custom font failed to load. */
export const familyFor = (w?: string | number) => (fontsReady ? FAMILY[String(w ?? '400')] ?? FAMILY['400'] : undefined);

export const LEVELS = [
  { id: 'baslangic', title: 'Başlangıç', sub: 'A1 – A2' },
  { id: 'orta', title: 'Orta', sub: 'B1' },
  { id: 'yuksek', title: 'Yüksek', sub: 'B2 – C1' },
] as const;

export type LevelId = (typeof LEVELS)[number]['id'];

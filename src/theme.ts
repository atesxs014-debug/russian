export const C = {
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
};

export const R = { sm: 10, md: 16, lg: 24, xl: 32 };

export const LEVELS = [
  { id: 'baslangic', title: 'Başlangıç', sub: 'A1 – A2' },
  { id: 'orta', title: 'Orta', sub: 'B1' },
  { id: 'yuksek', title: 'Yüksek', sub: 'B2+' },
] as const;

export type LevelId = (typeof LEVELS)[number]['id'];

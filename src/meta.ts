import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { BUILD, REPO } from './buildInfo';

/** Shown once after installing a new build ("Yenilikler"). */
export const WHATS_NEW: string[] = [
  'Rusça derinleşti: her kelimeye örnek cümle (kartta, sözlükte ve sorularda), 2.100+ kelime',
  'Rusça dilbilgisi tam set: sıfat çekimi, çoğul hâller, zamirler, -ся fiilleri, sayılar, koşul kipi, который, ön ekli hareket fiilleri',
  'Rusça 19 diyalog ve 9 okuma metni (eczane, otel, banka, kira, Puşkin, Baykal…)',
  'Rusça yüksek seviyeye 525 yeni kelime: siyaset, hukuk, ekonomi, bilim, sağlık, medya, sanat…',
];

const SEEN_KEY = 'voxa.seenBuild';

export async function shouldShowWhatsNew(): Promise<boolean> {
  try {
    const seen = await AsyncStorage.getItem(SEEN_KEY);
    return seen !== String(BUILD);
  } catch {
    return false;
  }
}
export async function markWhatsNewSeen() {
  await AsyncStorage.setItem(SEEN_KEY, String(BUILD)).catch(() => {});
}

/** Direct download link of the newest build for this phone. */
export const LATEST_URL = () => `https://github.com/${REPO}/releases/latest/download/${Platform.OS === 'ios' ? 'Voxa.ipa' : 'Voxa.apk'}`;

/** Checks GitHub Releases for a newer build. Returns the newer build number and its direct download link. */
export async function checkForUpdate(): Promise<{ build: number; url: string } | null> {
  if (!BUILD) return null;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    const n = parseInt(String(j.tag_name ?? '').replace(/\D/g, ''), 10);
    // straight to the newest file, never the releases page with old versions
    const file = Platform.OS === 'ios' ? 'Voxa.ipa' : 'Voxa.apk';
    return n > BUILD ? { build: n, url: `https://github.com/${REPO}/releases/latest/download/${file}` } : null;
  } catch {
    return null;
  }
}

/** Opens a pre-filled GitHub issue page; the user just taps "Submit". No token in the app. */
export function reportProblem(ctx: { lang: string; where: string; detail: string }) {
  const title = `[${ctx.lang}] İçerik hatası: ${ctx.where}`.slice(0, 120);
  const body = [`**Dil:** ${ctx.lang}`, `**Yer:** ${ctx.where}`, `**Sürüm:** ${BUILD}`, '', '**Detay:**', ctx.detail, '', '**Ne yanlış?** (buraya yaz)', ''].join('\n');
  const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=icerik`;
  Linking.openURL(url).catch(() => {});
}

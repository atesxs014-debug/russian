import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking } from 'react-native';
import { BUILD, REPO } from './buildInfo';

/** Shown once after installing a new build ("Yenilikler"). */
export const WHATS_NEW: string[] = [
  'Yeni görünüm: Lavanta teması ve Manrope yazı tipi',
  'Sade ana sayfa: tek "Bugün" kartı, ünite ilerlemesi tek satırda',
  'Alt menü: Ana sayfa · Dersler · Tekrar · Profil',
  'Dersler 10 katına çıktı: Rusça 72, İngilizce/Almanca/Fransızca 50, İtalyanca 44 ders',
  'Kelime kartları: emoji, cinsiyet rengi, okunuş',
  'Yanlışlıkla seçimi önleyen dokunma koruması',
  'Tekrar sekmesinde hafıza durumu ve zayıf noktalar',
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

/** Checks GitHub Releases for a newer build. Returns the newer build number or null. */
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
    return n > BUILD ? { build: n, url: j.html_url } : null;
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

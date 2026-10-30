import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';
import { BUILD, REPO } from './buildInfo';

/** Shown once after installing a new build ("Yenilikler"). */
export const WHATS_NEW: string[] = [
  'Orta seviyeye dilbilgisi üniteleri: haller/zamanlar/artikeller, boşluk doldurma alıştırmalarıyla (Ayarlar → Dilbilgisi: zorunlu ya da isteğe bağlı)',
  'Diyalog dersleri: Anya ve Dima (her dilde kendi karakterleri) ile gerçek konuşmalar; ikinci kişinin repliklerini sen söylüyorsun',
  'Yüksek seviye açıldı: ileri dilbilgisi, okuma metinleri (kelimeye dokun → anlamı, sesi, tekrara ekle) ve serbest konuşma; arayüz o dile geçer',
  'Yazma ve dikte: dilin kendi klavyesiyle (Kiril, ä ö ü ß, é è ç…) duyduğunu yaz',
  'Sözlük ve fiil çekim tabloları (Tekrar sekmesi)',
  '20 rozet, PDF ilerleme raporu ve Android ana ekran widget\'ı',
  'Bulut yedek: e-postayla giriş, her dersten sonra otomatik yedek',
  'Uygulama boyutu küçüldü: sesler sıkıştırıldı, yavaş dinleme artık aynı kayıttan',
  'Dil başına 1.500+ kelime/ifade',
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

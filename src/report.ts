import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LangCode, getCourse, langMeta } from './course';
import { MASTERED_BOX, Progress, emptyProgress } from './progress';
import { accuracy } from './today';
import { BADGES, earned } from './badges';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const pct = (n: number) => `%${Math.round(n * 100)}`;

/** Builds a one-page progress report (all languages) as a PDF and opens the share sheet. */
export async function shareReport(backupJson: string): Promise<boolean> {
  try {
    const data = JSON.parse(backupJson);
    const name: string = data.profile?.name ?? '';
    const xpTotal: number = data.profile?.xpTotal ?? 0;
    const langs = Object.keys(data.progress ?? {}) as LangCode[];
    const rows = langs.map((l) => {
      const p: Progress = { ...emptyProgress(), ...data.progress[l] };
      const course = getCourse(l);
      const totalLessons = course.units.reduce((n, u) => n + u.lessons.length, 0);
      const passed = Object.values(p.lessons).filter((x) => x.passedAt).length;
      const tests = Object.values(p.tests).filter((x) => x.passedAt).length;
      const items = Object.values(p.items);
      const mastered = items.filter((s) => s.box >= MASTERED_BOX).length;
      const acc = accuracy(p);
      const cur = course.units.find((u) => !p.tests[u.id]?.passedAt);
      const badges = earned(p, xpTotal, langs.length);
      const m = langMeta(l);
      return `
        <section>
          <h2>${m.flag} ${esc(m.name)}</h2>
          <div class="bar"><div style="width:${Math.round((passed / Math.max(1, totalLessons)) * 100)}%"></div></div>
          <table>
            <tr><td>Geçilen ders</td><td><b>${passed}</b> / ${totalLessons}</td></tr>
            <tr><td>Geçilen ünite sınavı</td><td><b>${tests}</b> / ${course.units.length}</td></tr>
            <tr><td>Şu anki ünite</td><td>${esc(cur?.title ?? 'Tümü tamamlandı')}</td></tr>
            <tr><td>Tekrardaki öğe</td><td><b>${items.length}</b> (tam öğrenilen ${mastered})</td></tr>
            <tr><td>Doğruluk</td><td>${acc === null ? '—' : pct(acc)}</td></tr>
            <tr><td>Seri</td><td>${p.streak.count} gün (en iyi ${p.streak.best ?? p.streak.count})</td></tr>
            <tr><td>XP</td><td>${p.xp}</td></tr>
          </table>
          <p class="badges">${badges.map((b) => `${b.icon} ${esc(b.title)}`).join(' · ') || 'Henüz rozet yok'}</p>
        </section>`;
    });
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;color:#1d1830;padding:28px}
      h1{color:#6A48E8;margin:0}h2{margin:22px 0 8px}
      .sub{color:#6b6683;margin-top:4px}
      table{width:100%;border-collapse:collapse}td{padding:6px 0;border-bottom:1px solid #ece9f6}td:last-child{text-align:right}
      .bar{height:10px;background:#ece9f6;border-radius:5px;overflow:hidden;margin-bottom:8px}.bar div{height:10px;background:#6A48E8}
      .badges{color:#6b6683;font-size:13px}
      footer{margin-top:28px;color:#9a95b0;font-size:11px}
    </style></head><body>
      <h1>Voxa ilerleme raporu</h1>
      <div class="sub">${esc(name)} · ${new Date().toLocaleDateString('tr-TR')} · toplam ${xpTotal} XP · ${BADGES.length} rozetten seçilenler</div>
      ${rows.join('')}
      <footer>Voxa ile oluşturuldu.</footer>
    </body></html>`;
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Voxa raporu' });
    return true;
  } catch {
    return false;
  }
}

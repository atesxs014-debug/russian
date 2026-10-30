# Voxa

Konuşarak dil öğrenme uygulaması (Android + iOS, Expo). Diller: 🇷🇺 Rusça, 🇬🇧 İngilizce, 🇩🇪 Almanca, 🇫🇷 Fransızca, 🇮🇹 İtalyanca.

- **Başlangıç → Orta → Yüksek** (A1 – C1); her ders %90 ile geçilmeden sonraki açılmaz.
- Aralıklı tekrar: günlük tekrar bitmeden yeni ders açılmaz; ünite sınavı öğeler pekişmeden açılmaz, kalınca 15 dk bekleme.
- Yanlışta önce ipucu, ikinci hakta doğru cevap; yanlışlar oturum içinde tekrar gelir.
- Her dilin kendi ilerlemesi ve serisi (ayda 2 seri dondurma).
- Sesler GitHub Actions'ta üretilip uygulamaya gömülür (Edge doğal sesler, yedek: Google Translate sesi) — anahtar gerekmez, internetsiz çalışır.

## Kurulum dosyaları

`main`'e her push'ta GitHub Actions **Releases** sayfasına `Voxa-N.apk` ve `Voxa-N.ipa` (imzasız, Esign/Feather ile imzalanır) koyar.

Her zaman en son sürüm:
- Android: https://github.com/atesxs014-debug/russian/releases/latest/download/Voxa.apk
- iPhone: https://github.com/atesxs014-debug/russian/releases/latest/download/Voxa.ipa

## Android imza anahtarı

Repo → Settings → Secrets and variables → Actions → `ANDROID_KEYSTORE_B64`. Tanımlıysa her APK aynı anahtarla imzalanır ve güncellemeler ilerleme silinmeden üstüne kurulur.

## İçerik

- Kelime paketleri: `src/data/<dil>.json` (dil başına 1.500+ kelime/ifade).
- Dilbilgisi, diyalog ve okuma: `content/grammar/<dil>.txt` → `python3 scripts/build_grammar.py` → `src/data/grammar/<dil>.json` (CI ikisinin uyumlu olduğunu kontrol eder).
- Fiil çekimleri: `src/data/conj.json`.
- Sesler CI'da üretilir (edge-tts, diyaloglarda erkek sesi), mono 32 kbps'e sıkıştırılır; yavaş dinleme aynı kayıttan yapılır.

## Bulut yedek (Supabase)

1. Supabase → SQL Editor → `supabase/schema.sql` içeriğini çalıştır.
2. Authentication → Providers → Email açık olsun (istersen "Confirm email" kapat).
3. Project Settings → API'deki URL ve `anon` anahtarını `src/cloudConfig.ts` içine yaz.

## Yol haritası

1. ✅ 5 dil, ses/alfabe üniteleri, kilit sistemi, ayarlar, bildirimler
2. ✅ Kelime üniteleri: dil başına 45 ünite, 1.500+ kelime/ifade
3. ✅ Konuşma analizi (gömülü Whisper base), kayıt karşılaştırma, telaffuz telafisi
4. ✅ Lavanta teması, sekmeli sade düzen
5. ✅ Orta: dilbilgisi üniteleri + diyaloglar; Yüksek: ileri dilbilgisi, okuma, serbest konuşma (arayüz hedef dilde)
6. ✅ Yazma/dikte (dil klavyesi), sözlük, fiil çekimleri, rozetler, PDF rapor, Android widget
7. ✅ Supabase bulut yedek (proje anahtarı girilince açılır)
8. iOS widget (imzasız IPA'da uygulama grubu gerektiği için şimdilik yok)

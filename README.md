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

Dil paketleri `src/data/<dil>.json` dosyalarında. Yeni ders eklemek için JSON'a ders ekleyip push etmek yeterli; sesler otomatik üretilir.

## Yol haritası

1. ✅ 5 dil, ses/alfabe üniteleri, kilit sistemi, ayarlar, bildirimler
2. ✅ Kelime üniteleri: Rusça 72, İngilizce/Almanca/Fransızca 50, İtalyanca 44 ders
3. ✅ Konuşma analizi (gömülü Whisper base), kayıt karşılaştırma, telaffuz telafisi
4. ✅ Lavanta teması, sekmeli sade düzen
3. Başlangıç seviyesi kelime/diyalog üniteleri (Anya & Dima), Kiril klavye, dikte
4. Sözlük, çekim tabloları, kopya kağıdı, rozetler, widget, PDF rapor
5. Orta ve yüksek seviyeler
6. Supabase bulut yedek (iPhone profili)

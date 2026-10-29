# Rusça

Sıfırdan, alfabeden başlayarak seviyeli Rusça öğrenme uygulaması (Android + iOS, Expo).

- **Başlangıç → Orta → Yüksek**; her ders %90 ile geçilmeden sonraki açılmaz.
- Aralıklı tekrar (SRS): günlük tekrar bitmeden yeni ders açılmaz, ünite sınavı öğeler pekişmeden açılmaz.
- Sesler GitHub Actions'ta üretilip uygulamaya gömülür (Edge doğal ses, yedek: Google Translate sesi) — anahtar gerekmez, internetsiz çalışır.

## Kurulum dosyaları

`main`'e her push'ta GitHub Actions şunları üretir ve **Releases** sayfasına koyar:

- `Rusca-N.apk` → Android
- `Rusca-N.ipa` → iPhone (imzasız; Sideloadly/AltStore ile yüklenir)

## Android imza anahtarı

Repo ayarlarında `ANDROID_KEYSTORE_B64` secret'ı tanımlıysa her APK aynı anahtarla imzalanır, böylece güncellemeler ilerleme silinmeden üstüne kurulur.

## Yol haritası

1. ✅ İskelet, alfabe ünitesi, kilit sistemi, APK + IPA derlemesi
2. Konuşma analizi (cihaz içi Whisper)
3. Supabase bulut yedek (iPhone profili)
4. Başlangıç seviyesinin tamamı
5. Orta ve yüksek seviyeler

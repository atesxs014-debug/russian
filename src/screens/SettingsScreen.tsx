import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { langMeta } from '../course';
import { masteredCount } from '../progress';
import { ensurePermission } from '../notify';
import { BUILD } from '../buildInfo';
import AvatarPicker from '../components/AvatarPicker';
import { Button, FRAMES, IconBtn, Segmented, Stepper, Toggle } from '../ui';
import { ACCENTS, C, R, fs, themed } from '../theme';

const pad = (n: number) => `${n}`.padStart(2, '0');

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile, settings, progress, updateSettings, updateProfile, selectProfile, deleteProfile, resetProgress, exportBackup, importBackup } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState('');
  const xp = profile?.xpTotal ?? 0;
  const lang = langMeta(settings.lang);

  if (!profile) return null;

  async function setReminder(patch: Partial<typeof settings.reminder>) {
    if (patch.on) await ensurePermission();
    updateSettings({ reminder: { ...settings.reminder, ...patch } });
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.top, { paddingTop: insets.top + 8, paddingLeft: insets.left + 14 }]}>
        <IconBtn icon="arrow-back" onPress={onClose} />
        <Text style={st.title}>Ayarlar</Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, paddingBottom: insets.bottom + 40, maxWidth: 640, width: '100%', alignSelf: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={st.section}>PROFİL</Text>
        <View style={st.card}>
          <AvatarPicker value={profile.avatar} name={profile.name} onChange={(a) => updateProfile({ avatar: a })} />
          <TextInput value={name} onChangeText={setName} style={[st.input, { marginTop: 12 }]} placeholderTextColor={C.dim} />
          <Button title="Adı kaydet" kind="ghost" disabled={!name.trim() || name === profile.name} onPress={() => updateProfile({ name: name.trim() })} style={{ marginTop: 10 }} />
          <Button title="Profil değiştir" kind="ghost" icon="people" onPress={() => selectProfile(null)} style={{ marginTop: 10 }} />
        </View>

        <Text style={st.section}>GÖRÜNÜM</Text>
        <View style={st.card}>
          <Text style={st.label}>Yazı boyutu</Text>
          <Segmented
            options={[
              { value: 0.9, label: 'Küçük' },
              { value: 1, label: 'Normal' },
              { value: 1.15, label: 'Büyük' },
              { value: 1.3, label: 'Çok büyük' },
            ]}
            value={settings.fontScale}
            onChange={(v) => updateSettings({ fontScale: v })}
          />
          <Text style={[st.label, { marginTop: 12 }]}>Renk teması · {xp} XP</Text>
          <View style={st.swatches}>
            {ACCENTS.map((a) => {
              const locked = xp < a.xp;
              const on = settings.accent === a.id;
              return (
                <Pressable key={a.id} disabled={locked} onPress={() => updateSettings({ accent: a.id })} style={[st.swatch, on && { borderColor: C.text }]}>
                  <View style={[st.swatchDot, { backgroundColor: a.dark }, locked && { opacity: 0.25 }]}>{locked && <Ionicons name="lock-closed" size={14} color="#fff" />}</View>
                  <Text style={st.swatchText}>{locked ? `${a.xp} XP` : a.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[st.label, { marginTop: 12 }]}>Profil çerçevesi</Text>
          <View style={st.swatches}>
            {FRAMES.map((f) => {
              const locked = xp < f.xp;
              const on = settings.frame === f.id;
              return (
                <Pressable key={f.id} disabled={locked} onPress={() => updateSettings({ frame: f.id })} style={[st.swatch, on && { borderColor: C.text }]}>
                  <View style={[st.swatchDot, { borderWidth: 4, borderColor: f.id === 'none' ? C.line : f.color, backgroundColor: 'transparent' }, locked && { opacity: 0.3 }]}>
                    {locked && <Ionicons name="lock-closed" size={14} color={C.sub} />}
                  </View>
                  <Text style={st.swatchText}>{locked ? `${f.xp} XP` : f.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={st.note}>Açık/koyu tema telefonunun ayarını takip eder.</Text>
        </View>

        <Text style={st.section}>SES</Text>
        <View style={st.card}>
          <Text style={st.label}>Dinleme hızı</Text>
          <Segmented
            options={[0.5, 0.75, 1, 1.25, 1.5].map((v) => ({ value: v, label: `${v}x` }))}
            value={settings.rate}
            onChange={(v) => updateSettings({ rate: v })}
          />
          <Toggle label="Ses efektleri" sub="Doğru/yanlış sesleri" value={settings.sfx} onChange={(v) => updateSettings({ sfx: v })} />
          <Toggle label="Titreşim" value={settings.haptics} onChange={(v) => updateSettings({ haptics: v })} />
        </View>

        <Text style={st.section}>ÖĞRENME</Text>
        <View style={st.card}>
          <Text style={st.label}>Dilbilgisi anlatımı</Text>
          <Segmented
            options={[
              { value: 'embedded', label: 'Derslerin içinde' },
              { value: 'separate', label: 'Ayrı dersler' },
            ]}
            value={settings.grammarMode}
            onChange={(v) => updateSettings({ grammarMode: v })}
          />
          <Text style={st.note}>Dilbilgisi üniteleri geldiğinde bu seçime göre gösterilecek.</Text>
        </View>

        <Text style={st.section}>BİLDİRİMLER</Text>
        <View style={st.card}>
          <Toggle label="Günlük hatırlatma" value={settings.reminder.on} onChange={(v) => setReminder({ on: v })} />
          {settings.reminder.on && (
            <Stepper
              label="Saat"
              value={`${pad(settings.reminder.hour)}:${pad(settings.reminder.minute)}`}
              onMinus={() => {
                const t = settings.reminder.hour * 60 + settings.reminder.minute - 30;
                const m = (t + 1440) % 1440;
                setReminder({ hour: Math.floor(m / 60), minute: m % 60 });
              }}
              onPlus={() => {
                const m = (settings.reminder.hour * 60 + settings.reminder.minute + 30) % 1440;
                setReminder({ hour: Math.floor(m / 60), minute: m % 60 });
              }}
            />
          )}
          <Toggle label="Sessiz saatler" sub="Bu saatlerde ek hatırlatma gelmez" value={settings.quiet.on} onChange={(v) => updateSettings({ quiet: { ...settings.quiet, on: v } })} />
          {settings.quiet.on && (
            <>
              <Stepper label="Başlangıç" value={`${pad(settings.quiet.from)}:00`} onMinus={() => updateSettings({ quiet: { ...settings.quiet, from: (settings.quiet.from + 23) % 24 } })} onPlus={() => updateSettings({ quiet: { ...settings.quiet, from: (settings.quiet.from + 1) % 24 } })} />
              <Stepper label="Bitiş" value={`${pad(settings.quiet.to)}:00`} onMinus={() => updateSettings({ quiet: { ...settings.quiet, to: (settings.quiet.to + 23) % 24 } })} onPlus={() => updateSettings({ quiet: { ...settings.quiet, to: (settings.quiet.to + 1) % 24 } })} />
            </>
          )}
          <Toggle label="Haftalık özet" sub="Pazar 19:00" value={settings.weekly} onChange={async (v) => { if (v) await ensurePermission(); updateSettings({ weekly: v }); }} />
        </View>

        {Platform.OS === 'ios' && (
          <>
            <Text style={st.section}>YEDEK (GEÇİCİ)</Text>
            <View style={st.card}>
              <Text style={st.p}>Otomatik bulut yedek gelene kadar: IPA'yı silip yüklemeden önce yedeği paylaş (Notlar'a kaydet), yeniden yükleyince buraya yapıştır. Her dil ayrı yedeklenir.</Text>
              <Button title={`${lang.name} yedeğini paylaş`} icon="share-outline" onPress={() => Share.share({ message: exportBackup() }).catch(() => {})} style={{ marginTop: 12 }} />
              {showImport ? (
                <>
                  <TextInput value={paste} onChangeText={setPaste} multiline placeholder="Yedek metnini yapıştır" placeholderTextColor={C.dim} style={[st.input, { height: 110, textAlignVertical: 'top', paddingTop: 12, marginTop: 12 }]} />
                  <Button
                    title="Geri yükle"
                    kind="good"
                    disabled={!paste.trim()}
                    onPress={async () => {
                      if (await importBackup(paste)) {
                        Alert.alert('Yüklendi', 'İlerlemen geri yüklendi.');
                        setPaste('');
                        setShowImport(false);
                      } else Alert.alert('Olmadı', 'Bu metin geçerli bir Voxa yedeği değil.');
                    }}
                    style={{ marginTop: 10 }}
                  />
                </>
              ) : (
                <Button title="Yedekten geri yükle" kind="ghost" icon="download-outline" onPress={() => setShowImport(true)} style={{ marginTop: 10 }} />
              )}
            </View>
          </>
        )}

        <Text style={st.section}>İSTATİSTİK · {lang.name.toUpperCase()}</Text>
        <View style={st.card}>
          <Text style={st.p}>Öğrenilen öğe: {Object.keys(progress.items).length} · tam öğrenilen: {masteredCount(progress)}</Text>
          <Text style={st.p}>Geçilen ders: {Object.values(progress.lessons).filter((l) => l.passedAt).length}</Text>
          <Text style={st.p}>
            Seri: {progress.streak.count} gün (en iyi {progress.streak.best ?? progress.streak.count}) · dondurma hakkı: {2 - (progress.streak.freezes?.month === new Date().toISOString().slice(0, 7) ? progress.streak.freezes.used : 0)}/2
          </Text>
          <Text style={st.p}>Bu dilde XP: {progress.xp} · toplam XP: {xp}</Text>
        </View>

        <Text style={st.section}>TEHLİKELİ BÖLGE</Text>
        <View style={st.card}>
          <Button title={`${lang.name} ilerlemesini sıfırla`} kind="ghost" onPress={() => { setResetText(''); setResetOpen(true); }} />
          <Button
            title="Profili sil"
            kind="bad"
            onPress={() =>
              Alert.alert('Profil silinsin mi?', `${profile.name} ve tüm dillerdeki ilerlemesi silinecek.`, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => deleteProfile(profile.id) },
              ])
            }
            style={{ marginTop: 10 }}
          />
        </View>
        <Text style={st.ver}>Voxa · sürüm {BUILD || 'geliştirme'}</Text>
      </ScrollView>

      <Modal visible={resetOpen} transparent animationType="fade" onRequestClose={() => setResetOpen(false)}>
        <View style={st.backdrop}>
          <View style={st.dialog}>
            <Text style={st.dTitle}>Emin misin?</Text>
            <Text style={st.p}>{lang.name} ilerlemenin tamamı silinecek. Onaylamak için SIFIRLA yaz.</Text>
            <TextInput value={resetText} onChangeText={setResetText} autoCapitalize="characters" placeholder="SIFIRLA" placeholderTextColor={C.dim} style={[st.input, { marginTop: 12 }]} />
            <Button
              title="Sıfırla"
              kind="bad"
              disabled={resetText.trim().toUpperCase() !== 'SIFIRLA'}
              onPress={() => {
                resetProgress();
                setResetOpen(false);
              }}
              style={{ marginTop: 12 }}
            />
            <Button title="Vazgeç" kind="ghost" onPress={() => setResetOpen(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = themed(() => ({
  top: { flexDirection: 'row', alignItems: 'center', paddingRight: 14 },
  title: { color: C.text, fontSize: fs(22), fontWeight: '900', marginLeft: 8 },
  section: { color: C.dim, fontWeight: '900', fontSize: fs(12), letterSpacing: 1.5, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  label: { color: C.text, fontWeight: '700', fontSize: fs(15) },
  input: { backgroundColor: C.bg2, borderRadius: R.md, color: C.text, fontSize: fs(17), paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: C.line },
  p: { color: C.sub, fontSize: fs(15), lineHeight: fs(22) },
  note: { color: C.dim, fontSize: fs(12), marginTop: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  swatch: { alignItems: 'center', padding: 6, borderRadius: 12, borderWidth: 2, borderColor: 'transparent', width: 70 },
  swatchDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  swatchText: { color: C.sub, fontSize: fs(11), fontWeight: '700', marginTop: 4 },
  ver: { color: C.dim, textAlign: 'center', marginTop: 24, fontSize: fs(12) },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.bg, borderRadius: R.lg, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
  dTitle: { color: C.text, fontSize: fs(22), fontWeight: '900', marginBottom: 8 },
}));

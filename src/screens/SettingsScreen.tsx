import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store';
import { emptyProgress } from '../progress';
import { Button, IconBtn } from '../ui';
import { C, R } from '../theme';

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile, selectProfile, renameProfile, deleteProfile, exportBackup, importBackup, save, progress } = useApp();
  const [name, setName] = useState(profile?.name ?? '');
  const [paste, setPaste] = useState('');
  const [showImport, setShowImport] = useState(false);

  async function doExport() {
    try {
      await Share.share({ message: exportBackup(), title: 'Rusça yedek' });
    } catch {}
  }

  async function doImport() {
    const ok = await importBackup(paste);
    if (ok) {
      Alert.alert('Yüklendi', 'İlerlemen geri yüklendi.');
      setPaste('');
      setShowImport(false);
      onClose();
    } else Alert.alert('Olmadı', 'Bu metin geçerli bir Rusça uygulama yedeği değil.');
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        <IconBtn icon="arrow-back" onPress={onClose} />
        <Text style={st.title}>Ayarlar</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <Text style={st.section}>PROFİL</Text>
        <View style={st.card}>
          <TextInput value={name} onChangeText={setName} style={st.input} placeholderTextColor={C.dim} />
          <Button title="Adı kaydet" kind="ghost" disabled={!name.trim() || name === profile?.name} onPress={() => profile && renameProfile(profile.id, name)} style={{ marginTop: 10 }} />
          <Button title="Profil değiştir" kind="ghost" icon="people" onPress={() => selectProfile(null)} style={{ marginTop: 10 }} />
        </View>

        <Text style={st.section}>YEDEK</Text>
        <View style={st.card}>
          <Text style={st.p}>
            IPA'yı silip yeniden yüklemeden önce yedeği paylaş (Notlar'a ya da Dosyalar'a kaydet). Yeniden yükleyince buraya yapıştır. Otomatik bulut yedek bir sonraki sürümde geliyor.
          </Text>
          <Button title="Yedeği paylaş" icon="share-outline" onPress={doExport} style={{ marginTop: 12 }} />
          {showImport ? (
            <>
              <TextInput
                value={paste}
                onChangeText={setPaste}
                multiline
                placeholder="Yedek metnini buraya yapıştır"
                placeholderTextColor={C.dim}
                style={[st.input, { height: 120, textAlignVertical: 'top', paddingTop: 12, marginTop: 12 }]}
              />
              <Button title="Geri yükle" kind="good" disabled={!paste.trim()} onPress={doImport} style={{ marginTop: 10 }} />
            </>
          ) : (
            <Button title="Yedekten geri yükle" kind="ghost" icon="download-outline" onPress={() => setShowImport(true)} style={{ marginTop: 10 }} />
          )}
        </View>

        <Text style={st.section}>İSTATİSTİK</Text>
        <View style={st.card}>
          <Text style={st.p}>Öğrenilen öğe: {Object.keys(progress.items).length}</Text>
          <Text style={st.p}>Geçilen ders: {Object.values(progress.lessons).filter((l) => l.passedAt).length}</Text>
          <Text style={st.p}>Seri: {progress.streak.count} gün · XP: {progress.xp}</Text>
        </View>

        <Text style={st.section}>TEHLİKELİ BÖLGE</Text>
        <View style={st.card}>
          <Button
            title="İlerlemeyi sıfırla"
            kind="ghost"
            onPress={() =>
              Alert.alert('Emin misin?', 'Bu profilin tüm ilerlemesi silinecek.', [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sıfırla', style: 'destructive', onPress: () => save(emptyProgress()) },
              ])
            }
          />
          <Button
            title="Profili sil"
            kind="bad"
            onPress={() =>
              Alert.alert('Profil silinsin mi?', `${profile?.name} ve tüm ilerlemesi silinecek.`, [
                { text: 'Vazgeç', style: 'cancel' },
                { text: 'Sil', style: 'destructive', onPress: () => profile && deleteProfile(profile.id) },
              ])
            }
            style={{ marginTop: 10 }}
          />
        </View>
        <Text style={st.ver}>Rusça · v0.1.0</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
  title: { color: C.text, fontSize: 22, fontWeight: '900', marginLeft: 8 },
  section: { color: C.dim, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginTop: 18, marginBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  input: { backgroundColor: C.bg2, borderRadius: R.md, color: C.text, fontSize: 17, paddingHorizontal: 14, height: 52, borderWidth: 1, borderColor: C.line },
  p: { color: C.sub, fontSize: 15, lineHeight: 22 },
  ver: { color: C.dim, textAlign: 'center', marginTop: 24, fontSize: 12 },
});

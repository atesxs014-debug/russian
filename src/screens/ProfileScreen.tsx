import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text, TextInput } from '../Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_COLORS, Avatar as AvatarT, useApp } from '../store';
import AvatarPicker from '../components/AvatarPicker';
import { Avatar, Button } from '../ui';
import { C, R, fs, themed } from '../theme';

export default function ProfileScreen() {
  const { profiles, createProfile, selectProfile } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarT>({ kind: 'initial', color: AVATAR_COLORS[profiles.length % AVATAR_COLORS.length] });
  const [adding, setAdding] = useState(profiles.length === 0);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 36, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={st.brand}>
            <View style={st.logoDot}>
              <Ionicons name="pulse" size={30} color={C.onPrimary} />
            </View>
            <Text style={st.logo}>Voxa</Text>
          </View>
          <Text style={st.sub}>Konuşarak dil öğren. Rusça, İngilizce, Almanca, Fransızca, İtalyanca — sıfırdan, adım adım. Her adımı tam öğrenmeden sonrakine geçmezsin.</Text>

          {profiles.length > 0 && (
            <View style={{ marginTop: 28 }}>
              <Text style={st.label}>Kim çalışıyor?</Text>
              {profiles.map((p) => (
                <Pressable key={p.id} onPress={() => selectProfile(p.id)} style={({ pressed }) => [st.profile, pressed && { backgroundColor: C.cardHi }]}>
                  <Avatar avatar={p.avatar} name={p.name} frame={p.settings.frame} />
                  <Text style={st.pname}>{p.name}</Text>
                  <Ionicons name="chevron-forward" size={22} color={C.sub} />
                </Pressable>
              ))}
            </View>
          )}

          {adding ? (
            <View style={{ marginTop: 24 }}>
              <Text style={st.label}>Yeni profil</Text>
              <AvatarPicker value={avatar} name={name} onChange={setAvatar} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Adın"
                placeholderTextColor={C.dim}
                style={st.input}
                returnKeyType="done"
                onSubmitEditing={() => name.trim() && createProfile(name, avatar)}
              />
              <Button title="Başla" icon="arrow-forward" disabled={!name.trim()} onPress={() => createProfile(name, avatar)} style={{ marginTop: 14 }} />
            </View>
          ) : (
            <Button title="Yeni profil ekle" icon="person-add" kind="ghost" onPress={() => setAdding(true)} style={{ marginTop: 20 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = themed(() => ({
  wrap: { paddingHorizontal: 24, flexGrow: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logoDot: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  logo: { color: C.text, fontSize: fs(42), fontWeight: '900', marginLeft: 12, letterSpacing: -1 },
  sub: { color: C.sub, fontSize: fs(16), lineHeight: fs(23), marginTop: 14 },
  label: { color: C.sub, fontSize: fs(13), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 10 },
  pname: { flex: 1, color: C.text, fontSize: fs(18), fontWeight: '700', marginLeft: 14 },
  input: { backgroundColor: C.card, borderRadius: R.md, color: C.text, fontSize: fs(18), paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: C.line, marginTop: 14 },
}));

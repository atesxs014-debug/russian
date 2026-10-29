import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { Button } from '../ui';
import { C, R } from '../theme';

export default function ProfileScreen() {
  const { profiles, createProfile, selectProfile } = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(profiles.length === 0);

  return (
    <LinearGradient colors={[C.bg2, C.bg]} style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <Text style={st.logo}>Я</Text>
          <Text style={st.h1}>Привет!</Text>
          <Text style={st.sub}>Sıfırdan, alfabeden başlayarak Rusça. Her adımı tam öğrenmeden bir sonrakine geçmezsin.</Text>

          {profiles.length > 0 && (
            <View style={{ marginTop: 32 }}>
              <Text style={st.label}>Kim çalışıyor?</Text>
              {profiles.map((p) => (
                <Pressable key={p.id} onPress={() => selectProfile(p.id)} style={({ pressed }) => [st.profile, pressed && { backgroundColor: C.cardHi }]}>
                  <View style={st.avatar}>
                    <Text style={st.avatarText}>{p.name.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <Text style={st.pname}>{p.name}</Text>
                  <Ionicons name="chevron-forward" size={22} color={C.sub} />
                </Pressable>
              ))}
            </View>
          )}

          {adding ? (
            <View style={{ marginTop: 28 }}>
              <Text style={st.label}>Adın</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="örn. Burak"
                placeholderTextColor={C.dim}
                style={st.input}
                autoFocus={profiles.length === 0}
                returnKeyType="done"
                onSubmitEditing={() => name.trim() && createProfile(name)}
              />
              <Button title="Başla" icon="arrow-forward" disabled={!name.trim()} onPress={() => createProfile(name)} style={{ marginTop: 14 }} />
            </View>
          ) : (
            <Button title="Yeni profil ekle" icon="person-add" kind="ghost" onPress={() => setAdding(true)} style={{ marginTop: 20 }} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 24, flexGrow: 1 },
  logo: { color: C.accent, fontSize: 64, fontWeight: '900' },
  h1: { color: C.text, fontSize: 40, fontWeight: '900', marginTop: 4 },
  sub: { color: C.sub, fontSize: 16, lineHeight: 23, marginTop: 10 },
  label: { color: C.sub, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 },
  profile: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#0B0F1E', fontWeight: '900', fontSize: 18 },
  pname: { flex: 1, color: C.text, fontSize: 18, fontWeight: '700', marginLeft: 14 },
  input: { backgroundColor: C.card, borderRadius: R.md, color: C.text, fontSize: 18, paddingHorizontal: 16, height: 56, borderWidth: 1.5, borderColor: C.line },
});

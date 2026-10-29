import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { AVATAR_COLORS, Avatar as AvatarT } from '../store';
import { Avatar, Segmented } from '../ui';
import { C, fs, themed } from '../theme';

const EMOJIS = ['🦊', '🐻', '🐼', '🦁', '🐯', '🐸', '🐧', '🦉', '🐙', '🦄', '🚀', '⚡', '🎧', '📚', '🌍', '🔥'];

export default function AvatarPicker({ value, name, onChange }: { value: AvatarT; name: string; onChange: (a: AvatarT) => void }) {
  async function pickPhoto() {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.25, base64: true });
      const a = r.assets?.[0];
      if (!r.canceled && a?.base64) onChange({ ...value, kind: 'photo', value: `data:image/jpeg;base64,${a.base64}` });
    } catch {}
  }

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: 10 }}>
        <Avatar avatar={value} name={name || '?'} size={84} />
      </View>
      <Segmented
        options={[
          { value: 'initial', label: 'Baş harf' },
          { value: 'emoji', label: 'Emoji' },
          { value: 'photo', label: 'Fotoğraf' },
        ]}
        value={value.kind}
        onChange={(k) => {
          if (k === 'photo') pickPhoto();
          else onChange({ ...value, kind: k, value: k === 'emoji' ? value.value && value.kind === 'emoji' ? value.value : EMOJIS[0] : undefined });
        }}
      />
      {value.kind === 'emoji' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 6 }}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => onChange({ ...value, kind: 'emoji', value: e })} style={[st.emoji, value.value === e && { borderColor: C.primary }]}>
              <Text style={{ fontSize: fs(26) }}>{e}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {value.kind === 'photo' && (
        <Pressable onPress={pickPhoto} style={st.photoBtn}>
          <Ionicons name="image-outline" size={18} color={C.primary} />
          <Text style={st.photoText}>Başka fotoğraf seç</Text>
        </Pressable>
      )}
      {value.kind !== 'photo' && (
        <View style={st.colors}>
          {AVATAR_COLORS.map((c) => (
            <Pressable key={c} onPress={() => onChange({ ...value, color: c })} style={[st.color, { backgroundColor: c }, value.color === c && { borderColor: C.text }]} />
          ))}
        </View>
      )}
    </View>
  );
}

const st = themed(() => ({
  emoji: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 8, borderWidth: 2, borderColor: 'transparent', backgroundColor: C.card },
  colors: { flexDirection: 'row', justifyContent: 'center', columnGap: 10, marginTop: 8 },
  color: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: 'transparent' },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  photoText: { color: C.primary, fontWeight: '700', marginLeft: 6, fontSize: fs(14) },
}));

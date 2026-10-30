import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { KEYBOARD } from '../i18n';
import { C, R, fs, themed } from '../theme';

/**
 * On-screen keyboard with the language's own letters (Cyrillic, ä ö ü ß, é è ç …),
 * so writing works even when the phone has no keyboard for that language.
 */
export default function LangKeyboard({ lang, onKey, onBack, onSpace, disabled }: { lang: string; onKey: (ch: string) => void; onBack: () => void; onSpace: () => void; disabled?: boolean }) {
  const rows = KEYBOARD[lang] ?? KEYBOARD.en;
  const [caps, setCaps] = useState(false);
  const key = (ch: string) => {
    if (disabled) return;
    onKey(caps ? ch.toUpperCase() : ch);
    if (caps) setCaps(false);
  };
  return (
    <View style={[st.kb, disabled && { opacity: 0.5 }]}>
      {rows.map((row) => (
        <View key={row} style={st.row}>
          {[...row].map((ch) => (
            <Pressable key={ch} onPress={() => key(ch)} style={({ pressed }) => [st.key, pressed && { backgroundColor: C.primary }]}>
              {({ pressed }) => <Text style={[st.keyText, pressed && { color: C.onPrimary }]}>{caps ? ch.toUpperCase() : ch}</Text>}
            </Pressable>
          ))}
        </View>
      ))}
      <View style={st.row}>
        <Pressable onPress={() => setCaps((x) => !x)} style={[st.key, st.wide, caps && { backgroundColor: C.primary }]}>
          <Ionicons name="arrow-up" size={18} color={caps ? C.onPrimary : C.text} />
        </Pressable>
        <Pressable onPress={() => !disabled && onSpace()} style={[st.key, { flex: 5 }]}>
          <Text style={st.keyText}>boşluk</Text>
        </Pressable>
        <Pressable onPress={() => !disabled && onBack()} onLongPress={() => !disabled && onBack()} style={[st.key, st.wide]}>
          <Ionicons name="backspace-outline" size={20} color={C.text} />
        </Pressable>
      </View>
    </View>
  );
}

const st = themed(() => ({
  kb: { backgroundColor: C.bg2, borderRadius: R.md, padding: 4, gap: 5 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  key: { flex: 1, maxWidth: 40, height: 44, borderRadius: 8, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  wide: { flex: 1.6, maxWidth: 64 },
  keyText: { color: C.text, fontSize: fs(18), fontWeight: '600' },
}));

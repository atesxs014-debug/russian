import React from 'react';
import { Modal, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Text';
import { LANGS } from '../course';
import { useApp } from '../store';
import { C, R, fs, themed } from '../theme';

export default function LangMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { settings, setLang } = useApp();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose}>
        <View style={[st.menu, { marginTop: insets.top + 64 }]}>
          <Text style={st.title}>Hangi dili çalışıyorsun?</Text>
          {LANGS.map((l) => {
            const on = l.code === settings.lang;
            return (
              <Pressable
                key={l.code}
                onPress={() => {
                  onClose();
                  if (!on) setLang(l.code);
                }}
                style={({ pressed }) => [st.item, on && { backgroundColor: C.cardHi }, pressed && { opacity: 0.7 }]}
              >
                <Text style={{ fontSize: fs(26) }}>{l.flag}</Text>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.name}>{l.name}</Text>
                  <Text style={st.sub}>
                    {l.native}
                    {settings.started.includes(l.code) ? '' : ' · yeni başla'}
                  </Text>
                </View>
                {on && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
              </Pressable>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const st = themed(() => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,6,20,0.45)', paddingHorizontal: 20 },
  menu: { backgroundColor: C.card, borderRadius: R.lg, padding: 12, maxWidth: 420, width: '100%', alignSelf: 'flex-end' },
  title: { color: C.sub, fontWeight: '700', fontSize: fs(13), margin: 8 },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: R.md },
  name: { color: C.text, fontWeight: '800', fontSize: fs(16) },
  sub: { color: C.sub, fontSize: fs(13) },
}));

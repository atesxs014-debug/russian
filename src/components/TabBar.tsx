import React from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../Text';
import { C, fs, themed } from '../theme';

export type Tab = 'home' | 'lessons' | 'review' | 'profile';

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Ana sayfa', icon: 'home-outline', iconOn: 'home' },
  { id: 'lessons', label: 'Dersler', icon: 'book-outline', iconOn: 'book' },
  { id: 'review', label: 'Tekrar', icon: 'repeat-outline', iconOn: 'repeat' },
  { id: 'profile', label: 'Profil', icon: 'person-outline', iconOn: 'person' },
];

export default function TabBar({ tab, onChange, badge }: { tab: Tab; onChange: (t: Tab) => void; badge?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.bar, { paddingBottom: Math.max(insets.bottom, 10), paddingLeft: insets.left, paddingRight: insets.right }]}>
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={t.label} onPress={() => onChange(t.id)} style={st.item}>
            <View>
              <Ionicons name={on ? t.iconOn : t.icon} size={23} color={on ? C.primary : C.sub} />
              {t.id === 'review' && badge ? (
                <View style={st.badge}>
                  <Text style={st.badgeText}>{badge > 99 ? '99+' : badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[st.label, { color: on ? C.primary : C.sub, fontWeight: on ? '800' : '600' }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const st = themed(() => ({
  bar: { flexDirection: 'row', backgroundColor: C.bar, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48, justifyContent: 'center' },
  label: { fontSize: fs(11) },
  badge: { position: 'absolute', top: -4, right: -12, backgroundColor: C.accent, borderRadius: 9, minWidth: 18, height: 18, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
}));

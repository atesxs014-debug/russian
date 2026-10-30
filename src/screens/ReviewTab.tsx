import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useApp } from '../store';
import { MASTERED_BOX, dueItems, today as dateToday, weakItems } from '../progress';
import { Button } from '../ui';
import { C, R, fs, themed } from '../theme';
import type { Route } from '../../App';

/** Review hub: today's due items, weak points, and how solid the memory is. */
export default function ReviewTab({ go }: { go: (r: Route) => void }) {
  const insets = useSafeAreaInsets();
  const { progress } = useApp();
  const due = useMemo(() => dueItems(progress).length, [progress]);
  const weak = useMemo(() => weakItems(progress).length, [progress]);
  const items = Object.values(progress.items);
  const tomorrow = items.filter((s) => s.due === dateToday(1)).length;
  const buckets = [
    { label: 'Yeni', n: items.filter((s) => s.box <= 1).length, color: C.bad },
    { label: 'Öğreniliyor', n: items.filter((s) => s.box >= 2 && s.box < 4).length, color: C.gold },
    { label: 'Pekişiyor', n: items.filter((s) => s.box >= 4 && s.box < MASTERED_BOX).length, color: C.primary },
    { label: 'Tam öğrenildi', n: items.filter((s) => s.box >= MASTERED_BOX).length, color: C.good },
  ];
  const max = Math.max(1, ...buckets.map((b) => b.n));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 28, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, gap: 14, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Text style={st.title}>Tekrar</Text>

        <View style={st.card}>
          <Text style={st.big}>{due}</Text>
          <Text style={st.label}>{due ? 'öğe bugün tekrar bekliyor' : 'Bugünkü tekrar tamam'}</Text>
          <Text style={st.small}>Yarın: {tomorrow} öğe</Text>
          {due > 0 && <Button title="Tekrara başla" icon="play" onPress={() => go({ name: 'review' })} style={{ marginTop: 14 }} />}
        </View>

        <Pressable onPress={() => go({ name: 'dict' })} style={({ pressed }) => [st.row, pressed && { opacity: 0.85 }]}>
          <View style={[st.icon, { backgroundColor: C.bg2 }]}>
            <Ionicons name="book-outline" size={20} color={C.primary} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.rowTitle}>Sözlük ve fiil çekimleri</Text>
            <Text style={st.small}>Kelime ara, dinle, tekrara ekle · çekim tabloları</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.sub} />
        </Pressable>

        <Pressable onPress={() => weak && go({ name: 'weak' })} style={({ pressed }) => [st.row, pressed && weak > 0 && { opacity: 0.85 }]}>
          <View style={[st.icon, { backgroundColor: C.badBg }]}>
            <Ionicons name="fitness-outline" size={20} color={C.bad} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.rowTitle}>Zayıf noktalar</Text>
            <Text style={st.small}>{weak ? `${weak} öğede sık hata yapıyorsun` : 'Şimdilik zayıf noktan yok'}</Text>
          </View>
          {weak > 0 && <Ionicons name="chevron-forward" size={18} color={C.sub} />}
        </Pressable>

        <View style={st.card}>
          <Text style={st.rowTitle}>Hafıza durumu</Text>
          <View style={{ marginTop: 12, gap: 10 }}>
            {buckets.map((b) => (
              <View key={b.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={st.small}>{b.label}</Text>
                  <Text style={[st.small, { color: C.text, fontWeight: '700' }]}>{b.n}</Text>
                </View>
                <View style={st.track}>
                  <View style={{ width: `${(b.n / max) * 100}%`, height: 8, borderRadius: 4, backgroundColor: b.color }} />
                </View>
              </View>
            ))}
          </View>
          <Text style={[st.small, { marginTop: 12 }]}>Bir öğe 5 başarılı tekrardan sonra "tam öğrenildi" sayılır.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const st = themed(() => ({
  title: { color: C.text, fontSize: fs(22), fontWeight: '800' },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18 },
  big: { color: C.primary, fontSize: fs(44), fontWeight: '800' },
  label: { color: C.text, fontSize: fs(16), fontWeight: '700' },
  small: { color: C.sub, fontSize: fs(13) },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: C.text, fontSize: fs(16), fontWeight: '800' },
  track: { height: 8, borderRadius: 4, backgroundColor: C.line, marginTop: 4, overflow: 'hidden' },
}));

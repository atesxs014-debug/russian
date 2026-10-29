import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store';
import { UNITS, UPCOMING } from '../course';
import { dueItems, lessonLock, testLock, unitOpen, unitProgress } from '../progress';
import { Bar, IconBtn } from '../ui';
import { C, LEVELS, LevelId, R } from '../theme';
import type { Route } from '../../App';

export default function HomeScreen({ go }: { go: (r: Route) => void }) {
  const insets = useSafeAreaInsets();
  const { profile, progress } = useApp();
  const [level, setLevel] = useState<LevelId>('baslangic');
  const due = useMemo(() => dueItems(progress), [progress]);

  const units = UNITS.map((u, i) => ({ u, i })).filter(({ u }) => u.level === level);
  const upcoming = UPCOMING.filter((x) => x.level === level);
  const learned = Object.keys(progress.items).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}>
        <View style={st.header}>
          <View style={{ flex: 1 }}>
            <Text style={st.hello}>Привет, {profile?.name}</Text>
            <Text style={st.helloSub}>{learned} öğe öğrenildi</Text>
          </View>
          <View style={st.chip}>
            <Text style={st.chipText}>🔥 {progress.streak.count}</Text>
          </View>
          <View style={[st.chip, { marginLeft: 8 }]}>
            <Text style={st.chipText}>⭐ {progress.xp}</Text>
          </View>
          <IconBtn icon="settings-outline" onPress={() => go({ name: 'settings' })} />
        </View>

        {/* daily review */}
        {due.length > 0 ? (
          <Pressable onPress={() => go({ name: 'review' })} style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}>
            <LinearGradient colors={['#F6BE4A', '#F08A3C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.review}>
              <Ionicons name="repeat" size={30} color="#2A1600" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={st.reviewTitle}>Günlük tekrar: {due.length} öğe</Text>
                <Text style={st.reviewSub}>Tekrarı bitirmeden yeni ders açılmaz</Text>
              </View>
              <Ionicons name="play-circle" size={36} color="#2A1600" />
            </LinearGradient>
          </Pressable>
        ) : learned > 0 ? (
          <View style={st.reviewDone}>
            <Ionicons name="checkmark-circle" size={22} color={C.good} />
            <Text style={st.reviewDoneText}>Bugünkü tekrar tamam</Text>
          </View>
        ) : null}

        {/* level tabs */}
        <View style={st.tabs}>
          {LEVELS.map((l) => (
            <Pressable key={l.id} onPress={() => setLevel(l.id)} style={[st.tab, level === l.id && st.tabOn]}>
              <Text style={[st.tabText, level === l.id && st.tabTextOn]}>{l.title}</Text>
              <Text style={[st.tabSub, level === l.id && { color: '#0B0F1E' }]}>{l.sub}</Text>
            </Pressable>
          ))}
        </View>

        {units.map(({ u, i }) => {
          const open = unitOpen(progress, i);
          const pct = unitProgress(progress, u);
          const tLock = testLock(progress, i);
          const tScore = progress.tests[u.id];
          return (
            <View key={u.id} style={[st.unit, !open && { opacity: 0.5 }]}>
              <Text style={st.unitKicker}>ÜNİTE {i + 1}</Text>
              <Text style={st.unitTitle}>{u.title}</Text>
              <Text style={st.unitSub}>{u.subtitle}</Text>
              <View style={{ marginTop: 12, marginBottom: 6 }}>
                <Bar value={pct} color={C.good} />
              </View>

              {u.lessons.map((ls, j) => {
                const lock = lessonLock(progress, i, j);
                const sc = progress.lessons[ls.id];
                const passed = !!sc?.passedAt;
                return (
                  <Pressable
                    key={ls.id}
                    onPress={() => (lock.open ? go({ name: 'lesson', lessonId: ls.id }) : Alert.alert('Kilitli', lock.reason))}
                    style={({ pressed }) => [st.node, pressed && { backgroundColor: C.cardHi }]}
                  >
                    <View style={[st.dot, passed ? { backgroundColor: C.good } : lock.open ? { backgroundColor: C.primary } : { backgroundColor: C.line }]}>
                      {passed ? (
                        <Ionicons name="checkmark" size={20} color="#0B0F1E" />
                      ) : lock.open ? (
                        <Text style={st.dotText}>{j + 1}</Text>
                      ) : (
                        <Ionicons name="lock-closed" size={16} color={C.sub} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[st.nodeTitle, !lock.open && { color: C.dim }]}>{ls.title}</Text>
                      <Text style={st.nodeSub}>{ls.subtitle}</Text>
                    </View>
                    {sc ? <Text style={[st.score, { color: passed ? C.good : C.gold }]}>%{Math.round(sc.best * 100)}</Text> : null}
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => (tLock.open ? go({ name: 'test', unitId: u.id }) : Alert.alert('Sınav kilitli', tLock.reason))}
                style={({ pressed }) => [st.node, st.testNode, pressed && { opacity: 0.85 }]}
              >
                <View style={[st.dot, { backgroundColor: tScore?.passedAt ? C.good : tLock.open ? C.gold : C.line }]}>
                  <Ionicons name={tScore?.passedAt ? 'trophy' : tLock.open ? 'ribbon' : 'lock-closed'} size={18} color={tLock.open || tScore?.passedAt ? '#0B0F1E' : C.sub} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.nodeTitle}>Ünite sınavı</Text>
                  <Text style={st.nodeSub}>Sonraki ünite için %90 gerekli</Text>
                </View>
                {tScore ? <Text style={[st.score, { color: tScore.passedAt ? C.good : C.gold }]}>%{Math.round(tScore.best * 100)}</Text> : null}
              </Pressable>
            </View>
          );
        })}

        {upcoming.length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={st.upKicker}>{units.length ? 'SIRADAKİ ÜNİTELER' : 'BU SEVİYEDEKİ ÜNİTELER'}</Text>
            {upcoming.map((x, k) => (
              <View key={x.title} style={st.up}>
                <Ionicons name="lock-closed" size={16} color={C.dim} />
                <Text style={st.upText}>{x.title}</Text>
                <Text style={st.upSoon}>{k === 0 && units.length ? 'sırada' : 'yakında'}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  hello: { color: C.text, fontSize: 26, fontWeight: '900' },
  helloSub: { color: C.sub, fontSize: 14, marginTop: 2 },
  chip: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, marginRight: 4 },
  chipText: { color: C.text, fontWeight: '800', fontSize: 14 },
  review: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 16, marginBottom: 18 },
  reviewTitle: { color: '#2A1600', fontWeight: '900', fontSize: 17 },
  reviewSub: { color: '#4A2A00', fontSize: 13, marginTop: 2 },
  reviewDone: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.goodBg, borderRadius: R.md, padding: 12, marginBottom: 18 },
  reviewDoneText: { color: C.good, fontWeight: '800', marginLeft: 8 },
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md, padding: 4, marginBottom: 18 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
  tabOn: { backgroundColor: C.primary },
  tabText: { color: C.sub, fontWeight: '800', fontSize: 15 },
  tabTextOn: { color: '#0B0F1E' },
  tabSub: { color: C.dim, fontSize: 11, fontWeight: '700', marginTop: 1 },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 16 },
  unitKicker: { color: C.primary, fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
  unitTitle: { color: C.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  unitSub: { color: C.sub, fontSize: 14, marginTop: 2 },
  node: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: R.sm, marginTop: 4 },
  testNode: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 10, paddingTop: 14 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: '#0B0F1E', fontWeight: '900', fontSize: 16 },
  nodeTitle: { color: C.text, fontWeight: '800', fontSize: 16 },
  nodeSub: { color: C.sub, fontSize: 13, marginTop: 1 },
  score: { fontWeight: '900', fontSize: 15 },
  upKicker: { color: C.dim, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginBottom: 8 },
  up: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: R.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  upText: { flex: 1, color: C.dim, fontWeight: '700', fontSize: 15, marginLeft: 10 },
  upSoon: { color: C.dim, fontSize: 12, fontWeight: '700' },
});

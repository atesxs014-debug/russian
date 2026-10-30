import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useApp } from '../store';
import { langMeta, unitOptional } from '../course';
import { lessonLock, testLock, unitOpen, unitProgress } from '../progress';
import { currentUnitIndex } from '../today';
import { Bar } from '../ui';
import { C, LEVELS, LevelId, R, fs, themed } from '../theme';
import type { Route } from '../../App';

const KIND_LABEL = { grammar: '📘 Dilbilgisi', dialog: '💬 Diyalog', text: '📖 Okuma', vocab: '' } as const;

/** All units of the current language, grouped by level; the current unit is expanded. */
export default function LessonsScreen({ go }: { go: (r: Route) => void }) {
  const insets = useSafeAreaInsets();
  const { progress, course, settings } = useApp();
  const cur = currentUnitIndex(course, progress);
  const [level, setLevel] = useState<LevelId>(course.units[cur]?.level ?? 'baslangic');
  const [openUnit, setOpenUnit] = useState<string | null>(course.units[cur]?.id ?? null);
  const meta = langMeta(settings.lang);
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    setOpenUnit(course.units[cur]?.id ?? null);
  }, [course.lang]);

  const units = course.units.map((u, i) => ({ u, i })).filter(({ u }) => u.level === level);
  const upcoming = course.upcoming.filter((x) => x.level === level);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.top, { paddingTop: insets.top + 14, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
        <Text style={st.title}>
          {meta.flag} {meta.name} dersleri
        </Text>
        <View style={st.tabs}>
          {LEVELS.map((l) => (
            <Pressable key={l.id} onPress={() => setLevel(l.id)} style={[st.tab, level === l.id && { backgroundColor: C.primary }]}>
              <Text style={[st.tabText, level === l.id && { color: C.onPrimary }]}>{l.title}</Text>
              <Text style={[st.tabSub, level === l.id && { color: C.onPrimary }]}>{l.sub}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: 28, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {units.map(({ u, i }) => {
          const open = unitOpen(course, progress, i);
          const expanded = openUnit === u.id;
          const tLock = testLock(course, progress, i);
          const tScore = progress.tests[u.id];
          const done = u.lessons.filter((l) => progress.lessons[l.id]?.passedAt).length;
          return (
            <View key={u.id} style={[st.unit, !open && { opacity: 0.55 }]}>
              <Pressable onPress={() => setOpenUnit(expanded ? null : u.id)} style={st.unitHead} accessibilityRole="button" accessibilityState={{ expanded }}>
                <View style={[st.unitNum, tScore?.passedAt ? { backgroundColor: C.good } : i === cur ? { backgroundColor: C.primary } : { backgroundColor: C.line }]}>
                  {tScore?.passedAt ? <Ionicons name="trophy" size={16} color={C.onPrimary} /> : !open ? <Ionicons name="lock-closed" size={14} color={C.sub} /> : <Text style={[st.unitNumText, i === cur && { color: C.onPrimary }]}>{i + 1}</Text>}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={st.unitTitle}>{u.title}</Text>
                  <Text style={st.unitSub}>
                    {u.kind && u.kind !== 'vocab' ? `${KIND_LABEL[u.kind]} · ` : ''}
                    {unitOptional(u) ? 'isteğe bağlı · ' : ''}
                    {done}/{u.lessons.length} ders
                    {tScore?.passedAt ? ' · tamamlandı' : ''}
                  </Text>
                </View>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.sub} />
              </Pressable>
              {expanded && (
                <View style={{ marginTop: 10 }}>
                  <Bar value={unitProgress(progress, u)} color={C.good} height={6} />
                  <View style={{ marginTop: 6 }}>
                    {u.lessons.map((ls, j) => {
                      const lock = lessonLock(course, progress, i, j);
                      const sc = progress.lessons[ls.id];
                      const passed = !!sc?.passedAt;
                      return (
                        <Pressable
                          key={ls.id}
                          onPress={() => (lock.open ? go({ name: 'lesson', lessonId: ls.id }) : Alert.alert('Kilitli', lock.reason))}
                          style={({ pressed }) => [st.node, pressed && { backgroundColor: C.cardHi }]}
                        >
                          <View style={[st.dot, passed ? { backgroundColor: C.good } : lock.open ? { borderWidth: 2.5, borderColor: C.primary } : { backgroundColor: C.line }]}>
                            {passed ? (
                              <Ionicons name={sc?.perfect ? 'star' : 'checkmark'} size={17} color={C.onPrimary} />
                            ) : lock.open ? (
                              <Text style={[st.dotText, { color: C.primary }]}>{j + 1}</Text>
                            ) : (
                              <Ionicons name="lock-closed" size={14} color={C.sub} />
                            )}
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[st.nodeTitle, !lock.open && { color: C.dim }]}>{ls.title}</Text>
                            <Text style={st.nodeSub} numberOfLines={1}>
                              {ls.subtitle}
                            </Text>
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
                        <Ionicons name={tScore?.passedAt ? 'trophy' : tLock.open ? 'ribbon' : 'lock-closed'} size={16} color={tLock.open || tScore?.passedAt ? C.onPrimary : C.sub} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={st.nodeTitle}>Ünite sınavı</Text>
                        <Text style={st.nodeSub}>Sonraki ünite için %90 gerekli</Text>
                      </View>
                      {tScore ? <Text style={[st.score, { color: tScore.passedAt ? C.good : C.gold }]}>%{Math.round(tScore.best * 100)}</Text> : null}
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {upcoming.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={st.upKicker}>YAKINDA</Text>
            {upcoming.map((x) => (
              <View key={x.title} style={st.up}>
                <Ionicons name="time-outline" size={16} color={C.dim} />
                <Text style={st.upText}>{x.title}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const st = themed(() => ({
  top: { paddingBottom: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  title: { color: C.text, fontSize: fs(22), fontWeight: '800', marginBottom: 12 },
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
  tabText: { color: C.sub, fontWeight: '800', fontSize: fs(14) },
  tabSub: { color: C.dim, fontSize: fs(11), fontWeight: '700', marginTop: 1 },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: 14 },
  unitHead: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  unitNum: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  unitNumText: { color: C.sub, fontWeight: '800', fontSize: fs(15) },
  unitTitle: { color: C.text, fontSize: fs(16), fontWeight: '800' },
  unitSub: { color: C.sub, fontSize: fs(12), marginTop: 2 },
  node: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 4, borderRadius: R.sm },
  testNode: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 6, paddingTop: 12 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dotText: { fontWeight: '800', fontSize: fs(14) },
  nodeTitle: { color: C.text, fontWeight: '700', fontSize: fs(15) },
  nodeSub: { color: C.sub, fontSize: fs(12), marginTop: 1 },
  score: { fontWeight: '800', fontSize: fs(14) },
  upKicker: { color: C.dim, fontWeight: '800', fontSize: fs(12), letterSpacing: 1.5, marginBottom: 8 },
  up: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: R.md, padding: 14, marginBottom: 8 },
  upText: { flex: 1, color: C.sub, fontWeight: '600', fontSize: fs(14), marginLeft: 10 },
}));

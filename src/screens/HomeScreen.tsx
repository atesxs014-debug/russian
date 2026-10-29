import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../store';
import { LANGS, findLesson, langMeta, quoteOfDay } from '../course';
import { dueItems, lessonLock, masteredCount, testLock, unitOpen, unitProgress, weakItems } from '../progress';
import { checkForUpdate } from '../meta';
import { speak } from '../audio/player';
import { Avatar, Bar, IconBtn } from '../ui';
import { C, LEVELS, LevelId, R, fs, themed } from '../theme';
import type { Route } from '../../App';

export default function HomeScreen({ go }: { go: (r: Route) => void }) {
  const insets = useSafeAreaInsets();
  const { profile, progress, course, settings, setLang } = useApp();
  const [level, setLevel] = useState<LevelId>('baslangic');
  const [langMenu, setLangMenu] = useState(false);
  const [update, setUpdate] = useState<{ build: number; url: string } | null>(null);
  const due = useMemo(() => dueItems(progress), [progress]);
  const weak = useMemo(() => weakItems(progress), [progress]);
  const meta = langMeta(settings.lang);
  const quote = quoteOfDay(course);

  useEffect(() => {
    checkForUpdate().then(setUpdate);
  }, []);

  const units = course.units.map((u, i) => ({ u, i })).filter(({ u }) => u.level === level);
  const upcoming = course.upcoming.filter((x) => x.level === level);
  const learned = Object.keys(progress.items).length;
  const resume = progress.resume ? findLesson(course, progress.resume.lessonId) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, maxWidth: 760, width: '100%', alignSelf: 'center' }}
      >
        <View style={st.header}>
          <Pressable onPress={() => go({ name: 'settings' })}>
            {profile && <Avatar avatar={profile.avatar} name={profile.name} frame={settings.frame} size={42} />}
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.hello} numberOfLines={1}>
              Merhaba, {profile?.name}
            </Text>
            <Text style={st.helloSub}>
              {learned} öğe · {masteredCount(progress)} tam öğrenildi
            </Text>
          </View>
          <Pressable onPress={() => setLangMenu(true)} style={st.flagBtn}>
            <Text style={{ fontSize: fs(22) }}>{meta.flag}</Text>
            <Ionicons name="chevron-down" size={14} color={C.sub} />
          </Pressable>
          <View style={st.chip}>
            <Text style={st.chipText}>🔥 {progress.streak.count}</Text>
          </View>
          <IconBtn icon="settings-outline" onPress={() => go({ name: 'settings' })} />
        </View>

        {update && (
          <Pressable onPress={() => Linking.openURL(update.url)} style={st.update}>
            <Ionicons name="cloud-download-outline" size={20} color={C.primary} />
            <Text style={st.updateText}>Yeni sürüm hazır (#{update.build}). İndirmek için dokun.</Text>
          </Pressable>
        )}

        {due.length > 0 ? (
          <Pressable onPress={() => go({ name: 'review' })} style={({ pressed }) => [st.review, pressed && { transform: [{ scale: 0.98 }] }]}>
            <Ionicons name="repeat" size={30} color="#2A1600" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={st.reviewTitle}>Günlük tekrar: {due.length} öğe</Text>
              <Text style={st.reviewSub}>Tekrarı bitirmeden yeni ders açılmaz</Text>
            </View>
            <Ionicons name="play-circle" size={36} color="#2A1600" />
          </Pressable>
        ) : learned > 0 ? (
          <View style={st.reviewDone}>
            <Ionicons name="checkmark-circle" size={22} color={C.good} />
            <Text style={st.reviewDoneText}>Bugünkü tekrar tamam</Text>
          </View>
        ) : null}

        {resume && (
          <Pressable onPress={() => go({ name: 'lesson', lessonId: resume.lesson.id })} style={st.resume}>
            <Ionicons name="play-forward" size={20} color={C.primary} />
            <Text style={st.resumeText}>Kaldığın yerden devam et: {resume.lesson.title}</Text>
          </Pressable>
        )}

        {quote && (
          <Pressable onPress={() => speak(quote.t)} style={st.quote}>
            <Text style={st.quoteKicker}>GÜNÜN SÖZÜ</Text>
            <Text style={st.quoteText}>{quote.t}</Text>
            <Text style={st.quoteTr}>{quote.tr}</Text>
          </Pressable>
        )}

        {weak.length > 0 && (
          <Pressable onPress={() => go({ name: 'weak' })} style={st.weak}>
            <Ionicons name="fitness-outline" size={20} color={C.bad} />
            <Text style={st.weakText}>Zayıf noktalarını çalış ({weak.length})</Text>
            <Ionicons name="chevron-forward" size={18} color={C.sub} />
          </Pressable>
        )}

        <View style={st.tabs}>
          {LEVELS.map((l) => (
            <Pressable key={l.id} onPress={() => setLevel(l.id)} style={[st.tab, level === l.id && { backgroundColor: C.primary }]}>
              <Text style={[st.tabText, level === l.id && { color: C.onPrimary }]}>{l.title}</Text>
              <Text style={[st.tabSub, level === l.id && { color: C.onPrimary }]}>{l.sub}</Text>
            </Pressable>
          ))}
        </View>

        {units.map(({ u, i }) => {
          const open = unitOpen(course, progress, i);
          const tLock = testLock(course, progress, i);
          const tScore = progress.tests[u.id];
          return (
            <View key={u.id} style={[st.unit, !open && { opacity: 0.5 }]}>
              <Text style={st.unitKicker}>
                {meta.name.toUpperCase()} · ÜNİTE {i + 1}
              </Text>
              <Text style={st.unitTitle}>{u.title}</Text>
              <Text style={st.unitSub}>{u.subtitle}</Text>
              <View style={{ marginTop: 12, marginBottom: 6 }}>
                <Bar value={unitProgress(progress, u)} color={C.good} />
              </View>

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
                    <View style={[st.dot, { backgroundColor: passed ? C.good : lock.open ? C.primary : C.line }]}>
                      {passed ? (
                        <Ionicons name={sc?.perfect ? 'star' : 'checkmark'} size={20} color={C.onPrimary} />
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
                  <Ionicons name={tScore?.passedAt ? 'trophy' : tLock.open ? 'ribbon' : 'lock-closed'} size={18} color={tLock.open || tScore?.passedAt ? C.onPrimary : C.sub} />
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

      <Modal visible={langMenu} transparent animationType="fade" onRequestClose={() => setLangMenu(false)}>
        <Pressable style={st.backdrop} onPress={() => setLangMenu(false)}>
          <View style={[st.menu, { marginTop: insets.top + 64 }]}>
            <Text style={st.menuTitle}>Hangi dili çalışıyorsun?</Text>
            {LANGS.map((l) => {
              const on = l.code === settings.lang;
              const started = settings.started.includes(l.code);
              return (
                <Pressable
                  key={l.code}
                  onPress={() => {
                    setLangMenu(false);
                    if (!on) setLang(l.code);
                  }}
                  style={({ pressed }) => [st.menuItem, on && { backgroundColor: C.cardHi }, pressed && { opacity: 0.7 }]}
                >
                  <Text style={{ fontSize: fs(26) }}>{l.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={st.menuName}>{l.name}</Text>
                    <Text style={st.menuSub}>
                      {l.native}
                      {started ? '' : ' · yeni başla'}
                    </Text>
                  </View>
                  {on && <Ionicons name="checkmark-circle" size={22} color={C.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = themed(() => ({
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  hello: { color: C.text, fontSize: fs(22), fontWeight: '900' },
  helloSub: { color: C.sub, fontSize: fs(13), marginTop: 2 },
  flagBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 },
  chip: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: C.text, fontWeight: '800', fontSize: fs(14) },
  update: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.primary },
  updateText: { color: C.text, marginLeft: 8, flex: 1, fontSize: fs(14), fontWeight: '600' },
  review: { flexDirection: 'row', alignItems: 'center', borderRadius: R.lg, padding: 16, marginBottom: 14, backgroundColor: '#F6BE4A' },
  reviewTitle: { color: '#2A1600', fontWeight: '900', fontSize: fs(17) },
  reviewSub: { color: '#4A2A00', fontSize: fs(13), marginTop: 2 },
  reviewDone: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.goodBg, borderRadius: R.md, padding: 12, marginBottom: 14 },
  reviewDoneText: { color: C.good, fontWeight: '800', marginLeft: 8, fontSize: fs(15) },
  resume: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 14 },
  resumeText: { color: C.text, marginLeft: 8, flex: 1, fontWeight: '700', fontSize: fs(14) },
  quote: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 14, borderLeftWidth: 4, borderLeftColor: C.primary },
  quoteKicker: { color: C.primary, fontWeight: '900', fontSize: fs(11), letterSpacing: 1.5 },
  quoteText: { color: C.text, fontSize: fs(18), fontWeight: '700', marginTop: 6 },
  quoteTr: { color: C.sub, fontSize: fs(14), marginTop: 4, fontStyle: 'italic' },
  weak: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.badBg, borderRadius: R.md, padding: 12, marginBottom: 14 },
  weakText: { color: C.text, marginLeft: 8, flex: 1, fontWeight: '700', fontSize: fs(14) },
  tabs: { flexDirection: 'row', backgroundColor: C.card, borderRadius: R.md, padding: 4, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 12 },
  tabText: { color: C.sub, fontWeight: '800', fontSize: fs(15) },
  tabSub: { color: C.dim, fontSize: fs(11), fontWeight: '700', marginTop: 1 },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginBottom: 16 },
  unitKicker: { color: C.primary, fontWeight: '900', fontSize: fs(11), letterSpacing: 1.5 },
  unitTitle: { color: C.text, fontSize: fs(22), fontWeight: '900', marginTop: 4 },
  unitSub: { color: C.sub, fontSize: fs(14), marginTop: 2 },
  node: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: R.sm, marginTop: 4 },
  testNode: { borderTopWidth: 1, borderTopColor: C.line, marginTop: 10, paddingTop: 14 },
  dot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: C.onPrimary, fontWeight: '900', fontSize: fs(16) },
  nodeTitle: { color: C.text, fontWeight: '800', fontSize: fs(16) },
  nodeSub: { color: C.sub, fontSize: fs(13), marginTop: 1 },
  score: { fontWeight: '900', fontSize: fs(15) },
  upKicker: { color: C.dim, fontWeight: '900', fontSize: fs(12), letterSpacing: 1.5, marginBottom: 8 },
  up: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg2, borderRadius: R.md, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  upText: { flex: 1, color: C.dim, fontWeight: '700', fontSize: fs(15), marginLeft: 10 },
  upSoon: { color: C.dim, fontSize: fs(12), fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 20 },
  menu: { backgroundColor: C.bg, borderRadius: R.lg, padding: 12, maxWidth: 420, width: '100%', alignSelf: 'flex-end' },
  menuTitle: { color: C.sub, fontWeight: '800', fontSize: fs(13), margin: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: R.md },
  menuName: { color: C.text, fontWeight: '800', fontSize: fs(16) },
  menuSub: { color: C.sub, fontSize: fs(13) },
}));

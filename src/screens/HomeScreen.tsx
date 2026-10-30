import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useApp } from '../store';
import { langMeta, quoteOfDay } from '../course';
import { lessonLock, weakItems } from '../progress';
import { accuracy, currentUnitIndex, today } from '../today';
import { checkForUpdate } from '../meta';
import { speak } from '../audio/player';
import LangMenu from '../components/LangMenu';
import { Avatar } from '../ui';
import { C, LEVELS, R, fs, themed } from '../theme';
import type { Route } from '../../App';
import type { Tab } from '../components/TabBar';

export default function HomeScreen({ go, setTab }: { go: (r: Route) => void; setTab: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const { profile, progress, course, settings } = useApp();
  const [langMenu, setLangMenu] = useState(false);
  const [update, setUpdate] = useState<{ build: number; url: string } | null>(null);
  const meta = langMeta(settings.lang);
  const quote = quoteOfDay(course);
  const t = useMemo(() => today(course, progress), [course, progress]);
  const weak = useMemo(() => weakItems(progress).length, [progress]);
  const ui = currentUnitIndex(course, progress);
  const unit = course.units[ui];
  const level = LEVELS.find((l) => l.id === unit?.level);
  const acc = accuracy(progress);

  useEffect(() => {
    checkForUpdate().then(setUpdate);
  }, []);

  // ---- "Bugün" card content ----
  let kicker = 'BUGÜN';
  let title = '';
  let sub = '';
  let cta = 'Başla';
  let action: (() => void) | null = null;
  switch (t.kind) {
    case 'review':
      title = 'Günlük tekrar';
      sub = `${t.count} öğe seni bekliyor · ~${Math.max(1, Math.round(t.count * 0.2))} dk`;
      action = () => go({ name: 'review' });
      break;
    case 'speak':
      kicker = 'TELAFFUZ TELAFİSİ';
      title = t.title;
      sub = `${t.count} kelimeyi söylemen gerekiyor · sonraki ders bunu bekliyor`;
      cta = 'Telafi et';
      action = () => go({ name: 'speak', lessonId: t.lessonId });
      break;
    case 'resume':
      kicker = 'KALDIĞIN YER';
      title = t.next.title;
      sub = `Ünite ${t.next.unitIndex + 1} · Ders ${t.next.lessonIndex + 1}`;
      cta = 'Devam et';
      action = () => go({ name: 'lesson', lessonId: t.next.lessonId });
      break;
    case 'lesson':
      kicker = 'SIRADAKİ DERS';
      title = t.next.title;
      sub = `Ünite ${t.next.unitIndex + 1} · Ders ${t.next.lessonIndex + 1} · ${t.next.unit.lessons[t.next.lessonIndex].subtitle}`;
      cta = 'Derse başla';
      action = () => go({ name: 'lesson', lessonId: t.next.lessonId });
      break;
    case 'test':
      kicker = 'ÜNİTE SINAVI';
      title = t.unit.title;
      sub = 'Sonraki üniteyi açmak için %90 gerekli';
      cta = 'Sınava gir';
      action = () => go({ name: 'test', unitId: t.unit.id });
      break;
    case 'wait':
      title = 'Bugünlük bu kadar';
      sub = t.reason;
      cta = weak ? 'Zayıf noktaları çalış' : '';
      action = weak ? () => go({ name: 'weak' }) : null;
      break;
    case 'done':
      title = 'Harika gidiyorsun';
      sub = 'Yeni üniteler yakında. Zayıf noktalarını pekiştirebilirsin.';
      cta = weak ? 'Zayıf noktaları çalış' : '';
      action = weak ? () => go({ name: 'weak' }) : null;
  }
  const after = t.kind === 'review' && t.next ? t.next : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 28, paddingLeft: insets.left + 20, paddingRight: insets.right + 20, gap: 18, maxWidth: 640, width: '100%', alignSelf: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* header */}
        <View style={st.header}>
          <Pressable onPress={() => setTab('profile')} accessibilityLabel="Profil">
            {profile && <Avatar avatar={profile.avatar} name={profile.name} frame={settings.frame} size={44} />}
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={st.hello} numberOfLines={1}>
              Merhaba, {profile?.name}
            </Text>
            <Text style={st.helloSub}>
              {meta.name} · {level?.title} {level?.sub.split(' ')[0]}
            </Text>
          </View>
          <View style={st.chip}>
            <Ionicons name="flame" size={16} color={C.accent} />
            <Text style={st.chipText}>{progress.streak.count}</Text>
          </View>
          <Pressable onPress={() => setLangMenu(true)} style={st.flag} accessibilityLabel={`Dil seç: ${meta.name}`}>
            <Text style={{ fontSize: fs(19) }}>{meta.flag}</Text>
          </Pressable>
        </View>

        {update && (
          <Pressable onPress={() => Linking.openURL(update.url)} style={st.update}>
            <Ionicons name="cloud-download-outline" size={20} color={C.primary} />
            <Text style={st.updateText}>Yeni sürüm hazır (#{update.build}). Dokun, en son sürüm insin.</Text>
          </Pressable>
        )}

        {/* today */}
        <View style={st.hero}>
          <View style={st.heroTop}>
            <Text style={st.heroKicker}>{kicker}</Text>
            {t.kind === 'review' ? <Ionicons name="repeat" size={18} color={C.onPrimary} style={{ opacity: 0.8 }} /> : null}
          </View>
          <Text style={st.heroTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={st.heroSub}>{sub}</Text>
          {action && cta ? (
            <Pressable onPress={action} style={({ pressed }) => [st.heroBtn, pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 }]}>
              <Ionicons name="play" size={18} color={C.primary} />
              <Text style={st.heroBtnText}>{cta}</Text>
            </Pressable>
          ) : null}
        </View>

        {after && (
          <View style={st.after}>
            <Ionicons name="lock-closed-outline" size={15} color={C.sub} />
            <Text style={st.afterText}>
              Sonra: <Text style={{ color: C.text, fontWeight: '700' }}>{after.title}</Text> · tekrardan sonra açılır
            </Text>
          </View>
        )}

        {/* current unit strip */}
        {unit && (
          <Pressable onPress={() => setTab('lessons')} style={st.unit}>
            <View style={st.unitHead}>
              <Text style={st.unitTitle} numberOfLines={1}>
                {unit.title}
              </Text>
              <Text style={st.unitCount}>
                {unit.lessons.filter((l) => progress.lessons[l.id]?.passedAt).length}/{unit.lessons.length}
              </Text>
            </View>
            <Text style={st.unitSub}>Ünite {ui + 1}</Text>
            <View style={st.steps}>
              {unit.lessons.map((ls, j) => {
                const passed = !!progress.lessons[ls.id]?.passedAt;
                const open = lessonLock(course, progress, ui, j).open;
                return (
                  <React.Fragment key={ls.id}>
                    {j > 0 && <View style={[st.stepLine, passed && { backgroundColor: C.good }]} />}
                    <Pressable
                      onPress={() => open && go({ name: 'lesson', lessonId: ls.id })}
                      accessibilityLabel={`Ders ${j + 1}: ${ls.title}`}
                      style={[st.step, passed ? { backgroundColor: C.good } : open ? { borderWidth: 3, borderColor: C.primary } : { backgroundColor: C.line }]}
                    >
                      {passed ? (
                        <Ionicons name={progress.lessons[ls.id]?.perfect ? 'star' : 'checkmark'} size={15} color={C.onPrimary} />
                      ) : (
                        <Text style={[st.stepText, { color: open ? C.primary : C.sub }]}>{j + 1}</Text>
                      )}
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </View>
          </Pressable>
        )}

        {/* stats */}
        <View style={st.stats}>
          <View style={st.stat}>
            <Text style={st.statNum}>{progress.streak.count}</Text>
            <Text style={st.statLabel}>gün seri</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{Object.keys(progress.items).length}</Text>
            <Text style={st.statLabel}>öğe</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{acc === null ? '–' : `%${Math.round(acc * 100)}`}</Text>
            <Text style={st.statLabel}>doğruluk</Text>
          </View>
        </View>

        {quote && (
          <Pressable onPress={() => speak(quote.t)} style={st.quote}>
            <Text style={st.quoteText}>«{quote.t}»</Text>
            <Text style={st.quoteTr}>Günün sözü · {quote.tr}</Text>
          </Pressable>
        )}
      </ScrollView>
      <LangMenu open={langMenu} onClose={() => setLangMenu(false)} />
    </View>
  );
}

const st = themed(() => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hello: { color: C.text, fontSize: fs(20), fontWeight: '800' },
  helloSub: { color: C.sub, fontSize: fs(13), marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, borderRadius: 19, backgroundColor: C.card, paddingHorizontal: 12 },
  chipText: { color: C.text, fontWeight: '800', fontSize: fs(14) },
  flag: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  update: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.primary },
  updateText: { color: C.text, marginLeft: 8, flex: 1, fontSize: fs(14), fontWeight: '600' },
  hero: { backgroundColor: C.primary, borderRadius: R.lg, padding: 20, gap: 6 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { color: C.onPrimary, fontSize: fs(12), fontWeight: '800', letterSpacing: 1.5, opacity: 0.85 },
  heroTitle: { color: C.onPrimary, fontSize: fs(28), fontWeight: '800', marginTop: 6 },
  heroSub: { color: C.onPrimary, fontSize: fs(14), opacity: 0.85 },
  heroBtn: { marginTop: 12, height: 52, borderRadius: R.md, backgroundColor: C.onPrimary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  heroBtnText: { color: C.primary, fontSize: fs(16), fontWeight: '800' },
  after: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginTop: -6 },
  afterText: { color: C.sub, fontSize: fs(13), flex: 1 },
  unit: { backgroundColor: C.card, borderRadius: R.lg, padding: 18 },
  unitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  unitTitle: { color: C.text, fontSize: fs(16), fontWeight: '800', flex: 1 },
  unitCount: { color: C.sub, fontSize: fs(12), fontWeight: '700' },
  unitSub: { color: C.sub, fontSize: fs(12), marginTop: 2 },
  steps: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  step: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontWeight: '800', fontSize: fs(13) },
  stepLine: { flex: 1, height: 3, backgroundColor: C.line },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: R.md, padding: 12 },
  statNum: { color: C.text, fontSize: fs(20), fontWeight: '800' },
  statLabel: { color: C.sub, fontSize: fs(12), marginTop: 2 },
  quote: { paddingHorizontal: 4 },
  quoteText: { color: C.text, fontSize: fs(15), fontWeight: '700' },
  quoteTr: { color: C.sub, fontSize: fs(12), marginTop: 3 },
}));

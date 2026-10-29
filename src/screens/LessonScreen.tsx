import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { findLesson, Letter, Rule, Word } from '../course';
import { lessonQuiz } from '../quiz';
import { applyLesson, bumpStreak, PASS } from '../progress';
import { useApp } from '../store';
import { speak, stopAudio } from '../audio/player';
import QuizRunner, { QuizResult } from '../components/QuizRunner';
import ResultView from '../components/ResultView';
import { Bar, Button, IconBtn, SoundButton } from '../ui';
import { C, R } from '../theme';

type Phase = 'learn' | 'quiz' | 'result';

export default function LessonScreen({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const found = findLesson(lessonId)!;
  const { unit, lesson, index } = found;
  const { progress, save } = useApp();
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState<Phase>('learn');
  const [card, setCard] = useState(-1); // -1 = intro
  const [result, setResult] = useState<QuizResult | null>(null);
  const [round, setRound] = useState(0);
  const questions = useMemo(() => lessonQuiz(unit, index), [unit, index, round]);

  const cards: (Letter | Rule)[] = lesson.kind === 'letters' ? lesson.letters ?? [] : lesson.rules ?? [];

  useEffect(() => {
    if (phase !== 'learn' || card < 0) return;
    const c = cards[card];
    const t = setTimeout(() => speak('name' in c ? c.name : c.examples[0].ru), 300);
    return () => clearTimeout(t);
  }, [card, phase]);

  useEffect(() => () => stopAudio(), []);

  if (phase === 'quiz') {
    return (
      <QuizRunner
        key={round}
        title={`${lesson.title} · sınav`}
        questions={questions}
        onClose={() => setPhase('learn')}
        onFinish={(r) => {
          save(bumpStreak(applyLesson(progress, lesson.id, r.score, r.firstTry)));
          setResult(r);
          setPhase('result');
        }}
      />
    );
  }

  if (phase === 'result' && result) {
    const passed = result.score >= PASS;
    return (
      <ResultView
        result={result}
        passed={passed}
        passText={index < unit.lessons.length - 1 ? 'Sonraki ders açıldı. Bu dersin öğeleri yarın tekrar sorulacak.' : 'Ünitenin tüm dersleri bitti! Tekrarlarla pekiştirince ünite sınavı açılacak.'}
        failText="Bir sonraki derse geçmek için %90 lazım. Kartlara dönüp yanlış yaptıklarına tekrar bak."
        primary={passed ? { title: 'Ana sayfa', onPress: onClose } : { title: 'Tekrar sına', onPress: () => { setRound((x) => x + 1); setPhase('quiz'); } }}
        secondary={passed ? { title: 'Dersi tekrar et', onPress: () => { setCard(0); setPhase('learn'); setRound((x) => x + 1); } } : { title: 'Kartlara dön', onPress: () => { setCard(0); setPhase('learn'); } }}
      />
    );
  }

  const isIntro = card < 0;
  const last = card === cards.length - 1;

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={st.top}>
        <IconBtn icon="close" onPress={onClose} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Bar value={(card + 1) / cards.length} />
        </View>
        <Text style={st.count}>{isIntro ? '' : `${card + 1}/${cards.length}`}</Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
        {isIntro ? (
          <View style={st.intro}>
            <Text style={st.kicker}>DERS {index + 1}</Text>
            <Text style={st.h1}>{lesson.title}</Text>
            <Text style={st.big}>{lesson.subtitle}</Text>
            <Text style={st.p}>{lesson.intro}</Text>
            <View style={st.rule}>
              <Ionicons name="shield-checkmark" size={20} color={C.gold} />
              <Text style={st.ruleText}>Kartları incele, sesleri dinle. Sonra sınav: %90 altı = ders tekrar.</Text>
            </View>
          </View>
        ) : 'upper' in cards[card] ? (
          <LetterCard l={cards[card] as Letter} />
        ) : (
          <RuleCard r={cards[card] as Rule} />
        )}
      </ScrollView>

      <View style={st.nav}>
        {!isIntro && <Button title="Geri" kind="ghost" icon="arrow-back" onPress={() => setCard((c) => c - 1)} style={{ flex: 1, marginRight: 10 }} />}
        {last ? (
          <Button title="Sınava başla" icon="flag" kind="good" onPress={() => { stopAudio(); setPhase('quiz'); }} style={{ flex: 2 }} />
        ) : (
          <Button title={isIntro ? 'Başla' : 'İleri'} icon="arrow-forward" onPress={() => setCard((c) => c + 1)} style={{ flex: 2 }} />
        )}
      </View>
    </View>
  );
}

function WordRow({ w }: { w: Word }) {
  return (
    <Pressable onPress={() => speak(w.ru)} onLongPress={() => speak(w.ru, true)} style={({ pressed }) => [st.word, pressed && { backgroundColor: C.cardHi }]}>
      <Ionicons name="volume-medium" size={20} color={C.primary} />
      <Text style={st.wordRu}>{w.ru}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={st.wordRead}>{w.read}</Text>
        <Text style={st.wordTr}>{w.tr}</Text>
      </View>
    </Pressable>
  );
}

function LetterCard({ l }: { l: Letter }) {
  return (
    <View>
      <View style={st.letterBox}>
        <Text style={st.letter}>
          {l.upper}
          <Text style={st.letterLow}> {l.lower}</Text>
        </Text>
        <SoundButton onPress={() => speak(l.name)} onSlow={() => speak(l.name, true)} />
      </View>
      <View style={st.soundRow}>
        <View style={st.pill}>
          <Text style={st.pillLabel}>SES</Text>
          <Text style={st.pillValue}>{l.sound}</Text>
        </View>
        <View style={st.pill}>
          <Text style={st.pillLabel}>ADI</Text>
          <Text style={st.pillValue}>{l.name}</Text>
        </View>
      </View>
      <Text style={st.hint}>{l.hint}</Text>
      <Text style={st.section}>ÖRNEK KELİMELER</Text>
      {l.words.map((w) => (
        <WordRow key={w.ru} w={w} />
      ))}
      <Text style={st.tip}>Kelimeye dokun: dinle · basılı tut: yavaş dinle</Text>
    </View>
  );
}

function RuleCard({ r }: { r: Rule }) {
  return (
    <View>
      <Text style={st.h1}>{r.title}</Text>
      <Text style={[st.p, { marginTop: 12 }]}>{r.text}</Text>
      <Text style={st.section}>ÖRNEKLER</Text>
      {r.examples.map((w) => (
        <WordRow key={w.ru} w={w} />
      ))}
      <Text style={st.tip}>Kelimeye dokun: dinle · basılı tut: yavaş dinle</Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center' },
  count: { color: C.sub, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  intro: { flex: 1, justifyContent: 'center' },
  kicker: { color: C.primary, fontWeight: '900', letterSpacing: 1.5, fontSize: 13 },
  h1: { color: C.text, fontSize: 30, fontWeight: '900', marginTop: 6 },
  big: { color: C.text, fontSize: 40, fontWeight: '700', marginTop: 18, letterSpacing: 4 },
  p: { color: C.sub, fontSize: 17, lineHeight: 25, marginTop: 18 },
  rule: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginTop: 24 },
  ruleText: { color: C.text, flex: 1, marginLeft: 10, fontSize: 14, lineHeight: 20 },
  letterBox: { backgroundColor: C.card, borderRadius: R.xl, alignItems: 'center', paddingVertical: 28 },
  letter: { color: C.text, fontSize: 120, fontWeight: '700', lineHeight: 140 },
  letterLow: { fontSize: 72, color: C.sub },
  soundRow: { flexDirection: 'row', marginTop: 14, columnGap: 10 },
  pill: { flex: 1, backgroundColor: C.bg2, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.line },
  pillLabel: { color: C.dim, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  pillValue: { color: C.text, fontSize: 22, fontWeight: '800', marginTop: 2 },
  hint: { color: C.text, fontSize: 16, lineHeight: 23, marginTop: 14 },
  section: { color: C.dim, fontWeight: '900', fontSize: 12, letterSpacing: 1.5, marginTop: 20, marginBottom: 8 },
  word: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 8 },
  wordRu: { flex: 1, color: C.text, fontSize: 24, fontWeight: '700', marginLeft: 10 },
  wordRead: { color: C.primary, fontSize: 15, fontWeight: '800' },
  wordTr: { color: C.sub, fontSize: 13, marginTop: 2 },
  tip: { color: C.dim, fontSize: 12, textAlign: 'center', marginTop: 6 },
  nav: { flexDirection: 'row' },
});

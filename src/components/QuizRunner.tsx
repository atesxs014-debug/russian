import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question, requeue } from '../quiz';
import { speak, stopAudio } from '../audio/player';
import { Bar, Button, IconBtn, SoundButton } from '../ui';
import { C, R } from '../theme';

export type QuizResult = { score: number; firstTry: Record<string, boolean>; total: number; correct: number };

type Props = {
  questions: Question[];
  title?: string;
  onClose: () => void;
  onFinish: (r: QuizResult) => void;
};

export default function QuizRunner({ questions, title, onClose, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<Question[]>(questions);
  const [chosen, setChosen] = useState<string | null>(null);
  const firstTry = useRef<Record<string, boolean>>({});
  const firstByQuestion = useRef<Record<string, boolean>>({});
  const total = useMemo(() => questions.length, [questions]);
  const anim = useRef(new Animated.Value(0)).current;

  const q = queue[0];
  const answeredUnique = Object.keys(firstByQuestion.current).length;
  const remainingRetries = queue.filter((x) => x.origin).length;

  useEffect(() => {
    if (!q) return;
    setChosen(null);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    if (q.audio) {
      const t = setTimeout(() => speak(q.audio!), 250);
      return () => clearTimeout(t);
    }
  }, [q?.key]);

  useEffect(() => () => stopAudio(), []);

  if (!q) return null;

  const correct = chosen === q.answer;
  const origin = q.origin ?? q.key;

  function choose(opt: string) {
    if (chosen) return;
    setChosen(opt);
    const ok = opt === q.answer;
    if (!(origin in firstByQuestion.current)) {
      firstByQuestion.current[origin] = ok;
      // an item is "known" only if every one of its questions was right on the first try
      firstTry.current[q.itemId] = (firstTry.current[q.itemId] ?? true) && ok;
    }
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
    const after = q.audioAfter ?? q.audio;
    if (after) setTimeout(() => speak(after), ok ? 150 : 400);
  }

  function next() {
    const rest = queue.slice(1);
    if (!correct) {
      // wrong answers come back later in the session until you get them right
      const again = requeue(q);
      const at = Math.min(rest.length, 2 + Math.floor(Math.random() * 3));
      rest.splice(at, 0, again);
    }
    if (rest.length === 0) {
      const vals = Object.values(firstByQuestion.current);
      const correctCount = vals.filter(Boolean).length;
      onFinish({ score: vals.length ? correctCount / vals.length : 0, firstTry: firstTry.current, total: vals.length, correct: correctCount });
      return;
    }
    setQueue(rest);
  }

  const progress = answeredUnique / total;

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={st.top}>
        <IconBtn icon="close" onPress={onClose} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Bar value={progress} />
        </View>
        {remainingRetries > 0 ? (
          <View style={st.retry}>
            <Ionicons name="refresh" size={14} color={C.gold} />
            <Text style={st.retryText}>{remainingRetries}</Text>
          </View>
        ) : (
          <Text style={st.count}>
            {answeredUnique}/{total}
          </Text>
        )}
      </View>
      {title ? <Text style={st.title}>{title}</Text> : null}

      <Animated.View style={[st.body, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <Text style={st.instruction}>{q.instruction}</Text>
        <View style={st.prompt}>
          {q.display ? <Text style={[st.display, q.display.length > 6 && { fontSize: 52 }]}>{q.display}</Text> : null}
          {q.audio && !q.display ? <SoundButton big onPress={() => speak(q.audio!)} onSlow={() => speak(q.audio!, true)} /> : null}
          {q.audio && q.display ? (
            <View style={{ marginTop: 16 }}>
              <SoundButton onPress={() => speak(q.audio!)} onSlow={() => speak(q.audio!, true)} />
            </View>
          ) : null}
        </View>

        <View style={st.grid}>
          {q.options.map((opt) => {
            const isAnswer = opt === q.answer;
            const isChosen = opt === chosen;
            const state = !chosen ? 'idle' : isAnswer ? 'right' : isChosen ? 'wrong' : 'dim';
            return (
              <Pressable
                key={opt}
                onPress={() => choose(opt)}
                style={({ pressed }) => [
                  st.opt,
                  state === 'right' && { backgroundColor: C.goodBg, borderColor: C.good },
                  state === 'wrong' && { backgroundColor: C.badBg, borderColor: C.bad },
                  state === 'dim' && { opacity: 0.45 },
                  pressed && !chosen && { transform: [{ scale: 0.97 }], backgroundColor: C.cardHi },
                ]}
              >
                <Text style={[st.optText, q.optionsAreRussian && st.optRu]} numberOfLines={2} adjustsFontSizeToFit>
                  {opt}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      {chosen ? (
        <View style={[st.feedback, { backgroundColor: correct ? C.goodBg : C.badBg }]}>
          <View style={st.fbHead}>
            <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={26} color={correct ? C.good : C.bad} />
            <Text style={[st.fbTitle, { color: correct ? C.good : C.bad }]}>{correct ? 'Doğru!' : 'Yanlış — sonra tekrar gelecek'}</Text>
          </View>
          <Text style={st.fbText}>{q.explain}</Text>
          <Button title="Devam" kind={correct ? 'good' : 'bad'} onPress={next} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <View style={{ height: 56 }} />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center' },
  count: { color: C.sub, fontWeight: '700', minWidth: 40, textAlign: 'right' },
  retry: { flexDirection: 'row', alignItems: 'center', minWidth: 40, justifyContent: 'flex-end' },
  retryText: { color: C.gold, fontWeight: '800', marginLeft: 3 },
  title: { color: C.dim, fontSize: 13, fontWeight: '700', marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
  body: { flex: 1, paddingTop: 20 },
  instruction: { color: C.text, fontSize: 22, fontWeight: '800' },
  prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 160 },
  display: { color: C.text, fontSize: 84, fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 16 },
  opt: {
    width: '48.5%',
    minHeight: 76,
    borderRadius: R.md,
    borderWidth: 2,
    borderColor: C.line,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  optText: { color: C.text, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  optRu: { fontSize: 30 },
  feedback: { borderRadius: R.lg, padding: 16, marginBottom: 4 },
  fbHead: { flexDirection: 'row', alignItems: 'center' },
  fbTitle: { fontSize: 18, fontWeight: '800', marginLeft: 8 },
  fbText: { color: C.text, fontSize: 15, marginTop: 8, lineHeight: 21 },
});

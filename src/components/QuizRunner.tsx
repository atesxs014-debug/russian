import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question, requeue } from '../quiz';
import { feedback, speak, stopAudio } from '../audio/player';
import { reportProblem } from '../meta';
import { Bar, Button, IconBtn, SoundButton } from '../ui';
import { C, R, fs, themed } from '../theme';

export type QuizResult = {
  score: number;
  firstTry: Record<string, boolean>;
  total: number;
  correct: number;
  mistakes: Question[];
};

type Props = {
  questions: Question[];
  title?: string;
  lang: string;
  /** Max listens per question (tests: 2). Undefined = unlimited. */
  maxPlays?: number;
  onClose: () => void;
  onFinish: (r: QuizResult) => void;
};

type Stage = 'ask' | 'hint' | 'done';

export default function QuizRunner({ questions, title, lang, maxPlays, onClose, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [queue, setQueue] = useState<Question[]>(questions);
  const [stage, setStage] = useState<Stage>('ask');
  const [picks, setPicks] = useState<string[]>([]);
  const [plays, setPlays] = useState(0);
  const firstTry = useRef<Record<string, boolean>>({});
  const firstByQuestion = useRef<Record<string, boolean>>({});
  const mistakes = useRef<Question[]>([]);
  const total = useMemo(() => questions.length, [questions]);
  const anim = useRef(new Animated.Value(0)).current;

  const q = queue[0];
  const answeredUnique = Object.keys(firstByQuestion.current).length;
  const retries = queue.filter((x) => x.origin).length;

  const listen = (slow = false) => {
    if (!q?.audio && !q?.audioAfter) return;
    if (maxPlays !== undefined && stage === 'ask' && plays >= maxPlays) return;
    setPlays((n) => n + 1);
    speak((q.audio ?? q.audioAfter)!, slow);
  };

  useEffect(() => {
    if (!q) return;
    setStage('ask');
    setPicks([]);
    setPlays(0);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    if (q.audio) {
      const t = setTimeout(() => {
        setPlays(1);
        speak(q.audio!);
      }, 250);
      return () => clearTimeout(t);
    }
  }, [q?.key]);

  useEffect(() => () => stopAudio(), []);

  if (!q) return null;

  const origin = q.origin ?? q.key;
  const last = picks[picks.length - 1];
  const solved = last === q.answer;

  function choose(opt: string) {
    if (stage === 'done' || picks.includes(opt)) return;
    const ok = opt === q.answer;
    const first = picks.length === 0;
    setPicks((p) => [...p, opt]);
    if (first && !(origin in firstByQuestion.current)) {
      firstByQuestion.current[origin] = ok;
      firstTry.current[q.itemId] = (firstTry.current[q.itemId] ?? true) && ok;
      if (!ok) mistakes.current.push(q);
    }
    feedback(ok);
    if (ok || !first || q.options.length <= 2) {
      // correct, or second try used (2-option questions get no second try)
      setStage('done');
      const after = q.audioAfter ?? q.audio;
      if (after) setTimeout(() => speak(after), ok ? 150 : 400);
    } else {
      setStage('hint');
    }
  }

  function next() {
    const rest = queue.slice(1);
    // wrong on the first pick (even if the hint helped) → comes back later in the session
    if (picks[0] !== q.answer) {
      const again = requeue(q);
      const at = Math.min(rest.length, 2 + Math.floor(Math.random() * 3));
      rest.splice(at, 0, again);
    }
    if (rest.length === 0) {
      const vals = Object.values(firstByQuestion.current);
      const correct = vals.filter(Boolean).length;
      onFinish({ score: vals.length ? correct / vals.length : 0, firstTry: firstTry.current, total: vals.length, correct, mistakes: mistakes.current });
      return;
    }
    setQueue(rest);
  }

  const playsLeft = maxPlays !== undefined ? Math.max(0, maxPlays - plays) : undefined;
  const limitHit = playsLeft === 0 && stage === 'ask';

  const prompt = (
    <View style={st.prompt}>
      {q.display ? (
        <Text style={[st.display, q.display.length > 6 && { fontSize: fs(46) }]} adjustsFontSizeToFit numberOfLines={2}>
          {q.display}
        </Text>
      ) : null}
      {q.audio ? (
        <View style={{ marginTop: q.display ? 14 : 0 }}>
          <SoundButton big={!q.display} onPress={() => listen()} onSlow={() => listen(true)} disabled={limitHit} left={stage === 'ask' ? playsLeft : undefined} />
        </View>
      ) : null}
    </View>
  );

  const grid = (
    <View style={st.grid}>
      {q.options.map((opt) => {
        const isAnswer = opt === q.answer;
        const picked = picks.includes(opt);
        let state: 'idle' | 'right' | 'wrong' | 'dim' = 'idle';
        if (picked && !isAnswer) state = 'wrong';
        if (stage === 'done' && isAnswer) state = 'right';
        if (stage === 'done' && !picked && !isAnswer) state = 'dim';
        return (
          <Pressable
            key={opt}
            onPress={() => choose(opt)}
            style={({ pressed }) => [
              st.opt,
              q.options.length <= 2 && { width: '100%' },
              state === 'right' && { backgroundColor: C.goodBg, borderColor: C.good },
              state === 'wrong' && { backgroundColor: C.badBg, borderColor: C.bad },
              state === 'dim' && { opacity: 0.45 },
              pressed && stage !== 'done' && { transform: [{ scale: 0.97 }], backgroundColor: C.cardHi },
            ]}
          >
            {state === 'right' && <Ionicons name="checkmark-circle" size={18} color={C.good} style={st.badge} />}
            {state === 'wrong' && <Ionicons name="close-circle" size={18} color={C.bad} style={st.badge} />}
            <Text style={[st.optText, q.optionsAreTarget && st.optTarget]} numberOfLines={2} adjustsFontSizeToFit>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
      <View style={st.top}>
        <IconBtn icon="close" onPress={onClose} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Bar value={answeredUnique / total} />
        </View>
        {retries > 0 ? (
          <View style={st.retry}>
            <Ionicons name="refresh" size={14} color={C.gold} />
            <Text style={st.retryText}>{retries}</Text>
          </View>
        ) : (
          <Text style={st.count}>
            {answeredUnique}/{total}
          </Text>
        )}
        <IconBtn icon="flag-outline" size={20} color={C.dim} onPress={() => reportProblem({ lang, where: title ?? 'Sınav', detail: `Soru: ${q.instruction}\nGösterilen: ${q.display ?? q.audio ?? ''}\nDoğru cevap: ${q.answer}\nŞıklar: ${q.options.join(' | ')}` })} />
      </View>
      {title ? <Text style={st.title}>{title}</Text> : null}

      <Animated.View style={[{ flex: 1, paddingTop: 16 }, { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <Text style={st.instruction}>{q.instruction}</Text>
        {landscape ? (
          <View style={{ flex: 1, flexDirection: 'row', columnGap: 20 }}>
            <View style={{ flex: 1 }}>{prompt}</View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
              {grid}
            </ScrollView>
          </View>
        ) : (
          <>
            {prompt}
            {grid}
          </>
        )}
      </Animated.View>

      {stage === 'hint' ? (
        <View style={[st.feedback, { backgroundColor: C.goldBg }]}>
          <View style={st.fbHead}>
            <Ionicons name="bulb" size={24} color={C.gold} />
            <Text style={[st.fbTitle, { color: C.gold }]}>İpucu — bir hakkın daha var</Text>
          </View>
          <Text style={st.fbText}>{q.hint}</Text>
        </View>
      ) : stage === 'done' ? (
        <View style={[st.feedback, { backgroundColor: solved && picks.length === 1 ? C.goodBg : C.badBg }]}>
          <View style={st.fbHead}>
            <Ionicons name={solved ? 'checkmark-circle' : 'close-circle'} size={26} color={solved && picks.length === 1 ? C.good : C.bad} />
            <Text style={[st.fbTitle, { color: solved && picks.length === 1 ? C.good : C.bad }]}>
              {solved ? (picks.length === 1 ? 'Doğru!' : 'İpucuyla buldun — sonra tekrar gelecek') : 'Yanlış — sonra tekrar gelecek'}
            </Text>
          </View>
          <Text style={st.fbText}>{q.explain}</Text>
          <Button title="Devam" kind={solved && picks.length === 1 ? 'good' : 'bad'} onPress={next} style={{ marginTop: 12 }} />
        </View>
      ) : (
        <View style={{ height: 8 }} />
      )}
    </View>
  );
}

const st = themed(() => ({
  wrap: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center' },
  count: { color: C.sub, fontWeight: '700', minWidth: 40, textAlign: 'right', fontSize: fs(14) },
  retry: { flexDirection: 'row', alignItems: 'center', minWidth: 40, justifyContent: 'flex-end' },
  retryText: { color: C.gold, fontWeight: '800', marginLeft: 3 },
  title: { color: C.dim, fontSize: fs(12), fontWeight: '700', marginTop: 10, textTransform: 'uppercase', letterSpacing: 1 },
  instruction: { color: C.text, fontSize: fs(22), fontWeight: '800' },
  prompt: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 140 },
  display: { color: C.text, fontSize: fs(80), fontWeight: '700', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, marginBottom: 14 },
  opt: { width: '48.5%', minHeight: 74, borderRadius: R.md, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', padding: 10 },
  badge: { position: 'absolute', top: 6, right: 6 },
  optText: { color: C.text, fontSize: fs(18), fontWeight: '700', textAlign: 'center' },
  optTarget: { fontSize: fs(26) },
  feedback: { borderRadius: R.lg, padding: 16, marginBottom: 4 },
  fbHead: { flexDirection: 'row', alignItems: 'center' },
  fbTitle: { fontSize: fs(17), fontWeight: '800', marginLeft: 8, flex: 1 },
  fbText: { color: C.text, fontSize: fs(15), marginTop: 8, lineHeight: fs(21) },
}));

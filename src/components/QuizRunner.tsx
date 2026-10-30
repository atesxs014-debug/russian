import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Text } from '../Text';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Question, requeue } from '../quiz';
import { feedback, speak, stopAudio } from '../audio/player';
import { reportProblem } from '../meta';
import { Bar, Button, IconBtn, SoundButton } from '../ui';
import { checkTyped, t } from '../i18n';
import LangKeyboard from './LangKeyboard';
import { C, LevelId, R, fs, themed } from '../theme';

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
  /** 'yuksek' switches instructions/buttons to the target language. */
  level?: LevelId;
  onClose: () => void;
  onFinish: (r: QuizResult) => void;
};

type Stage = 'ask' | 'hint' | 'done';

export default function QuizRunner({ questions, title, lang, maxPlays, level, onClose, onFinish }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [queue, setQueue] = useState<Question[]>(questions);
  const [stage, setStage] = useState<Stage>('ask');
  const [picks, setPicks] = useState<string[]>([]);
  const [plays, setPlays] = useState(0);
  const [typed, setTyped] = useState('');
  const [lastOk, setLastOk] = useState(false);
  const [near, setNear] = useState(false);
  const firstTry = useRef<Record<string, boolean>>({});
  const firstByQuestion = useRef<Record<string, boolean>>({});
  const mistakes = useRef<Question[]>([]);
  const total = useMemo(() => questions.length, [questions]);
  const anim = useRef(new Animated.Value(0)).current;
  // Accidental-tap guard: options stay locked until the new question has settled,
  // and "Devam" unlocks shortly after feedback appears.
  const [inputReady, setInputReady] = useState(false);
  const [nextReady, setNextReady] = useState(false);
  const fbAnim = useRef(new Animated.Value(0)).current;

  const q = queue[0];
  const answeredUnique = Object.keys(firstByQuestion.current).length;
  const retries = queue.filter((x) => x.origin).length;

  const listen = (slow = false) => {
    if (!q?.audio && !q?.audioAfter) return;
    if (maxPlays !== undefined && stage === 'ask' && plays >= maxPlays) return;
    setPlays((n) => n + 1);
    speak((q.audio ?? q.audioAfter)!, slow, q.audio ? q.voice ?? 0 : 0);
  };

  useEffect(() => {
    if (!q) return;
    setStage('ask');
    setPicks([]);
    setPlays(0);
    setTyped('');
    setLastOk(false);
    setNear(false);
    setInputReady(false);
    setNextReady(false);
    fbAnim.setValue(0);
    anim.setValue(0);
    Animated.timing(anim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    const unlock = setTimeout(() => setInputReady(true), 650);
    const t = q.audio
      ? setTimeout(() => {
          setPlays(1);
          speak(q.audio!, false, q.voice ?? 0);
        }, 350)
      : undefined;
    return () => {
      clearTimeout(unlock);
      if (t) clearTimeout(t);
    };
  }, [q?.key]);

  useEffect(() => {
    if (stage === 'ask') return;
    fbAnim.setValue(0);
    Animated.timing(fbAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    if (stage === 'done') {
      setNextReady(false);
      const t = setTimeout(() => setNextReady(true), 600);
      return () => clearTimeout(t);
    }
  }, [stage]);

  useEffect(() => () => stopAudio(), []);

  if (!q) return null;

  const origin = q.origin ?? q.key;
  const last = picks[picks.length - 1];
  const solved = q.input === 'type' ? lastOk : last === q.answer;

  function checkTypedAnswer() {
    const v = typed.trim();
    if (!v || picks.includes(v)) return;
    const res = checkTyped(v, q.answer);
    setNear(res === 'near');
    choose(v, res === 'ok');
  }

  function choose(opt: string, okOverride?: boolean) {
    if (!inputReady || stage === 'done' || picks.includes(opt)) return;
    const ok = okOverride ?? opt === q.answer;
    setLastOk(ok);
    const first = picks.length === 0;
    setPicks((p) => [...p, opt]);
    if (first && !(origin in firstByQuestion.current)) {
      firstByQuestion.current[origin] = ok;
      firstTry.current[q.itemId] = (firstTry.current[q.itemId] ?? true) && ok;
      if (!ok) mistakes.current.push(q);
    }
    feedback(ok);
    if (ok || !first || (!q.input && q.options.length <= 2)) {
      // correct, or second try used (2-option questions get no second try)
      setStage('done');
      const after = q.audioAfter ?? q.audio;
      if (after) setTimeout(() => speak(after), ok ? 150 : 400);
    } else {
      setStage('hint');
    }
  }

  function next() {
    if (!nextReady) return;
    setNextReady(false);
    const rest = queue.slice(1);
    // wrong on the first pick (even if the hint helped) → comes back later in the session
    if (q.input === 'type' ? !(picks.length === 1 && lastOk) : picks[0] !== q.answer) {
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
    <View style={[st.prompt, q.input === 'type' && { flex: 0, minHeight: 90, paddingVertical: 8 }]}>
      {q.display ? (
        <Text style={[st.display, q.display.length > 6 && { fontSize: fs(46) }, q.display.length > 16 && { fontSize: fs(28), lineHeight: fs(36) }]} adjustsFontSizeToFit numberOfLines={q.display.length > 16 ? 5 : 2}>
          {q.display}
        </Text>
      ) : null}
      {q.sub ? <Text style={st.sub}>{q.sub}</Text> : null}
      {q.audio ? (
        <View style={{ marginTop: q.display ? 14 : 0 }}>
          <SoundButton big={!q.display} onPress={() => listen()} onSlow={() => listen(true)} disabled={limitHit} left={stage === 'ask' ? playsLeft : undefined} />
        </View>
      ) : null}
    </View>
  );

  const typing = (
    <View style={{ marginBottom: 12 }}>
      <View style={[st.typed, stage === 'done' && { borderColor: solved ? C.good : C.bad }]}>
        <Text style={[st.typedText, !typed && { color: C.dim }]}>{typed || '…'}</Text>
      </View>
      {stage !== 'done' ? (
        <>
          <LangKeyboard lang={lang} disabled={!inputReady} onKey={(ch) => setTyped((x) => x + ch)} onBack={() => setTyped((x) => x.slice(0, -1))} onSpace={() => setTyped((x) => (x.endsWith(' ') ? x : x + ' '))} />
          <Button title={t('check', lang, level)} icon="checkmark" disabled={!typed.trim() || !inputReady} onPress={checkTypedAnswer} style={{ marginTop: 10 }} />
        </>
      ) : null}
    </View>
  );

  const grid = q.input === 'type' ? typing : (
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
              !inputReady && { opacity: 0.6 },
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
        ) : q.input === 'type' ? (
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }} showsVerticalScrollIndicator={false}>
            {prompt}
            {grid}
          </ScrollView>
        ) : (
          <>
            {prompt}
            {grid}
          </>
        )}
      </Animated.View>

      {stage === 'hint' ? (
        <Animated.View style={[st.feedback, { backgroundColor: C.goldBg, opacity: fbAnim, transform: [{ translateY: fbAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <View style={st.fbHead}>
            <Ionicons name="bulb" size={24} color={C.gold} />
            <Text style={[st.fbTitle, { color: C.gold }]}>{near ? 'Neredeyse! Bir harfi kontrol et' : t('hintTitle', lang, level)}</Text>
          </View>
          <Text style={st.fbText}>{q.hint}</Text>
        </Animated.View>
      ) : stage === 'done' ? (
        <Animated.View style={[st.feedback, { backgroundColor: solved && picks.length === 1 ? C.goodBg : C.badBg, opacity: fbAnim, transform: [{ translateY: fbAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <View style={st.fbHead}>
            <Ionicons name={solved ? 'checkmark-circle' : 'close-circle'} size={26} color={solved && picks.length === 1 ? C.good : C.bad} />
            <Text style={[st.fbTitle, { color: solved && picks.length === 1 ? C.good : C.bad }]}>
              {solved ? (picks.length === 1 ? t('correct', lang, level) : 'İpucuyla buldun — sonra tekrar gelecek') : t('wrong', lang, level)}
            </Text>
          </View>
          {q.input === 'type' && !solved ? <Text style={[st.fbText, { fontWeight: '800' }]}>Doğrusu: {q.answer}</Text> : null}
          <Text style={st.fbText}>{q.explain}</Text>
          <Button title={t('continue', lang, level)} kind={solved && picks.length === 1 ? 'good' : 'bad'} onPress={next} disabled={!nextReady} style={{ marginTop: 12 }} />
        </Animated.View>
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
  sub: { color: C.sub, fontSize: fs(15), textAlign: 'center', marginTop: 6 },
  typed: { minHeight: 56, borderRadius: R.md, borderWidth: 2, borderColor: C.line, backgroundColor: C.card, justifyContent: 'center', paddingHorizontal: 14, marginBottom: 10 },
  typedText: { color: C.text, fontSize: fs(24), fontWeight: '700' },
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

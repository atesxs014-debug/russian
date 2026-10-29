import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useApp } from '../store';
import { speak, stopAudio, feedback } from '../audio/player';
import { SPEAK_PASS, SpeakResult, scoreSpeech } from '../speech/score';
import { cleanupRecording, levels, loadWhisper, micPermission, playMine, saveForPlayback, startRecording, stopRecording, transcribe, whisperReady } from '../speech/recorder';
import { C, R, fs, themed } from '../theme';

const MAX_TRIES = 3;

type Props = {
  target: string;
  /** Called once: passed (score ≥ 80), failed (3 tries used) or skipped ("Şu an konuşamam"). */
  onDone: (outcome: 'pass' | 'fail' | 'skip', score: number) => void;
  allowSkip?: boolean;
};

type Phase = 'idle' | 'loading' | 'recording' | 'thinking' | 'result' | 'error';

/** "Şimdi sen söyle" — hold the mic, speak, get a 0–100 score with the wrong letters in red. */
export default function SpeakPanel({ target, onDone, allowSkip = true }: Props) {
  const { settings, course } = useApp();
  const [phase, setPhase] = useState<Phase>('idle');
  const [tries, setTries] = useState(0);
  const [res, setRes] = useState<SpeakResult | null>(null);
  const [warn, setWarn] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const pressStart = useRef(0);
  const pressing = useRef(false);
  const recRef = useRef(false);

  useEffect(() => {
    setPhase('idle');
    setTries(0);
    setRes(null);
    setWarn(null);
    setFinished(false);
  }, [target]);

  useEffect(() => {
    // warm the model up in the background so the first try is fast
    if (!whisperReady()) loadWhisper().catch(() => {});
    return () => cleanupRecording();
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;
    const loop = Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.out(Easing.quad), useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 600, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [phase]);

  async function onPressIn() {
    if (finished || phase === 'thinking' || phase === 'loading') return;
    pressing.current = true;
    setErr(null);
    stopAudio();
    if (!(await micPermission())) {
      setErr('Mikrofon izni gerekli. Telefon ayarlarından Voxa için mikrofonu aç.');
      setPhase('error');
      return;
    }
    pressStart.current = Date.now();
    try {
      await startRecording();
      recRef.current = true;
      setPhase('recording');
      if (!pressing.current) onPressOut(); // released while the mic was starting
    } catch {
      setErr('Kayıt başlatılamadı.');
      setPhase('error');
    }
  }

  async function onPressOut() {
    pressing.current = false;
    if (!recRef.current) return;
    recRef.current = false;
    const pcm = await stopRecording();
    if (Date.now() - pressStart.current < 350) {
      setPhase(res ? 'result' : 'idle');
      setWarn('Mikrofonu basılı tut, konuş, sonra bırak.');
      return;
    }
    const lv = levels(pcm);
    setWarn(lv.peak < 600 ? 'Sesin çok kısık geldi, biraz daha yüksek söyle.' : lv.noiseFloor > 1500 ? 'Ortam gürültülü, puan yanıltıcı olabilir.' : null);
    saveForPlayback(pcm);
    setPhase(whisperReady() ? 'thinking' : 'loading');
    try {
      const heard = await transcribe(pcm, settings.lang);
      const r = scoreSpeech(target, heard, settings.lang, course);
      const n = tries + 1;
      setTries(n);
      setRes(r);
      setPhase('result');
      const ok = r.score >= SPEAK_PASS;
      feedback(ok);
      if (ok || n >= MAX_TRIES) {
        setFinished(true);
        setTimeout(() => onDone(ok ? 'pass' : 'fail', r.score), 900);
      }
    } catch {
      setErr('Konuşma motoru çalışmadı. Tekrar dene.');
      setPhase('error');
    }
  }

  const ok = !!res && res.score >= SPEAK_PASS;
  const color = !res ? C.primary : ok ? C.good : res.score >= 50 ? C.gold : C.bad;
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });

  return (
    <View style={st.wrap}>
      <View style={st.head}>
        <Ionicons name="mic" size={16} color={C.primary} />
        <Text style={st.kicker}>ŞİMDİ SEN SÖYLE</Text>
        <Text style={st.tries}>
          {tries}/{MAX_TRIES} deneme
        </Text>
      </View>

      <View style={st.targetRow}>
        {res ? (
          <Text style={st.target}>
            {res.chars.map((c, i) => (
              <Text key={i} style={c.wrong ? { color: C.bad, textDecorationLine: 'underline' } : undefined}>
                {c.ch}
              </Text>
            ))}
          </Text>
        ) : (
          <Text style={st.target}>{target.replace(/́/g, '')}</Text>
        )}
      </View>

      {res ? (
        <View style={st.resultRow}>
          <View style={[st.score, { borderColor: color }]}>
            <Text style={[st.scoreNum, { color }]}>{res.score}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[st.verdict, { color }]}>{ok ? 'Harika telaffuz!' : res.heard ? (finished ? 'Bu kart sonra tekrar gelecek' : 'Bir daha dene') : 'Seni duyamadım'}</Text>
            {res.heard ? <Text style={st.heard}>Duyulan: “{res.heard}”</Text> : null}
          </View>
        </View>
      ) : null}

      {res && !ok && res.heard
        ? res.tips.map((t) => (
            <View key={t} style={st.tip}>
              <Ionicons name="bulb-outline" size={15} color={C.gold} />
              <Text style={st.tipText}>{t}</Text>
            </View>
          ))
        : null}

      {warn ? <Text style={st.warn}>{warn}</Text> : null}
      {err ? <Text style={[st.warn, { color: C.bad }]}>{err}</Text> : null}

      <View style={st.controls}>
        <Pressable onPress={() => speak(target)} style={st.small} accessibilityLabel="Doğru sesi dinle">
          <Ionicons name="volume-high" size={20} color={C.primary} />
          <Text style={st.smallText}>Doğru ses</Text>
        </Pressable>

        <Animated.View style={{ transform: [{ scale: phase === 'recording' ? scale : 1 }] }}>
          <Pressable
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={finished}
            accessibilityLabel="Basılı tut ve konuş"
            style={[st.mic, { backgroundColor: phase === 'recording' ? C.bad : C.primary }, finished && { opacity: 0.4 }]}
          >
            <Ionicons name={phase === 'thinking' || phase === 'loading' ? 'hourglass' : 'mic'} size={34} color={C.onPrimary} />
          </Pressable>
        </Animated.View>

        <Pressable onPress={playMine} disabled={!res} style={[st.small, !res && { opacity: 0.35 }]} accessibilityLabel="Kendi sesimi dinle">
          <Ionicons name="person-circle-outline" size={20} color={C.primary} />
          <Text style={st.smallText}>Benim sesim</Text>
        </Pressable>
      </View>
      <Text style={st.hint}>
        {phase === 'recording' ? 'Dinliyorum… bitince bırak' : phase === 'thinking' ? 'Değerlendiriliyor…' : phase === 'loading' ? 'Konuşma motoru hazırlanıyor (ilk sefer birkaç saniye)…' : 'Basılı tut · konuş · bırak'}
      </Text>

      {allowSkip && !finished ? (
        <Pressable onPress={() => { setFinished(true); onDone('skip', 0); }} hitSlop={8} style={{ alignSelf: 'center', marginTop: 6 }}>
          <Text style={st.skip}>Şu an konuşamam (sonra telafi edeceğim)</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const st = themed(() => ({
  wrap: { backgroundColor: C.card, borderRadius: R.lg, padding: 16, marginTop: 16, borderWidth: 1.5, borderColor: C.line },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kicker: { color: C.primary, fontWeight: '800', fontSize: fs(12), letterSpacing: 1.3, flex: 1 },
  tries: { color: C.sub, fontSize: fs(12), fontWeight: '700' },
  targetRow: { alignItems: 'center', marginVertical: 12 },
  target: { color: C.text, fontSize: fs(30), fontWeight: '800', textAlign: 'center' },
  resultRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  score: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  scoreNum: { fontSize: fs(22), fontWeight: '800' },
  verdict: { fontSize: fs(16), fontWeight: '800' },
  heard: { color: C.sub, fontSize: fs(13), marginTop: 2 },
  tip: { flexDirection: 'row', gap: 6, backgroundColor: C.goldBg, borderRadius: R.sm, padding: 10, marginTop: 6 },
  tipText: { color: C.text, fontSize: fs(13), flex: 1, lineHeight: fs(18) },
  warn: { color: C.gold, fontSize: fs(13), textAlign: 'center', marginTop: 8, fontWeight: '600' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 4 },
  small: { alignItems: 'center', width: 84, gap: 4 },
  smallText: { color: C.sub, fontSize: fs(11), fontWeight: '700' },
  mic: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  hint: { color: C.sub, fontSize: fs(12), textAlign: 'center', marginTop: 10 },
  skip: { color: C.dim, fontSize: fs(13), fontWeight: '700', textDecorationLine: 'underline' },
}));

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Modal, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Course, DialogLine, Letter, Pair, ReadText, Rule, Word, findLesson, letterLabel, letterSay, plain, wordItemId } from '../course';
import { lessonQuiz } from '../quiz';
import { PASS, addToReview, applyLesson, bumpStreak, saveResume } from '../progress';
import { norm, t as tr } from '../i18n';
import { useApp } from '../store';
import { speak, stopAudio } from '../audio/player';
import { reportProblem } from '../meta';
import QuizRunner, { QuizResult } from '../components/QuizRunner';
import SpeakPanel from '../components/SpeakPanel';
import ResultView from '../components/ResultView';
import { Bar, Button, IconBtn, SoundButton } from '../ui';
import { C, R, fs, themed } from '../theme';

type Phase = 'learn' | 'quiz' | 'result';
type Card =
  | { type: 'letter'; l: Letter }
  | { type: 'rule'; r: Rule }
  | { type: 'pair'; p: Pair; a: Letter; b: Letter }
  | { type: 'word'; w: Word }
  | { type: 'line'; lines: DialogLine[]; i: number; who: [string, string] }
  | { type: 'text'; x: ReadText };

/** Text the learner must say for a card (single letters are hard to recognise, so an example word is used). */
function speechTarget(c: Card): string {
  if (c.type === 'word') return c.w.t;
  if (c.type === 'letter') return c.l.words[0]?.t ?? c.l.name;
  if (c.type === 'pair') return c.a.words[0]?.t ?? c.a.name;
  // dialogues: the learner says the second speaker's lines
  if (c.type === 'line') return c.lines[c.i].p === 1 ? c.lines[c.i].t : '';
  if (c.type === 'text') return (c.x.t.match(/^[^.!?]+[.!?]?/)?.[0] ?? '').trim();
  return c.r.examples[0]?.t ?? '';
}

export default function LessonScreen({ lessonId, onClose, onSpeakDebt }: { lessonId: string; onClose: () => void; onSpeakDebt: (lessonId: string) => void }) {
  const { progress, save, course, settings } = useApp();
  const found = findLesson(course, lessonId)!;
  const { unit, lesson, index, unitIndex } = found;
  const insets = useSafeAreaInsets();
  const resumeCard = progress.resume?.lessonId === lessonId ? progress.resume.card : -1;
  const [phase, setPhase] = useState<Phase>('learn');
  const [card, setCard] = useState(resumeCard);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [streakToday, setStreakToday] = useState<number | undefined>();
  const [round, setRound] = useState(0);
  // card order (a card whose speaking check failed 3 times is appended again) and per-position speaking results
  const [order, setOrder] = useState<number[]>([]);
  const [spoken, setSpoken] = useState<Record<number, 'pass' | 'fail' | 'skip'>>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  // ignore a second tap that lands within 400 ms (prevents skipping a card by accident)
  const lastTap = useRef(0);
  const guard = (fn: () => void) => () => {
    const now = Date.now();
    if (now - lastTap.current < 400) return;
    lastTap.current = now;
    fn();
  };
  const questions = useMemo(() => lessonQuiz(course, unit, index), [course, unit, index, round]);

  const cards: Card[] = useMemo(() => {
    if (lesson.kind === 'vocab') return (lesson.words ?? []).map((w) => ({ type: 'word' as const, w }));
    if (lesson.kind === 'dialog' && lesson.dialog) {
      const d = lesson.dialog;
      return d.lines.map((_, i) => ({ type: 'line' as const, lines: d.lines, i, who: d.who }));
    }
    if (lesson.kind === 'text' && lesson.text) return [{ type: 'text' as const, x: lesson.text }];
    if (lesson.kind === 'letters') return (lesson.letters ?? []).map((l) => ({ type: 'letter' as const, l }));
    if (lesson.kind === 'compare')
      return (lesson.pairs ?? [])
        .map((p) => ({ type: 'pair' as const, p, a: course.letters[`L:${p.a}`], b: course.letters[`L:${p.b}`] }))
        .filter((c) => c.a && c.b);
    return (lesson.rules ?? []).map((r) => ({ type: 'rule' as const, r }));
  }, [lesson, course]);

  useEffect(() => {
    setOrder(cards.map((_, i) => i));
  }, [cards]);

  // remember the card so the lesson resumes after the app is closed
  const progressRef = useRef(progress);
  progressRef.current = progress;
  useEffect(() => {
    if (phase === 'learn' && card >= 0) save(saveResume(progressRef.current, lessonId, card));
  }, [card, phase]);

  useEffect(() => () => stopAudio(), []);

  if (phase === 'quiz') {
    return (
      <QuizRunner
        key={round}
        lang={settings.lang}
        level={unit.level}
        title={`${lesson.title} · sınav`}
        questions={questions}
        onClose={() => setPhase('learn')}
        onFinish={(r) => {
          const b = bumpStreak(applyLesson(course, progress, lesson.id, r.score, r.firstTry, skipped));
          save(b.progress);
          setStreakToday(b.firstToday ? b.progress.streak.count : undefined);
          setResult(r);
          setPhase('result');
        }}
      />
    );
  }

  if (phase === 'result' && result) {
    const owes = progress.speakDebt?.[lesson.id]?.length ?? 0;
    if (result.score >= PASS && owes) {
      return (
        <ResultView
          result={result}
          passed
          streak={streakToday}
          passText={`Sınavı geçtin! Ama ${owes} kelimenin telaffuzunu atladın. Telafi etmeden sonraki ders açılmaz.`}
          failText=""
          primary={{ title: 'Telaffuzu tamamla', onPress: () => onSpeakDebt(lesson.id) }}
          secondary={{ title: 'Sonra yaparım', onPress: onClose }}
        />
      );
    }
    const passed = result.score >= PASS;
    return (
      <ResultView
        result={result}
        passed={passed}
        streak={streakToday}
        passText={index < unit.lessons.length - 1 ? 'Sonraki ders açıldı. Bu dersin öğeleri yarın tekrar sorulacak.' : 'Ünitenin tüm dersleri bitti! Tekrarlarla pekiştirince ünite sınavı açılacak.'}
        failText="Sonraki derse geçmek için %90 lazım. Kartlara dönüp yanlış yaptıklarına tekrar bak."
        primary={passed ? { title: 'Ana sayfa', onPress: onClose } : { title: 'Tekrar sına', onPress: () => { setRound((x) => x + 1); setPhase('quiz'); } }}
        secondary={passed ? { title: 'Dersi tekrar et', onPress: () => { setCard(0); setSpoken({}); setPhase('learn'); setRound((x) => x + 1); } } : { title: 'Kartlara dön', onPress: () => { setCard(0); setPhase('learn'); } }}
      />
    );
  }

  const total = order.length || cards.length;
  const isIntro = card < 0;
  const last = card === total - 1;
  const c = cards[order[card] ?? card];
  const target = c ? speechTarget(c) : '';
  const status = spoken[card];
  const canGoOn = isIntro || !target || !!status;

  function onSpoken(outcome: 'pass' | 'fail' | 'skip') {
    setSpoken((m) => ({ ...m, [card]: outcome }));
    if (outcome === 'skip') setSkipped((xs) => (xs.includes(target) ? xs : [...xs, target]));
    if (outcome === 'fail') setOrder((o) => [...o, o[card]]); // 3 failed tries → this card comes back at the end
  }

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12, paddingLeft: insets.left + 20, paddingRight: insets.right + 20 }]}>
      <View style={st.top}>
        <IconBtn icon="close" onPress={onClose} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Bar value={(card + 1) / total} />
        </View>
        <Text style={st.count}>{isIntro ? '' : `${card + 1}/${total}`}</Text>
        <IconBtn
          icon="flag-outline"
          size={20}
          color={C.dim}
          onPress={() =>
            reportProblem({
              lang: settings.lang,
              where: `${lesson.title}${isIntro ? '' : ` · kart ${card + 1}`}`,
              detail: !c
                ? lesson.intro
                : c.type === 'word'
                  ? `${c.w.t} — ${c.w.read} — ${c.w.tr}`
                  : c.type === 'letter'
                    ? `${letterLabel(c.l)} — ${c.l.sound} — ${c.l.hint}`
                    : c.type === 'rule'
                      ? `${c.r.title}: ${c.r.text}`
                      : c.type === 'line'
                        ? `${c.lines[c.i].t} — ${c.lines[c.i].tr}`
                        : c.type === 'text'
                          ? c.x.t.slice(0, 300)
                          : c.p.tip,
            })
          }
        />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingVertical: 16, maxWidth: 640, width: '100%', alignSelf: 'center' }} showsVerticalScrollIndicator={false}>
        {isIntro ? (
          <View style={st.intro}>
            <Text style={st.kicker}>DERS {index + 1}</Text>
            <Text style={st.h1}>{lesson.title}</Text>
            <Text style={st.big}>{lesson.subtitle}</Text>
            <Text style={st.p}>{lesson.intro}</Text>
            <View style={st.rule}>
              <Ionicons name="shield-checkmark" size={20} color={C.gold} />
              <Text style={st.ruleText}>
                {lesson.kind === 'dialog'
                  ? `Konuşmayı dinle. ${lesson.dialog?.who[1] ?? 'İkinci kişi'} sensin: onun repliklerini mikrofona dokunup söyle (80+ puan). En sonda sınav: %90 altı = ders tekrar.`
                  : 'Her kartta dinle, sonra mikrofona dokunup sen söyle (80+ puan). En sonda sınav: %90 altı = ders tekrar.'}
              </Text>
            </View>
          </View>
        ) : c.type === 'letter' ? (
          <LetterCard key={c.l.id} l={c.l} cyrillic={settings.lang === 'ru'} />
        ) : c.type === 'word' ? (
          <WordCard key={c.w.t} w={c.w} showRead={unitIndex <= 1} />
        ) : c.type === 'pair' ? (
          <PairCard p={c.p} a={c.a} b={c.b} />
        ) : c.type === 'line' ? (
          <LineCard key={`l${c.i}`} lines={c.lines} i={c.i} who={c.who} />
        ) : c.type === 'text' ? (
          <TextCard x={c.x} course={course} onAdd={(w) => save(addToReview(progressRef.current, wordItemId(w)))} />
        ) : (
          <RuleCard r={c.r} />
        )}
        {!isIntro && target ? <SpeakPanel key={`${card}-${target}`} target={target} onDone={onSpoken} /> : null}
        {!isIntro && status === 'fail' ? <Text style={st.again}>Bu kart sonda tekrar gelecek.</Text> : null}
      </ScrollView>

      <View style={st.nav}>
        {!isIntro && <Button title={tr('back', settings.lang, unit.level)} kind="ghost" icon="arrow-back" onPress={guard(() => setCard((x) => x - 1))} style={{ flex: 1, marginRight: 10 }} />}
        {last ? (
          <Button title={tr('startQuiz', settings.lang, unit.level)} icon="flag" kind="good" disabled={!canGoOn} onPress={guard(() => { stopAudio(); setPhase('quiz'); })} style={{ flex: 2 }} />
        ) : (
          <Button title={isIntro ? (resumeCard > 0 ? 'Devam et' : tr('start', settings.lang, unit.level)) : canGoOn ? tr('next', settings.lang, unit.level) : tr('sayFirst', settings.lang, unit.level)} icon="arrow-forward" disabled={!canGoOn} onPress={guard(() => setCard((x) => x + 1))} style={{ flex: 2 }} />
        )}
      </View>
    </View>
  );
}

function WordRow({ w }: { w: Word }) {
  return (
    <Pressable onPress={() => speak(w.t)} onLongPress={() => speak(w.t, true)} style={({ pressed }) => [st.word, pressed && { backgroundColor: C.cardHi }]}>
      <Ionicons name="volume-medium" size={20} color={C.primary} />
      <Text style={st.wordT}>{w.t}</Text>
      <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
        <Text style={st.wordRead}>{w.read}</Text>
        <Text style={st.wordTr}>{w.tr}</Text>
      </View>
    </Pressable>
  );
}

/** Big glyph that "draws" itself in once (a simple writing-direction cue). */
function DrawnGlyph({ text, sub }: { text: string; sub?: string }) {
  const reveal = useRef(new Animated.Value(0)).current;
  const play = () => {
    reveal.setValue(0);
    Animated.timing(reveal, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  };
  useEffect(play, [text]);
  return (
    <Pressable onPress={play} style={{ alignItems: 'center' }}>
      <View style={{ overflow: 'hidden' }}>
        <Text style={[st.glyph, { color: C.line, position: 'absolute' }]}>
          {text}
          {sub ? <Text style={st.glyphSub}> {sub}</Text> : null}
        </Text>
        <Animated.View style={{ overflow: 'hidden', width: reveal.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }}>
          <Text style={st.glyph} numberOfLines={1}>
            {text}
            {sub ? <Text style={st.glyphSub}> {sub}</Text> : null}
          </Text>
        </Animated.View>
      </View>
      <Text style={st.drawHint}>yazılışı tekrar izlemek için dokun</Text>
    </Pressable>
  );
}

function LetterCard({ l, cyrillic }: { l: Letter; cyrillic: boolean }) {
  return (
    <View>
      <View style={st.letterBox}>
        <DrawnGlyph text={l.upper} sub={l.lower} />
        <View style={{ marginTop: 10 }}>
          <SoundButton onPress={() => speak(letterSay(l))} onSlow={() => speak(letterSay(l), true)} />
        </View>
      </View>
      <View style={st.soundRow}>
        <View style={st.pill}>
          <Text style={st.pillLabel}>SES</Text>
          <Text style={st.pillValue}>{l.sound}</Text>
        </View>
        <View style={st.pill}>
          <Text style={st.pillLabel}>{cyrillic ? 'HARFİN ADI' : 'ÖRNEK'}</Text>
          <Text style={st.pillValue}>{l.name}</Text>
        </View>
      </View>
      <Text style={st.hint}>{l.hint}</Text>
      <Text style={st.section}>ÖRNEK KELİMELER</Text>
      {l.words.map((w) => (
        <WordRow key={w.t} w={w} />
      ))}
      <Text style={st.tip}>Dokun: dinle · basılı tut: yavaş dinle</Text>
    </View>
  );
}

const GENDER = { m: { label: 'eril', key: 'male' }, f: { label: 'dişil', key: 'female' }, n: { label: 'nötr', key: 'neuter' } } as const;

/** Vocabulary card. The Latin-letter reading is shown in early units and hidden (tap to reveal) later. */
function WordCard({ w, showRead }: { w: Word; showRead: boolean }) {
  const [reveal, setReveal] = useState(showRead);
  const g = w.g ? GENDER[w.g] : null;
  const gColor = g ? C[g.key] : C.primary;
  return (
    <View>
      <View style={[st.letterBox, g && { borderTopWidth: 5, borderTopColor: gColor }]}>
        {w.e ? <Text style={st.emoji}>{w.e}</Text> : null}
        <Text style={[st.wordBig, g && { color: gColor }]} adjustsFontSizeToFit numberOfLines={2}>
          {w.t}
        </Text>
        {reveal ? (
          <Text style={st.wordReadBig}>{w.read}</Text>
        ) : (
          <Pressable onPress={() => setReveal(true)} hitSlop={10}>
            <Text style={st.revealText}>okunuşu göster</Text>
          </Pressable>
        )}
        <View style={{ marginTop: 12 }}>
          <SoundButton onPress={() => speak(w.t)} onSlow={() => speak(w.t, true)} />
        </View>
      </View>
      <View style={st.soundRow}>
        <View style={st.pill}>
          <Text style={st.pillLabel}>ANLAMI</Text>
          <Text style={st.pillValue}>{w.tr}</Text>
        </View>
        {g ? (
          <View style={[st.pill, { flex: 0, minWidth: 92, borderColor: gColor }]}>
            <Text style={st.pillLabel}>CİNSİYET</Text>
            <Text style={[st.pillValue, { color: gColor }]}>{g.label}</Text>
          </View>
        ) : null}
      </View>
      {w.x ? (
        <Pressable onPress={() => speak(w.x![0])} onLongPress={() => speak(w.x![0], true)} style={({ pressed }) => [st.exBox, pressed && { backgroundColor: C.cardHi }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.primary} />
            <Text style={st.exLabel}>ÖRNEK CÜMLE</Text>
            <Ionicons name="volume-medium" size={16} color={C.primary} />
          </View>
          <Text style={st.exT}>{w.x[0]}</Text>
          <Text style={st.exTr}>{w.x[1]}</Text>
        </Pressable>
      ) : null}
      <Text style={st.tip}>🔊 dinle · 🐢 yavaş dinle</Text>
    </View>
  );
}

function PairCard({ p, a, b }: { p: Pair; a: Letter; b: Letter }) {
  return (
    <View>
      <View style={st.pairRow}>
        {[a, b].map((x) => (
          <Pressable key={x.id} onPress={() => speak(letterSay(x))} style={({ pressed }) => [st.pairBox, pressed && { backgroundColor: C.cardHi }]}>
            <Text style={st.pairGlyph}>{x.upper}</Text>
            <Text style={st.pairSound}>{x.sound}</Text>
            <View style={st.pairWord}>
              <Ionicons name="volume-medium" size={16} color={C.primary} />
              <Text style={st.pairWordText}>{x.words[0]?.t}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={st.hint}>{p.tip}</Text>
      <Text style={st.section}>KELİMELERLE DİNLE</Text>
      {[...a.words, ...b.words].map((w) => (
        <WordRow key={w.t} w={w} />
      ))}
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
        <WordRow key={w.t} w={w} />
      ))}
      <Text style={st.tip}>Dokun: dinle · basılı tut: yavaş dinle</Text>
    </View>
  );
}

/** One dialogue line, with the conversation so far above it. */
function LineCard({ lines, i, who }: { lines: DialogLine[]; i: number; who: [string, string] }) {
  const cur = lines[i];
  useEffect(() => {
    const tm = setTimeout(() => speak(cur.t, false, cur.p), 300);
    return () => clearTimeout(tm);
  }, [i]);
  return (
    <View>
      {lines.slice(Math.max(0, i - 4), i + 1).map((l, k, arr) => {
        const now = k === arr.length - 1;
        const right = l.p === 1;
        return (
          <Pressable
            key={`${i}-${k}`}
            onPress={() => speak(l.t, false, l.p)}
            onLongPress={() => speak(l.t, true, l.p)}
            style={[st.bubble, right ? st.bubbleR : st.bubbleL, !now && { opacity: 0.55 }, now && { borderWidth: 2, borderColor: C.primary }]}
          >
            <Text style={st.who}>{who[l.p]}</Text>
            <Text style={[st.bubbleT, now && { fontSize: fs(22) }]}>{l.t}</Text>
            <Text style={st.bubbleTr}>{l.tr}</Text>
          </Pressable>
        );
      })}
      <View style={{ alignItems: 'center', marginTop: 8 }}>
        <SoundButton onPress={() => speak(cur.t, false, cur.p)} onSlow={() => speak(cur.t, true, cur.p)} />
      </View>
      <Text style={st.tip}>Baloncuğa dokun: dinle · basılı tut: yavaş</Text>
    </View>
  );
}

const stripWord = (s: string) => s.replace(/^[«"“(¿¡]+|[»"”),.!?;:…]+$/g, '');

/** Reading text: tap any word for its meaning, sound and "add to review". */
function TextCard({ x, course, onAdd }: { x: ReadText; course: Course; onAdd: (w: Word) => void }) {
  const [showTr, setShowTr] = useState(false);
  const [sel, setSel] = useState<Word | null>(null);
  const gloss = useMemo(() => new Map(x.gloss.map(([a, b]) => [norm(a), b])), [x]);
  function lookup(raw: string) {
    const w = stripWord(raw);
    if (!w) return;
    const n = norm(w);
    const known = course.words[wordItemId({ t: w, tr: '', read: '' })];
    const hit = gloss.get(n) ?? known?.tr ?? [...gloss.entries()].find(([k]) => k.startsWith(n.slice(0, Math.max(4, n.length - 2))))?.[1];
    speak(w);
    setSel({ t: w, tr: hit ?? 'Sözlükte yok — bağlamdan tahmin et', read: '' });
  }
  return (
    <View>
      <View style={st.textBox}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {x.t.split(/\s+/).map((tok, k) => (
            <Pressable key={k} onPress={() => lookup(tok)} hitSlop={2}>
              {({ pressed }) => <Text style={[st.tok, pressed && { backgroundColor: C.cardHi }]}>{tok} </Text>}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, columnGap: 12 }}>
        <SoundButton onPress={() => speak(x.t)} onSlow={() => speak(x.t, true)} />
        <Button title={showTr ? 'Çeviriyi gizle' : 'Çeviriyi göster'} kind="ghost" onPress={() => setShowTr((v) => !v)} style={{ paddingHorizontal: 14 }} />
      </View>
      {showTr ? <Text style={[st.p, { marginTop: 12 }]}>{x.tr}</Text> : null}
      <Text style={st.tip}>Bilmediğin kelimeye dokun: anlamı, sesi ve tekrara ekleme</Text>
      <Modal visible={!!sel} transparent animationType="fade" onRequestClose={() => setSel(null)}>
        <Pressable style={st.backdrop} onPress={() => setSel(null)}>
          <View style={st.dialog}>
            <Text style={st.h1}>{sel?.t}</Text>
            <Text style={[st.p, { marginTop: 6 }]}>{sel?.tr}</Text>
            <View style={{ flexDirection: 'row', marginTop: 14, columnGap: 10 }}>
              <Button title="Dinle" icon="volume-high" kind="ghost" onPress={() => sel && speak(sel.t)} style={{ flex: 1 }} />
              <Button
                title="Tekrara ekle"
                icon="add"
                onPress={() => {
                  if (sel) {
                    onAdd(sel);
                    Alert.alert('Eklendi', `${plain(sel.t)} yarın tekrarında sorulacak.`);
                  }
                  setSel(null);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const st = themed(() => ({
  wrap: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: 'row', alignItems: 'center' },
  count: { color: C.sub, fontWeight: '700', minWidth: 40, textAlign: 'right', fontSize: fs(14) },
  intro: { flex: 1, justifyContent: 'center' },
  kicker: { color: C.primary, fontWeight: '900', letterSpacing: 1.5, fontSize: fs(13) },
  h1: { color: C.text, fontSize: fs(30), fontWeight: '900', marginTop: 6 },
  big: { color: C.text, fontSize: fs(34), fontWeight: '700', marginTop: 16, letterSpacing: 2 },
  p: { color: C.sub, fontSize: fs(17), lineHeight: fs(25), marginTop: 16 },
  rule: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginTop: 24 },
  ruleText: { color: C.text, flex: 1, marginLeft: 10, fontSize: fs(14), lineHeight: fs(20) },
  letterBox: { backgroundColor: C.card, borderRadius: R.xl, alignItems: 'center', paddingVertical: 22 },
  glyph: { color: C.text, fontSize: fs(104), fontWeight: '700', lineHeight: fs(124) },
  glyphSub: { fontSize: fs(60), color: C.sub },
  drawHint: { color: C.dim, fontSize: fs(11), marginTop: 2 },
  soundRow: { flexDirection: 'row', marginTop: 14, columnGap: 10 },
  pill: { flex: 1, backgroundColor: C.bg2, borderRadius: R.md, padding: 12, borderWidth: 1, borderColor: C.line },
  pillLabel: { color: C.dim, fontSize: fs(11), fontWeight: '900', letterSpacing: 1.2 },
  pillValue: { color: C.text, fontSize: fs(20), fontWeight: '800', marginTop: 2 },
  hint: { color: C.text, fontSize: fs(16), lineHeight: fs(23), marginTop: 14 },
  section: { color: C.dim, fontWeight: '900', fontSize: fs(12), letterSpacing: 1.5, marginTop: 20, marginBottom: 8 },
  word: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 14, marginBottom: 8 },
  wordT: { flex: 1, color: C.text, fontSize: fs(22), fontWeight: '700', marginLeft: 10 },
  wordRead: { color: C.primary, fontSize: fs(15), fontWeight: '800' },
  wordTr: { color: C.sub, fontSize: fs(13), marginTop: 2 },
  tip: { color: C.dim, fontSize: fs(12), textAlign: 'center', marginTop: 6 },
  emoji: { fontSize: fs(56), marginBottom: 4 },
  wordBig: { color: C.text, fontSize: fs(46), fontWeight: '800', textAlign: 'center', paddingHorizontal: 12 },
  wordReadBig: { color: C.primary, fontSize: fs(20), fontWeight: '800', marginTop: 6 },
  revealText: { color: C.dim, fontSize: fs(14), fontWeight: '700', marginTop: 8, textDecorationLine: 'underline' },
  pairRow: { flexDirection: 'row', columnGap: 12 },
  pairBox: { flex: 1, backgroundColor: C.card, borderRadius: R.xl, alignItems: 'center', paddingVertical: 20 },
  pairGlyph: { color: C.text, fontSize: fs(86), fontWeight: '700' },
  pairSound: { color: C.primary, fontSize: fs(18), fontWeight: '800' },
  pairWord: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  pairWordText: { color: C.text, fontSize: fs(18), fontWeight: '700', marginLeft: 6 },
  nav: { flexDirection: 'row', maxWidth: 640, width: '100%', alignSelf: 'center' },
  again: { color: C.gold, fontSize: fs(13), textAlign: 'center', marginTop: 8, fontWeight: '700' },
  exBox: { backgroundColor: C.card, borderRadius: R.md, padding: 14, marginTop: 12, borderLeftWidth: 4, borderLeftColor: C.primary },
  exLabel: { flex: 1, color: C.dim, fontSize: fs(11), fontWeight: '900', letterSpacing: 1.2, marginLeft: 6 },
  exT: { color: C.text, fontSize: fs(18), fontWeight: '700', marginTop: 6 },
  exTr: { color: C.sub, fontSize: fs(14), marginTop: 3 },
  bubble: { borderRadius: R.lg, padding: 12, marginBottom: 8, maxWidth: '88%' },
  bubbleL: { backgroundColor: C.card, alignSelf: 'flex-start', borderTopLeftRadius: 6 },
  bubbleR: { backgroundColor: C.cardHi, alignSelf: 'flex-end', borderTopRightRadius: 6 },
  who: { color: C.primary, fontSize: fs(11), fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
  bubbleT: { color: C.text, fontSize: fs(18), fontWeight: '700' },
  bubbleTr: { color: C.sub, fontSize: fs(13), marginTop: 3 },
  textBox: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
  tok: { color: C.text, fontSize: fs(19), lineHeight: fs(30), borderRadius: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  dialog: { backgroundColor: C.bg, borderRadius: R.lg, padding: 20, maxWidth: 440, width: '100%', alignSelf: 'center' },
}));

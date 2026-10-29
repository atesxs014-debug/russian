import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { QuizResult } from './QuizRunner';
import { speak } from '../audio/player';
import { Button } from '../ui';
import { C, R, fs, themed } from '../theme';

type Action = { title: string; onPress: () => void; disabled?: boolean };

export default function ResultView({
  result,
  passed,
  passText,
  failText,
  primary,
  secondary,
  streak,
}: {
  result: QuizResult;
  passed: boolean;
  passText: string;
  failText: string;
  primary: Action;
  secondary?: Action;
  /** Set when this session was the first of the day: shows a short celebration. */
  streak?: number;
}) {
  const insets = useSafeAreaInsets();
  const pct = Math.round(result.score * 100);
  const perfect = result.score === 1;
  const seen = new Set<string>();
  const mistakes = result.mistakes.filter((q) => (seen.has(q.itemId) ? false : (seen.add(q.itemId), true)));

  return (
    <View style={[st.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={{ alignItems: 'center', paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {streak ? (
          <View style={st.streak}>
            <Text style={{ fontSize: fs(22) }}>🔥</Text>
            <Text style={st.streakText}>Bugünkü çalışma tamam! Seri: {streak} gün</Text>
          </View>
        ) : null}
        <View style={[st.ring, { borderColor: perfect ? C.gold : passed ? C.good : C.bad }]}>
          {perfect ? <Ionicons name="star" size={26} color={C.gold} /> : null}
          <Text style={[st.pct, { color: perfect ? C.gold : passed ? C.good : C.bad }]}>%{pct}</Text>
          <Text style={st.pctSub}>
            {result.correct}/{result.total} ilk denemede
          </Text>
        </View>
        <View style={st.head}>
          <Ionicons name={passed ? 'trophy' : 'refresh-circle'} size={28} color={passed ? C.gold : C.bad} />
          <Text style={st.title}>{perfect ? 'Kusursuz!' : passed ? 'Geçtin!' : 'Henüz değil'}</Text>
        </View>
        <Text style={st.text}>{passed ? passText : failText}</Text>
        {perfect ? <Text style={[st.text, { color: C.gold, marginTop: 6 }]}>Altın yıldız + bonus XP kazandın ⭐</Text> : null}

        {mistakes.length > 0 && (
          <View style={{ alignSelf: 'stretch', marginTop: 22 }}>
            <Text style={st.section}>YANLIŞ YAPTIKLARIN</Text>
            {mistakes.map((q) => (
              <Pressable key={q.key} onPress={() => speak((q.audio ?? q.audioAfter ?? q.display)!)} style={({ pressed }) => [st.mistake, pressed && { backgroundColor: C.cardHi }]}>
                <Ionicons name="volume-medium" size={18} color={C.primary} />
                <Text style={st.mText} numberOfLines={2}>
                  {q.explain}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      <Button title={primary.title} kind={passed ? 'good' : 'primary'} onPress={primary.onPress} disabled={primary.disabled} />
      {secondary && <Button title={secondary.title} kind="ghost" onPress={secondary.onPress} disabled={secondary.disabled} style={{ marginTop: 10 }} />}
    </View>
  );
}

const st = themed(() => ({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  streak: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.goldBg, borderRadius: R.md, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 20 },
  streakText: { color: C.gold, fontWeight: '800', marginLeft: 8, fontSize: fs(15) },
  ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  pct: { fontSize: fs(48), fontWeight: '900' },
  pctSub: { color: C.sub, fontSize: fs(12), marginTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  title: { color: C.text, fontSize: fs(28), fontWeight: '900', marginLeft: 10 },
  text: { color: C.sub, fontSize: fs(16), lineHeight: fs(23), textAlign: 'center', marginTop: 12, paddingHorizontal: 8 },
  section: { color: C.dim, fontWeight: '900', fontSize: fs(12), letterSpacing: 1.5, marginBottom: 8 },
  mistake: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 8 },
  mText: { color: C.text, fontSize: fs(14), marginLeft: 10, flex: 1 },
}));

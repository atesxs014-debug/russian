import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { QuizResult } from './QuizRunner';
import { Button } from '../ui';
import { C, R } from '../theme';

type Action = { title: string; onPress: () => void };

export default function ResultView({
  result,
  passed,
  passText,
  failText,
  primary,
  secondary,
}: {
  result: QuizResult;
  passed: boolean;
  passText: string;
  failText: string;
  primary: Action;
  secondary?: Action;
}) {
  const insets = useSafeAreaInsets();
  const pct = Math.round(result.score * 100);
  return (
    <View style={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }]}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={[st.ring, { borderColor: passed ? C.good : C.bad }]}>
          <Text style={[st.pct, { color: passed ? C.good : C.bad }]}>%{pct}</Text>
          <Text style={st.pctSub}>
            {result.correct}/{result.total} ilk denemede
          </Text>
        </View>
        <View style={st.head}>
          <Ionicons name={passed ? 'trophy' : 'refresh-circle'} size={28} color={passed ? C.gold : C.bad} />
          <Text style={st.title}>{passed ? 'Geçtin!' : 'Henüz değil'}</Text>
        </View>
        <Text style={st.text}>{passed ? passText : failText}</Text>
      </View>
      <Button title={primary.title} kind={passed ? 'good' : 'primary'} onPress={primary.onPress} />
      {secondary && <Button title={secondary.title} kind="ghost" onPress={secondary.onPress} style={{ marginTop: 10 }} />}
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24 },
  ring: { width: 190, height: 190, borderRadius: 95, borderWidth: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  pct: { fontSize: 52, fontWeight: '900' },
  pctSub: { color: C.sub, fontSize: 13, marginTop: 2 },
  head: { flexDirection: 'row', alignItems: 'center', marginTop: 28 },
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginLeft: 10 },
  text: { color: C.sub, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 12, paddingHorizontal: 8, borderRadius: R.md },
});

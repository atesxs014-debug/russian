import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../Text';
import { useApp } from '../store';
import { findLesson } from '../course';
import { paySpeakDebt } from '../progress';
import SpeakPanel from '../components/SpeakPanel';
import { Button, IconBtn } from '../ui';
import { C, R, fs, themed } from '../theme';

/** Catch-up for words skipped with "Şu an konuşamam". */
export default function SpeakDebtScreen({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { progress, save, course } = useApp();
  const words = progress.speakDebt?.[lessonId] ?? [];
  const [i, setI] = useState(0);
  const [round, setRound] = useState(0);
  const lesson = findLesson(course, lessonId)?.lesson;
  const passedNow = !!progress.lessons[lessonId]?.passedAt;

  if (words.length === 0) {
    return (
      <View style={[st.wrap, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 16 }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark-circle" size={72} color={C.good} />
          <Text style={st.title}>Telafi tamam!</Text>
          <Text style={st.p}>{passedNow ? `${lesson?.title ?? 'Ders'} geçildi, sonraki ders açıldı.` : 'Tüm kelimeleri söyledin.'}</Text>
        </View>
        <Button title="Ana sayfa" kind="good" onPress={onClose} />
      </View>
    );
  }

  const target = words[i % words.length];
  return (
    <View style={[st.wrap, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={st.top}>
        <IconBtn icon="close" onPress={onClose} />
        <Text style={st.head}>Telaffuz telafisi · {words.length} kelime kaldı</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingVertical: 16, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Text style={st.p}>{lesson?.title}: sessiz ortamda olmadığın için atladığın kelimeler. Her birini 80+ puanla söyle.</Text>
        <SpeakPanel
          key={`${target}-${round}`}
          target={target}
          allowSkip={false}
          onDone={(outcome) => {
            if (outcome === 'pass') {
              save(paySpeakDebt(course, progress, lessonId, target));
              setI(0);
            } else {
              setI((x) => x + 1); // try the next one, this one comes back
            }
            setRound((r) => r + 1);
          }}
        />
      </ScrollView>
    </View>
  );
}

const st = themed(() => ({
  wrap: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  head: { color: C.text, fontWeight: '800', fontSize: fs(16), flex: 1 },
  title: { color: C.text, fontSize: fs(26), fontWeight: '800', marginTop: 12 },
  p: { color: C.sub, fontSize: fs(15), lineHeight: fs(22), textAlign: 'center', marginTop: 8, borderRadius: R.md },
}));

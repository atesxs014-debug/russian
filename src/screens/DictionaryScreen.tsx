import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput } from '../Text';
import { useApp } from '../store';
import { Word, langMeta, plain, wordItemId } from '../course';
import { addToReview } from '../progress';
import { norm } from '../i18n';
import { speak } from '../audio/player';
import CONJ from '../data/conj.json';
import { IconBtn, Segmented } from '../ui';
import { C, R, fs, themed } from '../theme';

type Verb = { inf: string; tr: string; forms: string[]; past: string };
type ConjPack = { persons: string[]; pastLabel: string; verbs: Verb[] };

/** "je" + "ai" → "j'ai"; otherwise "person form" (same rule as the audio script). */
export function conjPhrase(lang: string, person: string, form: string): string {
  const p = person.split(' / ')[0].replace("'", '');
  if (lang === 'fr' && p === 'je' && /^[aeiouéèêh]/i.test(form)) return `j'${form}`;
  return `${p} ${form}`;
}

/** Searchable dictionary of every word in the course, plus verb conjugation tables. */
export default function DictionaryScreen({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { course, progress, save, settings } = useApp();
  const [tab, setTab] = useState<'words' | 'verbs'>('words');
  const [q, setQ] = useState('');
  const [verb, setVerb] = useState<Verb | null>(null);
  const meta = langMeta(settings.lang);
  const conj = (CONJ as Record<string, ConjPack>)[settings.lang];

  const all = useMemo(() => Object.values(course.words).sort((a, b) => plain(a.t).localeCompare(plain(b.t), meta.locale)), [course]);
  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return all;
    return all.filter((w) => norm(w.t).includes(n) || norm(w.tr).includes(n));
  }, [q, all]);

  const inReview = (w: Word) => !!progress.items[wordItemId(w)];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[st.top, { paddingTop: insets.top + 8, paddingLeft: insets.left + 14, paddingRight: insets.right + 14 }]}>
        <IconBtn icon="arrow-back" onPress={verb ? () => setVerb(null) : onClose} />
        <Text style={st.title}>
          {meta.flag} {verb ? verb.inf : 'Sözlük'}
        </Text>
      </View>
      {verb && conj ? (
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 30, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Text style={st.p}>{verb.tr}</Text>
          <View style={[st.card, { marginTop: 14 }]}>
            {conj.persons.map((p, i) => (
              <Pressable key={p} onPress={() => speak(conjPhrase(settings.lang, p, verb.forms[i]))} style={({ pressed }) => [st.row, pressed && { backgroundColor: C.cardHi }]}>
                <Text style={st.person}>{p}</Text>
                <Text style={st.form}>{verb.forms[i]}</Text>
                <Ionicons name="volume-medium" size={18} color={C.primary} />
              </Pressable>
            ))}
          </View>
          <Text style={st.section}>{conj.pastLabel.toUpperCase()}</Text>
          <View style={st.card}>
            <Text style={st.form}>{verb.past}</Text>
          </View>
          <Text style={st.note}>Bir satıra dokun: sesli dinle.</Text>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
          <Segmented
            options={[
              { value: 'words', label: `Kelimeler (${all.length})` },
              { value: 'verbs', label: 'Fiil çekimleri' },
            ]}
            value={tab}
            onChange={(v) => setTab(v as 'words' | 'verbs')}
          />
          {tab === 'words' ? (
            <>
              <TextInput value={q} onChangeText={setQ} placeholder={`${meta.name} ya da Türkçe ara`} placeholderTextColor={C.dim} style={st.input} autoCorrect={false} autoCapitalize="none" />
              <FlatList
                data={list}
                keyExtractor={(w) => wordItemId(w)}
                initialNumToRender={30}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
                ListEmptyComponent={<Text style={[st.note, { textAlign: 'center', marginTop: 20 }]}>Bulunamadı. Derslerde ilerledikçe yeni kelimeler eklenir.</Text>}
                renderItem={({ item: w }) => {
                  const on = inReview(w);
                  return (
                    <Pressable onPress={() => speak(w.t)} onLongPress={() => speak(w.t, true)} style={({ pressed }) => [st.word, pressed && { backgroundColor: C.cardHi }]}>
                      {w.e ? <Text style={{ fontSize: fs(22), marginRight: 8 }}>{w.e}</Text> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={st.wordT}>{w.t}</Text>
                        <Text style={st.wordTr}>
                          {w.tr}
                          {w.read ? ` · ${w.read}` : ''}
                        </Text>
                      </View>
                      <Pressable hitSlop={10} disabled={on} onPress={() => save(addToReview(progress, wordItemId(w)))} style={[st.add, on && { backgroundColor: C.goodBg }]}>
                        <Ionicons name={on ? 'checkmark' : 'add'} size={18} color={on ? C.good : C.primary} />
                      </Pressable>
                    </Pressable>
                  );
                }}
              />
            </>
          ) : conj ? (
            <ScrollView contentContainerStyle={{ paddingTop: 12, paddingBottom: insets.bottom + 24 }}>
              {conj.verbs.map((v) => (
                <Pressable key={v.inf} onPress={() => setVerb(v)} style={({ pressed }) => [st.word, pressed && { backgroundColor: C.cardHi }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.wordT}>{v.inf}</Text>
                    <Text style={st.wordTr}>{v.tr}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.sub} />
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
    </View>
  );
}

const st = themed(() => ({
  top: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
  title: { color: C.text, fontSize: fs(22), fontWeight: '900', marginLeft: 8 },
  input: { backgroundColor: C.card, borderRadius: R.md, color: C.text, fontSize: fs(17), paddingHorizontal: 14, height: 50, borderWidth: 1, borderColor: C.line, marginVertical: 12 },
  word: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: R.md, padding: 12, marginBottom: 8 },
  wordT: { color: C.text, fontSize: fs(18), fontWeight: '800' },
  wordTr: { color: C.sub, fontSize: fs(13), marginTop: 2 },
  add: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg2, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: R.sm },
  person: { color: C.dim, fontSize: fs(14), fontWeight: '700', width: 110 },
  form: { flex: 1, color: C.text, fontSize: fs(19), fontWeight: '800' },
  section: { color: C.dim, fontWeight: '900', fontSize: fs(12), letterSpacing: 1.5, marginTop: 18, marginBottom: 8 },
  p: { color: C.sub, fontSize: fs(16) },
  note: { color: C.dim, fontSize: fs(12), marginTop: 10 },
}));

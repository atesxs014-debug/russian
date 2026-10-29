import React, { useEffect, useMemo, useState } from 'react';
import { UNITS } from '../course';
import { questionsFor, unitQuiz } from '../quiz';
import { applyReview, applyTest, bumpStreak, dueItems, PASS } from '../progress';
import { useApp } from '../store';
import QuizRunner, { QuizResult } from '../components/QuizRunner';
import ResultView from '../components/ResultView';

/** Daily review (mode="review") or a unit's final test (mode="test"). */
export default function PracticeScreen({ mode, unitId, onClose }: { mode: 'review' | 'test'; unitId?: string; onClose: () => void }) {
  const { progress, save } = useApp();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const unit = UNITS.find((u) => u.id === unitId);

  const questions = useMemo(() => {
    if (mode === 'test' && unit) return unitQuiz(unit);
    return questionsFor(dueItems(progress));
    // build once per round; progress changes while answering must not rebuild the quiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (questions.length === 0) onClose();
  }, [questions]);

  if (result) {
    if (mode === 'review') {
      const perfect = result.score === 1;
      return (
        <ResultView
          result={result}
          passed
          passText={perfect ? 'Tüm tekrarlar doğru. Yeni derslere devam edebilirsin!' : 'Tekrar bitti. Yanlış yaptıkların yarın yeniden sorulacak, doğruların aralığı uzadı.'}
          failText=""
          primary={{ title: 'Ana sayfa', onPress: onClose }}
        />
      );
    }
    const passed = result.score >= PASS;
    return (
      <ResultView
        result={result}
        passed={passed}
        passText="Üniteyi tamamladın! Sıradaki ünite açıldı."
        failText="Sınavı geçmek için %90 lazım. Yanlış yaptığın öğeler tekrar listene eklendi; tekrar edip yeniden dene."
        primary={passed ? { title: 'Ana sayfa', onPress: onClose } : { title: 'Tekrar dene', onPress: () => { setResult(null); setRound((r) => r + 1); } }}
        secondary={passed ? undefined : { title: 'Ana sayfa', onPress: onClose }}
      />
    );
  }

  if (questions.length === 0) return null;

  return (
    <QuizRunner
      key={round}
      title={mode === 'review' ? 'Günlük tekrar' : `${unit?.title} · ünite sınavı`}
      questions={questions}
      onClose={onClose}
      onFinish={(r) => {
        const next = mode === 'review' ? applyReview(progress, r.firstTry) : applyTest(progress, unitId!, r.score, r.firstTry);
        save(bumpStreak(next));
        setResult(r);
      }}
    />
  );
}

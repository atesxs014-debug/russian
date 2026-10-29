import React, { useEffect, useMemo, useState } from 'react';
import { questionsFor, unitQuiz } from '../quiz';
import { PASS, RETRY_MINUTES, applyReview, applyTest, bumpStreak, dueItems, weakItems } from '../progress';
import { useApp } from '../store';
import QuizRunner, { QuizResult } from '../components/QuizRunner';
import ResultView from '../components/ResultView';

/** Daily review, weak-points drill, or a unit's final test. */
export default function PracticeScreen({ mode, unitId, onClose }: { mode: 'review' | 'test' | 'weak'; unitId?: string; onClose: () => void }) {
  const { progress, save, course, settings } = useApp();
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [streakToday, setStreakToday] = useState<number | undefined>();
  const unit = course.units.find((u) => u.id === unitId);

  const questions = useMemo(() => {
    if (mode === 'test' && unit) return unitQuiz(course, unit);
    if (mode === 'weak') return questionsFor(course, weakItems(progress));
    return questionsFor(course, dueItems(progress));
    // build once per round; progress changes while answering must not rebuild the quiz
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  useEffect(() => {
    if (questions.length === 0) onClose();
  }, [questions]);

  if (result) {
    if (mode !== 'test') {
      return (
        <ResultView
          result={result}
          passed
          streak={streakToday}
          passText={
            mode === 'weak'
              ? 'Zayıf noktalarını çalıştın. Doğru bildiklerin güçlendi.'
              : result.score === 1
                ? 'Tüm tekrarlar doğru. Yeni derslere devam edebilirsin!'
                : 'Tekrar bitti. Yanlış yaptıkların yarın yeniden sorulacak, doğruların aralığı uzadı.'
          }
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
        streak={streakToday}
        passText="Üniteyi tamamladın! Sıradaki ünite açıldı."
        failText={`Sınavı geçmek için %90 lazım. ${RETRY_MINUTES} dakika sonra tekrar girebilirsin; bu sürede aşağıdaki yanlışlarını çalış.`}
        primary={{ title: 'Ana sayfa', onPress: onClose }}
      />
    );
  }

  if (questions.length === 0) return null;

  return (
    <QuizRunner
      key={round}
      lang={settings.lang}
      maxPlays={mode === 'test' ? 2 : undefined}
      title={mode === 'review' ? 'Günlük tekrar' : mode === 'weak' ? 'Zayıf noktalar' : `${unit?.title} · ünite sınavı`}
      questions={questions}
      onClose={onClose}
      onFinish={(r) => {
        const next =
          mode === 'test' ? applyTest(progress, unitId!, r.score, r.firstTry) : mode === 'review' ? applyReview(progress, r.firstTry) : applyReview(progress, Object.fromEntries(Object.entries(r.firstTry).filter(([, ok]) => ok)));
        const b = bumpStreak(next);
        save(b.progress);
        setStreakToday(b.firstToday ? b.progress.streak.count : undefined);
        setResult(r);
      }}
    />
  );
}

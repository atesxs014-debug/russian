import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { AUDIO } from './audioMap';
import { LangCode, langMeta, plain } from '../course';

let current: AudioPlayer | null = null;
let lang: LangCode = 'ru';
let rate = 1;
let sfxOn = true;
let hapticsOn = true;

const SFX = {
  good: require('../../assets/sfx/good.wav'),
  bad: require('../../assets/sfx/bad.wav'),
};

export async function initAudio() {
  try {
    // Pronunciation audio plays even when the phone is on silent.
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {}
}

export function configureAudio(opts: { lang?: LangCode; rate?: number; sfx?: boolean; haptics?: boolean }) {
  if (opts.lang) lang = opts.lang;
  if (opts.rate) rate = opts.rate;
  if (opts.sfx !== undefined) sfxOn = opts.sfx;
  if (opts.haptics !== undefined) hapticsOn = opts.haptics;
}

export function stopAudio() {
  try {
    Speech.stop();
  } catch {}
  if (current) {
    try {
      current.pause();
      current.remove();
    } catch {}
    current = null;
  }
}

function play(src: number, playbackRate = 1): AudioPlayer | null {
  try {
    const p = createAudioPlayer(src);
    let started = false;
    const start = () => {
      try {
        // pitch correction keeps slowed-down speech natural (no separate slow recordings needed)
        if (playbackRate !== 1) p.setPlaybackRate(playbackRate, 'high');
      } catch {}
      p.play();
    };
    const sub = p.addListener('playbackStatusUpdate', (st) => {
      if (!started && st.isLoaded) {
        started = true;
        start();
      }
      if (st.didJustFinish) {
        sub.remove();
        if (current === p) current = null;
        try {
          p.remove();
        } catch {}
      }
    });
    start();
    return p;
  } catch {
    return null;
  }
}

/**
 * Plays the bundled native-speaker recording at the user's speed (0.5x–1.5x);
 * `slow` forces the 🐢 speed. `voice` 1 = the male voice (dialogues). Falls back to on-device TTS.
 */
export function speak(text: string, slow = false, voice: 0 | 1 = 0) {
  stopAudio();
  const k = plain(text).toLowerCase();
  const entry = (voice === 1 ? AUDIO[`${lang}#m:${k}`] : undefined) ?? AUDIO[`${lang}:${k}`];
  const r = slow ? 0.65 : rate;
  if (entry) {
    const p = play(entry, Math.max(0.5, r));
    if (p) {
      current = p;
      return;
    }
  }
  Speech.speak(plain(text), { language: langMeta(lang).locale, rate: Math.max(0.3, r * 0.9), pitch: voice === 1 ? 0.8 : 1 });
}

export function feedback(ok: boolean) {
  if (hapticsOn)
    Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error).catch(() => {});
  if (sfxOn) {
    const p = play(ok ? SFX.good : SFX.bad);
    if (p) setTimeout(() => {
      try {
        p.remove();
      } catch {}
    }, 1500);
  }
}

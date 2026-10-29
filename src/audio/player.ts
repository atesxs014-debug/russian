import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { AUDIO } from './audioMap';
import { plain } from '../course';

let current: AudioPlayer | null = null;

export async function initAudio() {
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // non-fatal
  }
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

export const audioKey = (text: string) => plain(text).toLowerCase();

/** Plays the bundled native-speaker recording; falls back to on-device Russian TTS. */
export function speak(text: string, slow = false) {
  stopAudio();
  const key = audioKey(text);
  const entry = AUDIO[key];
  if (entry) {
    try {
      const p = createAudioPlayer(slow ? entry.s : entry.n);
      current = p;
      let started = false;
      const sub = p.addListener('playbackStatusUpdate', (st) => {
        if (!started && st.isLoaded) {
          started = true;
          p.play();
        }
        if (st.didJustFinish) {
          sub.remove();
          if (current === p) current = null;
          try {
            p.remove();
          } catch {}
        }
      });
      p.play();
      return;
    } catch {
      // fall through to TTS
    }
  }
  Speech.speak(key, { language: 'ru-RU', rate: slow ? 0.55 : 0.9 });
}

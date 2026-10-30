import AudioRecord from '@fugood/react-native-audio-pcm-stream';
import { AudioModule, createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { initWhisper, WhisperContext } from 'whisper.rn';

const SAMPLE_RATE = 16000;

// ---------------- Whisper model (bundled, loaded once) ----------------
let ctx: WhisperContext | null = null;
let loading: Promise<WhisperContext> | null = null;

export function loadWhisper(): Promise<WhisperContext> {
  if (ctx) return Promise.resolve(ctx);
  if (!loading) {
    loading = initWhisper({ filePath: require('../../assets/models/ggml-base.bin') })
      .then((c) => {
        ctx = c;
        return c;
      })
      .catch((e) => {
        loading = null;
        throw e;
      });
  }
  return loading;
}

export const whisperReady = () => !!ctx;

// ---------------- recording (raw 16 kHz mono PCM) ----------------
let chunks: string[] = [];
let sub: { remove(): void } | null = null;
let recording = false;

export async function micPermission(): Promise<boolean> {
  try {
    const r = await AudioModule.requestRecordingPermissionsAsync();
    return r.granted;
  } catch {
    return false;
  }
}

// ---- voice activity detection: stop automatically when the speaker goes quiet ----
const SILENCE_MS = 1000; // konuşma bittikten sonra bu kadar sessizlik → dur
const MAX_MS = 8000; // en uzun kayıt
const NO_SPEECH_MS = 5000; // hiç konuşma yoksa dur
let vadTimer: ReturnType<typeof setInterval> | null = null;

function chunkRms(b64: string): number {
  const bytes = b64ToBytes(b64);
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const n = Math.floor(bytes.length / 2);
  if (!n) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const x = v.getInt16(i * 2, true);
    sum += x * x;
  }
  return Math.sqrt(sum / n);
}

export type AutoStopReason = 'silence' | 'max' | 'nospeech';

/**
 * Starts recording. `onAutoStop` fires once when the learner stops talking
 * (or nothing was said / the max length was reached); then call stopRecording().
 */
export async function startRecording(onAutoStop?: (why: AutoStopReason) => void, onLevel?: (level: number) => void) {
  if (recording) return;
  await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }).catch(() => {});
  chunks = [];
  const started = Date.now();
  let noise = 0;
  let noiseN = 0;
  let speaking = false;
  let lastVoice = 0;
  let fired = false;
  const fire = (why: AutoStopReason) => {
    if (fired) return;
    fired = true;
    onAutoStop?.(why);
  };
  AudioRecord.init({ sampleRate: SAMPLE_RATE, channels: 1, bitsPerSample: 16, audioSource: 6, bufferSize: 2048 });
  sub?.remove();
  sub = AudioRecord.on('data', (d) => {
    chunks.push(d);
    const rms = chunkRms(d);
    const now = Date.now();
    // first ~250 ms: learn the room's noise level
    if (now - started < 250) {
      noise = (noise * noiseN + rms) / ++noiseN;
      return;
    }
    const threshold = Math.max(700, noise * 2.8);
    onLevel?.(Math.min(1, rms / (threshold * 3)));
    if (rms > threshold) {
      speaking = true;
      lastVoice = now;
    } else if (speaking && now - lastVoice > SILENCE_MS) fire('silence');
  });
  AudioRecord.start();
  recording = true;
  vadTimer && clearInterval(vadTimer);
  vadTimer = setInterval(() => {
    const t = Date.now() - started;
    if (t > MAX_MS) fire('max');
    else if (!speaking && t > NO_SPEECH_MS) fire('nospeech');
  }, 200);
}

/** Stops recording and returns the raw PCM (16-bit little-endian mono). */
export async function stopRecording(): Promise<Uint8Array> {
  if (vadTimer) {
    clearInterval(vadTimer);
    vadTimer = null;
  }
  if (!recording) return new Uint8Array(0);
  recording = false;
  AudioRecord.stop();
  // let the last buffer arrive
  await new Promise((r) => setTimeout(r, 120));
  sub?.remove();
  sub = null;
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
  const parts = chunks.map(b64ToBytes);
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  parts.forEach((p) => {
    out.set(p, o);
    o += p.length;
  });
  return out;
}

// ---------------- analysis helpers ----------------
export type Level = { durationSec: number; peak: number; noiseFloor: number };

export function levels(pcm: Uint8Array): Level {
  const view = new DataView(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const n = Math.floor(pcm.length / 2);
  const frame = 320; // 20 ms
  const rms: number[] = [];
  let peak = 0;
  for (let i = 0; i + frame <= n; i += frame) {
    let sum = 0;
    for (let j = 0; j < frame; j++) {
      const v = view.getInt16((i + j) * 2, true);
      sum += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }
    rms.push(Math.sqrt(sum / frame));
  }
  rms.sort((a, b) => a - b);
  return { durationSec: n / SAMPLE_RATE, peak, noiseFloor: rms.length ? rms[Math.floor(rms.length * 0.1)] : 0 };
}

export async function transcribe(pcm: Uint8Array, language: string): Promise<string> {
  const c = await loadWhisper();
  const { promise } = c.transcribeData(bytesToB64(pcm), { language, maxLen: 0, temperature: 0, beamSize: 3 });
  const r = await promise;
  return (r.result ?? '').trim();
}

// ---------------- playback of your own voice ----------------
let player: AudioPlayer | null = null;
const recFile = () => new File(Paths.cache, 'voxa-son-kayit.wav');

/** Keeps only the latest recording (overwritten each time, deleted on cleanup). */
export function saveForPlayback(pcm: Uint8Array) {
  try {
    const f = recFile();
    if (f.exists) f.delete();
    f.create();
    f.write(wav(pcm));
  } catch {}
}

export function playMine() {
  try {
    player?.remove();
    const f = recFile();
    if (!f.exists) return;
    player = createAudioPlayer({ uri: f.uri });
    player.play();
  } catch {}
}

export function cleanupRecording() {
  try {
    player?.remove();
    player = null;
    const f = recFile();
    if (f.exists) f.delete();
  } catch {}
}

function wav(pcm: Uint8Array): Uint8Array {
  const h = new ArrayBuffer(44);
  const v = new DataView(h);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + pcm.length, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, SAMPLE_RATE, true);
  v.setUint32(28, SAMPLE_RATE * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length);
  out.set(new Uint8Array(h), 0);
  out.set(pcm, 44);
  return out;
}

// ---------------- base64 ----------------
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  let s = '';
  const step = 0x2000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode(...bytes.subarray(i, i + step));
  return btoa(s);
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './cloudConfig';

/**
 * Supabase cloud backup over plain REST (no extra native packages):
 *  - e-mail + password sign-in (GoTrue: /auth/v1)
 *  - one row per user in public.backups (PostgREST: /rest/v1), protected by RLS
 * The table + policies are in supabase/schema.sql.
 */
export type Session = { access_token: string; refresh_token: string; expires_at: number; user: { id: string; email?: string } };

const SESSION_KEY = 'voxa.cloud.session';
export const cloudConfigured = () => !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

const headers = (token?: string) => ({
  apikey: SUPABASE_ANON_KEY,
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token ?? SUPABASE_ANON_KEY}`,
});

async function call<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}${path}`, { ...init, headers: { ...headers(token), ...(init.headers as Record<string, string>) } });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = body?.msg ?? body?.error_description ?? body?.message ?? body?.error ?? `HTTP ${res.status}`;
    throw new Error(translate(String(msg)));
  }
  return body as T;
}

function translate(m: string): string {
  if (/invalid login/i.test(m)) return 'E-posta ya da şifre yanlış.';
  if (/email not confirmed/i.test(m)) return 'E-postana gelen onay bağlantısına tıkla, sonra tekrar giriş yap.';
  if (/already registered|already exists/i.test(m)) return 'Bu e-posta zaten kayıtlı. Giriş yap.';
  if (/password should be at least/i.test(m)) return 'Şifre en az 6 karakter olmalı.';
  if (/network request failed/i.test(m)) return 'İnternet bağlantısı yok.';
  return m;
}

function toSession(b: { access_token: string; refresh_token: string; expires_in: number; user: Session['user'] }): Session {
  return { access_token: b.access_token, refresh_token: b.refresh_token, expires_at: Date.now() + (b.expires_in - 60) * 1000, user: b.user };
}

export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function saveSession(s: Session | null) {
  if (s) await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
  else await AsyncStorage.removeItem(SESSION_KEY);
}

/** Signs in; if the account doesn't exist yet it is created first. */
export async function signIn(email: string, password: string): Promise<Session> {
  const e = email.trim().toLowerCase();
  try {
    const b = await call<any>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: e, password }) });
    const s = toSession(b);
    await saveSession(s);
    return s;
  } catch (err) {
    if (!/yanlış/.test((err as Error).message)) throw err;
    // maybe a new account
    const b = await call<any>('/auth/v1/signup', { method: 'POST', body: JSON.stringify({ email: e, password }) });
    if (!b?.access_token) throw new Error('Hesap oluşturuldu. E-postana gelen onay bağlantısına tıkla, sonra tekrar giriş yap. (Şifren yanlışsa düzelt.)');
    const s = toSession(b);
    await saveSession(s);
    return s;
  }
}

export async function signOut() {
  const s = await loadSession();
  if (s) call('/auth/v1/logout', { method: 'POST' }, s.access_token).catch(() => {});
  await saveSession(null);
}

async function fresh(): Promise<Session> {
  const s = await loadSession();
  if (!s) throw new Error('Giriş yapılmadı.');
  if (Date.now() < s.expires_at) return s;
  const b = await call<any>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: s.refresh_token }) });
  const n = toSession(b);
  await saveSession(n);
  return n;
}

/** Uploads the full backup (all languages + profile). */
export async function pushBackup(json: string): Promise<string> {
  const s = await fresh();
  const now = new Date().toISOString();
  await call(
    '/rest/v1/backups?on_conflict=user_id',
    { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: s.user.id, data: JSON.parse(json), updated_at: now }) },
    s.access_token,
  );
  await AsyncStorage.setItem('voxa.cloud.last', now);
  return now;
}

/** Latest cloud backup as JSON text, or null when there is none. */
export async function pullBackup(): Promise<{ json: string; updatedAt: string } | null> {
  const s = await fresh();
  const rows = await call<{ data: unknown; updated_at: string }[]>(`/rest/v1/backups?select=data,updated_at&user_id=eq.${s.user.id}`, { method: 'GET' }, s.access_token);
  if (!rows?.length) return null;
  return { json: JSON.stringify(rows[0].data), updatedAt: rows[0].updated_at };
}

export async function lastPush(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('voxa.cloud.last');
  } catch {
    return null;
  }
}

// ---------- automatic backup (debounced) ----------
let timer: ReturnType<typeof setTimeout> | null = null;
/** Called after progress changes; uploads at most every 20 s while signed in. */
export function scheduleAutoBackup(getJson: () => Promise<string>) {
  if (!cloudConfigured()) return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      if (!(await loadSession())) return;
      const j = await getJson();
      if (j) await pushBackup(j);
    } catch {
      // offline: next change retries
    }
  }, 20000);
}

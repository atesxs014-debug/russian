import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Course, LangCode, getCourse } from './course';
import { Progress, emptyProgress } from './progress';

export type Avatar = { kind: 'initial' | 'emoji' | 'photo'; value?: string; color: string };

export type Settings = {
  lang: LangCode;
  started: LangCode[];
  rate: number; // 0.5 – 1.5
  fontScale: number; // 0.9 / 1 / 1.15 / 1.3
  sfx: boolean;
  haptics: boolean;
  accent: string;
  frame: string;
  grammarMode: 'embedded' | 'separate';
  reminder: { on: boolean; hour: number; minute: number };
  quiet: { on: boolean; from: number; to: number };
  weekly: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  lang: 'ru',
  started: ['ru'],
  rate: 1,
  fontScale: 1,
  sfx: true,
  haptics: true,
  accent: 'blue',
  frame: 'none',
  grammarMode: 'embedded',
  reminder: { on: true, hour: 20, minute: 0 },
  quiet: { on: true, from: 23, to: 8 },
  weekly: true,
};

export type Profile = { id: string; name: string; createdAt: string; avatar: Avatar; settings: Settings; xpTotal: number };
type ProfilesDoc = { list: Profile[]; activeId?: string };

const PROFILES_KEY = 'voxa.profiles.v1';
const progressKey = (id: string, lang: LangCode) => `voxa.progress.v1.${id}.${lang}`;

export const AVATAR_COLORS = ['#6A48E8', '#13915F', '#D9582A', '#2F6FD6', '#B9760A', '#D6336C'];

type Ctx = {
  ready: boolean;
  profiles: Profile[];
  profile: Profile | null;
  settings: Settings;
  course: Course;
  progress: Progress;
  createProfile: (name: string, avatar: Avatar) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  updateProfile: (patch: Partial<Pick<Profile, 'name' | 'avatar'>>) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  setLang: (lang: LangCode) => Promise<void>;
  save: (p: Progress) => void;
  resetProgress: () => void;
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<boolean>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppProvider missing');
  return c;
}

function normalize(p: Partial<Profile>): Profile {
  return {
    id: p.id!,
    name: p.name ?? '',
    createdAt: p.createdAt ?? new Date().toISOString(),
    avatar: p.avatar ?? { kind: 'initial', color: AVATAR_COLORS[0] },
    settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) },
    xpTotal: p.xpTotal ?? 0,
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<ProfilesDoc>({ list: [] });
  const [progress, setProgress] = useState<Progress>(emptyProgress());
  const docRef = useRef(doc);
  docRef.current = doc;
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const profile = useMemo(() => doc.list.find((p) => p.id === doc.activeId) ?? null, [doc]);
  const settings = profile?.settings ?? DEFAULT_SETTINGS;
  const course = useMemo(() => getCourse(settings.lang), [settings.lang]);

  const persistDoc = useCallback(async (d: ProfilesDoc) => {
    setDoc(d);
    docRef.current = d;
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(d));
  }, []);

  const loadProgress = useCallback(async (id: string | undefined, lang: LangCode) => {
    if (!id) return setProgress(emptyProgress());
    const raw = await AsyncStorage.getItem(progressKey(id, lang));
    setProgress(raw ? { ...emptyProgress(), ...JSON.parse(raw) } : emptyProgress());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILES_KEY);
        const d: ProfilesDoc = raw ? JSON.parse(raw) : { list: [] };
        d.list = d.list.map(normalize);
        setDoc(d);
        const active = d.list.find((p) => p.id === d.activeId);
        await loadProgress(d.activeId, active?.settings.lang ?? 'ru');
      } catch {}
      setReady(true);
    })();
  }, [loadProgress]);

  const patchActive = useCallback(
    async (fn: (p: Profile) => Profile) => {
      const d = docRef.current;
      await persistDoc({ ...d, list: d.list.map((p) => (p.id === d.activeId ? fn(p) : p)) });
    },
    [persistDoc],
  );

  const save = useCallback(
    (p: Progress) => {
      const d = docRef.current;
      const active = d.list.find((x) => x.id === d.activeId);
      if (!active) return;
      const gained = p.xp - progressRef.current.xp;
      progressRef.current = p;
      setProgress(p);
      if (gained > 0) patchActive((x) => ({ ...x, xpTotal: x.xpTotal + gained }));
      AsyncStorage.setItem(progressKey(active.id, active.settings.lang), JSON.stringify(p)).catch(() => {});
    },
    [patchActive],
  );

  const createProfile = useCallback(
    async (name: string, avatar: Avatar) => {
      const p = normalize({ id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), avatar });
      await persistDoc({ list: [...docRef.current.list, p], activeId: p.id });
      await loadProgress(p.id, p.settings.lang);
    },
    [persistDoc, loadProgress],
  );

  const selectProfile = useCallback(
    async (id: string | null) => {
      const d = docRef.current;
      await persistDoc({ ...d, activeId: id ?? undefined });
      const p = d.list.find((x) => x.id === id);
      await loadProgress(id ?? undefined, p?.settings.lang ?? 'ru');
    },
    [persistDoc, loadProgress],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<Profile, 'name' | 'avatar'>>) => patchActive((p) => ({ ...p, ...patch })),
    [patchActive],
  );

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => patchActive((p) => ({ ...p, settings: { ...p.settings, ...patch } })),
    [patchActive],
  );

  const setLang = useCallback(
    async (lang: LangCode) => {
      const d = docRef.current;
      const active = d.list.find((x) => x.id === d.activeId);
      if (!active) return;
      const started = active.settings.started.includes(lang) ? active.settings.started : [...active.settings.started, lang];
      await patchActive((p) => ({ ...p, settings: { ...p.settings, lang, started } }));
      await loadProgress(active.id, lang);
    },
    [patchActive, loadProgress],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      const d = docRef.current;
      const p = d.list.find((x) => x.id === id);
      await Promise.all((p?.settings.started ?? []).map((l) => AsyncStorage.removeItem(progressKey(id, l))));
      const activeId = d.activeId === id ? undefined : d.activeId;
      await persistDoc({ list: d.list.filter((x) => x.id !== id), activeId });
      if (!activeId) setProgress(emptyProgress());
    },
    [persistDoc],
  );

  const resetProgress = useCallback(() => {
    const d = docRef.current;
    const active = d.list.find((x) => x.id === d.activeId);
    if (!active) return;
    const e = emptyProgress();
    setProgress(e);
    AsyncStorage.setItem(progressKey(active.id, active.settings.lang), JSON.stringify(e)).catch(() => {});
  }, []);

  /** One backup with the profile (avatar, settings) and EVERY language's progress. */
  const exportBackup = useCallback(async () => {
    const d = docRef.current;
    const active = d.list.find((x) => x.id === d.activeId);
    if (!active) return '';
    const all: Record<string, Progress> = {};
    for (const l of active.settings.started) {
      if (l === active.settings.lang) all[l] = progressRef.current;
      else {
        const raw = await AsyncStorage.getItem(progressKey(active.id, l));
        if (raw) all[l] = JSON.parse(raw);
      }
    }
    return JSON.stringify({ app: 'voxa', v: 2, exportedAt: new Date().toISOString(), profile: { name: active.name, avatar: active.avatar, settings: active.settings, xpTotal: active.xpTotal }, progress: all });
  }, []);

  const importBackup = useCallback(
    async (json: string) => {
      try {
        const data = JSON.parse(json.trim());
        if (!['voxa', 'russian'].includes(data?.app)) return false;
        const d = docRef.current;
        const active = d.list.find((x) => x.id === d.activeId);
        if (!active) return false;
        if (data.v === 2 && data.progress && typeof data.progress === 'object') {
          const langs = Object.keys(data.progress) as LangCode[];
          for (const l of langs) await AsyncStorage.setItem(progressKey(active.id, l), JSON.stringify({ ...emptyProgress(), ...data.progress[l] }));
          const prof = data.profile ?? {};
          const settings = { ...active.settings, ...(prof.settings ?? {}) };
          settings.started = [...new Set([...(settings.started ?? []), ...langs])];
          await persistDoc({ ...d, list: d.list.map((x) => (x.id === active.id ? { ...x, avatar: prof.avatar ?? x.avatar, xpTotal: Math.max(x.xpTotal, prof.xpTotal ?? 0), settings } : x)) });
          await loadProgress(active.id, settings.lang);
          return true;
        }
        // eski tek dilli yedek
        if (!data.progress?.lessons) return false;
        if (data.lang && data.lang !== active.settings.lang) await setLang(data.lang);
        save({ ...emptyProgress(), ...data.progress });
        return true;
      } catch {
        return false;
      }
    },
    [persistDoc, loadProgress, save, setLang],
  );

  const value: Ctx = {
    ready,
    profiles: doc.list,
    profile,
    settings,
    course,
    progress,
    createProfile,
    selectProfile,
    updateProfile,
    updateSettings,
    deleteProfile,
    setLang,
    save,
    resetProgress,
    exportBackup,
    importBackup,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

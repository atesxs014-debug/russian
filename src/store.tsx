import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Progress, emptyProgress } from './progress';

export type Profile = { id: string; name: string; createdAt: string };
type ProfilesDoc = { list: Profile[]; activeId?: string };

const PROFILES_KEY = 'ru.profiles.v1';
const progressKey = (id: string) => `ru.progress.v1.${id}`;

type Ctx = {
  ready: boolean;
  profiles: Profile[];
  profile: Profile | null;
  progress: Progress;
  createProfile: (name: string) => Promise<void>;
  selectProfile: (id: string | null) => Promise<void>;
  renameProfile: (id: string, name: string) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  save: (p: Progress) => void;
  exportBackup: () => string;
  importBackup: (json: string) => Promise<boolean>;
};

const AppCtx = createContext<Ctx | null>(null);

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error('AppProvider missing');
  return c;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [doc, setDoc] = useState<ProfilesDoc>({ list: [] });
  const [progress, setProgress] = useState<Progress>(emptyProgress());

  const profile = useMemo(() => doc.list.find((p) => p.id === doc.activeId) ?? null, [doc]);

  const persistDoc = useCallback(async (d: ProfilesDoc) => {
    setDoc(d);
    await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(d));
  }, []);

  const loadProgress = useCallback(async (id?: string) => {
    if (!id) return setProgress(emptyProgress());
    const raw = await AsyncStorage.getItem(progressKey(id));
    setProgress(raw ? { ...emptyProgress(), ...JSON.parse(raw) } : emptyProgress());
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PROFILES_KEY);
        const d: ProfilesDoc = raw ? JSON.parse(raw) : { list: [] };
        setDoc(d);
        await loadProgress(d.activeId);
      } catch {
        // keep defaults
      }
      setReady(true);
    })();
  }, [loadProgress]);

  const save = useCallback(
    (p: Progress) => {
      setProgress(p);
      if (doc.activeId) AsyncStorage.setItem(progressKey(doc.activeId), JSON.stringify(p)).catch(() => {});
    },
    [doc.activeId],
  );

  const createProfile = useCallback(
    async (name: string) => {
      const p: Profile = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name: name.trim(), createdAt: new Date().toISOString() };
      await persistDoc({ list: [...doc.list, p], activeId: p.id });
      await loadProgress(p.id);
    },
    [doc, persistDoc, loadProgress],
  );

  const selectProfile = useCallback(
    async (id: string | null) => {
      await persistDoc({ ...doc, activeId: id ?? undefined });
      await loadProgress(id ?? undefined);
    },
    [doc, persistDoc, loadProgress],
  );

  const renameProfile = useCallback(
    async (id: string, name: string) => {
      await persistDoc({ ...doc, list: doc.list.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)) });
    },
    [doc, persistDoc],
  );

  const deleteProfile = useCallback(
    async (id: string) => {
      await AsyncStorage.removeItem(progressKey(id));
      const activeId = doc.activeId === id ? undefined : doc.activeId;
      await persistDoc({ list: doc.list.filter((p) => p.id !== id), activeId });
      if (!activeId) setProgress(emptyProgress());
    },
    [doc, persistDoc],
  );

  const exportBackup = useCallback(
    () => JSON.stringify({ app: 'russian', v: 1, name: profile?.name, exportedAt: new Date().toISOString(), progress }),
    [profile, progress],
  );

  const importBackup = useCallback(
    async (json: string) => {
      try {
        const d = JSON.parse(json.trim());
        if (d?.app !== 'russian' || !d.progress?.lessons) return false;
        save({ ...emptyProgress(), ...d.progress });
        return true;
      } catch {
        return false;
      }
    },
    [save],
  );

  const value: Ctx = {
    ready,
    profiles: doc.list,
    profile,
    progress,
    createProfile,
    selectProfile,
    renameProfile,
    deleteProfile,
    save,
    exportBackup,
    importBackup,
  };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

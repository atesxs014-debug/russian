import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Modal, ScrollView, View, useColorScheme } from 'react-native';
import { Text } from './src/Text';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppProvider, useApp } from './src/store';
import { configureAudio, initAudio } from './src/audio/player';
import { ensurePermission, scheduleReminders } from './src/notify';
import { WHATS_NEW, markWhatsNewSeen, shouldShowWhatsNew } from './src/meta';
import { dueItems, today } from './src/progress';
import { langMeta } from './src/course';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import LessonsScreen from './src/screens/LessonsScreen';
import ReviewTab from './src/screens/ReviewTab';
import TabBar, { Tab } from './src/components/TabBar';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import LessonScreen from './src/screens/LessonScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { Button } from './src/ui';
import { C, R, applyTheme, fs, setFontsReady } from './src/theme';

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'review' }
  | { name: 'weak' }
  | { name: 'test'; unitId: string }
  | { name: 'settings' };

function Root() {
  const { ready, profile, settings, progress } = useApp();
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark';
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [tab, setTab] = useState<Tab>('home');
  const [whatsNew, setWhatsNew] = useState(false);
  const home = () => setRoute({ name: 'home' });

  // theme must be applied before children render
  const themeKey = `${scheme}-${settings.accent}-${settings.fontScale}`;
  useMemo(() => applyTheme(scheme, settings.accent, settings.fontScale), [themeKey]);

  useEffect(() => {
    initAudio();
    shouldShowWhatsNew().then(setWhatsNew);
    ensurePermission(); // izinler ilk açılışta istenir
  }, []);

  useEffect(() => {
    configureAudio({ lang: settings.lang, rate: settings.rate, sfx: settings.sfx, haptics: settings.haptics });
  }, [settings.lang, settings.rate, settings.sfx, settings.haptics]);

  useEffect(() => {
    if (!profile) return;
    const weekAgo = today(-7);
    const learnedThisWeek = Object.values(progress.lessons).filter((l) => l.passedAt && l.passedAt >= weekAgo).length * 8;
    scheduleReminders(settings, { due: dueItems(progress).length, learnedThisWeek, langName: langMeta(settings.lang).name });
  }, [profile?.id, settings.reminder, settings.quiet, settings.weekly, settings.lang, progress.updatedAt]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name !== 'home') {
        home();
        return true;
      }
      if (tab !== 'home') {
        setTab('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route, tab]);

  useEffect(() => {
    home();
    setTab('home');
  }, [profile?.id]);

  useEffect(() => {
    home();
  }, [settings.lang]);

  let screen: React.ReactNode;
  if (!ready)
    screen = (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  else if (!profile) screen = <ProfileScreen />;
  else
    switch (route.name) {
      case 'lesson':
        screen = <LessonScreen key={route.lessonId} lessonId={route.lessonId} onClose={home} />;
        break;
      case 'review':
        screen = <PracticeScreen mode="review" onClose={home} />;
        break;
      case 'weak':
        screen = <PracticeScreen mode="weak" onClose={home} />;
        break;
      case 'test':
        screen = <PracticeScreen key={route.unitId} mode="test" unitId={route.unitId} onClose={home} />;
        break;
      case 'settings':
        screen = <SettingsScreen onClose={home} />;
        break;
      default:
        screen = (
          <View style={{ flex: 1 }}>
            <View style={{ flex: 1 }}>
              {tab === 'home' && <HomeScreen go={setRoute} setTab={setTab} />}
              {tab === 'lessons' && <LessonsScreen go={setRoute} />}
              {tab === 'review' && <ReviewTab go={setRoute} />}
              {tab === 'profile' && <SettingsScreen />}
            </View>
            <TabBar tab={tab} onChange={setTab} badge={dueItems(progress).length} />
          </View>
        );
    }

  return (
    <View key={themeKey} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
      {screen}
      <Modal visible={whatsNew && ready} transparent animationType="fade" onRequestClose={() => setWhatsNew(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: C.bg, borderRadius: R.lg, padding: 20, maxHeight: '80%', maxWidth: 480, width: '100%', alignSelf: 'center' }}>
            <Text style={{ color: C.text, fontSize: fs(24), fontWeight: '900' }}>Yenilikler ✨</Text>
            <ScrollView style={{ marginTop: 12 }}>
              {WHATS_NEW.map((w) => (
                <View key={w} style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <Ionicons name="sparkles" size={16} color={C.primary} style={{ marginTop: 2 }} />
                  <Text style={{ color: C.text, fontSize: fs(15), marginLeft: 8, flex: 1, lineHeight: fs(21) }}>{w}</Text>
                </View>
              ))}
            </ScrollView>
            <Button
              title="Harika"
              onPress={() => {
                markWhatsNewSeen();
                setWhatsNew(false);
              }}
              style={{ marginTop: 12 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Short logo animation on launch. */
function Splash({ onDone }: { onDone: () => void }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(a, { toValue: 1, useNativeDriver: true, friction: 6 }),
      Animated.delay(250),
      Animated.timing(a, { toValue: 2, duration: 250, useNativeDriver: true }),
    ]).start(onDone);
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#6A48E8', alignItems: 'center', justifyContent: 'center', opacity: a.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 1, 0] }) }}
    >
      <Animated.View style={{ flexDirection: 'row', alignItems: 'center', transform: [{ scale: a.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, 1, 1.1] }) }] }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="pulse" size={34} color="#6A48E8" />
        </View>
        <Text style={{ color: '#FFFFFF', fontSize: 44, fontWeight: '800', marginLeft: 12, letterSpacing: -1 }}>Voxa</Text>
      </Animated.View>
    </Animated.View>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({ Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold });
  const fontsDone = fontsLoaded || !!fontError;
  setFontsReady(fontsLoaded);
  if (!fontsDone) return <View style={{ flex: 1, backgroundColor: '#6A48E8' }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Root />
        {splash && <Splash onDone={() => setSplash(false)} />}
      </AppProvider>
    </SafeAreaProvider>
  );
}

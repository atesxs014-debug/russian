import React, { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/store';
import { initAudio } from './src/audio/player';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import LessonScreen from './src/screens/LessonScreen';
import PracticeScreen from './src/screens/PracticeScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { C } from './src/theme';

export type Route =
  | { name: 'home' }
  | { name: 'lesson'; lessonId: string }
  | { name: 'review' }
  | { name: 'test'; unitId: string }
  | { name: 'settings' };

function Root() {
  const { ready, profile } = useApp();
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const home = () => setRoute({ name: 'home' });

  useEffect(() => {
    initAudio();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (route.name !== 'home') {
        home();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [route]);

  useEffect(() => {
    if (!profile) home();
  }, [profile?.id]);

  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.primary} />
      </View>
    );
  if (!profile) return <ProfileScreen />;

  switch (route.name) {
    case 'lesson':
      return <LessonScreen key={route.lessonId} lessonId={route.lessonId} onClose={home} />;
    case 'review':
      return <PracticeScreen mode="review" onClose={home} />;
    case 'test':
      return <PracticeScreen key={route.unitId} mode="test" unitId={route.unitId} onClose={home} />;
    case 'settings':
      return <SettingsScreen onClose={home} />;
    default:
      return <HomeScreen go={setRoute} />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}

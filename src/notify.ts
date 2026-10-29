import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { Settings } from './store';

let configured = false;

function configure() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'Hatırlatmalar',
      importance: Notifications.AndroidImportance.DEFAULT,
    }).catch(() => {});
  }
}

export async function ensurePermission(): Promise<boolean> {
  try {
    configure();
    const cur = await Notifications.getPermissionsAsync();
    if (cur.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

const inQuiet = (s: Settings, hour: number) => {
  if (!s.quiet.on) return false;
  const { from, to } = s.quiet;
  return from <= to ? hour >= from && hour < to : hour >= from || hour < to;
};

/** Re-schedules all local reminders. Called on app start and whenever settings change. */
export async function scheduleReminders(s: Settings, info: { due: number; learnedThisWeek: number; langName: string }) {
  try {
    configure();
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (s.reminder.on) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Voxa', body: `Bugünkü ${info.langName} çalışman seni bekliyor.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: s.reminder.hour, minute: s.reminder.minute },
      });
    }

    // biriken tekrar: 20+ öğe varsa 2 saat sonra bir kez hatırlat (sessiz saatler dışında)
    const later = new Date(Date.now() + 2 * 3600 * 1000);
    if (info.due >= 20 && !inQuiet(s, later.getHours())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Tekrarların birikti', body: `${info.due} öğe tekrar bekliyor. Kısa bir tekrar serini korur.` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 7200 },
      });
    }

    if (s.weekly) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'Haftalık özet', body: `Bu hafta ${info.learnedThisWeek} yeni öğe öğrendin. Yeni haftaya hazır mısın?` },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 19, minute: 0 },
      });
    }
  } catch {
    // notifications are best-effort
  }
}

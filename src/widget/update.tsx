import React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetData } from './VoxaWidget';

const KEY = 'voxa.widget';

/** Saves the widget data and redraws the Android home-screen widget (no-op elsewhere). */
export async function updateWidget(data: WidgetData) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
    if (Platform.OS !== 'android') return;
    const { requestWidgetUpdate } = require('react-native-android-widget');
    const { VoxaWidget } = require('./VoxaWidget');
    await requestWidgetUpdate({ widgetName: 'Voxa', renderWidget: () => <VoxaWidget {...data} /> });
  } catch {
    // widget is optional
  }
}

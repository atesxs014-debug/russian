import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { VoxaWidget, WidgetData } from './VoxaWidget';

export const WIDGET_KEY = 'voxa.widget';
const EMPTY: WidgetData = { streak: 0, due: 0, flag: '' };

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let data = EMPTY;
      try {
        const raw = await AsyncStorage.getItem(WIDGET_KEY);
        if (raw) data = { ...EMPTY, ...JSON.parse(raw) };
      } catch {}
      props.renderWidget(<VoxaWidget {...data} />);
      break;
    }
    default:
      break;
  }
}

import { Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

registerRootComponent(App);

// Android home-screen widget
if (Platform.OS === 'android') {
  try {
    const { registerWidgetTaskHandler } = require('react-native-android-widget');
    const { widgetTaskHandler } = require('./src/widget/taskHandler');
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {}
}

import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type WidgetData = { streak: number; due: number; flag: string; word?: { t: string; tr: string }; name?: string };

/** Home-screen widget (Android): streak, reviews waiting and a word of the day. */
export function VoxaWidget({ streak, due, flag, word }: WidgetData) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#6A48E8', borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', width: 'match_parent' }}>
        <TextWidget text={`Voxa ${flag}`} style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '700' }} />
        <TextWidget text={`🔥 ${streak}`} style={{ fontSize: 15, color: '#FFFFFF', fontWeight: '700' }} />
      </FlexWidget>
      {word ? (
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget text={word.t} style={{ fontSize: 22, color: '#FFFFFF', fontWeight: '700' }} maxLines={1} truncate="END" />
          <TextWidget text={word.tr} style={{ fontSize: 13, color: '#E4DCFF' }} maxLines={1} truncate="END" />
        </FlexWidget>
      ) : null}
      <TextWidget text={due > 0 ? `${due} öğe tekrar bekliyor` : 'Bugünkü tekrar tamam ✓'} style={{ fontSize: 12, color: '#E4DCFF' }} />
    </FlexWidget>
  );
}

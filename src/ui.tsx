import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { C, R } from './theme';

type BtnProps = {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'good' | 'bad';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  loading?: boolean;
};

export function Button({ title, onPress, kind = 'primary', disabled, icon, style, loading }: BtnProps) {
  const bg = kind === 'primary' ? C.primary : kind === 'good' ? C.good : kind === 'bad' ? C.bad : 'transparent';
  const fg = kind === 'ghost' ? C.text : '#0B0F1E';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        { backgroundColor: bg, borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: C.line },
        (disabled || loading) && { opacity: 0.4 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.row}>
          {icon && <Ionicons name={icon} size={20} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[s.btnText, { color: fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Bar({ value, color = C.primary, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: C.line, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function IconBtn({ icon, onPress, size = 24, color = C.text }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; size?: number; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={size} color={color} />
    </Pressable>
  );
}

export function SoundButton({ onPress, onSlow, big }: { onPress: () => void; onSlow?: () => void; big?: boolean }) {
  return (
    <View style={s.row}>
      <Pressable onPress={onPress} style={({ pressed }) => [s.sound, big && s.soundBig, pressed && { transform: [{ scale: 0.95 }] }]}>
        <Ionicons name="volume-high" size={big ? 40 : 24} color="#0B0F1E" />
      </Pressable>
      {onSlow && (
        <Pressable onPress={onSlow} style={({ pressed }) => [s.slow, pressed && { opacity: 0.7 }]}>
          <Text style={s.slowText}>🐢</Text>
        </Pressable>
      )}
    </View>
  );
}

export const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { height: 56, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },
  iconBtn: { padding: 6 },
  sound: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  soundBig: { width: 96, height: 96, borderRadius: 48 },
  slow: { marginLeft: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' },
  slowText: { fontSize: 20 },
});

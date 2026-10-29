import React from 'react';
import { ActivityIndicator, Image, Pressable, Switch, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { C, R, fs, themed } from './theme';
import type { Avatar as AvatarT } from './store';

type IconName = keyof typeof Ionicons.glyphMap;

type BtnProps = {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'good' | 'bad' | 'gold';
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
  loading?: boolean;
};

export function Button({ title, onPress, kind = 'primary', disabled, icon, style, loading }: BtnProps) {
  const bg = { primary: C.primary, good: C.good, bad: C.bad, gold: C.gold, ghost: 'transparent' }[kind];
  const fg = kind === 'ghost' ? C.text : C.onPrimary;
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

export function Bar({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: C.line, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height, backgroundColor: color ?? C.primary, borderRadius: height }} />
    </View>
  );
}

export function IconBtn({ icon, onPress, size = 24, color, disabled }: { icon: IconName; onPress: () => void; size?: number; color?: string; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} style={({ pressed }) => [s.iconBtn, (pressed || disabled) && { opacity: 0.4 }]}>
      <Ionicons name={icon} size={size} color={color ?? C.text} />
    </Pressable>
  );
}

export function SoundButton({ onPress, onSlow, big, disabled, left }: { onPress: () => void; onSlow?: () => void; big?: boolean; disabled?: boolean; left?: number }) {
  return (
    <View style={s.row}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [s.sound, { backgroundColor: C.primary }, big && s.soundBig, disabled && { opacity: 0.35 }, pressed && { transform: [{ scale: 0.95 }] }]}
      >
        <Ionicons name="volume-high" size={big ? 40 : 24} color={C.onPrimary} />
      </Pressable>
      {onSlow && (
        <Pressable onPress={onSlow} disabled={disabled} style={({ pressed }) => [s.slow, { backgroundColor: C.cardHi }, (pressed || disabled) && { opacity: 0.5 }]}>
          <Text style={{ fontSize: 20 }}>🐢</Text>
        </Pressable>
      )}
      {left !== undefined && <Text style={[s.left, { color: left > 0 ? C.sub : C.bad }]}>{left} dinleme hakkı</Text>}
    </View>
  );
}

export const FRAMES: { id: string; name: string; xp: number; color: string }[] = [
  { id: 'none', name: 'Yok', xp: 0, color: 'transparent' },
  { id: 'silver', name: 'Gümüş', xp: 250, color: '#C9D1E6' },
  { id: 'emerald', name: 'Zümrüt', xp: 600, color: '#2FCB8E' },
  { id: 'ruby', name: 'Yakut', xp: 1000, color: '#FF4D6D' },
  { id: 'gold', name: 'Altın', xp: 1800, color: '#F6BE4A' },
];

export function Avatar({ avatar, name, size = 44, frame = 'none' }: { avatar: AvatarT; name: string; size?: number; frame?: string }) {
  const ring = FRAMES.find((f) => f.id === frame)?.color ?? 'transparent';
  const inner = size - (ring === 'transparent' ? 0 : 6);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring === 'transparent' ? 0 : 3, borderColor: ring, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: avatar.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {avatar.kind === 'photo' && avatar.value ? (
          <Image source={{ uri: avatar.value }} style={{ width: inner, height: inner }} />
        ) : avatar.kind === 'emoji' && avatar.value ? (
          <Text style={{ fontSize: inner * 0.55 }}>{avatar.value}</Text>
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: inner * 0.42 }}>{name.slice(0, 1).toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}

export function Toggle({ label, sub, value, onChange }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={s.toggle}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={[s.tLabel, { color: C.text }]}>{label}</Text>
        {sub ? <Text style={[s.tSub, { color: C.sub }]}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: C.primary, false: C.line }} thumbColor="#fff" />
    </View>
  );
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={[s.seg, { backgroundColor: C.bg2 }]}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} disabled={o.disabled} onPress={() => onChange(o.value)} style={[s.segItem, on && { backgroundColor: C.primary }, o.disabled && { opacity: 0.35 }]}>
            <Text style={[s.segText, { color: on ? C.onPrimary : C.sub }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onMinus, onPlus, label }: { value: string; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <View style={s.toggle}>
      <Text style={[s.tLabel, { color: C.text, flex: 1 }]}>{label}</Text>
      <IconBtn icon="remove-circle-outline" onPress={onMinus} />
      <Text style={[s.stepVal, { color: C.text }]}>{value}</Text>
      <IconBtn icon="add-circle-outline" onPress={onPlus} />
    </View>
  );
}

export const s = themed(() => ({
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { minHeight: 54, borderRadius: R.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  btnText: { fontSize: fs(17), fontWeight: '700', letterSpacing: 0.2 },
  iconBtn: { padding: 6 },
  sound: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  soundBig: { width: 96, height: 96, borderRadius: 48 },
  slow: { marginLeft: 12, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  left: { marginLeft: 12, fontSize: fs(12), fontWeight: '700' },
  toggle: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  tLabel: { fontSize: fs(16), fontWeight: '700' },
  tSub: { fontSize: fs(13), marginTop: 2 },
  seg: { flexDirection: 'row', borderRadius: 12, padding: 3, marginVertical: 6 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10 },
  segText: { fontWeight: '800', fontSize: fs(14) },
  stepVal: { fontSize: fs(17), fontWeight: '800', minWidth: 64, textAlign: 'center' },
}));

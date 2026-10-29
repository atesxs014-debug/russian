import React from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps } from 'react-native';
import { familyFor } from './theme';

/**
 * Text that renders in Manrope: the style's fontWeight picks the matching
 * font file (custom fonts can't be bolded reliably on Android).
 */
export function Text(props: TextProps) {
  const flat = StyleSheet.flatten(props.style) ?? {};
  const fam = flat.fontFamily ? undefined : familyFor(flat.fontWeight);
  return <RNText {...props} style={fam ? [props.style, { fontFamily: fam, fontWeight: 'normal' }] : props.style} />;
}

export const TextInput = React.forwardRef<RNTextInput, TextInputProps>(function TextInput(props, ref) {
  const flat = StyleSheet.flatten(props.style) ?? {};
  const fam = flat.fontFamily ? undefined : familyFor(flat.fontWeight ?? '600');
  return <RNTextInput ref={ref} {...props} style={fam ? [props.style, { fontFamily: fam, fontWeight: 'normal' }] : props.style} />;
});

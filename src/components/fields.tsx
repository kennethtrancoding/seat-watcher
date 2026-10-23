import { useState, type ReactNode } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useStrings } from '../i18n/useStrings';
import { FieldError, Options, Switch, Text, colors, textStyles, useTextScale } from './ui';

/** Form rows for the Settings and Developer screens. */

export function NumberField({
  label,
  value,
  onChangeText,
  suffix,
  hint,
  error,
  allowNegative,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suffix?: string;
  hint?: string;
  error?: string;
  allowNegative?: boolean;
}) {
  const scale = useTextScale();
  const t = useStrings();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.inputWrap}>
          <TextInput
            style={[
              styles.input,
              { fontSize: styles.input.fontSize * scale },
              focused && styles.inputFocused,
              error ? styles.inputError : null,
            ]}
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            // The decimal pad has no minus key.
            keyboardType={allowNegative ? 'numbers-and-punctuation' : 'decimal-pad'}
            returnKeyType="done"
            selectTextOnFocus
            selectionColor={colors.text}
            accessibilityLabel={suffix ? t.fieldWithUnit(label, suffix) : label}
          />
          {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
      </View>
      {error ? <FieldError>{error}</FieldError> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function SwitchField({
  label,
  value,
  onValueChange,
  hint,
  error,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
      </View>
      {error ? <FieldError>{error}</FieldError> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** A label above a row of option buttons (pass `selected` to each), with an optional hint. */
export function OptionsField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.field} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={styles.label}>{label}</Text>
      <Options>{children}</Options>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

/** Secondary text under a field or button. */
export function Hint({ children }: { children: string }) {
  return <Text style={styles.hint}>{children}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: 6, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  label: { ...textStyles.body, color: colors.text, flexShrink: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: {
    minWidth: 84,
    minHeight: 44,
    textAlign: 'right',
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.edge,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  // One point thicker, so the padding gives one point back and the number holds still.
  inputFocused: { borderWidth: 2, borderColor: colors.text, paddingVertical: 7, paddingHorizontal: 11 },
  inputError: { borderWidth: 2, borderColor: colors.alarm, paddingVertical: 7, paddingHorizontal: 11 },
  suffix: { ...textStyles.subhead, color: colors.secondary, minWidth: 32 },
  hint: { ...textStyles.subhead, color: colors.secondary },
});

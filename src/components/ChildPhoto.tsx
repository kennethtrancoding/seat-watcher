import { Image, Text as NativeText, StyleSheet, View } from 'react-native';

import { useStrings } from '../i18n/useStrings';
import { canPickPhoto, pickChildPhoto } from '../onboarding/childPhoto';
import { Button, colors } from './ui';

/** The child's photo in a circle, or their initial until a photo is added. `ring` draws a border around it. */
export function ChildAvatar({ uri, name, size = 64, ring }: { uri: string; name: string; size?: number; ring?: string }) {
  const t = useStrings().childPhoto;
  const circle = { width: size, height: size, borderRadius: size / 2 };
  const border = ring ? { borderWidth: 3, borderColor: ring } : null;
  if (uri) {
    return <Image source={{ uri }} style={[circle, border]} accessibilityLabel={t.of(name)} />;
  }
  return (
    <View style={[styles.placeholder, circle, border]} accessible={false}>
      {/* A fixed-size circle, so the initial ignores the text-size settings. */}
      <NativeText allowFontScaling={false} style={[styles.initial, { fontSize: size * 0.44 }]}>
        {name ? name[0].toUpperCase() : '?'}
      </NativeText>
    </View>
  );
}

/** The photo with Add / Change / Remove buttons. Hidden in builds without the image picker. */
export function ChildPhotoPicker({
  uri,
  name,
  onChange,
}: {
  uri: string;
  name: string;
  onChange: (uri: string) => void;
}) {
  const t = useStrings().childPhoto;
  if (!canPickPhoto) return null;
  const choose = async () => {
    const picked = await pickChildPhoto().catch(() => null);
    if (picked) onChange(picked);
  };
  return (
    <View style={styles.row}>
      <ChildAvatar uri={uri} name={name} size={88} />
      <View style={styles.buttons}>
        <Button
          compact
          variant="secondary"
          icon={uri ? 'photo' : 'camera.fill'}
          title={uri ? t.change : t.add}
          onPress={() => void choose()}
        />
        {uri ? <Button compact variant="secondary" icon="trash" title={t.remove} onPress={() => onChange('')} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.highlight },
  initial: { fontWeight: '600', color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  buttons: { flex: 1, gap: 8 },
});

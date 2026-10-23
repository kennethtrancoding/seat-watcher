import { File, Paths } from 'expo-file-system';

import { loadIfNative } from '../native/optionalModule';

type ImagePickerModule = typeof import('expo-image-picker');

const ImagePicker = loadIfNative(
  'ExponentImagePicker',
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  () => require('expo-image-picker') as ImagePickerModule,
);

/** False in a development build made before expo-image-picker was added. */
export const canPickPhoto = ImagePicker !== null;

/**
 * Lets the user choose and crop a photo, and keeps a copy in the app's
 * documents. Resolves to the copy's URI, or null if they cancelled.
 */
export async function pickChildPhoto(): Promise<string | null> {
  if (!ImagePicker) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return null;
  // The picker's file is in the cache, which iOS may clear. A new name each
  // time, so a changed photo never shows a cached old image.
  const copy = new File(Paths.document, `child-photo-${Date.now()}.jpg`);
  await new File(result.assets[0].uri).copy(copy);
  return copy.uri;
}

/** Whether a photo saved by pickChildPhoto is still on the phone (a factory reset deletes them). */
export function childPhotoExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/** Deletes a photo saved by pickChildPhoto once nothing uses it. */
export function deleteChildPhoto(uri: string): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // Already gone, or not ours. Either way there's nothing to clean up.
  }
}

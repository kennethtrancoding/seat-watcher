import { requireOptionalNativeModule } from 'expo';

/**
 * Loads a package only if its native module is compiled into this build.
 *
 * A package added after the current development build was made isn't in it,
 * and importing it throws, which would crash the app at launch. This returns
 * null instead, so the feature is just unavailable until the next build.
 * `load` must be a `require()` of the package (see createTransport.ts for why
 * a lazy require can't simply be wrapped in try/catch).
 */
export function loadIfNative<T>(nativeModuleName: string, load: () => T): T | null {
  return requireOptionalNativeModule(nativeModuleName) ? load() : null;
}

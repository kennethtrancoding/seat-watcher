import AsyncStorage from '@react-native-async-storage/async-storage';

import { FakeAccountServer } from './fakeAccountServer';
import type { AccountServer } from './server';

/**
 * Where the pretend server keeps its data. Erasing the phone's storage leaves
 * this key alone, the way it couldn't touch a real server's data; the
 * Developer screen's factory reset empties it through `pretend.reset` instead.
 */
export const ACCOUNT_SERVER_KEY = 'carSeatMonitor.accountServer.v1';

/**
 * The account server the app talks to. For now it's the pretend one on this
 * phone; a real one would implement AccountServer and be picked here, the way
 * phoneAuth.ts picks between the demo and Supabase.
 */
export const accountServer: AccountServer = new FakeAccountServer({
  storage: {
    async load() {
      const raw = await AsyncStorage.getItem(ACCOUNT_SERVER_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    save: (data) => AsyncStorage.setItem(ACCOUNT_SERVER_KEY, JSON.stringify(data)),
  },
});

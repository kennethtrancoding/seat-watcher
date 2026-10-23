# Architecture

The app reads a car seat's sensors over Bluetooth, decides whether a child is in danger, and alerts the parent with iOS notifications. The logic that makes that decision is plain TypeScript with no React and no native code, so Jest can test it on any computer. React only displays state and forwards button presses.

## Data flow

```
 INPUTS                      CORE (plain TypeScript, unit-tested)                 OUTPUTS

 real seat ─BLE─▶ BleCarSeatTransport ──┐
                                        ├──▶ CarSeatMonitor ──────────▶ Notifier ──▶ iOS notification
 simulator ─────▶ SimulatedCarSeat… ────┘      ├ occupancy (pressure ≥ threshold)
                                               ├ ProximityEstimator (RSSI → metres)
                                               └ AlertEngine (conditions + cooldown)
                                                     │ state
                                                     ▼
 phone GPS ─────▶ SeatLocator ────────────────▶ MonitorService (the store)
                                                     │ useSyncExternalStore
                                                     ▼
                                             MonitorProvider ── useMonitor() ──▶ screens (src/app)
```

- **Transports** produce a stream of events: link status, temperature, pressure, and signal strength (RSSI). The real one talks to the hardware; the simulated one fakes it. Both implement the same `CarSeatTransport` interface, so nothing downstream knows which is running.
- **CarSeatMonitor** turns events into state. It decides occupancy from pressure, feeds RSSI to the `ProximityEstimator`, tells the seat whether this phone is near it and hears how many other caregivers' phones are, asks the `AlertEngine` which alerts are active and which to send, and hands those to the `Notifier`.
- **SeatLocator** remembers where the seat was last seen, using the phone's GPS while it's connected to the seat. See [Find My and Life360](find-my-and-life360.md).
- **MonitorService** is the app's store. It watches **every seat at once**: one transport, one `CarSeatMonitor` and one `SeatLocator` per seat, so two children riding together are both covered. It adds and removes them as seats are added and removed, rebuilds them when you switch between hardware and simulator, connects paired seats by themselves (see [Connecting by itself](bluetooth-and-firmware.md#connecting-by-itself)), and combines everything into one snapshot for React (`seats[seatId]`).
- **MonitorProvider** puts that snapshot, plus settings and actions, into React context. Screens read it with `useMonitor()`.

## Folder tour

*Kind* says what a file may import. **Pure** files import neither React nor native modules; that's what makes them testable in Node.

| File | What it does | Kind |
|---|---|---|
| **src/app/** | *Screens. Every file here is a route (see [Expo Router](react-native-for-web-developers.md#screens-and-navigation-expo-router)).* | |
| [_layout.tsx](../src/app/_layout.tsx) | Root layout: wraps everything in `MonitorProvider` and `OnboardingProvider`, applies the text size, and picks what's shown with `Stack.Protected`: setup until it's finished, then the main screens, or the title card and the login screen while logged out; puts the Settings gear on the home screen and each seat's screen | React |
| [index.tsx](../src/app/index.tsx) | Home: a greeting, how every seat is doing, urgent alerts, one card per seat, Connect all, Add a car seat | React |
| [seat/[id].tsx](../src/app/seat/[id].tsx) | One seat: status, connection, readings, Find the car seat card, simulator panel, the child's name and photo, pairing, Remove | React |
| [seat/new.tsx](../src/app/seat/new.tsx) | Add a car seat: who rides in it, then pairing | React |
| [seat/pair.tsx](../src/app/seat/pair.tsx) | Pairs a seat with its hardware (`SeatPairing`) | React |
| [account/index.tsx](../src/app/account/index.tsx) | Account: name and relationship, phone number, what's kept where, log out, delete | React |
| [account/phone.tsx](../src/app/account/phone.tsx) | Change number, verified by a texted code | React |
| [team.tsx](../src/app/team.tsx) | Your teams: your own (helpers and invites still out; invite, cancel, remove), then each team you help (leave) | React |
| [invite.tsx](../src/app/invite.tsx) | Where invite links open, in every state: setup's invite step, **Join …'s team?**, or log in first | React |
| [+native-intent.tsx](../src/app/+native-intent.tsx) | Rewrites links the system opens the app with: old invite links go to the invite page | Native |
| [settings.tsx](../src/app/settings.tsx) | Settings, in two parts; everything saves by itself. First what's set for your own seats (a summary, and the way to their screen) and your team; then this phone's own: language, text size, units, whether getting in or out of a seat notifies, what the seat screen shows (pressure, Bluetooth signal), the Find the car seat shortcuts. Also the account (log out), and the way to the Developer screen | React |
| [seat-settings.tsx](../src/app/seat-settings.tsx) | Settings for your seats: too hot, too cold, too far, and how long before your helpers hear about an alert. They go with your seats to your helpers' phones | React |
| [developer.tsx](../src/app/developer.tsx) | Developer options: the simulated seat, occupancy and distance calibration, alert repeat, the pretend account server's tools and its log of team alerts, Restore defaults (every setting, including the ones in Settings), Run setup again, and the factory reset | React |
| [logged-out.tsx](../src/app/logged-out.tsx) | The title card again, after logging out: Log in opens the login screen, and the two ways in start setup over | React |
| [login.tsx](../src/app/login.tsx) | Logging back in after logging out | React |
| [onboarding/](../src/app/onboarding/) | Setup screens, one file per step, plus the title card's log-in (see [Onboarding](onboarding.md)) | React |
| **src/ble/** | *Getting data from the seat* | |
| [protocol.ts](../src/ble/protocol.ts) | The firmware contract: UUIDs and byte parsing | Pure |
| [transport.ts](../src/ble/transport.ts) | `CarSeatTransport` interface, event types, `TransportEmitter` helper | Pure |
| [BleCarSeatTransport.ts](../src/ble/BleCarSeatTransport.ts) | Real hardware: scan, connect, subscribe, reconnect, RSSI, identify (blink), the Bluetooth permission | Native |
| [SimulatedCarSeatTransport.ts](../src/ble/SimulatedCarSeatTransport.ts) | Fake seat for demos, Expo Go, the Simulator, and tests | Pure |
| **src/monitor/** | *Wiring it together* | |
| [CarSeatMonitor.ts](../src/monitor/CarSeatMonitor.ts) | Events → state → alerts → notifications | Pure |
| [MonitorService.ts](../src/monitor/MonitorService.ts) | The store: a transport, monitor and locator per seat; pairing bookkeeping; connecting seats by themselves; builds the snapshot | Pure except `createTransport` |
| [createTransport.ts](../src/monitor/createTransport.ts) | Picks the simulator or BLE, and asks for Bluetooth; loads the BLE library only if its native module exists | Native check |
| [MonitorProvider.tsx](../src/monitor/MonitorProvider.tsx) | React context, startup (loading settings, reading the notification permission), applying the language, `useMonitor()` | React |
| [useFactoryReset.ts](../src/monitor/useFactoryReset.ts) | The factory reset: disconnects, deletes the photo, clears notifications and everything saved, logs out; from Developer options, also empties the pretend account server | React |
| **src/alerts/** | *Deciding and notifying* | |
| [AlertEngine.ts](../src/alerts/AlertEngine.ts) | Which alerts are active (walking away only once no other caregiver is near the seat); cooldown so they don't spam; `OccupancyTracker`, which spots a seat being filled or emptied | Pure |
| [messages.ts](../src/alerts/messages.ts) | Notification titles and bodies (with the child's name), including "Good morning: Emma is all buckled in!" and "Emma is out of the seat!", the practice alert, the main screen's status line, short labels. The words themselves are in [src/i18n/](../src/i18n/) | Pure |
| [notifier.ts](../src/alerts/notifier.ts) | `Notifier` interface, the iOS local-notification implementation (critical for safety alerts when allowed), the notification and critical-alert permission, the practice alert | Native |
| **src/proximity/** | | |
| [ProximityEstimator.ts](../src/proximity/ProximityEstimator.ts) | RSSI → rough distance, with smoothing and hysteresis | Pure |
| **src/locate/** | *Find the car seat: last-seen location, Find My, Life360* | |
| [SeatLocator.ts](../src/locate/SeatLocator.ts) | When to take location fixes; remembers the last one | Pure |
| [links.ts](../src/locate/links.ts) | Find My and Life360 app definitions, their names as the phone shows them, Apple Maps links, share text | Pure |
| [deviceLocation.ts](../src/locate/deviceLocation.ts) | GPS and location permissions through `expo-location` | Native |
| [open.ts](../src/locate/open.ts) | Opens other apps and the share sheet | Native |
| [storage.ts](../src/locate/storage.ts) | Saves where each seat was last seen, by seat ID | Native |
| **src/onboarding/** | *First-run setup (see [Onboarding](onboarding.md))* | |
| [flow.ts](../src/onboarding/flow.ts) | The order of the setup screens for each way in; the saved setup record | Pure |
| [invite.ts](../src/onboarding/invite.ts) | Builds and reads invite links (the invite's code, every child's name, and who sent it), and sends old ones to the invite page | Pure |
| [textMessage.ts](../src/onboarding/textMessage.ts) | Opens Messages with a text already typed (`expo-sms`) | Native |
| [phone.ts](../src/onboarding/phone.ts) | Normalizes and formats phone numbers | Pure |
| [auth.ts](../src/onboarding/auth.ts) | `PhoneAuth` interface, the demo log-in that accepts any code, and friendly messages for log-in errors | Pure |
| [supabaseAuth.ts](../src/onboarding/supabaseAuth.ts) | Real log-in codes by text through Supabase Auth | Native |
| [phoneAuth.ts](../src/onboarding/phoneAuth.ts) | Uses Supabase when `EXPO_PUBLIC_SUPABASE_*` is set, the demo otherwise | Native |
| [OnboardingProvider.tsx](../src/onboarding/OnboardingProvider.tsx) | React context: setup complete, the logged-in number and the account (through the account server), `goNext()`, `signIn()` (which also joins an accepted invite's team), keeping the seats your teams share in step with the server, `finishLogIn()` (after logging in from the title card), `signOut()`, `restart()` | React |
| [PhoneSignIn.tsx](../src/onboarding/PhoneSignIn.tsx) | Phone number and texted code, for the setup step, the title card's log-in and the login screen | React |
| [TitleCard.tsx](../src/onboarding/TitleCard.tsx) | The title card (the two ways in, Log in, the language switch), for setup's first screen and for after logging out | React |
| [OnboardingScreen.tsx](../src/onboarding/OnboardingScreen.tsx) | The frame every setup screen uses (progress rule, symbol, title), plus `Choice` | React |
| [storage.ts](../src/onboarding/storage.ts) | Saves the setup record on the phone | Native |
| [childPhoto.ts](../src/onboarding/childPhoto.ts) | Picks the child's photo and keeps a copy | Native |
| [support.ts](../src/onboarding/support.ts) | The "Call for help" number from app.json | Native |
| **src/comfort/** | *Comfort settings* | |
| [speech.ts](../src/comfort/speech.ts) | Reads text aloud with `expo-speech`, in a voice for the app's language; quiet while VoiceOver is on | Native |
| [useReadAloud.ts](../src/comfort/useReadAloud.ts) | Reads a screen's text when it comes into view, if Read screens aloud is on | React |
| **src/i18n/** | *English and Spanish (see [Languages](languages.md))* | |
| [en.ts](../src/i18n/en.ts) | Every string the app shows, says or sends, in English; defines the `Strings` type | Pure |
| [es.ts](../src/i18n/es.ts) | The same in Spanish, checked against `Strings` | Pure |
| [i18n.ts](../src/i18n/i18n.ts) | The current language, `strings()`, `resolveLanguage()` (Settings, then the phone), the locale for dates and the voice | Pure |
| [useStrings.ts](../src/i18n/useStrings.ts) | `useStrings()`: the strings for a component, re-rendering when the language changes | React |
| [deviceLanguage.ts](../src/i18n/deviceLanguage.ts) | The phone's preferred languages, from `expo-localization` | Native |
| **src/native/** | | |
| [optionalModule.ts](../src/native/optionalModule.ts) | Loads a package only if its native module is in this build | Native check |
| **src/seats/** | *The car seats* | |
| [seats.ts](../src/seats/seats.ts) | `Seat` (child's name and photo, paired hardware, and `sharedBy` for a seat someone else shares with you), `withSharedSeats` (bringing shared seats in line with your teams), names like "Emma's and Leo's seats", parsing, moving the one child from older settings into a seat | Pure |
| [storage.ts](../src/seats/storage.ts) | Saves the seats on the phone | Native |
| [SeatPairing.tsx](../src/seats/SeatPairing.tsx) | Finding and connecting one seat, confirmed by its light blinking | React |
| **src/account/** | *Accounts and teams (see [Onboarding › Accounts and teams](onboarding.md#accounts-and-teams))* | |
| [account.ts](../src/account/account.ts) | `Account` (ID, number, name, relationship), greetings, parsing | Pure |
| [team.ts](../src/account/team.ts) | Teams: owner and helpers, the seats a team watches, invites and their codes and expiry, your own team and the ones you help | Pure |
| [teamAlerts.ts](../src/account/teamAlerts.ts) | Team alerts: who hears when no one is left with a seat (the owner at once, the rest after the wait) or it's too hot (everyone at once), and `TeamAlerter`, which raises and ends them as seats' alerts change | Pure |
| [server.ts](../src/account/server.ts) | The `AccountServer` interface every account server implements, and `AccountError` | Pure |
| [fakeAccountServer.ts](../src/account/fakeAccountServer.ts) | The pretend account server: the whole server, run on the phone, with its permission checks | Pure |
| [accountServer.ts](../src/account/accountServer.ts) | The account server the app uses (the pretend one, kept in AsyncStorage) | Native |
| [TeamProvider.tsx](../src/account/TeamProvider.tsx) | React context: your own team and the teams you help, kept current as the server changes, and their actions (`useTeam()`); feeds every seat's alerts to `TeamAlerter`, with the seat's team | React |
| **src/settings/** | | |
| [settings.ts](../src/settings/settings.ts) | `Settings` type (including the language), defaults, validation, unit conversion | Pure |
| [storage.ts](../src/settings/storage.ts) | Loads and saves settings with AsyncStorage | Native |
| [useAutosavedDraft.ts](../src/settings/useAutosavedDraft.ts) | The typed values on the Settings and Developer screens, checked and saved by themselves | React |
| **src/components/** | *Reusable UI* | |
| [ui.tsx](../src/components/ui.tsx) | `Section` (a group under a hairline), `CardTitle`, `Button`, `TextField`, `Notice`, `Mark`, `Icon`, `Switch`, `SectionTitle`, the scaled `Text`, and the `colors`, `night` and `textStyles` tokens (see [Design](design.md)) | React |
| [fields.tsx](../src/components/fields.tsx) | `NumberField`, `SwitchField`, `OptionsField` for the Settings and Developer screens | React |
| [glass.tsx](../src/components/glass.tsx) | `Glass`: Liquid Glass on iOS 26, a solid fill everywhere else or with Reduce Transparency on | Native |
| [motion.tsx](../src/components/motion.tsx) | The press-and-spring, and the shared Reduce Motion setting | React |
| [SeatStatusCard.tsx](../src/components/SeatStatusCard.tsx) | One seat's status: "Emma's seat: looking good", with the child's photo; the red alarm band during an alert | React |
| [AlarmBand.tsx](../src/components/AlarmBand.tsx) | "Please check on Emma" and what's wrong, on the red band (home and seat screens) | React |
| [SeatCard.tsx](../src/components/SeatCard.tsx) | A seat on the home screen: child, status, latest readings, Connect | React |
| [ChildPhoto.tsx](../src/components/ChildPhoto.tsx) | The child's photo, and the picker for it | React |
| [InviteButton.tsx](../src/components/InviteButton.tsx) | Invite someone to help with your own seats: a new invite to your own team, sent from Messages (or the share sheet) | React |
| [TeamList.tsx](../src/components/TeamList.tsx) | The people on one team and the invites still out; Remove and Cancel only on your own | React |
| [LocateCard.tsx](../src/components/LocateCard.tsx) | The Find the car seat card | React |
| [SimulatorPanel.tsx](../src/components/SimulatorPanel.tsx) | Controls for the simulated seat | React |
| **Elsewhere** | | |
| [firmware/main.py](../firmware/main.py) | The car-seat board's program (MicroPython on a Raspberry Pi Pico 2 W): sensors → BLE | Firmware |
| [firmware/diagnose.py](../firmware/diagnose.py) | Wiring self-test for the FSR and warning LED, run with `mpremote run` | Firmware |
| [app.json](../app.json) | Native config: name, bundle ID, permissions text, background modes, plugins, the languages iOS offers | Config |
| [locales/es.json](../locales/es.json) | The iOS permission prompts in Spanish | Config |
| [plugins/](../plugins/) | Config plugins that tweak the generated iOS project | Config |
| [assets/icon.svg](../assets/icon.svg) | The app icon; [withSvgIcon.js](../plugins/withSvgIcon.js) renders every icon PNG from it into `.expo/icons/` | Config |
| [\_\_tests\_\_/](../__tests__/) | Jest tests | Tests |

## Design rules

1. **Pure core, thin native edges.** Logic lives in pure files. Code that touches a native module is kept in small adapters (`notifier.ts`, `deviceLocation.ts`, `open.ts`, the `storage.ts` files, `BleCarSeatTransport.ts`). This lets Jest run the core in Node, lets the app start in Expo Go (where some native modules don't exist), and makes implementations swappable.
2. **Interfaces at the seams.** Each boundary is an interface with a real implementation and a fake one for tests or demos:

   | Interface | Real | Fake |
   |---|---|---|
   | `CarSeatTransport` ([transport.ts](../src/ble/transport.ts)) | `BleCarSeatTransport` | `SimulatedCarSeatTransport` |
   | `Notifier` ([notifier.ts](../src/alerts/notifier.ts)) | `localNotifier` | an array-collecting fake in the tests |
   | `LocationProvider` ([SeatLocator.ts](../src/locate/SeatLocator.ts)) | `deviceLocationProvider` | fixed locations in the tests |
   | `ProximityEstimator` ([ProximityEstimator.ts](../src/proximity/ProximityEstimator.ts)) | `RssiProximityEstimator` | swap in your own via `createEstimator` |

3. **Long-lived state lives in classes, not components.** Monitoring must keep running no matter which screen is open, so it isn't owned by any component.
4. **Temperatures are stored in °C.** They're converted to °F only for display and input, using the helpers in [settings.ts](../src/settings/settings.ts).
5. **[protocol.ts](../src/ble/protocol.ts) is the firmware contract.** Change it only in step with [firmware/main.py](../firmware/main.py).

## How state reaches the screen

`MonitorService` follows the "external store" pattern React supports natively. It has two methods: `getSnapshot()` returns the current snapshot, and `subscribe(listener)` calls `listener` when that changes. The snapshot is a new object each time it changes and the same object otherwise, which is how React knows when to re-render.

```tsx
// MonitorProvider.tsx
const snapshot = useSyncExternalStore(service.subscribe, service.getSnapshot);
```

`MonitorProvider` adds the settings, the seats and some actions, and exposes everything through context:

```tsx
// any screen or component
const { seats, settings, connect, connectAll } = useMonitor();
const { seat, state, simulator, lastSeen } = useSeat(seatId); // one seat
```

| Field | What it is |
|---|---|
| `seats` | The `Seat`s, in the order they were added |
| `seatStates` | Live state per seat ID: `state` (`MonitorState`: link status, readings, occupancy, proximity, how many other caregivers are near, active alerts; see [CarSeatMonitor.ts](../src/monitor/CarSeatMonitor.ts)), `simulator` (the simulated transport, or `null`), `lastSeen` |
| `addSeat()`, `updateSeat(id, changes)`, `removeSeat(id)` | Save the seats; the service starts or stops watching to match |
| `connect(id)`, `disconnect(id)`, `connectAll()`, `disconnectAll()` | Start or stop monitoring. Connect and Disconnect are saved on the seat (`autoConnect`); `disconnectAll()` is for logging out and isn't |
| `setAutoConnect(on)` | Whether seats connect by themselves; `OnboardingProvider` turns it on while setup is done and someone's logged in |
| `identify(id)` | Blink a connected seat's light (pairing uses it to confirm the right seat) |
| `forgetSeatHardware(id)` | "That isn't my seat": forget its hardware and skip it when pairing again |
| `setUserName(name)` | The account's name, for the "someone's in the seat" greeting; `OnboardingProvider` keeps it current |
| `settings`, `saveSettings(s)` | The saved `Settings`; saving applies immediately |
| `unavailableReason` | Why monitoring can't run (e.g. no Bluetooth in Expo Go) |
| `notificationsAllowed`, `criticalAlerts`, `requestNotifications()` | Whether notifications and [critical alerts](alerts-and-notifications.md#critical-alerts) are allowed (re-read when the app comes back), and the prompts |
| `factoryReset()` | Erases everything; use `useFactoryReset()`, which also erases the account |

Setup and the account have their own context: `useOnboarding()` gives `completed`, `phoneNumber` (logged in, or `null`), `account` (ID, number, name, relationship; a copy kept while logged out), `goNext(step)`, `complete()`, `acceptInvite()`, `signIn()`, `changeNumber()`, `belongsToSomeoneElse()`, `updateProfile()`, `deleteAccount()`, `signOut()`, `restart()` and `eraseAccount()`. The account's changes go through the account server.

The teams have one too: `useTeam()` gives `ownTeam` (your own team: its members and the invites still out, or null before your first invite), `helping` (the teams you help, whose seats are shared with you), `loaded`, `createInvite()`, `cancelInvite()` and `removeMember()` (all for your own team), `leave(teamId)` (a team you help), and `pretend` (the pretend server's tools, including its log of team alerts). It reloads whenever the account server says something changed. `TeamProvider` also raises a team alert on the server whenever a seat's alerts say no caregiver is left with it or it's too hot, with the team the seat belongs to (see [Several caregivers](alerts-and-notifications.md#several-caregivers)). The seats shared with you are kept in step by `OnboardingProvider`, which calls `syncSharedSeats` on the monitor (see [Onboarding › Teams](onboarding.md#teams)).

## The life of a reading

What happens when the seat reports a new temperature:

1. The firmware sends a BLE notification on the temperature characteristic.
2. `react-native-ble-manager` fires `onDidUpdateValueForCharacteristic`. iOS wakes the app for this even when it's in the background.
3. `BleCarSeatTransport.handleValue` decodes the bytes with `parseTemperatureC` and emits `{ type: 'temperature', celsius }`. It also reads RSSI if a reading is due.
4. `CarSeatMonitor.handle` calls `update({ temperatureC })`, which:
   - merges the change into the state,
   - asks `AlertEngine.evaluate` which alerts are active and which should notify now,
   - notifies its listeners if anything changed,
   - calls `notifier.notify(...)` for each alert that should notify.
5. `MonitorService.publish` builds a new snapshot. On the way it calls each seat's `SeatLocator.observe(link)`, which takes a location fix if one is due.
6. React re-renders the screens that use `useMonitor()`.

## Startup

1. `package.json` has `"main": "expo-router/entry"`, so Expo Router boots and renders [src/app/_layout.tsx](../src/app/_layout.tsx).
2. `MonitorProvider` creates the `MonitorService` and renders nothing until settings and seats are loaded, which takes a few milliseconds.
3. It sets up notifications and reads (without asking) whether they're allowed, and loads the saved settings, seats and last-seen locations from AsyncStorage. Before rendering, it sets the language: the one in Settings, or the phone's (see [Languages](languages.md)). The first time after the update to several seats, the child's name and photo from the old settings become the first seat.
4. `service.apply(settings, seats)` creates a transport (BLE, or the simulator) and a `CarSeatMonitor` for each seat.
5. `OnboardingProvider` loads whether setup is finished. If it isn't, the setup screens appear (see [Onboarding](onboarding.md)). Otherwise the home screen appears (or the title card, if they logged out). Once setup is done and someone's logged in, every paired seat the user hasn't disconnected connects by itself, or waits in `waiting` until the phone is close to it.

## Settings

- Stored as JSON under one AsyncStorage key ([storage.ts](../src/settings/storage.ts)). When loaded, `parseStoredSettings` merges them over `DEFAULT_SETTINGS`. Fields added in newer versions get their defaults, fields with the wrong type are dropped, and an invalid combination falls back to the defaults entirely.
- Distances are always stored in metres and temperatures in °C. `distanceUnit` (`ft` or `m`) and `temperatureUnit` only change what's shown; convert with `toDisplayDistance`/`fromDisplayDistance` and `formatDistance`/`formatRoughDistance` in [settings.ts](../src/settings/settings.ts).
- On the Settings and Developer screens there's no Save button. Anything tapped (options, switches, the photo) is saved straight away. Typed values are kept as text in a *draft* ([useAutosavedDraft.ts](../src/settings/useAutosavedDraft.ts)); 0.8 s after typing stops, and when the screen closes, the draft is converted to `Settings` (merged over the current settings) and checked with `validateSettings`. Errors appear under their fields, and `settingsToSave` saves the values that passed, as long as the result is valid as a whole. A draft that matches what's saved (compared as text) is never saved, so switching units doesn't store rounded values. Settings stays open under the Developer screen, so when a screen comes back into view with nothing still to check, its draft is reloaded from what's saved: that's how Settings shows the values *Restore defaults* just put back.
- `saveSettings` updates React state and writes to AsyncStorage. An effect then calls `service.applySettings`, which updates the running monitor, or rebuilds it if the simulator switch changed.

## Link status

`LinkStatus` ([transport.ts](../src/ble/transport.ts)) drives much of the UI and the alerts:

```
   Pairing (no hardware saved yet):
            connect()                 found            services ready
   idle ─────────────▶ scanning ─────────▶ connecting ────────────────▶ connected
    ▲                     │ nothing found      │ timeout/error           │  ▲
    │                     ▼                    ▼                   drop  │  │ back in range
    └────────────────── idle (with an error message)                     ▼  │
                                                                     reconnecting
   A paired seat:
            connect()             not there after 10 s
   idle ─────────────▶ connecting ───────────────────▶ waiting
                           │                              │ seat in range
                           └───────────▶ connected ◀──────┘

   disconnect() from any state ──▶ idle
```

- **`reconnecting`** means the link dropped without the user asking. That's the *Lost touch* alert. The monitor keeps the last readings and occupancy while it's in this state.
- **`waiting`** means a paired seat isn't in range yet, or Bluetooth is off. iOS holds the connection request open and completes it when the phone gets close. Nothing was connected, so it never alerts.
- **`idle`** after the user taps **Disconnect** clears readings and never alerts. A paired seat only ends up `idle` with an error if Bluetooth isn't allowed, or iOS has forgotten the seat's identifier.

## Where to go next

- Bluetooth details and the firmware contract: [bluetooth-and-firmware.md](bluetooth-and-firmware.md)
- How alerts decide when to fire: [alerts-and-notifications.md](alerts-and-notifications.md)
- Step-by-step changes: [cookbook.md](cookbook.md)

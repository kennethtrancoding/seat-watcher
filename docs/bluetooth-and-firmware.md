# Bluetooth and the firmware contract

## BLE in five minutes, for web developers

Bluetooth Low Energy (BLE) is how the phone talks to the car-seat board. If you know HTTP and WebSockets, the concepts map closely:

| BLE term | Meaning | Web analogy |
|---|---|---|
| **Peripheral** | The device with the data: the car-seat board, a Raspberry Pi Pico 2 W. It *advertises* so others can find it. | A server |
| **Central** | The device that scans for and connects to peripherals: the phone. | A client |
| **Advertising** | Small broadcast packets saying "I exist", often with a name and service UUIDs | DNS or service discovery |
| **Service** | A named group of values, identified by a UUID | An API namespace, like `/car-seat` |
| **Characteristic** | One value inside a service, also identified by a UUID. Holds a few bytes. | An endpoint, like `/car-seat/temperature` |
| **Read** | The central asks for the current value | `GET` |
| **Notify** | The peripheral pushes each new value to subscribed centrals | A WebSocket message |
| **RSSI** | Received signal strength in dBm. Always negative; closer to 0 means stronger (about −40 is next to it, −90 is far). | None |

Values are raw bytes, not JSON. Both sides have to agree on the byte layout, and that agreement is the contract below.

## The firmware contract

Everything the firmware must match lives in [src/ble/protocol.ts](../src/ble/protocol.ts). The firmware itself is [firmware/main.py](../firmware/main.py) (see [The Pico 2 W firmware](#the-pico-2-w-firmware)). If you change a UUID or a byte format on one side, change the other too. `npm test` fails if the firmware's UUIDs or name stop matching protocol.ts.

| Item | UUID | Properties | Format |
|---|---|---|---|
| Service | `c5a10001-7b3e-4f2d-9e61-2b8d4a0f5c10` | – | Advertise this UUID, or advertise the name `CarSeatSensor` |
| Temperature | `c5a10002-7b3e-4f2d-9e61-2b8d4a0f5c10` | read, notify | `int16` little-endian, hundredths of °C (23.50 °C → `2E 09`) |
| Pressure | `c5a10003-7b3e-4f2d-9e61-2b8d4a0f5c10` | read, notify | `uint16` little-endian, raw sensor units (1000 → `E8 03`) |
| Identify | `c5a10004-7b3e-4f2d-9e61-2b8d4a0f5c10` | write | Any value. The seat blinks its light fast for a few seconds, so setup can ask "is this your seat?" The app writes `01`. |
| Caregivers | `c5a10005-7b3e-4f2d-9e61-2b8d4a0f5c10` | write, notify | The phone writes `uint8` `01` while it's within its distance limit, `00` when it isn't. The seat notifies each phone, once a second, a `uint8`: how many *other* connected phones are near. A `01` counts for 6 seconds (`NEARBY_FOR_MS`), so the app writes it again every 2 seconds while it stays near. See [Several caregivers](alerts-and-notifications.md#several-caregivers). |

**Send notifications about once a second.** Besides keeping the readings fresh, each notification wakes the app in the background, which keeps the distance check and location updates running (see [The app lifecycle](react-native-for-web-developers.md#the-app-lifecycle-the-biggest-difference-from-the-web)).

The firmware encodes them in MicroPython like this:

```python
struct.pack("<h", round(temp_c * 100))  # temperature: 23.5 °C → 2E 09
struct.pack("<H", pressure)             # pressure: 1000 → E8 03
```

If you port the firmware to another board, the same encoding on an ESP32 with Arduino looks like this:

```cpp
int16_t t = (int16_t)roundf(tempC * 100);
uint8_t tbuf[2] = { (uint8_t)(t & 0xFF), (uint8_t)((t >> 8) & 0xFF) };
tempChar->setValue(tbuf, 2);
tempChar->notify();

uint16_t p = analogRead(FSR_PIN);           // 0–4095 on an ESP32
uint8_t pbuf[2] = { (uint8_t)(p & 0xFF), (uint8_t)(p >> 8) };
pressureChar->setValue(pbuf, 2);
pressureChar->notify();
```

Notes:

- The temperature encoding matches the Bluetooth SIG's standard Temperature characteristic (0x2A6E). The value `0x8000` means "unknown", and the app ignores it. The Pico firmware sends it when the temperature sensor doesn't answer.
- **Pressure units don't matter**, as long as the firmware and the **Occupied at pressure ≥** setting agree. Developer options shows the live reading to help you pick a threshold between the "empty" and "occupied" values. To see it on the seat screen too, turn on **Settings › Show pressure and threshold**.
- Packets shorter than 2 bytes are ignored.
- **Identify is optional.** If the write fails (firmware from before Identify existed), setup skips the "is the light blinking?" question and just reports that it connected.
- **Caregivers is optional too.** Without it (older firmware), the app never hears that anyone else is near, so every phone alerts as it walks away, as before. The notification is per phone (MicroPython's `gatts_notify` with explicit data), so each phone gets its own count of the others, and the value isn't readable.

### Changing the contract

1. Change [firmware/main.py](../firmware/main.py) and [protocol.ts](../src/ble/protocol.ts) together, then [copy the firmware to the board](#copy-the-firmware-to-the-board).
2. Update or add cases in [\_\_tests\_\_/protocol.test.ts](../__tests__/protocol.test.ts). The byte examples there double as documentation. [firmware.test.ts](../__tests__/firmware.test.ts) checks that both sides use the same UUIDs and name.
3. Update the table above.

If the app connects but no readings appear after you change the characteristics, turn Bluetooth off and on again on the iPhone. iOS can keep a device's old layout cached.

To add a whole new sensor, follow [Add a sensor reading](cookbook.md#add-a-sensor-reading-humidity).

## The Pico 2 W firmware

The car-seat board is a Raspberry Pi Pico 2 W running [MicroPython](https://micropython.org). Its whole program is [firmware/main.py](../firmware/main.py). Once a second it reads the sensors, stores the values in the two characteristics, and notifies each connected phone, along with how many of the other phones are near. When a phone disconnects, the board advertises again so the app can reconnect.

With nothing wired to it, the board already works as a seat. It reports the temperature from the chip's built-in sensor, and each press of its **BOOTSEL** button puts a pretend baby in the seat or takes it out. That's enough to try every alert. Add real sensors as you get them (see [Wiring and settings](#wiring-and-settings)).

### Install MicroPython (once per board)

The board needs MicroPython's **Pico 2 W** build (`RPI_PICO2_W`), version 1.25 or newer. Older versions and the plain Pico 2 build have no Bluetooth. This project's board runs v1.29.0.

1. Download the latest `.uf2` file from [micropython.org/download/RPI_PICO2_W](https://micropython.org/download/RPI_PICO2_W/).
2. Hold **BOOTSEL** while you plug the board into USB. It shows up as a drive called `RP2350`.
3. Drag the `.uf2` file onto that drive. The board restarts into MicroPython.

### Copy the firmware to the board

Use [mpremote](https://docs.micropython.org/en/latest/reference/mpremote.html), MicroPython's command-line tool. Install it with `pip install mpremote`, or run it without installing as `uvx mpremote` or `pipx run mpremote`. From the repo root:

```bash
mpremote cp firmware/main.py :main.py + reset
```

The file has to be called `main.py` on the board. MicroPython runs that file at power-up, so the seat works without a computer, powered from a USB power bank or the car's USB port.

To use **Thonny** instead, open `firmware/main.py`, choose *File › Save as… › Raspberry Pi Pico*, name it `main.py`, then press **Ctrl+D** in Thonny's Shell to restart the program.

Only one program can use the board's USB connection at a time. If mpremote says `failed to access /dev/cu.usbmodem… (it may be in use by another program)`, quit Thonny or any serial monitor first.

### Watch it run

Run `mpremote` with no arguments to see the board's log without stopping the program. Press **Ctrl+]** to leave.

```
Temp: 28.2 C  Pressure: 0  LED: OFF  Phones: waiting
Phone connected
Temp: 28.2 C  Pressure: 0  LED: OFF  Phones: 1 connected, 1 near
Demo seat: occupied
Temp: 28.3 C  Pressure: 2000  LED: OFF  Phones: 1 connected, 1 near
```

*Near* counts the phones that last said they're within their distance limit. The LED on the board (next to the USB socket) **blinks** slowly while it waits for a phone and stays **on** while one is connected. When the app writes to Identify, it **blinks fast** (five times a second) for 5 seconds (`IDENTIFY_MS`), then goes back to steady. The log shows `Identify: blinking`.

Anything that stops the program also switches Bluetooth off: **Ctrl+C**, Thonny's **Stop** button, or an mpremote command such as `cp` without `+ reset`. A connected app then reports *Lost touch* if the seat was occupied. That's deliberate: the seat really has stopped reporting, and a frozen reading would be worse. Start it again with `mpremote reset`, or unplug the board and plug it back in.

### Wiring and settings

| Part | Connections (Pico 2 W pin numbers in brackets) | Setting in `main.py` |
|---|---|---|
| Warning LED and a 220–330 Ω resistor | GP15 [20] → resistor → LED long leg; short leg → GND [18] | none |
| SHT4x temperature sensor, such as an SHT40 or SHT45 breakout | VIN → 3V3 [36], GND → GND [38], SDA → GP4 [6], SCL → GP5 [7] | `USE_SHT4X = True` |
| Force-sensitive resistor (FSR) and a 10 kΩ resistor | 3V3 [36] → FSR → GP26 [31], and GP26 [31] → 10 kΩ → GND [28] | `USE_FSR = True`, `FSR_PIN = 26` |

#### The FSR on the breadboard

This layout assumes the Pico sits in rows 1–20 with the USB socket at row 1, which puts its right-hand pins in column h with pin 40 in row 1. Pin *n* on that side is then in row 41 − *n*. Three jumpers bring 3V3, GP26 and GND down to the empty rows below the Pico. The parts go there, with empty rows between the three connections, so nothing sits next to the Pico's pins and no lead can bridge two of them. The power rails aren't used.

```
        f             g     h               i     j
row  5  ·             ·     Pico 3V3        ·     A ─┐
row 10  ·             ·     Pico GP26       ·     B ─┐
row 13  ·             ·     Pico GND        ·     C ─┐
        ⋮   rows 14–20: rest of the Pico in h; rows 21–29: empty
row 30  FSR wire      ·     ·               ·     A ─┘
row 31  ·             ·     ·               ·     ·
row 32  FSR wire      ·     10 kΩ ─┐        ·     B ─┘
row 33  ·             ·            │        ·     ·
row 34  ·             ·            │        ·     ·
row 35  ·             ·            │        ·     ·
row 36  ·             ·     10 kΩ ─┘        ·     C ─┘
```

A, B and C are the three jumpers, and `·` is an empty hole.

| From | To | Part |
|---|---|---|
| j5 (3V3 [36]) | j30 | jumper A |
| j10 (GP26 [31]) | j32 | jumper B |
| j13 (GND [28]) | j36 | jumper C |
| f30 | f32 | the FSR's two wires, either way round |
| h32 | h36 | the 10 kΩ resistor, lying flat |

Before you start, unplug USB, and take everything else off the right half and the right-hand rails. That includes any jumper from j5 to the + rail: a live 3V3 rail right next to the − rail is an easy short. Then run [the wiring check](#check-the-wiring). GP26 should read `a resistor to GND (about 10 kohm)`.

The settings are constants at the top of [main.py](../firmware/main.py). Copy the file to the board again after changing one.

| Setting | Default | What it does |
|---|---|---|
| `USE_SHT4X` | `False` | `False` uses the chip's built-in sensor. That measures the chip, not the air, and can be several degrees off. This board reads about 28 °C on a desk, close to the app's default limit of 95 °F (35 °C), so a warm room can trigger *Too hot* once the seat is occupied. Use an SHT4x for real readings. |
| `USE_FSR` | `False` | `False` means there's no pressure sensor, and BOOTSEL toggles the pretend baby: pressure 2000 (occupied) or 0 (empty). Set it to `True` only once the FSR *and* its 10 kΩ resistor are wired. An unconnected FSR pin reads 700–1000, so the app would show an empty seat as occupied. |
| `FSR_PIN` | `26` | The ADC pin the FSR is on: 26, 27 or 28. This board uses GP26 because its GP27 [32] only reaches the breadboard now and then: in the same row, GP26 read the 10 kΩ while GP27 read `OPEN`. |
| `THRESHOLD_C`, `HYSTERESIS_C` | `35.0`, `0.5` | When the warning LED turns on and off. The app's alerts use the limits in its own Settings instead. |
| `SAMPLE_MS` | `1000` | How often readings are sent. Keep it near one second (see [the firmware contract](#the-firmware-contract)). |
| `IDENTIFY_MS` | `5000` | How long the LED blinks fast after the app writes to Identify. |
| `MAX_PHONES` | `1` | How many phones can be connected at once. Stock MicroPython holds one, so leave it at 1 unless you've [rebuilt MicroPython for more](#several-phones-at-once). |

### Several phones at once

For the seat to know whether another caregiver is near (see [Several caregivers](alerts-and-notifications.md#several-caregivers)), every caregiver's phone has to be connected to it at the same time. The radio chip can manage that, but MicroPython's Bluetooth for the Pico 2 W is built with room for **one** connection (`MAX_NR_HCI_CONNECTIONS 1` in its `extmod/btstack/btstack_config_common.h`), and that can't be changed from Python. So `MAX_PHONES` is 1: once a phone connects, the board stops advertising, the other phones wait, and the next one connects when the first walks out of range. The app still works this way, but no one is ever counted as nearby, so each phone alerts as it walks away.

To hold more phones, rebuild MicroPython with more room. This hasn't been tried on this project's board yet, so test it with two phones before relying on it:

1. Install the tools: `brew install cmake` and `brew install --cask gcc-arm-embedded`. The build needs about 2 GB of disk.
2. Get the source for the version the board runs, and its submodules:
   ```bash
   git clone --branch v1.29.0 --depth 1 https://github.com/micropython/micropython.git
   cd micropython
   make -C mpy-cross
   make -C ports/rp2 BOARD=RPI_PICO2_W submodules
   ```
3. In `extmod/btstack/btstack_config_common.h`, change `#define MAX_NR_HCI_CONNECTIONS 1` to `3`.
4. Build: `make -C ports/rp2 BOARD=RPI_PICO2_W`. Install `ports/rp2/build-RPI_PICO2_W/firmware.uf2` the same way as [the download](#install-micropython-once-per-board).
5. Set `MAX_PHONES = 3` in [main.py](../firmware/main.py) and [copy it to the board](#copy-the-firmware-to-the-board). The board then keeps advertising while there's room, and the log shows `Phones: 2 connected, 1 near`.

Don't raise `MAX_PHONES` on stock MicroPython: the board would advertise for a second phone it has no room for.

### Calibrate the pressure sensor

With the FSR wired and `USE_FSR = True`:

1. Connect the app and open **Settings › Developer options**. Under *Seat*, the hint shows the current reading.
2. Note the reading with the seat empty, then with something about as heavy as a baby on it, such as a 4 kg (9 lb) bag of flour.
3. Set **Occupied at pressure ≥** between the two. It saves by itself.

The reading depends on exactly where the FSR sits, so calibrate with it mounted where it will stay: under the seat pad, where the baby's weight rests.

### Check the wiring

[firmware/diagnose.py](../firmware/diagnose.py) tests the FSR circuit and the warning LED without a multimeter. It runs from the computer and doesn't replace `main.py` on the board:

```bash
mpremote run firmware/diagnose.py
mpremote reset    # afterwards, to start main.py again
```

It switches on the chip's own ~50 kΩ pull-up, then its pull-down, and reads the FSR pin (`FSR_PIN`, set at the top of both files) each time. The other two ADC pins are measured alongside for comparison. Then, for 30 seconds, it blinks the red LED in step with the board's LED and prints the FSR pin while you press the FSR.

| What it prints | Meaning |
|---|---|
| The FSR pin: `a resistor to GND (about 10 kohm)` | The 10 kΩ → GND half works. |
| The FSR pin: `OPEN`, like the spare pins | Nothing holds the pin at GND, so it floats. With the FSR's wires attached, a floating pin can swing anywhere from 0 to 4095 in `main.py`'s log. First check that the Pico is pushed all the way into the breadboard, with no bare pin metal showing under its headers. Then, to find the break, move the far end of the pin's jumper into the − rail and run the test again. If the pin now reads `wired straight to GND`, the 10 kΩ isn't making contact: reseat it with straight legs or swap it. If it's still `OPEN`, plug that same end straight into the row of a GND pin, such as GND [28], instead. If it reads `wired straight to GND` there, the − rail is the dead part, so build the circuit without it. If it's still `OPEN`, the pin itself isn't reaching the breadboard. To confirm, wire a spare ADC pin to the same GND row: if that one reads `wired straight to GND`, move the FSR to it and change `FSR_PIN`. |
| `press` climbs while you squeeze the FSR | The FSR, its 3V3 supply and the FSR pin all work. |
| The board LED blinks but the red one doesn't | Turn the LED around: long leg toward the resistor and GP15, short leg (flat side) toward GND. |

The pulls are set directly in the pad registers with the pin's digital input off. Set through `Pin(…, Pin.PULL_DOWN)`, an RP2350 pin reads about 2 V instead of 0 V (erratum RP2350-E9), which makes it look connected when it isn't.

### Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| "We couldn't find a car seat" in the app | Look at the board's LED. **Blinking**: it's advertising. Bring the phone closer, and check with nRF Connect that `CarSeatSensor` shows up. **On**: other phones or computers hold every connection the board allows (`MAX_PHONES`, one with stock MicroPython). **Off**: `main.py` isn't running. Check it's on the board with `mpremote ls`, then run `mpremote reset`. |
| `ImportError: no module named 'bluetooth'` | The board has the wrong MicroPython build. [Install](#install-micropython-once-per-board) the `RPI_PICO2_W` one. |
| `Sensor read failed - check wiring` in the log | The SHT4x isn't answering on GP4/GP5. Check the wiring. Meanwhile the firmware sends "unknown", and the app keeps showing the last temperature it had. |
| The seat flips between occupied and empty | `USE_FSR = True` with the FSR or its 10 kΩ resistor missing or loose. [Check the wiring](#check-the-wiring). |
| The red warning LED never lights | It lights only above `THRESHOLD_C` (35 °C), and the built-in sensor reads about 28–31 °C on a desk. To check the LED itself, run [the wiring check](#check-the-wiring), which blinks it. |
| On a power bank, the board dies after a minute or so | Many power banks switch off when the load is as small as this board's. Try another one, or the car's USB port. |
| Setup connects but never asks "Is the seat's light blinking?" | The board runs firmware from before Identify. [Copy the firmware to the board](#copy-the-firmware-to-the-board) again. If it still skips the question, turn Bluetooth off and on on the iPhone: iOS can keep the old characteristic list cached. |

## How the app connects

All of this is in [BleCarSeatTransport.ts](../src/ble/BleCarSeatTransport.ts).

Pairing (a seat with no hardware saved yet):

1. **Check Bluetooth.** Waits briefly for iOS to report its Bluetooth state, then fails with a readable message if Bluetooth is off, permission is denied, or the device has none (the iOS Simulator).
2. **Scan for 10 seconds** for a peripheral advertising the service UUID or the name `CarSeatSensor` that no other seat has claimed. It takes the first match, and setup asks the user to confirm its light is blinking.
3. **Connect**, with a 10-second timeout, because iOS connection attempts never time out on their own.
4. **Discover the service, subscribe** to both characteristics, and read each once so the screen isn't blank until the first notification.
5. **Poll RSSI** every second, and also whenever data arrives, because timers pause in the background but notifications still arrive.

A paired seat skips the scan and connects to its saved identifier with a request **without a timeout**. iOS keeps that request pending, even in the background, and completes it as soon as the seat is in range. After 10 seconds the status changes from `connecting` to `waiting`, but the request stays open. If Bluetooth is off, the seat waits for it to come on.

When the link drops unexpectedly, the status becomes `reconnecting` and the app makes the same kind of request. If Bluetooth is switched off and on, the app starts a fresh attempt, because iOS silently drops requests made while Bluetooth was off. A request that fails outright is retried every 3 seconds.

A user-initiated **Disconnect** always ends in `idle`, never `reconnecting`, so it never triggers the *Lost touch* alert.

### Connecting by itself

After setup, nobody should need to tap **Connect** day to day. Every seat that's been paired connects by itself unless the user tapped **Disconnect** on it:

| When | What happens |
|---|---|
| The app opens (or someone logs in) | Each paired seat connects, or waits in `waiting` until the phone is close. |
| Walking away from the car | The link drops at the edge of range (roughly 10–30 m from a Pico, less through a car body and a pocket). The seat goes to `reconnecting`. *Lost touch* alerts only if someone was in the seat and no other caregiver stayed near it. |
| Walking back | iOS reconnects as soon as the seat is in range, even with the phone locked in a pocket, and the app wakes to start reading again. |
| iOS ended the app in the background, or the phone restarted | iOS relaunches it in the background when the seat comes into range. See [When the app isn't running](#when-the-app-isnt-running). |
| Bluetooth switched off and on | The seat waits, then connects once Bluetooth is back. |
| The app comes back to the foreground | Seats that stopped trying (for example, Bluetooth permission was off) try again. |
| The user taps **Disconnect** (or **Cancel** while waiting) | That seat stays disconnected, even after the app restarts, until they tap **Connect**. It's saved on the seat as `autoConnect`. |

`MonitorService.setAutoConnect()` is on while setup is done and someone's logged in. During setup, pairing does the connecting. Turning it off (logging out, _Run setup again_, the factory reset) disconnects every seat without saving it on the seat, so nothing alerts while nobody's logged in, and they connect again after logging back in. Turning it off while it's already off (during setup) leaves a seat connected by pairing alone. Seats that were never paired don't connect by themselves, because pairing has to check it found the right seat.

### When the app isn't running

Like a phone key for a car, the seat should connect without the app being opened. The app uses **CoreBluetooth state restoration** for this: `BleManager.start()` gets a `restoreIdentifierKey` (`RESTORE_IDENTIFIER` in [BleCarSeatTransport.ts](../src/ble/BleCarSeatTransport.ts); never change it). If iOS ends the app in the background to free memory (most likely overnight or after heavy use of other apps), it keeps the seat's link, or the pending request for an out-of-range seat. Then it relaunches the app in the background when the seat comes into range, sends a reading or drops. The same happens after the app crashes, and after the phone restarts once it's been unlocked ([Apple's rules](https://developer.apple.com/documentation/technotes/tn3115-bluetooth-state-restoration-app-relaunch-rules)).

Two pieces make the relaunch work:

- **React Native starts without a window.** The app uses the UIScene life cycle, where React Native starts when a window opens, and a background relaunch doesn't open one. So [plugins/withSceneLifecycle.js](../plugins/withSceneLifecycle.js) adds native code to `AppDelegate.swift`: if no window has opened by the end of launch, it starts React Native without one (`WindowlessReactNative`). When the user opens the app, `SeatWatcherSceneDelegate` shows that same instance rather than starting a second one, which would watch every seat twice. It also keeps the instance running if iOS closes the window of an app in the background.
- **The Bluetooth manager starts early.** iOS hands the links back only once `BleManager.start()` runs, and gives a relaunched app about 10 seconds. So a paired seat's transport starts the manager as soon as it's created, without waiting for the account to load. When the seat then connects, `keepConnecting()` finds it already connected and goes straight to subscribing.

**What still needs a tap: opening the app after swiping it away.** iOS never relaunches an app the user force-quit, or one whose link went away when Bluetooth was switched off and on in Settings (on iOS 26 and later, in Control Center too). Opening the app is enough; no **Connect** is needed. On iOS 26 and later, apps that pair through Apple's AccessorySetupKit are the exception, so moving pairing to it would close this gap.

During setup, the app also asks for Bluetooth on its own screen first (`requestBluetoothAccess()`), so the iOS prompt appears with an explanation rather than in the middle of a scan. After connecting, setup writes to Identify (`identify()`) and asks the user to confirm the light is blinking.

## Distance estimation

BLE doesn't measure distance. The app estimates it from RSSI with the log-distance path-loss model:

```
distance = 10 ^ ((RSSI at 1 m − RSSI) / (10 × n))
```

`n` is the path-loss exponent. On top of that formula, [ProximityEstimator.ts](../src/proximity/ProximityEstimator.ts) adds:

- a **median filter over 5 samples**, to ignore one-off spikes;
- **3 consecutive** "too far" estimates before tripping;
- **hysteresis**: the alert clears only once the estimate drops below 80 % of the limit.

A phone in a back pocket can read 10 dB weaker than one in hand, which looks like 2–3× the distance. So **calibrate**:

1. Connect to the seat and hold the phone 1 m away for a few seconds.
2. Open **Settings › Developer options** and tap **Use current signal**. This sets *Signal at 1 m*.
3. If you get false alarms, raise the *Path-loss exponent*: 2 is open air; 2.5–4 means bodies and car panels are in the way.

To try a different approach, such as a Kalman filter or ultra-wideband ranging, implement the `ProximityEstimator` interface and pass a `createEstimator` factory to `CarSeatMonitor`.

## Several seats

The app watches every seat at once, with one `BleCarSeatTransport` per seat ([MonitorService.ts](../src/monitor/MonitorService.ts)).

- **Pairing.** The first connect for a seat scans for a car seat that no other seat has claimed (and that the user hasn't rejected with *No, it isn't blinking*), then the transport reports the peripheral's CoreBluetooth identifier and it's saved on the seat (`deviceId`).
- **Reconnecting.** After that, the seat connects straight to that identifier, with no scan, by itself (see [Connecting by itself](#connecting-by-itself)). `react-native-ble-manager` looks the peripheral up by identifier if it hasn't been seen since launch. If iOS has forgotten it, the seat stops and asks the user to pair it again. The identifier is per phone: a caregiver's phone pairs on its own.
- **Scans take turns.** CoreBluetooth has one scan per app, so scans are queued (`exclusiveScan`); **Connect all seats** is safe.
- **Events stay apart.** Every transport ignores notifications and disconnects from peripherals other than its own.
- To pair a seat with different hardware, open the seat and tap **Pair with a different seat**.

## Working without hardware

- **The simulated seat** ([SimulatedCarSeatTransport.ts](../src/ble/SimulatedCarSeatTransport.ts)) implements the same `CarSeatTransport` interface. It goes through `scanning → connecting → connected`, streams readings every second with a little noise, converts the simulated distance to RSSI, and drops to `reconnecting` beyond 20 m or when *Cut power to seat* is on. *Someone else by the seat* makes it report another caregiver's phone as near, the way a real seat counts them. Like a paired seat, it waits in `waiting` if it's out of reach when it connects, and connects once it's back. With the simulator on, every seat counts as paired, so they all connect by themselves. Turn it on in **Settings › Developer options**; then every seat is simulated, each with its own controls on its screen. It's also what the end-to-end tests use.
- **A bare Pico 2 W**: with nothing wired to it, [the firmware](#the-pico-2-w-firmware) reports the chip's temperature, and the BOOTSEL button stands in for the pressure sensor. You can also use a BLE peripheral simulator app, such as LightBlue's virtual devices, on a second device. Advertise the service UUID with the two characteristics and send 2-byte values.
- **Seeing raw BLE traffic**: a scanner app such as nRF Connect shows what the board advertises and lets you read its characteristics. It's the quickest way to check the firmware before blaming the app.

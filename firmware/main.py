# Car-seat sensor for the Raspberry Pi Pico 2 W (MicroPython).
#
# Reads the seat's temperature and pressure once a second and serves them over
# Bluetooth LE to the Seat Watcher app, and tells each caregiver's phone whether
# another caregiver's phone is near the seat. The UUIDs and byte formats are the
# app's contract in src/ble/protocol.ts: change both together. Wiring, flashing
# and troubleshooting: docs/bluetooth-and-firmware.md.
#
# Copy this file to the board as main.py so it starts at power-up.
#
# Wiring (all optional; a bare board works, see USE_FSR):
#   Warning LED  GP15 -> 220-330 ohm resistor -> LED long leg; short leg -> GND
#   SHT4x        SDA -> GP4, SCL -> GP5, VIN -> 3V3, GND -> GND     (USE_SHT4X)
#   Seat FSR     3V3 -> FSR -> FSR_PIN, and FSR_PIN -> 10k ohm -> GND   (USE_FSR)

import struct
import time

import bluetooth
import rp2
from machine import ADC, I2C, Pin
from micropython import const

THRESHOLD_C = 35.0  # warning LED only; the app alerts at the limits in its Settings
HYSTERESIS_C = 0.5
USE_SHT4X = False  # False: the RP2350's built-in sensor, which reads the chip, not the air
USE_FSR = True  # False: no pressure sensor; each BOOTSEL press toggles a pretend occupied seat
FSR_PIN = 26  # GP26-GP28 can all read the FSR; this board's GP27 [32] only reaches the breadboard now and then
DEMO_PRESSURE = 2000  # what the pretend occupied seat reports; the app's default threshold is 500
SAMPLE_MS = 1000  # the app expects a notification about once a second
IDENTIFY_MS = 5000  # how long the board LED blinks fast when the app asks "is this my seat?"
MAX_PHONES = 1  # phones connected at once; stock MicroPython holds 1 (docs/bluetooth-and-firmware.md)

# The contract with the app (src/ble/protocol.ts).
DEVICE_NAME = "CarSeatSensor"
SERVICE_UUID = bluetooth.UUID("c5a10001-7b3e-4f2d-9e61-2b8d4a0f5c10")
TEMPERATURE_UUID = bluetooth.UUID("c5a10002-7b3e-4f2d-9e61-2b8d4a0f5c10")  # int16 LE, 0.01 C
PRESSURE_UUID = bluetooth.UUID("c5a10003-7b3e-4f2d-9e61-2b8d4a0f5c10")  # uint16 LE, raw units
IDENTIFY_UUID = bluetooth.UUID("c5a10004-7b3e-4f2d-9e61-2b8d4a0f5c10")  # write anything: blink
CAREGIVERS_UUID = bluetooth.UUID("c5a10005-7b3e-4f2d-9e61-2b8d4a0f5c10")  # write 1/0: I'm near
NEARBY_FOR_MS = const(6000)  # a phone counts as near this long after it last wrote a 1
TEMPERATURE_UNKNOWN = const(-0x8000)  # Bluetooth SIG "value not known"; the app ignores it

_FLAG_READ = const(0x0002)
_FLAG_WRITE = const(0x0008)
_FLAG_NOTIFY = const(0x0010)
_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)
_ADV_INTERVAL_US = const(100_000)

led = Pin(15, Pin.OUT)
status_led = Pin(
	"LED", Pin.OUT
)  # on the board: slow blink waiting, steady connected, fast blink identifying

if USE_SHT4X:
	i2c = I2C(0, sda=Pin(4), scl=Pin(5), freq=100000)
	SHT_ADDR = 0x44

	def read_temp_c():
		i2c.writeto(SHT_ADDR, b"\xfd")  # measure with high precision
		time.sleep_ms(10)
		data = i2c.readfrom(SHT_ADDR, 6)
		if crc8(data[0:2]) != data[2]:
			raise OSError("SHT4x CRC mismatch")
		raw = (data[0] << 8) | data[1]
		return -45 + 175 * raw / 65535

	def crc8(data):
		# Sensirion's CRC-8: polynomial 0x31, initial value 0xFF.
		crc = 0xFF
		for byte in data:
			crc ^= byte
			for _ in range(8):
				crc = ((crc << 1) ^ 0x31) & 0xFF if crc & 0x80 else (crc << 1) & 0xFF
		return crc
else:
	sensor = ADC(4)  # the built-in temperature sensor

	def read_temp_c():
		# One ADC step is about 0.5 C and the radio adds noise, so average 16
		# readings spread over 16 ms rather than taking one.
		total = 0
		for _ in range(16):
			total += sensor.read_u16()
			time.sleep_ms(1)
		volts = total / 16 * 3.3 / 65535
		return 27 - (volts - 0.706) / 0.001721


if USE_FSR:
	fsr = ADC(Pin(FSR_PIN))

	def read_pressure():
		return fsr.read_u16() >> 4  # 0-4095, like a 12-bit ADC; more weight reads higher

	def poll_button():
		return False
else:
	demo_occupied = False
	bootsel_was_down = False

	def read_pressure():
		return DEMO_PRESSURE if demo_occupied else 0

	def poll_button():
		"""Each BOOTSEL press puts the pretend baby in or takes it out. True on a press."""
		global demo_occupied, bootsel_was_down
		down = rp2.bootsel_button() == 1
		pressed = down and not bootsel_was_down
		bootsel_was_down = down
		if pressed:
			demo_occupied = not demo_occupied
			print("Demo seat:", "occupied" if demo_occupied else "empty")
		return pressed


def encode_temperature(temp_c):
	if temp_c is None or not -273 < temp_c < 327:  # int16 hundredths can't hold more
		return struct.pack("<h", TEMPERATURE_UNKNOWN)
	return struct.pack("<h", round(temp_c * 100))


def ad_field(ad_type, value):
	return bytes((len(value) + 1, ad_type)) + value


class CarSeatPeripheral:
	"""The Bluetooth side: one service with temperature, pressure, identify and caregivers characteristics."""

	def __init__(self):
		self._ble = bluetooth.BLE()
		self._ble.active(True)
		self._ble.config(gap_name=DEVICE_NAME)
		self._ble.irq(self._irq)
		(
			(
				self._temp_handle,
				self._pressure_handle,
				self._identify_handle,
				self._caregivers_handle,
			),
		) = self._ble.gatts_register_services(
			(
				(
					SERVICE_UUID,
					(
						(TEMPERATURE_UUID, _FLAG_READ | _FLAG_NOTIFY),
						(PRESSURE_UUID, _FLAG_READ | _FLAG_NOTIFY),
						(IDENTIFY_UUID, _FLAG_WRITE),
						(CAREGIVERS_UUID, _FLAG_WRITE | _FLAG_NOTIFY),
					),
				),
			)
		)
		# Each connected phone, and the ticks_ms until which it counts as near
		# (None: it hasn't said it's near, or said it isn't).
		self._connections = {}
		self.identify_until = None  # ticks_ms when the fast blink ends, while it lasts
		# An advertisement holds 31 bytes: enough for the flags and the 128-bit
		# service UUID, but not the name too, so the name goes in the scan
		# response. The app matches on either.
		self._adv_data = ad_field(0x01, b"\x06") + ad_field(0x07, bytes(SERVICE_UUID))
		self._resp_data = ad_field(0x09, DEVICE_NAME.encode())
		self._advertise()

	@property
	def connected(self):
		return bool(self._connections)

	@property
	def phone_count(self):
		return len(self._connections)

	@property
	def near_count(self):
		return len(self._near_phones())

	def publish(self, temp_c, pressure):
		"""Stores the readings for reads and notifies every connected phone."""
		for handle, value in (
			(self._temp_handle, encode_temperature(temp_c)),
			(self._pressure_handle, struct.pack("<H", pressure)),
		):
			self._ble.gatts_write(handle, value)
			for conn in tuple(self._connections):
				try:
					self._ble.gatts_notify(conn, handle)
				except OSError:
					pass  # the link is going down; the disconnect event follows
		self._send_nearby()

	def _near_phones(self):
		now = time.ticks_ms()
		# A copy: a Bluetooth event can change the connections mid-loop.
		return {
			conn
			for conn, until in tuple(self._connections.items())
			if until is not None and time.ticks_diff(until, now) > 0
		}

	def _send_nearby(self):
		"""Tells each phone how many of the other phones are near the seat."""
		near = self._near_phones()
		for conn in tuple(self._connections):
			others = len(near) - (1 if conn in near else 0)
			try:
				self._ble.gatts_notify(conn, self._caregivers_handle, bytes((others,)))
			except OSError:
				pass  # the link is going down; the disconnect event follows

	def close(self):
		self._ble.irq(None)  # or the disconnect event tries to advertise on a radio that's off
		self._ble.active(False)

	def _advertise(self):
		self._ble.gap_advertise(
			_ADV_INTERVAL_US, adv_data=self._adv_data, resp_data=self._resp_data
		)

	def _irq(self, event, data):
		if event == _IRQ_CENTRAL_CONNECT:
			self._connections[data[0]] = None
			print("Phone connected")
			if len(self._connections) < MAX_PHONES:
				self._advertise()  # room for another caregiver's phone
		elif event == _IRQ_CENTRAL_DISCONNECT:
			self._connections.pop(data[0], None)
			print("Phone disconnected; advertising again")
			self._advertise()
			self._send_nearby()
		elif event == _IRQ_GATTS_WRITE and data[1] == self._identify_handle:
			self.identify_until = time.ticks_add(time.ticks_ms(), IDENTIFY_MS)
			print("Identify: blinking")
		elif event == _IRQ_GATTS_WRITE and data[1] == self._caregivers_handle:
			if data[0] in self._connections:
				value = self._ble.gatts_read(self._caregivers_handle)
				near = len(value) > 0 and value[0] == 1
				until = time.ticks_add(time.ticks_ms(), NEARBY_FOR_MS) if near else None
				self._connections[data[0]] = until
				self._send_nearby()


def sample(seat):
	try:
		temp = read_temp_c()
	except OSError:
		print("Sensor read failed - check wiring")
		temp = None
	pressure = read_pressure()
	seat.publish(temp, pressure)

	if temp is None:
		led.off()
	elif temp > THRESHOLD_C:
		led.on()
	elif temp < THRESHOLD_C - HYSTERESIS_C:
		led.off()

	print(
		"Temp:",
		"--" if temp is None else round(temp, 1),
		"C  Pressure:",
		pressure,
		" LED:",
		"ON" if led.value() else "OFF",
		" Phones:",
		"%d connected, %d near" % (seat.phone_count, seat.near_count) if seat.connected else "waiting",
	)


def run(seat):
	next_sample = time.ticks_ms()
	while True:
		now = time.ticks_ms()
		if poll_button():
			next_sample = now  # send the change right away
		if time.ticks_diff(now, next_sample) >= 0:
			next_sample = time.ticks_add(now, SAMPLE_MS)
			sample(seat)
		if seat.identify_until is not None and time.ticks_diff(seat.identify_until, now) <= 0:
			seat.identify_until = None
		if seat.identify_until is not None:
			status_led.value((now // 100) % 2)
		else:
			status_led.value(seat.connected or (now // 500) % 2)
		time.sleep_ms(50)


seat = CarSeatPeripheral()
print("Advertising as", DEVICE_NAME)
try:
	run(seat)
finally:
	# Stopped (Ctrl-C from Thonny or mpremote) or crashed: switch the radio off so
	# the phone sees the seat go away instead of a reading that never changes.
	seat.close()
	led.off()
	status_led.off()

# Wiring self-test for the car-seat board (Pico 2 W, MicroPython).
#
# Checks the FSR circuit on FSR_PIN and the warning LED on GP15 without a
# multimeter, using the chip's own ~50 kohm pull resistors as test probes. It
# runs from RAM and leaves main.py on the board alone; reset afterwards:
#
#   mpremote run firmware/diagnose.py
#   mpremote reset
#
# For LIVE_S seconds at the end it blinks both LEDs and prints FSR_PIN: press the
# FSR and watch. Reading the results: docs/bluetooth-and-firmware.md.

import os
import time

import machine
from machine import ADC, Pin
from micropython import const

LIVE_S = 30
THRESHOLD_C = 35.0  # main.py's warning-LED threshold
FSR_PIN = 26  # main.py's FSR_PIN
FSR = "GP%d" % FSR_PIN

# MicroPython's Pin turns a pad's digital input on along with its pull, and on
# the RP2350 that input leaks enough to hold a pulled-down pin near 2 V
# (erratum RP2350-E9). So the pulls are set in the pad register with the input
# left off; the ADC still reads the pin.
PADS_BANK0 = 0x40038000 if "RP2350" in os.uname().machine else 0x4001C000
_PUE = const(0x08)
_PDE = const(0x04)
ADC_PINS = (26, 27, 28)
PIN_NAMES = {26: "GP26 [31]", 27: "GP27 [32]", 28: "GP28 [34]"}


def pad(gp):
	return PADS_BANK0 + 4 + 4 * gp


def average(adc):
	total = 0
	for _ in range(16):
		total += adc.read_u16() >> 4
	return total // 16


def read(gp, pulls=0):
	"""The pin's voltage, 0-4095, with the given pull bits on and its digital input off."""
	adc = ADC(Pin(gp))  # analog mode: no pulls, digital input off
	machine.mem32[pad(gp)] |= pulls
	time.sleep_ms(5)
	value = average(adc)
	machine.mem32[pad(gp)] &= ~(_PUE | _PDE)
	return value


def describe(up, down):
	"""What a pin is wired to, from its readings with the pull-up and with the pull-down."""
	if up < 200 and down < 200:
		return "wired straight to GND"
	if up > 3900 and down > 3900:
		return "wired straight to 3V3"
	if up > 3000 and down < 300:
		return "OPEN: no path to GND or 3V3, so it floats like a bare pin"
	if down < 300:
		return "a resistor to GND (about %d kohm)" % round(50 * up / (4095 - up))
	if up > 3000:
		return "a resistor to 3V3 (about %d kohm; a pressed FSR does this)" % round(
			50 * (4095 - down) / down
		)
	return "resistors to both GND and 3V3 (the 10 kohm plus a pressed FSR)"


def linked(a, b):
	"""True when a wire or resistor joins pins a and b: pulled opposite ways, they meet in between."""
	adc_a, adc_b = ADC(Pin(a)), ADC(Pin(b))
	machine.mem32[pad(a)] |= _PUE
	machine.mem32[pad(b)] |= _PDE
	time.sleep_ms(5)
	va, vb = average(adc_a), average(adc_b)
	machine.mem32[pad(a)] &= ~_PUE
	machine.mem32[pad(b)] &= ~_PDE
	return va < 3000 and vb > 1000


def chip_temperature():
	sensor = ADC(4)
	volts = sum(sensor.read_u16() for _ in range(16)) / 16 * 3.3 / 65535
	return 27 - (volts - 0.706) / 0.001721


def check_temperature():
	temp = chip_temperature()
	print("Chip temperature: %.1f C" % temp)
	if temp <= THRESHOLD_C:
		print(
			"  main.py lights the GP15 LED only above %.1f C, so it stays off here even when wired right."
			% THRESHOLD_C
		)


def check_pins():
	print("\nPins (each tested with the chip's pull-up, then its pull-down):")
	floating = []
	for gp in ADC_PINS:
		up, down = read(gp, _PUE), read(gp, _PDE)
		state = describe(up, down)
		print("  %s: pull-up %4d, pull-down %4d -> %s" % (PIN_NAMES[gp], up, down, state))
		if state.startswith("OPEN"):
			floating.append(gp)
	for i, a in enumerate(floating):
		for b in floating[i + 1 :]:
			if linked(a, b):
				print("  %s and %s are joined to each other" % (PIN_NAMES[a], PIN_NAMES[b]))
	spares = " and ".join("GP%d" % gp for gp in ADC_PINS if gp != FSR_PIN)
	print("  %s aren't for the FSR: unwired, they show what a bare pin reads." % spares)
	print("  A working FSR circuit, unpressed, shows %s as a resistor to GND (about 10 kohm)." % FSR)


def live():
	print("\nFor %d s: both LEDs blink once a second. Press the FSR hard a few times." % LIVE_S)
	print("  The board LED shows the blink you should see on the red LED.")
	print("  'press' climbs when the FSR pulls %s up; 'ground' stays near 680 while the 10 kohm holds it down." % FSR)
	print("  Hunting a loose contact? Wiggle one wire end at a time: 'ground' drops the moment %s reaches GND." % FSR)
	led, board_led = Pin(15, Pin.OUT), Pin("LED", Pin.OUT)
	highest, lowest_ground = 0, 4095
	start = time.ticks_ms()
	while time.ticks_diff(time.ticks_ms(), start) < LIVE_S * 1000:
		on = (time.ticks_diff(time.ticks_ms(), start) // 1000) % 2 == 0
		led.value(on)
		board_led.value(on)
		press, ground = read(FSR_PIN, _PDE), read(FSR_PIN, _PUE)
		highest = max(highest, press)
		lowest_ground = min(lowest_ground, ground)
		print("  LEDs %-3s  %s press %4d  ground %4d" % ("ON" if on else "off", FSR, press, ground))
		time.sleep_ms(500)
	led.off()
	board_led.off()

	print("\nResults:")
	if highest > 1000:
		print("  The FSR pulled %s up to %d: its pin, the FSR and the 3V3 supply all work." % (FSR, highest))
	else:
		print(
			"  %s never rose (highest %d). Either the FSR wasn't pressed, or the path"
			" %s -> FSR -> 3V3 is open." % (FSR, highest, FSR)
		)
	if lowest_ground > 3000:
		print("  Nothing ever pulled %s toward GND: the 10 kohm -> GND path is open." % FSR)
	print("  If the board LED blinked and the red one didn't, check the red LED's legs:")
	print("  long leg toward the resistor and GP15, short leg (flat side) toward GND.")


print("Car-seat wiring self-test (%s)" % os.uname().machine)
check_temperature()
check_pins()
live()
print("\nDone. 'mpremote reset' starts main.py again.")

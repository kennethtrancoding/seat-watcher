/**
 * Every word the app shows, says or sends, in English. es.ts has the same
 * keys in Spanish, and its type is checked against this file, so a missing
 * string is a type error. Read them through strings() or useStrings() (see
 * i18n.ts), not by importing this file.
 *
 * Text that depends on something takes the raw facts (the child's name, a
 * number), not finished phrases, so each language can build its own grammar:
 * "Emma's seat" here is "el asiento de Emma" in Spanish. An empty child name
 * means it isn't set yet.
 *
 * How the app talks: docs/design.md › Voice. Pure: no React or native imports.
 */

/** "Emma's seat", or "the car seat" until a name is set. */
function seat(childName: string, startOfSentence = false): string {
	if (childName) return `${childName}'s seat`;
	return startOfSentence ? "The car seat" : "the car seat";
}

/** "Emma", or "your little one" until a name is set. */
const child = (childName: string) => childName || "your little one";

/** "Emma and Leo", "Emma, Leo and Ava". */
function list(items: readonly string[]): string {
	return items.length <= 2
		? items.join(" and ")
		: `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

const PROTOTYPE_NOTE =
	"Just so you know: this is a prototype. Distance is only a rough guess, and alerts only go off when someone's in the seat. Always peek in the back seat!";

const CRITICAL_ALERTS_OFF =
	"Alerts stay quiet while your phone is on Silent. To make them ring anyway, turn on Critical Alerts under Notifications in Settings.";

export const en = {
	/** The app's name. A brand, so it's the same in every language. */
	appName: "Seat Watcher",

	common: {
		continue: "Continue",
		cancel: "Cancel",
		back: "Back",
		remove: "Remove",
		saveName: "Save name",
		skipForNow: "Skip for now",
		tryAgain: "Try again",
		/** Opens the iPhone's Settings app. */
		openSettings: "Open Settings",
		restoreDefaults: "Restore defaults",
		changesSave: "Changes save automatically.",
		useSimulatedSeat: "Use the simulated seat",
		useSimulatedCarSeat: "Use the simulated car seat",
		firstName: "First name",
		yourFirstName: "Your first name",
		childName: "Child's name",
		/** The suffix on fields in minutes. */
		minutes: "min",
		someone: "Someone",
		inTheSeat: "In the seat",
		watching: "Watching",
		/** "Please check on Emma". */
		checkOn: (childName: string) => `Please check on ${child(childName)}`,
		readAloud: "Read screens aloud",
		readAloudOn: "Okay! We'll read each screen out loud.",
		textSize: "Text size",
		relationship: "You're the child's…",
		prototypeNote: PROTOTYPE_NOTE,
		criticalAlertsOff: CRITICAL_ALERTS_OFF,
	},

	seats: {
		/** "Emma's seat" in a sentence; "The car seat" at the start of one. */
		name: seat,
		/** A heading: the seat's screen, its card, its status line. */
		title: (childName: string) => seat(childName, true),
		/** Every seat, all of them named: "Emma's and Leo's seats". */
		named: (childNames: readonly string[]) => `${list(childNames.map((n) => `${n}'s`))} seats`,
		/** Every seat, when some aren't named yet. */
		yours: "your car seats",
		nameTooLong: (max: number) => `Use at most ${max} characters.`,
	},

	alerts: {
		labels: {
			temperatureHigh: "Too hot",
			temperatureLow: "Too cold",
			tooFar: "Too far away",
			connectionLost: "Lost touch",
		},
		/** In place of the temperature, if there's no reading. */
		unknown: "unknown",
		tooHot: (childName: string, temperature: string) => ({
			title: `${seat(childName, true)} is too hot!`,
			body: `It's ${temperature} in there. Please check on ${child(childName)} now.`,
		}),
		tooCold: (childName: string, temperature: string) => ({
			title: `${seat(childName, true)} is too cold!`,
			body: `It's ${temperature} in there. Please check on ${child(childName)} now.`,
		}),
		tooFar: (childName: string, distance: string) => ({
			title: childName ? `Don't forget ${childName}!` : "Don't forget your little one!",
			body: `You're about ${distance} away. Is ${child(childName)} still in the car?`,
		}),
		connectionLost: (childName: string) => ({
			title: `Lost touch with ${seat(childName)}`,
			body: `Someone was still in the seat. Please check on ${child(childName)}.`,
		}),
		buckledIn: (childName: string) =>
			childName ? `${childName} is all buckled in!` : "Little passenger on board!",
		outOfSeat: (childName: string) =>
			childName ? `${childName} is out of the seat!` : "Little passenger is out of the seat!",
		practice: (childName: string) => ({
			title: `Practice: ${seat(childName)} is too hot!`,
			body: "Just practicing! A real alert looks and sounds just like this.",
		}),
	},

	/** After "Emma's seat: " on the status line. */
	status: {
		needsYou: "needs you now!",
		lookingGood: "looking good!",
		lostTouch: "lost touch!",
		connecting: "connecting…",
		waiting: "we'll connect when you're close…",
		notConnected: "not connected…",
	},

	/** "Good morning, Kenneth", by the hour of the day (0–23). */
	greeting(name: string | null, hour: number): string {
		const part =
			hour < 5
				? "Hi"
				: hour < 12
					? "Good morning"
					: hour < 17
						? "Good afternoon"
						: "Good evening";
		return name ? `${part}, ${name}` : part === "Hi" ? "Hi there" : part;
	},

	account: {
		relationships: {
			parent: "Parent",
			grandparent: "Grandparent",
			sitter: "Sitter or nanny",
			family: "Other family",
			other: "Friend or other",
		},
		/** "Kenneth (Grandparent)". */
		described: (name: string, relationship: string) => `${name} (${relationship})`,
		you: "You",
		since: (monthYear: string) => `On this phone since ${monthYear}`,
		deleteTitle: "Delete your account?",
		deleteBody:
			"This deletes your account and your own team, takes you off the teams you help, and erases your seats and settings from this phone. You can't undo this.",
		delete: "Delete",
		aboutYou: "About you",
		nameHint: "We greet you with it, and put it in invites you send.",
		phoneNumber: "Phone number",
		noneYet: "None yet",
		changeNumber: "Change number",
		changeNumberHint:
			"We'll text the new number a code to make sure it's yours. Your seats and settings stay put.",
		yourData: "Your data",
		whereKept: "Where things are kept",
		whereKeptHint: (seatCount: number) =>
			`Your name, number and teams, ${seatCount === 1 ? "your car seat" : "your car seats"} and your settings are saved with your account, so they come back when you log in again, even after someone else used this phone. Seats other people share with you follow their teams. For now the account server is pretend: it lives on this phone too.`,
		logOut: "Log out",
		logOutHint:
			"While you're logged out, we stop watching the seats. Log back in any time. Everything will be right here!",
		logOutTitle: "Log out?",
		logOutBody: (seats: string) => `We'll stop watching ${seats} until you log back in.`,
		deleteAccount: "Delete account",
	},

	settings: {
		errors: {
			number: "Enter a number.",
			temperatureGap: "Keep this at least 1 °C (about 2 °F) below the too-hot number.",
			distance: (low: number, high: number, unit: string) => `Use ${low}–${high} ${unit}.`,
			positive: "Must be greater than 0.",
			cooldown: "Use 0.5–60 minutes.",
			rssi: "Use −100 to −20 dBm.",
			pathLoss: "Use 1–6.",
			backupAfter: "Use 1–60 minutes.",
		},
		textSizes: { standard: "Standard", large: "Large", extraLarge: "Extra large" },
		yourAccount: "Your account",
		loggedInAs: (phone: string) => `Logged in as ${phone}`,
		notLoggedIn: "Not logged in",
		accountAndLogOut: "Account and log out",
		comfort: "Comfort",
		readAloudHint: "No need if you use VoiceOver.",
		language: "Language",
		languageSystem: "Same as phone",
		units: "Units",
		temperature: "Temperature",
		fahrenheit: "°F Fahrenheit",
		celsius: "°C Celsius",
		distance: "Distance",
		feet: "Feet",
		metres: "Meters",
		tooHotAbove: "Too hot above",
		tooColdBelow: "Too cold below",
		alertPast: "Too far past",
		distanceHint: (unit: "ft" | "m") =>
			`Distance is only a rough guess. It can be off by ${unit === "ft" ? "10 feet" : "several meters"} or more.`,
		personalSettings: "Personal settings",
		inAndOut: "In and out of the seat",
		notifyInAndOut: "Tell me when someone gets in or out",
		notifyInAndOutHint:
			'A little note like "All buckled in!" Hot, cold and distance alerts always come through.',
		seatScreen: "Seat screen",
		showPressure: "Show pressure and threshold",
		showPressureHint: (threshold: number) =>
			`Adds the pressure sensor's reading, and the reading that counts as occupied (${threshold}), under "In the seat".`,
		showSignal: "Show Bluetooth signal",
		showSignalHint:
			'Adds the signal strength under "Distance", in dBm. Closer to 0 means a stronger signal.',
		reachThemAfter: "Let helpers know after",
		reachThemHint:
			"If no one answers an alert by then, we'll let the helpers on your team know too.",
		findTheSeat: "Find the car seat",
		shortcut: (app: string) => `${app} shortcut`,
		rememberLocation: "Remember where the seat was last seen",
		rememberLocationOff:
			"While you're connected, we'll save where the seat is, so after an alert you can find it in Maps or share it. It stays on this phone.",
		rememberLocationWhileOpen:
			'Right now this only updates while the app is open. To keep it current while your phone is locked, set Location to "Always" in the Settings app.',
		rememberLocationOn:
			"Updated every 30 seconds while connected, and once more if we lose touch. It stays on this phone.",
		locationDenied:
			"Location access is off for this app. Allow it in the Settings app to use this.",
		developerOptions: "Developer options",
		/** The heading over the settings for your own seats. */
		yourSeats: "Your seats",
		/** What they're set to: "Too hot above 95°F, too cold below 50°F, too far past 16 ft." */
		yourSeatsSummary: (tooHot: string, tooCold: string, tooFar: string) =>
			`Too hot above ${tooHot}, too cold below ${tooCold}, too far past ${tooFar}.`,
		/** `seats` is "Emma's and Leo's seats", or '' before you've added one. */
		yourSeatsHint: (seats: string) =>
			seats
				? `For ${seats}. Your helpers' phones use them too, so everyone gets the same alerts.`
				: "For the seats you add. Your helpers' phones will use them too, so everyone gets the same alerts.",
		sharedFollowOwner:
			"Seats shared with you follow the settings of the person who shares them.",
		seatSettings: "Settings for your seats",
		/** Between the settings for your seats and the rest. */
		thisPhone: "The rest are just for you, on this phone, for every seat you watch.",
	},

	/** Settings › Settings for your seats. */
	seatSettings: {
		intro: (seats: string) =>
			seats
				? `These are for ${seats}. They go with your seats: your helpers' phones use them too, so everyone gets the same alerts.`
				: "These are for the seats you add. They go with your seats: your helpers' phones will use them too, so everyone gets the same alerts.",
		sharedNote:
			"Seats shared with you follow the settings of the person who shares them. Each seat's screen shows what they are.",
		helpers: "Your helpers",
	},

	developer: {
		intro: "These are for testing and tuning the prototype. The defaults are fine for everyday use.",
		seat: "Seat",
		simulated: "Simulated car seat",
		simulatedHint:
			"A pretend seat instead of the real hardware, for demos and the iOS Simulator. Its controls appear on the main screen.",
		occupiedAt: "Occupied at pressure ≥",
		currentReading: (pressure: number) =>
			`Current reading: ${pressure}. Pick a value between the empty and occupied readings.`,
		rawUnits: "In the sensor's raw units. Compare the empty and occupied readings to choose.",
		ownSeatsOnly:
			"Like the settings for your seats, this goes with your own seats to your helpers' phones. Seats shared with you use their owner's.",
		calibration: "Distance calibration",
		signalAt1m: "Signal at 1 m (3.3 ft)",
		signalAt1mHint:
			"Hold the phone 1 m (about 3 ft) from the seat for a few seconds, then tap below.",
		useCurrentSignal: (dbm: number) => `Use current signal (${dbm} dBm)`,
		connectToCalibrate: "Connect to calibrate",
		pathLoss: "Path-loss exponent",
		pathLossHint:
			"2 for open air; 2.5–4 when pockets, people or the car are in the way. Higher means fewer false alarms.",
		alerts: "Alerts",
		repeatEvery: "Repeat while active every",
		repeatHint:
			"A new problem alerts right away. The same alert won't repeat sooner than this.",
		startOver: "Start over",
		restoreDefaultsHint:
			"Puts every setting back the way it came, here and in Settings, including the language, text size and simulated seat. The saved last-seen location is forgotten. Your seats, account and team stay.",
		runSetupAgain: "Run setup again",
		runSetupAgainHint:
			"Logs out and walks through setup again. Your child and settings stay, and so do your account and team.",
		factoryReset: "Reset to factory settings",
		factoryResetHint:
			"Right away, with no undo: disconnects the seat, erases everything the app saved on this phone (your child, photo, settings, last-seen location), logs out, empties the pretend account server (every account, team and invite on it) and goes back to the first screen. Permissions you gave stay on; change those in the iPhone's Settings app.",
		accountServer: "Account server",
		accountServerHint:
			"Accounts, teams and invites are kept by a pretend server on this phone. Reset to factory settings empties it too.",
		acceptInvites: "Pretend invites were accepted",
		acceptInvitesHint:
			"Made-up helpers join for every invite still waiting, so your team fills in without a second phone. They're marked Pretend.",
		acceptedInvites: (count: number) =>
			count === 0
				? "No invites are waiting."
				: `${count} made-up ${count === 1 ? "helper" : "helpers"} joined.`,
		resetServer: "Reset the account server",
		resetServerHint:
			"Forgets every team, invite and other account on it. You stay logged in, with no teams, and seats shared with you come off this phone.",
		serverReset: "The account server is empty again.",
		teamAlerts: "Team alerts",
		teamAlertsHint:
			"When no one is left with a seat, the last phone to leave alerts, and the account server tells whoever set up the seats right away, then everyone else after the wait in Settings › Settings for your seats, unless the alert ends first. When a seat gets too hot, everyone on the team hears right away, even with someone by the seat. This pretend server can't reach other phones, so it shows who it would tell.",
		noTeamAlerts: "No team alerts yet.",
		teamAlert: (
			kind: "leftAlone" | "tooHot",
			childName: string,
			time: string,
			endedAt: string | null,
		) => {
			const what =
				kind === "tooHot"
					? `${seat(childName, true)} got too hot`
					: `No one was with ${child(childName)}`;
			return endedAt
				? `${what}, ${time} (over at ${endedAt})`
				: `${what}, ${time} (still going)`;
		},
		alertRaised: (kind: "leftAlone" | "tooHot", name: string, time: string) =>
			kind === "tooHot"
				? `${name}'s phone noticed first and alerted at ${time}`
				: `${name} was the last to leave; their phone alerted at ${time}`,
		ownerTold: (name: string, time: string) => `${name}, who set up the seats: told at ${time}`,
		helperTold: (name: string, time: string) => `${name}: told at ${time}`,
		helperToldLater: (name: string, time: string) => `${name}: at ${time}, if it's still going`,
	},

	locate: {
		apps: {
			showFindMy: {
				name: "Find My",
				description: "Find an AirTag on the car seat, or see where your family is.",
			},
			showLife360: {
				name: "Life360",
				description: "See where your Circle is, or find a Tile tracker on the car seat.",
			},
		},
		/** The pin's label in Maps. */
		pin: "Car seat",
		share: (seenAt: string, mapUrl: string) =>
			`The car seat was last seen here at ${seenAt}: ${mapUrl}`,
		shareWithAlerts: (alerts: readonly string[], location: string) =>
			`Car seat alert: ${alerts.join(", ")}. ${location}`,
		title: "Find the car seat",
		lastSeen: (seenAt: string) => `Last seen at ${seenAt}`,
		noSpotYet: "No spot saved yet. We'll save one while you're connected to the seat.",
		openInMaps: "Open in Maps",
		shareLocation: "Share location",
		open: (app: string) => `Open ${app}`,
	},

	invite: {
		/** The text the parent sends, before the link. `seats` is from seatsPhrase. */
		message: (from: string, seats: string, link: string) =>
			`${from ? `It's ${from}! ` : ""}Would you help me keep an eye on ${seats}? Install Seat Watcher, then open this link: ${link}`,
	},

	/** The page invite links open (src/app/invite.tsx). */
	inviteLink: {
		joinTitle: (from: string) => (from ? `Join ${from}'s team?` : "Join this team?"),
		joinBody: (from: string, seats: string, seatCount: number) =>
			`${from || "Someone"} is asking for your help watching ${seats}. You can pair with ${seatCount === 1 ? "it" : "them"} from this phone once you're close by.`,
		join: "Join the team",
		notNow: "Not now",
		joinedBody: (seats: string) =>
			`We added ${seats} to your home screen. Tap a seat to pair with it when you're close by.`,
		done: "Go to my seats",
		logInTitle: (from: string) =>
			from ? `Log in to join ${from}'s team` : "Log in to join the team",
		logInBody: "We'll text you a code. No password needed!",
		brokenTitle: "This invite link isn't complete",
		brokenBody:
			"Ask for a new invite, or copy the whole text message and paste it into the app.",
		toApp: "Go to the app",
	},

	signIn: {
		phoneHelp: "We need a 10-digit number, or one that starts with + if it's international.",
		demoNotice: "Demo mode: no text gets sent, so any 6 digits will do.",
		errors: {
			tooSoon: "We just sent you a code. Give it a minute, then you can ask for another.",
			cantText:
				"We couldn't text that number. Check that it's right and can get text messages.",
			badNumber: "That phone number doesn't look right. Check it and try again.",
			notSwitchedOn: "Logging in by text isn't switched on for this app yet.",
			noNewAccounts:
				"New accounts aren't open right now. Try a number that's already been used here.",
			notConfirmed: "We couldn't confirm this request. Wait a moment and try again.",
			general: "Hmm, that didn't go through. Check that you're online and try again.",
			couldntSend:
				"Hmm, we couldn't send the code. Check that you're online and give it another try.",
			couldntCheck:
				"Hmm, we couldn't check the code. Check that you're online and try again.",
			wrongCode:
				"That code didn't match, or it's expired. Double-check it, or we can send you a fresh one.",
			sameNumber: "That's already your number.",
		},
		alreadyTitle: "You're already logged in",
		alreadyBody: (phone: string) => `We've got you down as ${phone}.`,
		differentNumber: "Use a different number",
		welcomeBack: (name: string) => (name ? `Welcome back, ${name}!` : "Welcome back!"),
		welcomeBackBody: (seats: string) =>
			`Log in and we'll watch ${seats} again. We'll text you a code. No password needed!`,
		/** For welcomeBackBody, before any seat is added. */
		yourSeat: "your car seat",
		newNumberTitle: "What's your new number?",
		newNumberBody:
			"We'll text it a code to make sure it's yours. Your seats and settings stay put.",
		numberTitle: "What's your number?",
		numberBody: "We'll text you a code to log in. No password to make up or remember!",
		textMeACode: "Text me a code",
		yourNewNumber: "Your new number",
		yourNumber: "Your phone number",
		codeTitle: "Check your texts",
		codeBody: (digits: number, phone: string) =>
			`We just sent a ${digits}-digit code to ${phone}. Pop it in below.`,
		sendNewCode: "Send a new code",
		yourCode: "Your code",
		logInAs: (phone: string) => `Log in as ${phone}`,
		/** The login screen's way to someone else's account, or a new one. */
		otherAccount: "Use or create another account",
		otherTitle: "Who's logging in?",
		otherBody:
			"Type your number. If you're new here, we'll make your account and set up this phone for you.",
		restoreTitle: (name: string) => (name ? `Welcome back, ${name}!` : "Welcome back!"),
		restoreBody: (seats: string) =>
			`We found ${seats} and your settings, saved with your account. Want them back on this phone?`,
		restore: "Bring them back",
		restoreSkip: "Start from scratch",
		profileTitle: "Nice to meet you!",
		profileBody: "What should we call you? We'll use it to greet you, and in invites you send.",
	},

	ble: {
		tooSlow: "The car seat took too long to answer. Give it another try.",
		notConnected: "Not connected to the car seat.",
		notFound: "We couldn't find a car seat. Make sure it's on and close by.",
		offWillConnect: "Bluetooth is turned off. We'll connect as soon as you turn it on.",
		offReconnect: "Bluetooth is turned off. Turn it on to reconnect.",
		lostTrack:
			'Your phone has lost track of this seat. Tap "Pair with a different seat" to find it again.',
		off: "Bluetooth is turned off. Turn it on in Control Center.",
		denied: "Bluetooth permission is off. Allow it in Settings › Seat Watcher.",
		unsupported:
			'This device has no Bluetooth (the iOS Simulator doesn\'t). Turn on "Simulated car seat" in Settings › Developer options.',
		notReady: "Bluetooth isn't ready yet. Try again in a moment.",
		general: "Something went wrong talking to the car seat.",
		/** The simulated seat's device name. */
		simulatedSeat: "Simulated seat",
		/** Why monitoring can't run in Expo Go. */
		unavailable:
			"Bluetooth isn't available in this build (Expo Go can't use it). Use a development build, or turn on the simulated car seat.",
	},

	/** Header titles. */
	nav: {
		home: "Car seats",
		settings: "Settings",
		addSeat: "Add a car seat",
		pairSeat: "Pair the seat",
		account: "Account",
		changeNumber: "Change number",
		developer: "Developer",
		team: "Your team",
		seatSettings: "Your seats",
	},

	home: {
		noSeats: "Let's add your first car seat.",
		checkOn: (childNames: readonly string[]) =>
			`Please check on ${list(childNames.map(child))}.`,
		allGood: "All seats are looking good!",
		waitingForYou: (seatCount: number) =>
			`We'll connect when you're close to ${seatCount === 1 ? "the seat" : "your seats"}.`,
		connectToStart: (seatCount: number) =>
			`Connect ${seatCount === 1 ? "the seat" : "a seat"} and we'll start watching.`,
		someConnected: (connected: number, total: number) =>
			`${connected} of ${total} seats connected.`,
		openSeat: (childName: string) => `Open ${seat(childName)}`,
		notificationsOff:
			"Heads up! Notifications are off, so we can't reach you when the app is closed.",
		allowCriticalAlerts: "Allow Critical Alerts",
		criticalAlertsAsk:
			"Alerts can ring even when your phone is on Silent. Tap below, then allow Critical Alerts.",
		connectAll: "Connect all seats",
		addAnother: "Add another car seat",
		addSeat: "Add a car seat",
		/** Headings, once some seats are shared with you: yours, then each team's. */
		yourSeats: "Your seats",
		sharedBy: (owner: string) => (owner ? `Shared by ${owner}` : "Shared with you"),
	},

	seat: {
		links: {
			idle: "Not connected",
			scanning: "Looking for the seat…",
			connecting: "Connecting…",
			waiting: "We'll connect when you're close",
			connected: "Connected",
			reconnecting: "Lost touch. Trying again…",
		},
		removeTitle: (childName: string) => `Remove ${seat(childName)}?`,
		removeBody: "We'll stop watching it and forget its photo and last-seen spot.",
		tooHot: "Too hot",
		tooCold: "Too cold",
		justRight: "Just right",
		tooFar: "Too far",
		closeBy: "Close by",
		/** In place of "Too far" while other caregivers are near the seat, so there's no alert. */
		othersClose: (count: number) =>
			count === 1 ? "Someone else is close by" : `${count} others are close by`,
		simulated: (deviceName: string) => `${deviceName} (simulated)`,
		disconnect: "Disconnect",
		pair: "Pair with the seat",
		connect: "Connect to the seat",
		noOne: "No one",
		pressure: (pressure: number, threshold: number) =>
			`Pressure ${pressure} · occupied at ≥ ${threshold}`,
		occupiedAt: (threshold: number) => `Occupied at pressure ≥ ${threshold}`,
		temperature: "Temperature",
		/** "Safe range 50–95°F": `low` is just the number, `high` has the unit. */
		safeRange: (low: string, high: string) => `Safe range ${low}–${high}`,
		distance: "How far you are (about)",
		signal: (dbm: number, limit: string) => `Signal ${dbm} dBm · alert past ${limit}`,
		alertPast: (limit: string) => `We'll alert you past ${limit}`,
		stale: "These are the last readings from before we lost touch.",
		about: "About this seat",
		nameHint: "Alerts for this seat use this name.",
		hardware: "Seat hardware",
		usingSimulator: "Using the simulated seat.",
		pairedWith: (deviceName: string | null) =>
			`Paired with ${deviceName ?? "a car seat"}. Your phone connects to it by itself whenever you're close.`,
		notPaired: "Not paired yet. We'll find the seat and make sure it's yours.",
		pairDifferent: "Pair with a different seat",
		removeSeat: "Remove this seat",
		/** On a seat someone else shares with you, in place of the name field and Remove. */
		sharedNote: (owner: string) =>
			owner
				? `${owner} shares this seat with you, so only ${owner} can rename or remove it, and it alerts with ${owner}'s settings. You can still pair with it and add a photo on this phone.`
				: "This seat is shared with you, so only the person who set it up can rename or remove it, and it alerts with their settings. You can still pair with it and add a photo on this phone.",
		seeTeam: (owner: string) => (owner ? `See ${owner}'s team` : "See the team"),
	},

	newSeat: {
		fullTitle: "That's a full car!",
		fullBody: (max: number) =>
			`You can add up to ${max} seats of your own. To add one more, remove one of yours first.`,
		title: "Who's riding in this one?",
		/** `example` is the child's name as typed so far, or a made-up one. */
		body: (example: string) =>
			`We watch every seat at once, and alerts say whose seat it is, like "${seat(example, true)} is too hot!"`,
		exampleName: "Leo",
		next: "Next: find the seat",
		taken: (childName: string) =>
			`There's already a seat for ${childName}. Add something else to tell them apart.`,
	},

	onboarding: {
		step: (step: number, total: number) => `Step ${step} of ${total}`,
		titleCard: {
			hello: "Hi there! How are you getting started?",
			self: "I'm setting this up myself",
			selfDetail: "The car seat is right here with me.",
			invite: "Someone sent me an invite",
			inviteDetail: "A parent set up the seat and texted me a link.",
			/** Shown before logIn, on one line. */
			haveAccount: "Already have an account?",
			logIn: "Log in",
		},
		welcome: {
			title: "So glad you're here",
			body: "We'll keep an eye on your little one's car seat: how warm it is, if someone's in it, and how far away you are. If anything needs you, we'll tell you right away. Setup takes just a few minutes!",
			start: "Let's get started",
		},
		invite: {
			notAnInvite:
				"Hmm, that doesn't look like an invite link. Try copying the whole text message and pasting it again.",
			acceptTitle: "You're on the team!",
			acceptBody: (from: string, seats: string) =>
				`${from || "Someone"}'s counting on you to help watch over ${seats}. Thank you! We'll get your phone ready in just a few steps.`,
			accept: "Let's go",
			findTitle: "Let's find your invite",
			findBody:
				"Tap the link in the text you got, or copy the whole message and paste it here.",
			message: "Invite message",
			paste: "Paste the message here",
			noInvite:
				"Don't have one yet? Ask the parent to send you one from Settings › Invite someone to help.",
		},
		comfort: {
			title: "Let's make it easy on the eyes",
			body: "Pick the text size that feels comfy. You can change it later in Settings.",
			done: "Looks good",
			readAloudHint: "No need if you use VoiceOver.",
		},
		child: {
			title: "Who's riding with you?",
			/** `example` is the name as typed so far, or a made-up one. */
			body: (example: string) =>
				`We'll use their name in alerts, like "${seat(example, true)} is too hot!" Add a cute photo too, if you like.`,
			exampleName: "Emma",
			name: "Your little one's name",
		},
		permission: {
			allowed: "All set. Thank you!",
			bluetoothOff:
				"Bluetooth is allowed, but it's turned off. Swipe down from the top-right corner of the screen, then tap Bluetooth.",
			simulatorOn: "No need! You're using the simulated car seat.",
			noBluetoothHere:
				"This version of the app can't use Bluetooth (Expo Go and the iOS Simulator can't), so there's nothing to allow here.",
			bluetooth: {
				title: "Can we use Bluetooth?",
				reason: "It's how your phone and the car seat talk to each other.",
				allow: "Allow Bluetooth",
				declined:
					"Without Bluetooth, your phone can't hear the seat, so we can't warn you. You can turn it on in Settings any time.",
			},
			notifications: {
				title: "Can we send you alerts?",
				reason: "So we can reach you even when the app is closed or your phone is locked.",
				// iOS asks about critical alerts in a second prompt, right after the first.
				reasonWithCriticalAlerts:
					"So we can reach you even when the app is closed or your phone is locked. Your phone will also ask about Critical Alerts. Please allow those too, so alerts ring even on Silent.",
				allow: "Allow notifications",
				partial:
					"Almost there! Alerts are on, but they stay quiet while your phone is on Silent. To make them ring anyway, turn on Critical Alerts under Notifications in Settings.",
				declined:
					"Without notifications, we can't reach you when the app is closed or your phone is locked. That's when you need us most!",
			},
			location: {
				title: "Remember where the seat is?",
				reason: "If you walk away from the car, we can show you right where you left it. For that, set your location to Always.",
				allow: "Allow location",
				partial:
					'Almost there! Right now this only works while the app is open. To keep it working when your phone is locked, pick "Always" under Location in Settings.',
				declined: "No problem. We just won't be able to show where the seat was last seen.",
			},
		},
		watch: {
			temperatureTitle: "Too hot or too cold",
			temperatureBody: (childName: string) =>
				`Cars heat up and cool down fast. We'll let you know if the seat gets too hot or too cold for ${child(childName)}.`,
			/** `low` is just the number, `high` has the unit. */
			temperatureDetail: (low: string, high: string) =>
				`Right now, ${low}–${high} counts as just right. You can change that in Settings.`,
			weightTitle: "Who's in the seat",
			weightBody: (childName: string) =>
				`A little sensor under the seat pad can tell when ${child(childName)} is sitting in it.`,
			weightDetail:
				"We only send warnings while someone's in the seat, so an empty seat stays nice and quiet.",
			distanceTitle: "Walking away",
			distanceBody: (childName: string) =>
				`If you walk away while ${child(childName)} is still in the seat, we'll warn you right away.`,
			distanceDetail: "Distance is only a rough guess, so always peek in the back seat too!",
			exampleLabel: "Here's what an alert looks like",
			example: (title: string, body: string) => `Example alert: ${title}. ${body}`,
			now: "now",
			inTheApp: "In the app, you'll see",
			gotIt: "Got it",
		},
		practice: {
			notificationsOff:
				"Heads up! Notifications are off, so alerts can't make a sound. Turn on Notifications and Sounds in Settings.",
			heardTitle: "Did you hear it?",
			heard: "Yes, loud and clear",
			notHeard: "No, I didn't hear it",
			tips: {
				volume: "Turn the volume up with the buttons on the side of your phone.",
				silent: "Turn off Silent mode with the switch or Action button on the side of your phone.",
				focus: "Turn off Focus and Do Not Disturb (the little moon) in Control Center.",
				hearingAids:
					"Wear hearing aids? Go to Settings › Accessibility › Hearing Devices so phone sounds play right through them.",
			},
			louderTitle: "Let's make alerts louder",
			louderBody:
				"No problem, that's what practice is for. Try these, then we'll play it again.",
			playAgain: "Play it again",
			title: "Let's do a practice run",
			body: "Let's make sure you can hear an alert. Turn your volume up, then your phone will beep, buzz and flash!",
			play: "Play the practice alert",
			justPracticing: "Just practicing",
			turnOff: "Turn it off",
		},
		backup: {
			title: "Who else helps?",
			body: (minutes: number) =>
				`Everyone misses a notification sometimes. Invite a partner, grandparent or sitter to help. They'll set up their own phone, and if no one answers an alert for ${minutes} minutes, we'll let them know too.`,
			reachOutAfter: "Let them know after",
			minutes: (minutes: number) => `${minutes} min`,
		},
		done: {
			title: "You're all set!",
			body: "We'll keep an eye on the seat from here and let you know the moment anything needs you. Drive safe!",
			start: "Take me to the app",
		},
	},

	pairing: {
		tip: "No worries, it happens! Move your phone closer and make sure the seat is turned on.",
		findTitle: (childName: string) => `Let's find ${seat(childName)}`,
		noBluetooth:
			"This version of the app can't use Bluetooth. The simulated seat works just like the real one!",
		connected: "Connected!",
		connectedSimulator: "You're hooked up to the simulated car seat.",
		blinkingTitle: (childName: string) => `Is the light on ${seat(childName)} blinking?`,
		blinkingBody:
			"Take a peek! If we found the right seat, its light is blinking fast right now.",
		yesMine: "Yes, that's my seat",
		blinkAgain: "Blink again",
		notMine: "No, it isn't blinking",
		talking: (deviceName: string | null) =>
			`Your phone and ${deviceName ?? "your seat"} are talking to each other.`,
		lookingTitle: "Looking for your seat…",
		slipped: "The connection slipped. Trying again…",
		hangTight: "Hang tight, and keep your phone close to the seat.",
		findBody: 'Turn the seat on, keep your phone close, then tap "Find my seat."',
		find: "Find my seat",
		wrongSeatTitle: "Let's find the right seat",
		notFoundTitle: (childName: string) => `We couldn't find ${seat(childName)}`,
		wrongSeatBody:
			"There might be another seat close by. Stand right next to yours, away from others, and we'll try again.",
		callForHelp: "Call for help",
		useSimulatorDemo: "Use the simulated seat (demo)",
	},

	/** Your team: the people who help watch the seats (see src/account/team.ts). */
	team: {
		title: "Your team",
		ownerIntro: (seats: string) =>
			`The people who help watch ${seats}. Each one sets up their own phone, and only you can invite or remove people.`,
		/** Your own team, before you've added a seat of your own. */
		noSeatsIntro: "Add a car seat of your own, and you can invite people to help watch it too.",
		/** The heading over the teams you help. */
		helping: "Teams you help",
		teamOf: (owner: string) => (owner ? `${owner}'s team` : "Someone's team"),
		helperIntro: (owner: string, seats: string) =>
			owner
				? `You help ${owner} watch ${seats}. Only ${owner} can invite or remove people, or change the seats.`
				: `You help watch ${seats}. Only the person who set up the seats can invite or remove people, or change the seats.`,
		/** For Settings: "2 helpers, 1 invite waiting." */
		summary: (helpers: number, waiting: number) => {
			if (!helpers && !waiting) return "Just you so far.";
			const parts: string[] = [];
			if (helpers) parts.push(`${helpers} ${helpers === 1 ? "helper" : "helpers"}`);
			if (waiting) parts.push(`${waiting} ${waiting === 1 ? "invite" : "invites"} waiting`);
			return `${parts.join(", ")}.`;
		},
		/** For Settings, for someone with no team of their own: "You help Tam." ('' is someone with no name.) */
		helperSummary: (owners: readonly string[]) =>
			`You help ${list(owners.map((o) => o || "someone"))}.`,
		/** For Settings, after `summary`: "You also help Tam and Rosa." */
		alsoHelping: (owners: readonly string[]) =>
			`You also help ${list(owners.map((o) => o || "someone"))}.`,
		see: "See your team",
		you: "You",
		owner: "Set up the seats",
		joined: (day: string) => `Joined ${day}`,
		/** On a helper made up by the pretend server. */
		pretend: "Pretend",
		/** A member with no name or number. */
		someone: "Someone",
		invite: "Invite someone to help",
		inviteHint: (seats: string) =>
			`Text a partner, grandparent or sitter a link that sets up their phone to help watch ${seats}.`,
		nameSeatsFirst: "Give every seat a child's name first (tap a seat on the home screen).",
		addSeatFirst:
			"Add a car seat of your own first. Seats shared with you are their owner's to share.",
		full: (max: number) =>
			`That's a full team: up to ${max} helpers, counting invites still waiting.`,
		inviteSent: (day: string) => `Invite sent ${day}`,
		waiting: (expires: string) => `Waiting for them to join. Expires ${expires}.`,
		expired: "Expired. Send a new one if they still want to help.",
		cancelInvite: "Cancel invite",
		removeTitle: (name: string) => `Remove ${name} from your team?`,
		removeBody:
			"They won't be on your team anymore, and your seats come off their phone. You can invite them again any time.",
		removeHint: (name: string) => `Removes ${name} from your team`,
		leave: (owner: string) => (owner ? `Leave ${owner}'s team` : "Leave this team"),
		leaveTitle: (owner: string) => (owner ? `Leave ${owner}'s team?` : "Leave this team?"),
		leaveBody:
			"You won't be one of their helpers anymore, and their seats come off this phone. They can invite you again any time.",
		leaveConfirm: "Leave",
		pretendNote:
			"For now the account server is pretend and lives on this phone, so people who accept your invite on their own phone don't show up here. A real server would add them by itself.",
		joinFailedTitle: "We couldn't add you to the team",
		joinFailedBody: "You can keep setting up, and join later with a new invite.",
		/** For each AccountErrorCode in src/account/server.ts, plus anything else. */
		errors: {
			notFound: "We couldn't find your account. Log out, log back in and try again.",
			numberTaken: "That number already has an account of its own.",
			notAllowed: "Only the person who set up the seats can do that.",
			teamFull: "Your team is full. Cancel an invite or remove someone first.",
			noSeats: "Give every seat a child's name first.",
			inviteNotFound: "We couldn't find that invite. Ask for a new one.",
			inviteUsed: "That invite has already been used. Ask for a new one.",
			inviteExpired: "That invite has expired. Ask for a new one.",
			inviteCancelled: "That invite was canceled. Ask for a new one.",
			ownInvite: "That's your own invite. Send it to the person you'd like to help.",
			general: "Hmm, that didn't work. Try again in a moment.",
		},
	},

	childPhoto: {
		of: (childName: string) => (childName ? `Photo of ${childName}` : "Photo of your child"),
		change: "Change photo",
		add: "Add a photo",
		remove: "Remove photo",
	},

	seatCard: {
		empty: "Empty",
		opens: "Opens this seat",
		connect: "Connect",
	},

	simulator: {
		title: "Simulated car seat",
		temperature: (temperature: string) => `Temperature: ${temperature}`,
		mild: "Mild",
		hotCar: "Hot car",
		coldCar: "Cold car",
		distance: (distance: string) => `Phone distance: ${distance}`,
		inCar: "In car",
		walkingAway: "Walking away",
		outOfRange: "Out of range",
		occupied: "Baby in seat",
		cutPower: "Cut power to seat",
		someoneElseNearby: "Someone else by the seat",
	},

	/** VoiceOver's name for a number field with a unit: "Too hot above, in °F". */
	fieldWithUnit: (label: string, unit: string) => `${label}, in ${unit}`,
};

export type Strings = typeof en;

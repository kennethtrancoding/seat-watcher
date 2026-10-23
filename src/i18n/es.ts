import type { Strings } from "./en";

/**
 * Every word the app shows, says or sends, in Spanish. Same keys as en.ts; the
 * type makes sure none is missing.
 *
 * Written for Spanish speakers in the US (see docs/languages.md): "tú", like
 * the English's friendly "you"; "carro" and "asiento de seguridad"; the
 * iPhone's own Spanish names (Configuración, Alertas críticas, Encontrar). The
 * app doesn't know if a child is a boy or a girl, so nothing about the child is
 * gendered: "tu bebé", "ya tiene el cinturón puesto". "Ajustes" is this app's
 * Settings screen and "Configuración" the iPhone's Settings app.
 *
 * Pure: no React or native imports.
 */

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "el asiento de Emma", or "el asiento de seguridad" until a name is set. */
function seat(childName: string, startOfSentence = false): string {
	const phrase = childName ? `el asiento de ${childName}` : "el asiento de seguridad";
	return startOfSentence ? capitalize(phrase) : phrase;
}

/** "a las 3:05", but "a la 1:05". */
const atTime = (time: string) => (/^1[:.]/.test(time) ? `a la ${time}` : `a las ${time}`);

/** "del asiento de Emma": "de" and "el" join up. */
const ofSeat = (childName: string) =>
	childName ? `del asiento de ${childName}` : "del asiento de seguridad";

/** "Emma", or "tu bebé" until a name is set. */
const child = (childName: string) => childName || "tu bebé";

/** "Emma y Leo", "Emma, Leo y Ava". "y" becomes "e" before an "i" sound: "Leo e
 * Isabel". */
function list(items: readonly string[]): string {
	if (items.length < 2) return items.join("");
	const last = items[items.length - 1];
	const and = /^h?[ií](?![aeoáéó])/i.test(last) ? "e" : "y";
	return `${items.slice(0, -1).join(", ")} ${and} ${last}`;
}

export const es: Strings = {
	appName: "Seat Watcher",

	common: {
		continue: "Continuar",
		cancel: "Cancelar",
		back: "Atrás",
		remove: "Quitar",
		saveName: "Guardar nombre",
		skipForNow: "Omitir por ahora",
		tryAgain: "Intentar otra vez",
		openSettings: "Abrir Configuración",
		restoreDefaults: "Restablecer valores",
		changesSave: "Los cambios se guardan solos.",
		useSimulatedSeat: "Usar el asiento simulado",
		useSimulatedCarSeat: "Usar el asiento simulado",
		firstName: "Nombre",
		yourFirstName: "Tu nombre",
		childName: "Nombre del bebé",
		minutes: "min",
		someone: "Alguien",
		inTheSeat: "En el asiento",
		watching: "Vigilando",
		checkOn: (childName) => `Por favor, ve a ver a ${child(childName)}`,
		readAloud: "Leer las pantallas en voz alta",
		readAloudOn: "¡Listo! Leeremos cada pantalla en voz alta.",
		textSize: "Tamaño del texto",
		relationship: "Eres su…",
		prototypeNote:
			"Para que lo sepas: esto es un prototipo. La distancia es solo un cálculo aproximado, y las alertas solo suenan cuando hay alguien en el asiento. ¡Siempre echa un vistazo al asiento de atrás!",
		criticalAlertsOff:
			"Las alertas no suenan mientras tu teléfono está en modo silencio. Para que suenen de todos modos, activa Alertas críticas en Notificaciones, dentro de Configuración.",
	},

	seats: {
		name: seat,
		title: (childName) => (childName ? `Asiento de ${childName}` : "Asiento de seguridad"),
		named: (childNames) => `los asientos de ${list(childNames)}`,
		yours: "tus asientos de seguridad",
		nameTooLong: (max) => `Usa ${max} caracteres como máximo.`,
	},

	alerts: {
		labels: {
			temperatureHigh: "Muy caliente",
			temperatureLow: "Muy frío",
			tooFar: "Muy lejos",
			connectionLost: "Sin conexión",
		},
		unknown: "una temperatura desconocida",
		tooHot: (childName, temperature) => ({
			title: `¡${seat(childName, true)} está muy caliente!`,
			body: `Hace ${temperature} ahí adentro. Por favor, ve a ver a ${child(childName)} ahora mismo.`,
		}),
		tooCold: (childName, temperature) => ({
			title: `¡${seat(childName, true)} está muy frío!`,
			body: `Hace ${temperature} ahí adentro. Por favor, ve a ver a ${child(childName)} ahora mismo.`,
		}),
		tooFar: (childName, distance) => ({
			title: `¡No olvides a ${child(childName)}!`,
			body: `Estás a unos ${distance}. ¿${capitalize(child(childName))} sigue en el carro?`,
		}),
		connectionLost: (childName) => ({
			title: `Se perdió la conexión con ${seat(childName)}`,
			body: `Alguien seguía en el asiento. Por favor, ve a ver a ${child(childName)}.`,
		}),
		buckledIn: (childName) =>
			childName ? `¡${childName} ya tiene el cinturón puesto!` : "¡Bebé a bordo!",
		outOfSeat: (childName) =>
			childName ? `¡${childName} ya salió del asiento!` : "¡Tu bebé ya salió del asiento!",
		practice: (childName) => ({
			title: `Práctica: ¡${seat(childName)} está muy caliente!`,
			body: "¡Solo es una práctica! Una alerta de verdad se ve y suena igual que esta.",
		}),
	},

	status: {
		needsYou: "¡Te necesita ahora!",
		lookingGood: "¡Todo bien!",
		lostTouch: "¡Sin conexión!",
		connecting: "conectando…",
		waiting: "nos conectaremos cuando estés cerca…",
		notConnected: "no conectado…",
	},

	// "Buenas tardes" lasts until about 7 p.m. in Spanish.
	greeting(name, hour) {
		const part =
			hour < 5
				? "Hola"
				: hour < 12
					? "Buenos días"
					: hour < 19
						? "Buenas tardes"
						: "Buenas noches";
		return name ? `${part}, ${name}` : part;
	},

	account: {
		relationships: {
			parent: "Mamá o papá",
			grandparent: "Abuela o abuelo",
			sitter: "Niñera o cuidador",
			family: "Otro familiar",
			other: "Amistad u otro",
		},
		described: (name, relationship) => `${name} (${relationship.toLowerCase()})`,
		you: "Tú",
		since: (monthYear) => `En este teléfono desde ${monthYear}`,
		deleteTitle: "¿Borrar tu cuenta?",
		deleteBody:
			"Esto elimina tu cuenta y tu propio equipo, te saca de los equipos a los que ayudas y borra tus asientos y ajustes de este teléfono. No se puede deshacer.",
		delete: "Borrar",
		aboutYou: "Sobre ti",
		nameHint: "Lo usamos para saludarte y lo ponemos en las invitaciones que envíes.",
		phoneNumber: "Número de teléfono",
		noneYet: "Todavía no hay",
		changeNumber: "Cambiar número",
		changeNumberHint:
			"Le enviaremos un código por mensaje al número nuevo para confirmar que es tuyo. Tus asientos y ajustes se quedan como están.",
		yourData: "Tus datos",
		whereKept: "Dónde se guarda todo",
		whereKeptHint: (seatCount) =>
			`Tu nombre, tu número, tus equipos, ${seatCount === 1 ? "tu asiento de seguridad" : "tus asientos de seguridad"} y tus ajustes se guardan con tu cuenta, así que vuelven cuando inicias sesión de nuevo, aunque otra persona haya usado este teléfono. Los asientos que otras personas comparten contigo siguen a sus equipos. Por ahora el servidor de cuentas es de prueba: también vive en este teléfono.`,
		logOut: "Cerrar sesión",
		logOutHint:
			"Mientras tengas la sesión cerrada, dejamos de vigilar los asientos. Vuelve a iniciar sesión cuando quieras. ¡Todo seguirá aquí!",
		logOutTitle: "¿Cerrar sesión?",
		logOutBody: (seats) => `Dejaremos de vigilar ${seats} hasta que vuelvas a iniciar sesión.`,
		deleteAccount: "Borrar cuenta",
	},

	settings: {
		errors: {
			number: "Escribe un número.",
			temperatureGap: "Déjalo al menos 1 °C (unos 2 °F) por debajo del límite de calor.",
			distance: (low, high, unit) => `Usa entre ${low} y ${high} ${unit}.`,
			positive: "Tiene que ser mayor que 0.",
			cooldown: "Usa entre 0.5 y 60 minutos.",
			rssi: "Usa entre −100 y −20 dBm.",
			pathLoss: "Usa entre 1 y 6.",
			backupAfter: "Usa entre 1 y 60 minutos.",
		},
		textSizes: { standard: "Normal", large: "Grande", extraLarge: "Muy grande" },
		yourAccount: "Tu cuenta",
		loggedInAs: (phone) => `Sesión iniciada con el ${phone}`,
		notLoggedIn: "Sin sesión iniciada",
		accountAndLogOut: "Cuenta y cerrar sesión",
		comfort: "Comodidad",
		readAloudHint: "No hace falta si usas VoiceOver.",
		language: "Idioma",
		languageSystem: "Igual que el teléfono",
		units: "Unidades",
		temperature: "Temperatura",
		fahrenheit: "°F Fahrenheit",
		celsius: "°C Celsius",
		distance: "Distancia",
		feet: "Pies",
		metres: "Metros",
		tooHotAbove: "Muy caliente a más de",
		tooColdBelow: "Muy frío a menos de",
		alertPast: "Muy lejos a más de",
		distanceHint: (unit) =>
			`La distancia es solo un cálculo aproximado. Puede fallar por ${unit === "ft" ? "10 pies" : "varios metros"} o más.`,
		personalSettings: "Configuración personal",
		inAndOut: "Al subir y bajar del asiento",
		notifyInAndOut: "Avisarme cuando alguien suba o baje",
		notifyInAndOutHint:
			'Una notita como "¡Ya tiene el cinturón puesto!". Las alertas de calor, frío y distancia siempre llegan.',
		seatScreen: "Pantalla del asiento",
		showPressure: "Mostrar presión y umbral",
		showPressureHint: (threshold) =>
			`Agrega la lectura del sensor de presión, y la lectura que cuenta como ocupado (${threshold}), debajo de "En el asiento".`,
		showSignal: "Mostrar señal Bluetooth",
		showSignalHint:
			'Agrega la intensidad de la señal debajo de "A qué distancia estás", en dBm. Cuanto más cerca de 0, más fuerte es la señal.',
		reachThemAfter: "Avisar a tu equipo después de",
		reachThemHint:
			"Si nadie responde a una alerta para entonces, también les avisaremos a las personas de tu equipo.",
		findTheSeat: "Encontrar el asiento",
		shortcut: (app) => `Atajo a ${app}`,
		rememberLocation: "Recordar dónde se vio el asiento por última vez",
		rememberLocationOff:
			"Mientras haya conexión con el asiento, guardaremos dónde está, para que después de una alerta puedas encontrarlo en Mapas o compartirlo. Se queda en este teléfono.",
		rememberLocationWhileOpen:
			'Por ahora esto solo se actualiza con la app abierta. Para mantenerlo al día con el teléfono bloqueado, elige "Siempre" en Ubicación, en la app Configuración.',
		rememberLocationOn:
			"Se actualiza cada 30 segundos mientras hay conexión, y una vez más si se pierde. Se queda en este teléfono.",
		locationDenied:
			"El acceso a la ubicación está desactivado para esta app. Permítelo en la app Configuración para usar esto.",
		developerOptions: "Opciones de desarrollador",
		yourSeats: "Tus asientos",
		yourSeatsSummary: (tooHot, tooCold, tooFar) =>
			`Muy caliente a más de ${tooHot}, muy frío a menos de ${tooCold}, muy lejos a más de ${tooFar}.`,
		yourSeatsHint: (seats) =>
			seats
				? `Para ${seats}. Los teléfonos de tus ayudantes también los usan, así que todos reciben las mismas alertas.`
				: "Para los asientos que agregues. Los teléfonos de tus ayudantes también los usarán, así que todos recibirán las mismas alertas.",
		sharedFollowOwner:
			"Los asientos compartidos contigo siguen los ajustes de quien los comparte.",
		seatSettings: "Ajustes de tus asientos",
		thisPhone: "El resto son solo para ti, en este teléfono, para todos los asientos que vigilas.",
	},

	seatSettings: {
		intro: (seats) =>
			seats
				? `Estos ajustes son para ${seats}. Van con tus asientos: los teléfonos de tus ayudantes también los usan, así que todos reciben las mismas alertas.`
				: "Estos ajustes son para los asientos que agregues. Van con tus asientos: los teléfonos de tus ayudantes también los usarán, así que todos recibirán las mismas alertas.",
		sharedNote:
			"Los asientos compartidos contigo siguen los ajustes de quien los comparte. La pantalla de cada asiento muestra cuáles son.",
		helpers: "Tus ayudantes",
	},

	developer: {
		intro: "Son para probar y ajustar el prototipo. Los valores predeterminados funcionan bien para el uso diario.",
		seat: "Asiento",
		simulated: "Asiento simulado",
		simulatedHint:
			"Un asiento de mentira en lugar del dispositivo real, para demostraciones y el Simulador de iOS. Sus controles aparecen en la pantalla principal.",
		occupiedAt: "Ocupado con presión ≥",
		currentReading: (pressure) =>
			`Lectura actual: ${pressure}. Elige un valor entre la lectura vacía y la ocupada.`,
		rawUnits: "En las unidades del sensor. Compara la lectura vacía y la ocupada para elegir.",
		ownSeatsOnly:
			"Como los ajustes de tus asientos, esto va con tus propios asientos a los teléfonos de tus ayudantes. Los asientos compartidos contigo usan el de quien los comparte.",
		calibration: "Calibración de distancia",
		signalAt1m: "Señal a 1 m (3.3 ft)",
		signalAt1mHint:
			"Sostén el teléfono a 1 m (unos 3 ft) del asiento durante unos segundos y luego toca abajo.",
		useCurrentSignal: (dbm) => `Usar la señal actual (${dbm} dBm)`,
		connectToCalibrate: "Conéctate para calibrar",
		pathLoss: "Exponente de pérdida",
		pathLossHint:
			"2 al aire libre; 2.5–4 cuando hay bolsillos, personas o el carro de por medio. Más alto significa menos falsas alarmas.",
		alerts: "Alertas",
		repeatEvery: "Repetir mientras siga activa cada",
		repeatHint:
			"Un problema nuevo avisa enseguida. La misma alerta no se repite antes de este tiempo.",
		startOver: "Empezar de nuevo",
		restoreDefaultsHint:
			"Devuelve todos los ajustes a como venían, aquí y en Ajustes, incluidos el idioma, el tamaño del texto y el asiento simulado. Se borra la última ubicación guardada. Tus asientos, tu cuenta y tu equipo se quedan.",
		runSetupAgain: "Repetir la configuración inicial",
		runSetupAgainHint:
			"Cierra la sesión y vuelve a la configuración inicial. Tu bebé y tus ajustes se quedan, y también tu cuenta y tu equipo.",
		factoryReset: "Restablecer de fábrica",
		factoryResetHint:
			"Al instante y sin deshacer: desconecta el asiento, borra todo lo que la app guardó en este teléfono (tu bebé, la foto, los ajustes, la última ubicación), cierra la sesión, vacía el servidor de cuentas de prueba (todas sus cuentas, equipos e invitaciones) y vuelve a la primera pantalla. Los permisos que diste siguen activos; cámbialos en la app Configuración del iPhone.",
		accountServer: "Servidor de cuentas",
		accountServerHint:
			"Un servidor de prueba en este teléfono guarda las cuentas, los equipos y las invitaciones. Restablecer de fábrica también lo vacía.",
		acceptInvites: "Simular que aceptaron las invitaciones",
		acceptInvitesHint:
			"Por cada invitación pendiente se une una persona inventada, para llenar tu equipo sin un segundo teléfono. Aparecen marcadas De prueba.",
		acceptedInvites: (count) =>
			count === 0
				? "No hay invitaciones pendientes."
				: `Se ${count === 1 ? "unió" : "unieron"} ${count} ${count === 1 ? "ayudante" : "ayudantes"} de prueba.`,
		resetServer: "Restablecer el servidor de cuentas",
		resetServerHint:
			"Olvida todos los equipos, invitaciones y demás cuentas que tiene. Tu sesión sigue iniciada, sin equipos, y los asientos compartidos contigo salen de este teléfono.",
		serverReset: "El servidor de cuentas está vacío otra vez.",
		teamAlerts: "Alertas del equipo",
		teamAlertsHint:
			"Cuando nadie se queda con un asiento, el último teléfono en irse da la alerta, y el servidor de cuentas le avisa enseguida a quien configuró los asientos, y a los demás después de la espera de Ajustes › Ajustes de tus asientos, a menos que la alerta termine antes. Cuando un asiento se calienta demasiado, todo el equipo recibe el aviso enseguida, aunque haya alguien junto al asiento. Este servidor de prueba no llega a otros teléfonos, así que muestra a quién avisaría.",
		noTeamAlerts: "Todavía no hay alertas del equipo.",
		teamAlert: (kind, childName, time, endedAt) => {
			const what =
				kind === "tooHot"
					? `${seat(childName, true)} se calentó demasiado`
					: `Nadie estaba con ${child(childName)}`;
			return endedAt
				? `${what}, ${time} (terminó ${atTime(endedAt)})`
				: `${what}, ${time} (sigue activa)`;
		},
		alertRaised: (kind, name, time) =>
			kind === "tooHot"
				? `El teléfono de ${name} lo notó primero y dio la alerta ${atTime(time)}`
				: `${name} fue la última persona en irse; su teléfono dio la alerta ${atTime(time)}`,
		ownerTold: (name, time) =>
			`${name}, que configuró los asientos: se le avisó ${atTime(time)}`,
		helperTold: (name, time) => `${name}: se le avisó ${atTime(time)}`,
		helperToldLater: (name, time) => `${name}: ${atTime(time)}, si la alerta sigue`,
	},

	locate: {
		apps: {
			// Find My is called "Encontrar" on a Spanish iPhone.
			showFindMy: {
				name: "Encontrar",
				description: "Encuentra un AirTag en el asiento, o mira dónde está tu familia.",
			},
			showLife360: {
				name: "Life360",
				description:
					"Mira dónde está tu Círculo, o encuentra un rastreador Tile en el asiento.",
			},
		},
		pin: "Asiento de seguridad",
		share: (seenAt, mapUrl) => `El asiento se vio aquí por última vez (${seenAt}): ${mapUrl}`,
		shareWithAlerts: (alerts, location) =>
			`Alerta del asiento de seguridad: ${alerts.join(", ")}. ${location}`,
		title: "Encontrar el asiento",
		lastSeen: (seenAt) => `Visto por última vez: ${seenAt}`,
		noSpotYet:
			"Todavía no hay un lugar guardado. Guardaremos uno mientras haya conexión con el asiento.",
		openInMaps: "Abrir en Mapas",
		shareLocation: "Compartir ubicación",
		open: (app) => `Abrir ${app}`,
	},

	invite: {
		message: (from, seats, link) =>
			`${from ? `¡Soy ${from}! ` : ""}¿Me ayudas a vigilar ${seats}? Instala Seat Watcher y luego abre este enlace: ${link}`,
	},

	inviteLink: {
		joinTitle: (from) => (from ? `¿Unirte al equipo de ${from}?` : "¿Unirte a este equipo?"),
		joinBody: (from, seats, seatCount) =>
			`${from || "Alguien"} te pide ayuda para vigilar ${seats}. Podrás vincular${seatCount === 1 ? "lo" : "los"} desde este teléfono cuando estés cerca.`,
		join: "Unirme al equipo",
		notNow: "Ahora no",
		joinedBody: (seats) =>
			`Agregamos ${seats} a tu pantalla de inicio. Toca un asiento para vincularlo cuando estés cerca.`,
		done: "Ver mis asientos",
		logInTitle: (from) =>
			from
				? `Inicia sesión para unirte al equipo de ${from}`
				: "Inicia sesión para unirte al equipo",
		logInBody: "Te enviaremos un código por mensaje de texto. ¡Sin contraseña!",
		brokenTitle: "Este enlace de invitación está incompleto",
		brokenBody:
			"Pide una invitación nueva, o copia todo el mensaje de texto y pégalo en la app.",
		toApp: "Ir a la app",
	},

	signIn: {
		phoneHelp:
			"Necesitamos un número de 10 dígitos, o uno que empiece con + si es internacional.",
		demoNotice:
			"Modo de demostración: no se envía ningún mensaje, así que sirve cualquier código de 6 dígitos.",
		errors: {
			tooSoon: "Te acabamos de enviar un código. Espera un minuto y luego puedes pedir otro.",
			cantText:
				"No pudimos enviar un mensaje a ese número. Revisa que esté bien y que pueda recibir mensajes de texto.",
			badNumber: "Ese número de teléfono no parece correcto. Revísalo e inténtalo de nuevo.",
			notSwitchedOn:
				"Iniciar sesión por mensaje de texto todavía no está activado en esta app.",
			noNewAccounts:
				"Por ahora no se pueden crear cuentas nuevas. Prueba con un número que ya se haya usado aquí.",
			notConfirmed:
				"No pudimos confirmar esta solicitud. Espera un momento e inténtalo de nuevo.",
			general: "Mmm, eso no funcionó. Revisa que tengas internet e inténtalo de nuevo.",
			couldntSend:
				"Mmm, no pudimos enviar el código. Revisa que tengas internet e inténtalo otra vez.",
			couldntCheck:
				"Mmm, no pudimos revisar el código. Revisa que tengas internet e inténtalo de nuevo.",
			wrongCode: "Ese código no coincide o ya venció. Revísalo, o te enviamos uno nuevo.",
			sameNumber: "Ese ya es tu número.",
		},
		alreadyTitle: "Ya iniciaste sesión",
		alreadyBody: (phone) => `Tu número es el ${phone}.`,
		differentNumber: "Usar otro número",
		welcomeBack: (name) => (name ? `¡Hola de nuevo, ${name}!` : "¡Hola de nuevo!"),
		welcomeBackBody: (seats) =>
			`Inicia sesión y volveremos a vigilar ${seats}. Te enviaremos un código por mensaje de texto. ¡Sin contraseña!`,
		yourSeat: "tu asiento de seguridad",
		newNumberTitle: "¿Cuál es tu número nuevo?",
		newNumberBody:
			"Le enviaremos un código por mensaje para confirmar que es tuyo. Tus asientos y ajustes se quedan como están.",
		numberTitle: "¿Cuál es tu número?",
		numberBody:
			"Te enviaremos un código por mensaje de texto para iniciar sesión. ¡Sin contraseñas que inventar ni recordar!",
		textMeACode: "Envíame un código",
		yourNewNumber: "Tu número nuevo",
		yourNumber: "Tu número de teléfono",
		codeTitle: "Revisa tus mensajes",
		codeBody: (digits, phone) =>
			`Acabamos de enviar un código de ${digits} dígitos al ${phone}. Escríbelo abajo.`,
		sendNewCode: "Enviar un código nuevo",
		yourCode: "Tu código",
		logInAs: (phone) => `Iniciar sesión con el ${phone}`,
		otherAccount: "Usar o crear otra cuenta",
		otherTitle: "¿Quién inicia sesión?",
		otherBody:
			"Escribe tu número. Si es tu primera vez, crearemos tu cuenta y prepararemos este teléfono para ti.",
		restoreTitle: (name) => (name ? `¡Hola de nuevo, ${name}!` : "¡Hola de nuevo!"),
		restoreBody: (seats) =>
			`Encontramos ${seats} y tus ajustes, guardados con tu cuenta. ¿Quieres traerlos de vuelta a este teléfono?`,
		restore: "Traerlos de vuelta",
		restoreSkip: "Empezar desde cero",
		profileTitle: "¡Mucho gusto!",
		profileBody:
			"¿Cómo te llamamos? Lo usaremos para saludarte y en las invitaciones que envíes.",
	},

	ble: {
		tooSlow: "El asiento tardó demasiado en responder. Inténtalo otra vez.",
		notConnected: "No hay conexión con el asiento.",
		notFound: "No encontramos ningún asiento. Asegúrate de que esté encendido y cerca.",
		offWillConnect: "El Bluetooth está apagado. Nos conectaremos en cuanto lo actives.",
		offReconnect: "El Bluetooth está apagado. Actívalo para volver a conectarte.",
		lostTrack:
			'Tu teléfono perdió el rastro de este asiento. Toca "Vincular otro asiento" para encontrarlo de nuevo.',
		off: "El Bluetooth está apagado. Actívalo en el Centro de control.",
		denied: "El permiso de Bluetooth está desactivado. Permítelo en Configuración › Seat Watcher.",
		unsupported:
			'Este dispositivo no tiene Bluetooth (el Simulador de iOS no lo tiene). Activa "Asiento simulado" en Ajustes › Opciones de desarrollador.',
		notReady: "El Bluetooth todavía no está listo. Inténtalo de nuevo en un momento.",
		general: "Algo salió mal al comunicarnos con el asiento.",
		simulatedSeat: "Asiento simulado",
		unavailable:
			"El Bluetooth no está disponible en esta versión de la app (Expo Go no puede usarlo). Usa una compilación de desarrollo o activa el asiento simulado.",
	},

	nav: {
		home: "Asientos",
		settings: "Ajustes",
		addSeat: "Agregar un asiento",
		pairSeat: "Vincular el asiento",
		account: "Cuenta",
		changeNumber: "Cambiar número",
		developer: "Desarrollador",
		team: "Tu equipo",
		seatSettings: "Tus asientos",
	},

	home: {
		noSeats: "Agreguemos tu primer asiento de seguridad.",
		checkOn: (childNames) => `Por favor, ve a ver a ${list(childNames.map(child))}.`,
		allGood: "¡Todos los asientos están bien!",
		waitingForYou: (seatCount) =>
			`Nos conectaremos cuando estés cerca ${seatCount === 1 ? "del asiento" : "de tus asientos"}.`,
		connectToStart: (seatCount) =>
			`Conecta ${seatCount === 1 ? "el asiento" : "un asiento"} y empezaremos a vigilar.`,
		someConnected: (connected, total) => `${connected} de ${total} asientos conectados.`,
		openSeat: (childName) => `Abrir ${seat(childName)}`,
		notificationsOff:
			"¡Ojo! Las notificaciones están desactivadas, así que no podemos avisarte cuando la app está cerrada.",
		allowCriticalAlerts: "Permitir alertas críticas",
		criticalAlertsAsk:
			"Las alertas pueden sonar incluso con tu teléfono en modo silencio. Toca abajo y luego permite las alertas críticas.",
		connectAll: "Conectar todos los asientos",
		addAnother: "Agregar otro asiento",
		addSeat: "Agregar un asiento de seguridad",
		yourSeats: "Tus asientos",
		sharedBy: (owner) => (owner ? `Compartidos por ${owner}` : "Compartidos contigo"),
	},

	seat: {
		links: {
			idle: "No conectado",
			scanning: "Buscando el asiento…",
			connecting: "Conectando…",
			waiting: "Nos conectaremos cuando estés cerca",
			connected: "Conectado",
			reconnecting: "Sin conexión. Intentando otra vez…",
		},
		removeTitle: (childName) => `¿Quitar ${seat(childName)}?`,
		removeBody: "Dejaremos de vigilarlo y olvidaremos su foto y el último lugar donde se vio.",
		tooHot: "Muy caliente",
		tooCold: "Muy frío",
		justRight: "Ideal",
		tooFar: "Muy lejos",
		closeBy: "Cerca",
		othersClose: (count) =>
			count === 1 ? "Alguien más está cerca" : `Otras ${count} personas están cerca`,
		simulated: (deviceName) => `${deviceName} (simulado)`,
		disconnect: "Desconectar",
		pair: "Vincular el asiento",
		connect: "Conectar al asiento",
		noOne: "Nadie",
		pressure: (pressure, threshold) => `Presión ${pressure} · ocupado con ≥ ${threshold}`,
		occupiedAt: (threshold) => `Ocupado con presión ≥ ${threshold}`,
		temperature: "Temperatura",
		safeRange: (low, high) => `Rango seguro ${low}–${high}`,
		distance: "A qué distancia estás (aprox.)",
		signal: (dbm, limit) => `Señal ${dbm} dBm · alerta a más de ${limit}`,
		alertPast: (limit) => `Te avisaremos a más de ${limit}`,
		stale: "Estas son las últimas lecturas antes de perder la conexión.",
		about: "Sobre este asiento",
		nameHint: "Las alertas de este asiento usan este nombre.",
		hardware: "Dispositivo del asiento",
		usingSimulator: "Usando el asiento simulado.",
		pairedWith: (deviceName) =>
			`Vinculado con ${deviceName ?? "un asiento"}. Tu teléfono se conecta solo cada vez que estás cerca.`,
		notPaired:
			"Todavía no está vinculado. Buscaremos el asiento y confirmaremos que es el tuyo.",
		pairDifferent: "Vincular otro asiento",
		removeSeat: "Quitar este asiento",
		sharedNote: (owner) =>
			owner
				? `${owner} comparte este asiento contigo, así que solo ${owner} puede cambiarle el nombre o quitarlo, y avisa según los ajustes de ${owner}. Aun así puedes vincularlo y ponerle una foto en este teléfono.`
				: "Este asiento se comparte contigo, así que solo quien lo configuró puede cambiarle el nombre o quitarlo, y avisa según sus ajustes. Aun así puedes vincularlo y ponerle una foto en este teléfono.",
		seeTeam: (owner) => (owner ? `Ver el equipo de ${owner}` : "Ver el equipo"),
	},

	newSeat: {
		fullTitle: "¡El carro está lleno!",
		fullBody: (max) =>
			`Puedes agregar hasta ${max} asientos propios. Para agregar otro, primero quita uno de los tuyos.`,
		title: "¿Quién va en este?",
		body: (example) =>
			`Vigilamos todos los asientos a la vez, y las alertas dicen de quién es el asiento, como "¡${seat(example, true)} está muy caliente!"`,
		exampleName: "Leo",
		next: "Siguiente: buscar el asiento",
		taken: (childName) =>
			`Ya hay un asiento para ${childName}. Agrega algo más para distinguirlos.`,
	},

	onboarding: {
		step: (step, total) => `Paso ${step} de ${total}`,
		titleCard: {
			hello: "¡Hola! ¿Cómo quieres empezar?",
			self: "Voy a configurarlo yo",
			selfDetail: "Tengo el asiento aquí conmigo.",
			invite: "Alguien me envió una invitación",
			inviteDetail: "Una mamá o un papá preparó el asiento y me envió un enlace.",
			haveAccount: "¿Ya tienes una cuenta?",
			logIn: "Inicia sesión",
		},
		welcome: {
			title: "Qué gusto tenerte aquí",
			body: "Vamos a cuidar el asiento de tu bebé: qué tan caliente está, si hay alguien en él y qué tan lejos estás. Si algo necesita tu atención, te avisaremos enseguida. ¡La configuración solo toma unos minutos!",
			start: "¡Empecemos!",
		},
		invite: {
			notAnInvite:
				"Mmm, eso no parece un enlace de invitación. Copia todo el mensaje de texto y pégalo otra vez.",
			acceptTitle: "¡Ya eres parte del equipo!",
			acceptBody: (from, seats) =>
				`${from || "Alguien"} cuenta contigo para ayudar a cuidar ${seats}. ¡Gracias! Prepararemos tu teléfono en unos pocos pasos.`,
			accept: "¡Vamos!",
			findTitle: "Busquemos tu invitación",
			findBody:
				"Toca el enlace del mensaje que recibiste, o copia todo el mensaje y pégalo aquí.",
			message: "Mensaje de invitación",
			paste: "Pega el mensaje aquí",
			noInvite:
				"¿Todavía no tienes una? Pídele a la mamá o al papá que te envíe una desde Ajustes › Invitar a alguien a ayudar.",
		},
		comfort: {
			title: "Hagamos que se lea fácil",
			body: "Elige el tamaño de texto que te resulte cómodo. Puedes cambiarlo después en Ajustes.",
			done: "Así está bien",
			readAloudHint:
				"No hace falta si usas VoiceOver.",
		},
		child: {
			title: "¿Quién viaja contigo?",
			body: (example) =>
				`Usaremos su nombre en las alertas, como "¡${seat(example, true)} está muy caliente!" También puedes agregar una foto bonita, si quieres.`,
			exampleName: "Emma",
			name: "Nombre de tu bebé",
		},
		permission: {
			allowed: "Todo listo. ¡Gracias!",
			bluetoothOff:
				"El Bluetooth está permitido, pero está apagado. Desliza hacia abajo desde la esquina superior derecha de la pantalla y toca Bluetooth.",
			simulatorOn: "¡No hace falta! Estás usando el asiento simulado.",
			noBluetoothHere:
				"Esta versión de la app no puede usar Bluetooth (Expo Go y el Simulador de iOS no pueden), así que aquí no hay nada que permitir.",
			bluetooth: {
				title: "¿Podemos usar el Bluetooth?",
				reason: "Así es como tu teléfono y el asiento se comunican.",
				allow: "Permitir Bluetooth",
				declined:
					"Sin Bluetooth, tu teléfono no puede escuchar al asiento, así que no podemos avisarte. Puedes activarlo en Configuración cuando quieras.",
			},
			notifications: {
				title: "¿Podemos enviarte alertas?",
				reason: "Así podemos avisarte aunque la app esté cerrada o tu teléfono esté bloqueado.",
				reasonWithCriticalAlerts:
					"Así podemos avisarte aunque la app esté cerrada o tu teléfono esté bloqueado. Tu teléfono también te preguntará por las alertas críticas. Por favor, permítelas también, para que las alertas suenen incluso en modo silencio.",
				allow: "Permitir notificaciones",
				partial:
					"¡Ya casi! Las alertas están activadas, pero no suenan mientras tu teléfono está en modo silencio. Para que suenen de todos modos, activa Alertas críticas en Notificaciones, dentro de Configuración.",
				declined:
					"Sin notificaciones, no podemos avisarte cuando la app está cerrada o tu teléfono está bloqueado. ¡Y es justo cuando más nos necesitas!",
			},
			location: {
				title: "¿Recordamos dónde está el asiento?",
				reason: "Si te alejas del carro, podemos mostrarte justo dónde lo dejaste. Para eso, elige Siempre en la ubicación.",
				allow: "Permitir ubicación",
				partial:
					'¡Ya casi! Por ahora esto solo funciona con la app abierta. Para que siga funcionando con el teléfono bloqueado, elige "Siempre" en Ubicación, dentro de Configuración.',
				declined:
					"No hay problema. Solo que no podremos mostrarte dónde se vio el asiento por última vez.",
			},
		},
		watch: {
			temperatureTitle: "Mucho calor o mucho frío",
			temperatureBody: (childName) =>
				`Los carros se calientan y se enfrían rápido. Te avisaremos si el asiento se pone muy caliente o muy frío para ${child(childName)}.`,
			temperatureDetail: (low, high) =>
				`Por ahora, de ${low} a ${high} se considera ideal. Puedes cambiarlo en Ajustes.`,
			weightTitle: "Quién va en el asiento",
			weightBody: (childName) =>
				`Un pequeño sensor bajo el cojín del asiento sabe cuándo ${child(childName)} va en él.`,
			weightDetail:
				"Solo enviamos avisos cuando hay alguien en el asiento, así que un asiento vacío se queda tranquilo y en silencio.",
			distanceTitle: "Si te alejas",
			distanceBody: (childName) =>
				`Si te alejas mientras ${child(childName)} sigue en el asiento, te avisaremos enseguida.`,
			distanceDetail:
				"La distancia es solo un cálculo aproximado, así que ¡siempre echa un vistazo al asiento de atrás también!",
			exampleLabel: "Así se ve una alerta",
			example: (title, body) => `Alerta de ejemplo: ${title}. ${body}`,
			now: "ahora",
			inTheApp: "En la app, verás",
			gotIt: "Entendido",
		},
		practice: {
			notificationsOff:
				"¡Ojo! Las notificaciones están desactivadas, así que las alertas no pueden sonar. Activa Notificaciones y Sonidos en Configuración.",
			heardTitle: "¿La escuchaste?",
			heard: "Sí, fuerte y claro",
			notHeard: "No, no la escuché",
			tips: {
				volume: "Sube el volumen con los botones del costado de tu teléfono.",
				silent: "Desactiva el modo silencio con el interruptor o el botón de acción del costado de tu teléfono.",
				focus: "Desactiva Concentración y No molestar (la lunita) en el Centro de control.",
				hearingAids:
					"¿Usas audífonos? Ve a Configuración › Accesibilidad › Dispositivos auditivos para que los sonidos del teléfono se escuchen a través de ellos.",
			},
			louderTitle: "Hagamos que las alertas suenen más fuerte",
			louderBody:
				"No pasa nada, para eso es la práctica. Prueba esto y luego la volvemos a reproducir.",
			playAgain: "Reproducir otra vez",
			title: "Hagamos una prueba",
			body: "Asegurémonos de que puedas escuchar una alerta. Sube el volumen, ¡y tu teléfono va a sonar, vibrar y parpadear!",
			play: "Reproducir la alerta de prueba",
			justPracticing: "Solo es práctica",
			turnOff: "Apagarla",
		},
		backup: {
			title: "¿Quién más te ayuda?",
			body: (minutes) =>
				`A todos se nos pasa una notificación de vez en cuando. Invita a tu pareja, a los abuelos o a la niñera para que te ayuden. Cada persona prepara su propio teléfono, y si nadie responde a una alerta en ${minutes} minutos, también les avisaremos.`,
			reachOutAfter: "Avisarles después de",
			minutes: (minutes) => `${minutes} min`,
		},
		done: {
			title: "¡Todo listo!",
			body: "A partir de ahora vigilaremos el asiento y te avisaremos en cuanto algo necesite tu atención. ¡Maneja con cuidado!",
			start: "Llévame a la app",
		},
	},

	pairing: {
		tip: "¡No te preocupes, a veces pasa! Acerca tu teléfono y asegúrate de que el asiento esté encendido.",
		findTitle: (childName) => `Busquemos ${seat(childName)}`,
		noBluetooth:
			"Esta versión de la app no puede usar Bluetooth. ¡El asiento simulado funciona igual que el de verdad!",
		connected: "¡Conectado!",
		connectedSimulator: "Tu teléfono ya está conectado al asiento simulado.",
		blinkingTitle: (childName) => `¿Parpadea la luz ${ofSeat(childName)}?`,
		blinkingBody:
			"¡Échale un vistazo! Si encontramos el asiento correcto, su luz está parpadeando rápido ahora mismo.",
		yesMine: "Sí, es mi asiento",
		blinkAgain: "Parpadear otra vez",
		notMine: "No, no parpadea",
		talking: (deviceName) =>
			`Tu teléfono y ${deviceName ?? "tu asiento"} ya se están comunicando.`,
		lookingTitle: "Buscando tu asiento…",
		slipped: "Se perdió la conexión. Intentando otra vez…",
		hangTight: "Espera un momento y mantén tu teléfono cerca del asiento.",
		findBody: 'Enciende el asiento, mantén tu teléfono cerca y toca "Buscar mi asiento".',
		find: "Buscar mi asiento",
		wrongSeatTitle: "Busquemos el asiento correcto",
		notFoundTitle: (childName) => `No encontramos ${seat(childName)}`,
		wrongSeatBody:
			"Puede que haya otro asiento cerca. Párate justo al lado del tuyo, lejos de los demás, y lo intentaremos otra vez.",
		callForHelp: "Llamar para pedir ayuda",
		useSimulatorDemo: "Usar el asiento simulado (demo)",
	},

	team: {
		title: "Tu equipo",
		ownerIntro: (seats) =>
			`Las personas que ayudan a vigilar ${seats}. Cada una prepara su propio teléfono, y solo tú puedes invitar o quitar personas.`,
		noSeatsIntro:
			"Agrega un asiento de seguridad propio y podrás invitar a otras personas a ayudarte a vigilarlo.",
		helping: "Equipos a los que ayudas",
		teamOf: (owner) => (owner ? `Equipo de ${owner}` : "Equipo de otra persona"),
		helperIntro: (owner, seats) =>
			owner
				? `Ayudas a ${owner} a vigilar ${seats}. Solo ${owner} puede invitar o quitar personas, o cambiar los asientos.`
				: `Ayudas a vigilar ${seats}. Solo quien configuró los asientos puede invitar o quitar personas, o cambiar los asientos.`,
		summary: (helpers, waiting) => {
			if (!helpers && !waiting) return "Solo tú por ahora.";
			const parts: string[] = [];
			if (helpers) parts.push(`${helpers} ${helpers === 1 ? "ayudante" : "ayudantes"}`);
			if (waiting)
				parts.push(
					`${waiting} ${waiting === 1 ? "invitación pendiente" : "invitaciones pendientes"}`,
				);
			return `${parts.join(", ")}.`;
		},
		helperSummary: (owners) => `Ayudas a ${list(owners.map((o) => o || "alguien"))}.`,
		alsoHelping: (owners) => `También ayudas a ${list(owners.map((o) => o || "alguien"))}.`,
		see: "Ver tu equipo",
		you: "Tú",
		owner: "Configuró los asientos",
		joined: (day) => `Se unió el ${day}`,
		pretend: "De prueba",
		someone: "Alguien",
		invite: "Invitar a alguien a ayudar",
		inviteHint: (seats) =>
			`Envía por mensaje a tu pareja, a los abuelos o a la niñera un enlace para que su teléfono también ayude a vigilar ${seats}.`,
		nameSeatsFirst:
			"Primero ponle nombre al bebé de cada asiento (toca un asiento en la pantalla de inicio).",
		addSeatFirst:
			"Primero agrega un asiento de seguridad propio. Los asientos compartidos contigo los comparte quien los configuró.",
		full: (max) =>
			`Equipo completo: hasta ${max} ayudantes, contando las invitaciones pendientes.`,
		inviteSent: (day) => `Invitación enviada el ${day}`,
		waiting: (expires) => `Esperando a que se una. Vence el ${expires}.`,
		expired: "Venció. Envía otra si todavía quiere ayudar.",
		cancelInvite: "Cancelar invitación",
		removeTitle: (name) => `¿Quitar a ${name} de tu equipo?`,
		removeBody:
			"Ya no formará parte de tu equipo, y tus asientos saldrán de su teléfono. Puedes volver a invitar a esa persona cuando quieras.",
		removeHint: (name) => `Quita a ${name} de tu equipo`,
		leave: (owner) => (owner ? `Salir del equipo de ${owner}` : "Salir de este equipo"),
		leaveTitle: (owner) =>
			owner ? `¿Salir del equipo de ${owner}?` : "¿Salir de este equipo?",
		leaveBody:
			"Dejarás de ser parte de su equipo de ayuda, y sus asientos saldrán de este teléfono. Pueden volver a invitarte cuando quieran.",
		leaveConfirm: "Salir",
		pretendNote:
			"Por ahora el servidor de cuentas es de prueba y vive en este teléfono, así que quienes acepten tu invitación en su propio teléfono no aparecen aquí. Un servidor de verdad los agregaría solo.",
		joinFailedTitle: "No pudimos agregarte al equipo",
		joinFailedBody:
			"Puedes seguir con la configuración y unirte después con una invitación nueva.",
		errors: {
			notFound:
				"No encontramos tu cuenta. Cierra sesión, vuelve a iniciarla e inténtalo de nuevo.",
			numberTaken: "Ese número ya tiene su propia cuenta.",
			notAllowed: "Solo quien configuró los asientos puede hacer eso.",
			teamFull: "Tu equipo está completo. Primero cancela una invitación o quita a alguien.",
			noSeats: "Primero ponle nombre al bebé de cada asiento.",
			inviteNotFound: "No encontramos esa invitación. Pide una nueva.",
			inviteUsed: "Esa invitación ya se usó. Pide una nueva.",
			inviteExpired: "Esa invitación venció. Pide una nueva.",
			inviteCancelled: "Esa invitación se canceló. Pide una nueva.",
			ownInvite:
				"Esa es tu propia invitación. Envíasela a la persona que quieres que te ayude.",
			general: "Mmm, eso no funcionó. Inténtalo de nuevo en un momento.",
		},
	},

	childPhoto: {
		of: (childName) => (childName ? `Foto de ${childName}` : "Foto de tu bebé"),
		change: "Cambiar foto",
		add: "Agregar una foto",
		remove: "Quitar foto",
	},

	seatCard: {
		empty: "Vacío",
		opens: "Abre este asiento",
		connect: "Conectar",
	},

	simulator: {
		title: "Asiento simulado",
		temperature: (temperature) => `Temperatura: ${temperature}`,
		mild: "Templado",
		hotCar: "Carro caliente",
		coldCar: "Carro frío",
		distance: (distance) => `Distancia del teléfono: ${distance}`,
		inCar: "En el carro",
		walkingAway: "Alejándose",
		outOfRange: "Fuera de alcance",
		occupied: "Bebé en el asiento",
		cutPower: "Cortar la energía del asiento",
		someoneElseNearby: "Alguien más junto al asiento",
	},

	fieldWithUnit: (label, unit) => `${label}, en ${unit}`,
};

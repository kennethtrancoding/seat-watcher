import type { Strings } from "./en";

/** Complete Vietnamese dictionary. Use neutral “bạn” and “bé”, with whole
 * sentences for names and counts. */
const child = (name: string) => name || "bé của bạn";
const seat = (name: string, start = false) => {
	const text = name ? `ghế của ${name}` : "ghế an toàn trên ô tô";
	return start ? text.charAt(0).toUpperCase() + text.slice(1) : text;
};
const list = (items: readonly string[]) =>
	items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} và ${items.at(-1)}`;

export const vi: Strings = {
	appName: "Seat Watcher",
	common: {
		continue: "Tiếp tục",
		cancel: "Hủy",
		back: "Quay lại",
		remove: "Xóa",
		saveName: "Lưu tên",
		skipForNow: "Bỏ qua lúc này",
		tryAgain: "Thử lại",
		openSettings: "Mở Cài đặt",
		restoreDefaults: "Khôi phục mặc định",
		changesSave: "Thay đổi được lưu tự động.",
		useSimulatedSeat: "Dùng ghế mô phỏng",
		useSimulatedCarSeat: "Dùng ghế ô tô mô phỏng",
		firstName: "Tên",
		yourFirstName: "Tên của bạn",
		childName: "Tên của bé",
		minutes: "phút",
		someone: "Một người",
		inTheSeat: "Trong ghế",
		watching: "Đang theo dõi",
		checkOn: (name) => `Vui lòng kiểm tra ${child(name)}`,
		readAloud: "Đọc màn hình thành tiếng",
		readAloudOn: "Được rồi! Chúng tôi sẽ đọc từng màn hình thành tiếng.",
		textSize: "Cỡ chữ",
		relationship: "Bạn là… của bé",
		prototypeNote:
			"Đây là bản thử nghiệm. Khoảng cách chỉ là ước tính và cảnh báo chỉ phát khi có người trong ghế. Luôn kiểm tra ghế sau!",
		criticalAlertsOff:
			"Cảnh báo không phát âm thanh khi điện thoại ở chế độ im lặng. Để vẫn nghe cảnh báo, bật Cảnh báo quan trọng trong Thông báo ở Cài đặt.",
	},
	seats: {
		name: seat,
		title: (name) => seat(name, true),
		named: (names) => `các ghế của ${list(names)}`,
		yours: "các ghế ô tô của bạn",
		nameTooLong: (max) => `Dùng tối đa ${max} ký tự.`,
	},
	alerts: {
		labels: {
			temperatureHigh: "Quá nóng",
			temperatureLow: "Quá lạnh",
			tooFar: "Quá xa",
			connectionLost: "Mất kết nối",
		},
		unknown: "chưa rõ",
		tooHot: (name, temperature) => ({
			title: `${seat(name, true)} quá nóng!`,
			body: `Nhiệt độ trong ghế là ${temperature}. Vui lòng kiểm tra ${child(name)} ngay.`,
		}),
		tooCold: (name, temperature) => ({
			title: `${seat(name, true)} quá lạnh!`,
			body: `Nhiệt độ trong ghế là ${temperature}. Vui lòng kiểm tra ${child(name)} ngay.`,
		}),
		tooFar: (name, distance) => ({
			title: `Đừng quên ${child(name)}!`,
			body: `Bạn đang cách ghế khoảng ${distance}. ${name || "Bé"} vẫn còn trong xe phải không?`,
		}),
		connectionLost: (name) => ({
			title: `Mất kết nối với ${seat(name)}`,
			body: `Vẫn có người trong ghế khi mất kết nối. Vui lòng kiểm tra ${child(name)}.`,
		}),
		buckledIn: (name) => `${name || "Bé"} đã được thắt dây an toàn!`,
		outOfSeat: (name) => `${name || "Bé"} đã ra khỏi ghế!`,
		practice: (name) => ({
			title: `Thử cảnh báo: ${seat(name)} quá nóng!`,
			body: "Đây chỉ là thử cảnh báo! Cảnh báo thật cũng hiển thị và phát âm thanh như thế này.",
		}),
	},
	status: {
		needsYou: "cần bạn kiểm tra ngay!",
		lookingGood: "mọi thứ ổn!",
		lostTouch: "mất kết nối!",
		connecting: "đang kết nối…",
		waiting: "sẽ kết nối khi bạn ở gần…",
		notConnected: "chưa kết nối…",
	},
	greeting: (name, hour) => {
		const part =
			hour < 5
				? "Xin chào"
				: hour < 12
					? "Chào buổi sáng"
					: hour < 17
						? "Chào buổi chiều"
						: "Chào buổi tối";
		return name ? `${part}, ${name}` : part;
	},
	account: {
		relationships: {
			parent: "Cha hoặc mẹ",
			grandparent: "Ông hoặc bà",
			sitter: "Người trông trẻ",
			family: "Người thân khác",
			other: "Bạn bè hoặc người khác",
		},
		described: (name, relationship) => `${name} (${relationship})`,
		you: "Bạn",
		since: (date) => `Trên điện thoại này từ ${date}`,
		deleteTitle: "Xóa tài khoản của bạn?",
		deleteBody:
			"Tài khoản và nhóm của bạn sẽ bị xóa, bạn sẽ rời các nhóm bạn hỗ trợ, và các ghế cùng cài đặt trên điện thoại này cũng bị xóa. Không thể hoàn tác.",
		delete: "Xóa",
		aboutYou: "Thông tin của bạn",
		nameHint: "Tên này dùng trong lời chào và lời mời bạn gửi.",
		phoneNumber: "Số điện thoại",
		noneYet: "Chưa có",
		changeNumber: "Đổi số điện thoại",
		changeNumberHint:
			"Chúng tôi sẽ nhắn mã đến số mới để xác nhận đó là số của bạn. Các ghế và cài đặt được giữ nguyên.",
		yourData: "Dữ liệu của bạn",
		whereKept: "Nơi lưu dữ liệu",
		whereKeptHint: (count) =>
			`Tên, số điện thoại, các nhóm, ${count === 1 ? "ghế ô tô" : "các ghế ô tô"} và cài đặt được lưu cùng tài khoản. Khi đăng nhập lại, bạn sẽ lấy lại dữ liệu, kể cả sau khi người khác dùng điện thoại này. Ghế người khác chia sẻ với bạn đi theo nhóm của họ. Hiện tại máy chủ tài khoản là mô phỏng và cũng nằm trên điện thoại này.`,
		logOut: "Đăng xuất",
		logOutHint:
			"Chúng tôi ngừng theo dõi các ghế khi bạn đăng xuất. Bạn có thể đăng nhập lại bất cứ lúc nào. Mọi dữ liệu vẫn được giữ!",
		logOutTitle: "Đăng xuất?",
		logOutBody: (seats) =>
			`Chúng tôi sẽ ngừng theo dõi ${seats} cho đến khi bạn đăng nhập lại.`,
		deleteAccount: "Xóa tài khoản",
	},
	settings: {
		errors: {
			number: "Nhập một số.",
			temperatureGap: "Đặt thấp hơn ngưỡng quá nóng ít nhất 1 °C (khoảng 2 °F).",
			distance: (low, high, unit) => `Dùng giá trị ${low}–${high} ${unit}.`,
			positive: "Phải lớn hơn 0.",
			cooldown: "Dùng 0,5–60 phút.",
			rssi: "Dùng −100 đến −20 dBm.",
			pathLoss: "Dùng 1–6.",
			backupAfter: "Dùng 1–60 phút.",
		},
		textSizes: { standard: "Tiêu chuẩn", large: "Lớn", extraLarge: "Rất lớn" },
		yourAccount: "Tài khoản của bạn",
		loggedInAs: (phone) => `Đã đăng nhập bằng ${phone}`,
		notLoggedIn: "Chưa đăng nhập",
		accountAndLogOut: "Tài khoản và đăng xuất",
		comfort: "Dễ đọc và dễ nghe",
		readAloudHint: "Không cần nếu bạn dùng VoiceOver.",
		language: "Ngôn ngữ",
		languageSystem: "Theo điện thoại",
		units: "Đơn vị",
		temperature: "Nhiệt độ",
		fahrenheit: "°F Fahrenheit",
		celsius: "°C Celsius",
		distance: "Khoảng cách",
		feet: "Feet",
		metres: "Mét",
		tooHotAbove: "Quá nóng khi trên",
		tooColdBelow: "Quá lạnh khi dưới",
		alertPast: "Quá xa khi hơn",
		distanceHint: (unit) =>
			`Khoảng cách chỉ là ước tính. Sai số có thể từ ${unit === "ft" ? "10 feet" : "vài mét"} trở lên.`,
		personalSettings: "Cài đặt cá nhân",
		inAndOut: "Vào và ra khỏi ghế",
		notifyInAndOut: "Báo khi có người vào hoặc ra khỏi ghế",
		notifyInAndOutHint:
			"Thông báo ngắn như “Đã thắt dây an toàn!”. Cảnh báo nóng, lạnh và khoảng cách luôn được gửi.",
		seatScreen: "Màn hình ghế",
		showPressure: "Hiển thị áp lực và ngưỡng",
		showPressureHint: (threshold) =>
			`Hiển thị số đo cảm biến áp lực và ngưỡng có người (${threshold}) dưới mục “Trong ghế”.`,
		showSignal: "Hiển thị tín hiệu Bluetooth",
		showSignalHint:
			"Hiển thị cường độ tín hiệu theo dBm dưới mục “Khoảng cách”. Càng gần 0, tín hiệu càng mạnh.",
		reachThemAfter: "Báo cho người hỗ trợ sau",
		reachThemHint:
			"Nếu chưa có ai phản hồi cảnh báo sau thời gian này, chúng tôi cũng báo cho người hỗ trợ trong nhóm.",
		findTheSeat: "Tìm ghế ô tô",
		shortcut: (app) => `Lối tắt ${app}`,
		rememberLocation: "Nhớ vị trí ghế được thấy lần cuối",
		rememberLocationOff:
			"Khi có kết nối, chúng tôi lưu vị trí ghế để bạn tìm trong Bản đồ hoặc chia sẻ sau cảnh báo. Vị trí chỉ lưu trên điện thoại này.",
		rememberLocationWhileOpen:
			"Hiện tại vị trí chỉ cập nhật khi ứng dụng đang mở. Để tiếp tục khi điện thoại bị khóa, chọn “Luôn luôn” cho quyền Vị trí trong Cài đặt.",
		rememberLocationOn:
			"Cập nhật mỗi 30 giây khi có kết nối và thêm một lần khi mất kết nối. Vị trí chỉ lưu trên điện thoại này.",
		locationDenied:
			"Quyền truy cập vị trí của ứng dụng đang tắt. Cho phép trong Cài đặt để dùng tính năng này.",
		developerOptions: "Tùy chọn nhà phát triển",
		yourSeats: "Ghế của bạn",
		yourSeatsSummary: (tooHot, tooCold, tooFar) =>
			`Quá nóng khi trên ${tooHot}, quá lạnh khi dưới ${tooCold}, quá xa khi hơn ${tooFar}.`,
		yourSeatsHint: (seats) =>
			seats
				? `Dành cho ${seats}. Điện thoại của người hỗ trợ cũng dùng các cài đặt này, nên mọi người nhận cùng cảnh báo.`
				: "Dành cho các ghế bạn thêm. Điện thoại của người hỗ trợ cũng sẽ dùng các cài đặt này, nên mọi người nhận cùng cảnh báo.",
		sharedFollowOwner: "Ghế được chia sẻ với bạn dùng cài đặt của người chia sẻ.",
		seatSettings: "Cài đặt cho ghế của bạn",
		thisPhone:
			"Các cài đặt còn lại chỉ dành cho bạn, trên điện thoại này, cho mọi ghế bạn theo dõi.",
	},
	seatSettings: {
		intro: (seats) =>
			seats
				? `Các cài đặt này dành cho ${seats}. Chúng đi cùng ghế của bạn: điện thoại của người hỗ trợ cũng dùng chúng, nên mọi người nhận cùng cảnh báo.`
				: "Các cài đặt này dành cho các ghế bạn thêm. Chúng đi cùng ghế của bạn: điện thoại của người hỗ trợ cũng sẽ dùng chúng, nên mọi người nhận cùng cảnh báo.",
		sharedNote:
			"Ghế được chia sẻ với bạn dùng cài đặt của người chia sẻ. Màn hình của từng ghế cho biết các cài đặt đó.",
		helpers: "Người hỗ trợ của bạn",
	},
	developer: {
		intro: "Các tùy chọn này dùng để kiểm thử và điều chỉnh bản thử nghiệm. Giá trị mặc định phù hợp cho sử dụng hằng ngày.",
		seat: "Ghế",
		simulated: "Ghế ô tô mô phỏng",
		simulatedHint:
			"Ghế giả thay phần cứng thật, dùng để trình diễn và trên Trình mô phỏng iOS. Các nút điều khiển xuất hiện ở màn hình chính.",
		occupiedAt: "Có người khi áp lực ≥",
		currentReading: (pressure) =>
			`Số đo hiện tại: ${pressure}. Chọn giá trị giữa số đo ghế trống và ghế có người.`,
		rawUnits: "Dùng đơn vị thô của cảm biến. So sánh số đo khi trống và khi có người để chọn.",
		ownSeatsOnly:
			"Giống các cài đặt cho ghế của bạn, giá trị này đi cùng ghế của bạn đến điện thoại của người hỗ trợ. Ghế được chia sẻ với bạn dùng giá trị của chủ ghế.",
		calibration: "Hiệu chỉnh khoảng cách",
		signalAt1m: "Tín hiệu ở 1 m (3,3 ft)",
		signalAt1mHint: "Giữ điện thoại cách ghế 1 m (khoảng 3 ft) vài giây, rồi nhấn bên dưới.",
		useCurrentSignal: (dbm) => `Dùng tín hiệu hiện tại (${dbm} dBm)`,
		connectToCalibrate: "Kết nối để hiệu chỉnh",
		pathLoss: "Số mũ suy hao đường truyền",
		pathLossHint:
			"2 ở nơi thoáng; 2,5–4 khi có túi áo, người hoặc xe chắn tín hiệu. Giá trị cao hơn giúp giảm cảnh báo nhầm.",
		alerts: "Cảnh báo",
		repeatEvery: "Lặp lại cảnh báo sau mỗi",
		repeatHint:
			"Vấn đề mới được cảnh báo ngay. Cùng một cảnh báo sẽ không lặp lại trước khoảng thời gian này.",
		startOver: "Bắt đầu lại",
		restoreDefaultsHint:
			"Đưa mọi cài đặt về như ban đầu, ở đây và trong Cài đặt, kể cả ngôn ngữ, cỡ chữ và ghế mô phỏng. Vị trí cuối đã lưu sẽ bị xóa. Ghế, tài khoản và nhóm vẫn được giữ.",
		runSetupAgain: "Thiết lập lại",
		runSetupAgainHint:
			"Đăng xuất và chạy lại thiết lập. Thông tin bé, cài đặt, tài khoản và nhóm vẫn được giữ.",
		factoryReset: "Khôi phục cài đặt gốc",
		factoryResetHint:
			"Áp dụng ngay, không thể hoàn tác: ngắt kết nối ghế, xóa mọi dữ liệu ứng dụng đã lưu trên điện thoại này (bé, ảnh, cài đặt, vị trí cuối), đăng xuất, xóa sạch máy chủ tài khoản mô phỏng (mọi tài khoản, nhóm và lời mời trên đó) và quay về màn hình đầu. Các quyền đã cấp vẫn còn; đổi chúng trong Cài đặt của iPhone.",
		accountServer: "Máy chủ tài khoản",
		accountServerHint:
			"Tài khoản, nhóm và lời mời được lưu trên máy chủ mô phỏng ở điện thoại này. Khôi phục cài đặt gốc cũng xóa sạch máy chủ này.",
		acceptInvites: "Mô phỏng chấp nhận lời mời",
		acceptInvitesHint:
			"Tạo người hỗ trợ giả cho mọi lời mời đang chờ để thử nhóm mà không cần điện thoại thứ hai. Họ được đánh dấu Mô phỏng.",
		acceptedInvites: (count) =>
			count === 0
				? "Không có lời mời đang chờ."
				: `${count} người hỗ trợ mô phỏng đã tham gia.`,
		resetServer: "Đặt lại máy chủ tài khoản",
		resetServerHint:
			"Xóa mọi nhóm, lời mời và tài khoản khác trên máy chủ. Bạn vẫn đăng nhập nhưng không còn nhóm nào, và các ghế được chia sẻ với bạn sẽ bị gỡ khỏi điện thoại này.",
		serverReset: "Máy chủ tài khoản đã trống trở lại.",
		teamAlerts: "Cảnh báo nhóm",
		teamAlertsHint:
			"Khi không còn ai ở cạnh ghế, điện thoại rời đi sau cùng sẽ cảnh báo, và máy chủ tài khoản báo ngay cho người thiết lập ghế, rồi báo cho những người khác sau thời gian chờ trong Cài đặt › Cài đặt cho ghế của bạn, trừ khi cảnh báo kết thúc trước. Khi ghế quá nóng, cả nhóm được báo ngay, kể cả khi có người ở cạnh ghế. Máy chủ mô phỏng này không liên lạc được với điện thoại khác, nên chỉ cho thấy những ai sẽ được báo.",
		noTeamAlerts: "Chưa có cảnh báo nhóm.",
		teamAlert: (kind, childName, time, endedAt) => {
			const what =
				kind === "tooHot"
					? `${seat(childName, true)} quá nóng`
					: `Không còn ai ở với ${child(childName)}`;
			return endedAt
				? `${what}, ${time} (kết thúc lúc ${endedAt})`
				: `${what}, ${time} (vẫn đang diễn ra)`;
		},
		alertRaised: (kind, name, time) =>
			kind === "tooHot"
				? `Điện thoại của ${name} phát hiện đầu tiên và đã cảnh báo lúc ${time}`
				: `${name} là người rời đi sau cùng; điện thoại của họ đã cảnh báo lúc ${time}`,
		ownerTold: (name, time) => `${name}, người thiết lập ghế: đã được báo lúc ${time}`,
		helperTold: (name, time) => `${name}: đã được báo lúc ${time}`,
		helperToldLater: (name, time) => `${name}: lúc ${time}, nếu cảnh báo vẫn còn`,
	},
	locate: {
		apps: {
			showFindMy: {
				name: "Tìm",
				description: "Tìm AirTag gắn trên ghế ô tô hoặc xem vị trí gia đình.",
			},
			showLife360: {
				name: "Life360",
				description: "Xem vị trí Vòng tròn của bạn hoặc tìm thiết bị Tile trên ghế ô tô.",
			},
		},
		pin: "Ghế ô tô",
		share: (time, url) => `Ghế ô tô được thấy lần cuối ở đây lúc ${time}: ${url}`,
		shareWithAlerts: (alerts, location) =>
			`Cảnh báo ghế ô tô: ${alerts.join(", ")}. ${location}`,
		title: "Tìm ghế ô tô",
		lastSeen: (time) => `Thấy lần cuối lúc ${time}`,
		noSpotYet: "Chưa lưu vị trí. Chúng tôi sẽ lưu khi bạn kết nối với ghế.",
		openInMaps: "Mở trong Bản đồ",
		shareLocation: "Chia sẻ vị trí",
		open: (app) => `Mở ${app}`,
	},
	invite: {
		message: (from, seats, link) =>
			`${from ? `Mình là ${from}! ` : ""}Bạn có thể giúp mình theo dõi ${seats} không? Cài Seat Watcher rồi mở liên kết này: ${link}`,
	},
	inviteLink: {
		joinTitle: (from) => (from ? `Tham gia nhóm của ${from}?` : "Tham gia nhóm này?"),
		joinBody: (from, seats) =>
			`${from || "Một người"} nhờ bạn giúp theo dõi ${seats}. Bạn có thể ghép nối với ghế từ điện thoại này khi ở gần.`,
		join: "Tham gia nhóm",
		notNow: "Để sau",
		joinedBody: (seats) =>
			`Đã thêm ${seats} vào màn hình chính. Nhấn vào ghế để ghép nối khi bạn ở gần.`,
		done: "Đến các ghế của tôi",
		logInTitle: (from) =>
			from ? `Đăng nhập để tham gia nhóm của ${from}` : "Đăng nhập để tham gia nhóm",
		logInBody: "Chúng tôi sẽ nhắn mã cho bạn. Không cần mật khẩu!",
		brokenTitle: "Liên kết lời mời chưa đầy đủ",
		brokenBody: "Hãy xin lời mời mới hoặc sao chép toàn bộ tin nhắn rồi dán vào ứng dụng.",
		toApp: "Vào ứng dụng",
	},
	signIn: {
		phoneHelp: "Nhập số gồm 10 chữ số, hoặc bắt đầu bằng + nếu là số quốc tế.",
		demoNotice:
			"Chế độ trình diễn: không gửi tin nhắn thật. Bạn có thể nhập bất kỳ 6 chữ số nào.",
		errors: {
			tooSoon: "Chúng tôi vừa gửi mã. Chờ một phút rồi yêu cầu mã mới.",
			cantText: "Không thể nhắn đến số này. Kiểm tra số và khả năng nhận tin nhắn.",
			badNumber: "Số điện thoại có vẻ chưa đúng. Kiểm tra và thử lại.",
			notSwitchedOn: "Ứng dụng chưa bật đăng nhập qua tin nhắn.",
			noNewAccounts: "Hiện chưa cho phép tạo tài khoản mới. Thử số đã dùng trong ứng dụng.",
			notConfirmed: "Không thể xác nhận yêu cầu. Chờ một chút rồi thử lại.",
			general: "Yêu cầu chưa thành công. Kiểm tra kết nối mạng và thử lại.",
			couldntSend: "Không thể gửi mã. Kiểm tra kết nối mạng và thử lại.",
			couldntCheck: "Không thể kiểm tra mã. Kiểm tra kết nối mạng và thử lại.",
			wrongCode: "Mã không đúng hoặc đã hết hạn. Kiểm tra lại hoặc yêu cầu mã mới.",
			sameNumber: "Đó đã là số của bạn.",
		},
		alreadyTitle: "Bạn đã đăng nhập",
		alreadyBody: (phone) => `Bạn đang dùng số ${phone}.`,
		differentNumber: "Dùng số khác",
		welcomeBack: (name) => (name ? `Chào mừng ${name} quay lại!` : "Chào mừng bạn quay lại!"),
		welcomeBackBody: (seats) =>
			`Đăng nhập để chúng tôi tiếp tục theo dõi ${seats}. Chúng tôi sẽ nhắn mã cho bạn. Không cần mật khẩu!`,
		yourSeat: "ghế ô tô của bạn",
		newNumberTitle: "Số mới của bạn là gì?",
		newNumberBody:
			"Chúng tôi sẽ nhắn mã để xác nhận số này là của bạn. Các ghế và cài đặt được giữ nguyên.",
		numberTitle: "Số điện thoại của bạn là gì?",
		numberBody: "Chúng tôi sẽ nhắn mã để bạn đăng nhập. Không cần tạo hay nhớ mật khẩu!",
		textMeACode: "Gửi mã cho tôi",
		yourNewNumber: "Số mới của bạn",
		yourNumber: "Số điện thoại của bạn",
		codeTitle: "Kiểm tra tin nhắn",
		codeBody: (digits, phone) =>
			`Đã gửi mã gồm ${digits} chữ số đến ${phone}. Nhập mã bên dưới.`,
		sendNewCode: "Gửi mã mới",
		yourCode: "Mã của bạn",
		logInAs: (phone) => `Đăng nhập bằng ${phone}`,
		otherAccount: "Dùng hoặc tạo tài khoản khác",
		otherTitle: "Ai đang đăng nhập?",
		otherBody:
			"Nhập số của bạn. Nếu bạn mới sử dụng, chúng tôi sẽ tạo tài khoản và thiết lập điện thoại cho bạn.",
		restoreTitle: (name) => (name ? `Chào mừng ${name} quay lại!` : "Chào mừng bạn quay lại!"),
		restoreBody: (seats) =>
			`Đã tìm thấy ${seats} và cài đặt được lưu cùng tài khoản. Bạn muốn khôi phục trên điện thoại này không?`,
		restore: "Khôi phục dữ liệu",
		restoreSkip: "Bắt đầu từ đầu",
		profileTitle: "Rất vui được gặp bạn!",
		profileBody: "Chúng tôi nên gọi bạn là gì? Tên này dùng trong lời chào và lời mời bạn gửi.",
	},
	ble: {
		tooSlow: "Ghế phản hồi quá lâu. Hãy thử lại.",
		notConnected: "Chưa kết nối với ghế ô tô.",
		notFound: "Không tìm thấy ghế ô tô. Kiểm tra ghế đã bật và ở gần.",
		offWillConnect: "Bluetooth đang tắt. Chúng tôi sẽ kết nối khi bạn bật lại.",
		offReconnect: "Bluetooth đang tắt. Bật để kết nối lại.",
		lostTrack: "Điện thoại không còn nhận ra ghế này. Nhấn “Ghép nối với ghế khác” để tìm lại.",
		off: "Bluetooth đang tắt. Bật trong Trung tâm điều khiển.",
		denied: "Quyền Bluetooth đang tắt. Cho phép trong Cài đặt › Seat Watcher.",
		unsupported:
			"Thiết bị này không có Bluetooth (Trình mô phỏng iOS không có). Bật “Ghế ô tô mô phỏng” trong Cài đặt › Tùy chọn nhà phát triển.",
		notReady: "Bluetooth chưa sẵn sàng. Thử lại sau một chút.",
		general: "Có lỗi khi trao đổi dữ liệu với ghế ô tô.",
		simulatedSeat: "Ghế mô phỏng",
		unavailable:
			"Bản ứng dụng này không dùng được Bluetooth (Expo Go không hỗ trợ). Dùng bản phát triển hoặc bật ghế ô tô mô phỏng.",
	},
	nav: {
		home: "Các ghế ô tô",
		settings: "Cài đặt",
		addSeat: "Thêm ghế ô tô",
		pairSeat: "Ghép nối ghế",
		account: "Tài khoản",
		changeNumber: "Đổi số điện thoại",
		developer: "Nhà phát triển",
		team: "Nhóm của bạn",
		seatSettings: "Ghế của bạn",
	},
	home: {
		noSeats: "Hãy thêm ghế ô tô đầu tiên của bạn.",
		checkOn: (names) => `Vui lòng kiểm tra ${list(names.map(child))}.`,
		allGood: "Mọi ghế đều ổn!",
		waitingForYou: (count) =>
			`Chúng tôi sẽ kết nối khi bạn ở gần ${count === 1 ? "ghế" : "các ghế"}.`,
		connectToStart: () => "Kết nối một ghế để bắt đầu theo dõi.",
		someConnected: (connected, total) => `Đã kết nối ${connected}/${total} ghế.`,
		openSeat: (name) => `Mở ${seat(name)}`,
		notificationsOff:
			"Thông báo đang tắt nên chúng tôi không thể báo cho bạn khi ứng dụng đóng.",
		allowCriticalAlerts: "Cho phép Cảnh báo quan trọng",
		criticalAlertsAsk:
			"Cảnh báo có thể phát âm thanh kể cả ở chế độ im lặng. Nhấn bên dưới rồi cho phép Cảnh báo quan trọng.",
		connectAll: "Kết nối tất cả ghế",
		addAnother: "Thêm ghế ô tô khác",
		addSeat: "Thêm ghế ô tô",
		yourSeats: "Ghế của bạn",
		sharedBy: (owner) => (owner ? `${owner} chia sẻ` : "Được chia sẻ với bạn"),
	},
	seat: {
		links: {
			idle: "Chưa kết nối",
			scanning: "Đang tìm ghế…",
			connecting: "Đang kết nối…",
			waiting: "Sẽ kết nối khi bạn ở gần",
			connected: "Đã kết nối",
			reconnecting: "Mất kết nối. Đang thử lại…",
		},
		removeTitle: (name) => `Xóa ${seat(name)}?`,
		removeBody: "Chúng tôi sẽ ngừng theo dõi ghế và xóa ảnh cùng vị trí được thấy lần cuối.",
		tooHot: "Quá nóng",
		tooCold: "Quá lạnh",
		justRight: "Vừa phải",
		tooFar: "Quá xa",
		closeBy: "Ở gần",
		othersClose: (count) => (count === 1 ? "Có người khác ở gần" : `${count} người khác ở gần`),
		simulated: (device) => `${device} (mô phỏng)`,
		disconnect: "Ngắt kết nối",
		pair: "Ghép nối với ghế",
		connect: "Kết nối với ghế",
		noOne: "Không có người",
		pressure: (pressure, threshold) => `Áp lực ${pressure} · có người khi ≥ ${threshold}`,
		occupiedAt: (threshold) => `Có người khi áp lực ≥ ${threshold}`,
		temperature: "Nhiệt độ",
		safeRange: (low, high) => `Khoảng an toàn ${low}–${high}`,
		distance: "Khoảng cách của bạn (ước tính)",
		signal: (dbm, limit) => `Tín hiệu ${dbm} dBm · cảnh báo khi xa hơn ${limit}`,
		alertPast: (limit) => `Cảnh báo khi bạn xa hơn ${limit}`,
		stale: "Đây là số đo cuối cùng trước khi mất kết nối.",
		about: "Thông tin ghế",
		nameHint: "Cảnh báo của ghế này dùng tên này.",
		hardware: "Phần cứng ghế",
		usingSimulator: "Đang dùng ghế mô phỏng.",
		pairedWith: (device) =>
			`Đã ghép nối với ${device ?? "ghế ô tô"}. Điện thoại tự kết nối khi bạn ở gần, cho đến khi bạn nhấn Ngắt kết nối.`,
		notPaired: "Chưa ghép nối. Chúng tôi sẽ tìm ghế và xác nhận đó là ghế của bạn.",
		pairDifferent: "Ghép nối với ghế khác",
		removeSeat: "Xóa ghế này",
		sharedNote: (owner) =>
			owner
				? `${owner} chia sẻ ghế này với bạn, nên chỉ ${owner} có thể đổi tên hoặc xóa ghế, và ghế cảnh báo theo cài đặt của ${owner}. Bạn vẫn có thể ghép nối và thêm ảnh trên điện thoại này.`
				: "Ghế này được chia sẻ với bạn, nên chỉ người thiết lập ghế có thể đổi tên hoặc xóa ghế, và ghế cảnh báo theo cài đặt của họ. Bạn vẫn có thể ghép nối và thêm ảnh trên điện thoại này.",
		seeTeam: (owner) => (owner ? `Xem nhóm của ${owner}` : "Xem nhóm"),
	},
	newSeat: {
		fullTitle: "Đã đủ ghế rồi!",
		fullBody: (max) =>
			`Bạn có thể thêm tối đa ${max} ghế của riêng bạn. Xóa một ghế của bạn trước khi thêm ghế mới.`,
		title: "Bé nào ngồi ghế này?",
		body: (example) =>
			`Chúng tôi theo dõi mọi ghế cùng lúc. Cảnh báo cho biết ghế của bé nào, như “${seat(example, true)} quá nóng!”`,
		exampleName: "Leo",
		next: "Tiếp theo: tìm ghế",
		taken: (name) => `Đã có ghế cho ${name}. Thêm chữ cái đầu của họ để phân biệt.`,
	},
	onboarding: {
		step: (step, total) => `Bước ${step}/${total}`,
		titleCard: {
			hello: "Xin chào! Bạn muốn bắt đầu thế nào?",
			self: "Tôi tự thiết lập",
			selfDetail: "Ghế ô tô đang ở ngay đây với tôi.",
			invite: "Tôi đã nhận lời mời",
			inviteDetail: "Cha hoặc mẹ của bé đã thiết lập ghế và nhắn liên kết cho tôi.",
			haveAccount: "Bạn đã có tài khoản?",
			logIn: "Đăng nhập",
		},
		welcome: {
			title: "Chào mừng bạn",
			body: "Chúng tôi sẽ theo dõi ghế ô tô của bé: nhiệt độ, có người trong ghế hay không và khoảng cách của bạn. Nếu cần bạn kiểm tra, chúng tôi báo ngay. Thiết lập chỉ mất vài phút!",
			start: "Bắt đầu thôi",
		},
		invite: {
			notAnInvite:
				"Đây có vẻ không phải liên kết lời mời. Sao chép toàn bộ tin nhắn rồi dán lại.",
			acceptTitle: "Bạn đã vào nhóm!",
			acceptBody: (from, seats) =>
				`${from || "Một người"} nhờ bạn giúp theo dõi ${seats}. Cảm ơn bạn! Chúng tôi sẽ chuẩn bị điện thoại qua vài bước.`,
			accept: "Bắt đầu thôi",
			findTitle: "Tìm lời mời của bạn",
			findBody:
				"Nhấn liên kết trong tin nhắn đã nhận hoặc sao chép toàn bộ tin nhắn rồi dán vào đây.",
			message: "Tin nhắn lời mời",
			paste: "Dán tin nhắn vào đây",
			noInvite: "Chưa có lời mời? Nhờ cha hoặc mẹ của bé gửi từ Cài đặt › Mời người hỗ trợ.",
		},
		comfort: {
			title: "Chọn cách hiển thị dễ đọc",
			body: "Chọn cỡ chữ phù hợp. Bạn có thể đổi sau trong Cài đặt.",
			done: "Vừa rồi",
			readAloudHint: "Không cần nếu bạn dùng VoiceOver.",
		},
		child: {
			title: "Bé nào đi cùng bạn?",
			body: (example) =>
				`Tên bé sẽ xuất hiện trong cảnh báo, như “${seat(example, true)} quá nóng!”. Bạn cũng có thể thêm ảnh nếu thích.`,
			exampleName: "Emma",
			name: "Tên bé của bạn",
		},
		permission: {
			allowed: "Đã xong. Cảm ơn bạn!",
			bluetoothOff:
				"Đã cho phép Bluetooth nhưng Bluetooth đang tắt. Vuốt xuống từ góc trên bên phải màn hình rồi nhấn Bluetooth.",
			simulatorOn: "Không cần! Bạn đang dùng ghế ô tô mô phỏng.",
			noBluetoothHere:
				"Bản ứng dụng này không dùng được Bluetooth (Expo Go và Trình mô phỏng iOS không hỗ trợ), nên không cần cấp quyền ở đây.",
			bluetooth: {
				title: "Cho phép dùng Bluetooth?",
				reason: "Bluetooth giúp điện thoại và ghế ô tô trao đổi dữ liệu.",
				allow: "Cho phép Bluetooth",
				declined:
					"Không có Bluetooth, điện thoại không nhận dữ liệu ghế nên không thể cảnh báo. Bạn có thể bật trong Cài đặt bất cứ lúc nào.",
			},
			notifications: {
				title: "Cho phép gửi cảnh báo?",
				reason: "Để báo cho bạn kể cả khi ứng dụng đóng hoặc điện thoại bị khóa.",
				reasonWithCriticalAlerts:
					"Để báo cho bạn kể cả khi ứng dụng đóng hoặc điện thoại bị khóa. Điện thoại cũng sẽ hỏi về Cảnh báo quan trọng. Hãy cho phép để cảnh báo phát âm thanh cả ở chế độ im lặng.",
				allow: "Cho phép thông báo",
				partial:
					"Đã bật cảnh báo nhưng không phát âm thanh ở chế độ im lặng. Bật Cảnh báo quan trọng trong Thông báo ở Cài đặt để vẫn nghe cảnh báo.",
				declined:
					"Không có thông báo, chúng tôi không thể báo khi ứng dụng đóng hoặc điện thoại bị khóa. Đó là lúc bạn cần cảnh báo nhất!",
			},
			location: {
				title: "Nhớ vị trí của ghế?",
				reason: "Nếu bạn rời xe, chúng tôi có thể chỉ nơi bạn để xe. Hãy chọn Luôn luôn cho quyền vị trí.",
				allow: "Cho phép vị trí",
				partial:
					"Hiện tại chỉ hoạt động khi ứng dụng mở. Để tiếp tục khi điện thoại bị khóa, chọn “Luôn luôn” trong quyền Vị trí ở Cài đặt.",
				declined:
					"Không sao. Chúng tôi chỉ không thể hiển thị vị trí ghế được thấy lần cuối.",
			},
		},
		watch: {
			temperatureTitle: "Quá nóng hoặc quá lạnh",
			temperatureBody: (name) =>
				`Xe nóng lên và lạnh đi rất nhanh. Chúng tôi sẽ báo nếu ghế quá nóng hoặc quá lạnh cho ${child(name)}.`,
			temperatureDetail: (low, high) =>
				`Hiện tại ${low}–${high} được coi là vừa phải. Bạn có thể đổi trong Cài đặt.`,
			weightTitle: "Ai đang trong ghế",
			weightBody: (name) =>
				`Cảm biến nhỏ dưới đệm ghế nhận biết khi ${child(name)} ngồi trong ghế.`,
			weightDetail:
				"Chỉ gửi cảnh báo khi có người trong ghế, nên ghế trống không gây cảnh báo.",
			distanceTitle: "Rời xa xe",
			distanceBody: (name) =>
				`Nếu bạn rời xa khi ${child(name)} vẫn trong ghế, chúng tôi báo ngay.`,
			distanceDetail: "Khoảng cách chỉ là ước tính. Luôn kiểm tra ghế sau!",
			exampleLabel: "Cảnh báo sẽ hiển thị như thế này",
			example: (title, body) => `Cảnh báo mẫu: ${title}. ${body}`,
			now: "bây giờ",
			inTheApp: "Trong ứng dụng, bạn sẽ thấy",
			gotIt: "Đã hiểu",
		},
		practice: {
			notificationsOff:
				"Thông báo đang tắt nên cảnh báo không phát âm thanh. Bật Thông báo và Âm thanh trong Cài đặt.",
			heardTitle: "Bạn có nghe thấy không?",
			heard: "Có, nghe rất rõ",
			notHeard: "Không, tôi không nghe thấy",
			tips: {
				volume: "Tăng âm lượng bằng các nút bên cạnh điện thoại.",
				silent: "Tắt chế độ im lặng bằng công tắc hoặc nút Tác vụ bên cạnh điện thoại.",
				focus: "Tắt Tập trung và Không làm phiền (biểu tượng mặt trăng) trong Trung tâm điều khiển.",
				hearingAids:
					"Bạn dùng thiết bị trợ thính? Vào Cài đặt › Trợ năng › Thiết bị trợ thính để âm thanh điện thoại phát qua thiết bị.",
			},
			louderTitle: "Làm cảnh báo to hơn",
			louderBody: "Không sao, chúng ta đang thử mà. Làm theo các gợi ý rồi thử lại.",
			playAgain: "Phát lại",
			title: "Thử một cảnh báo",
			body: "Hãy chắc chắn bạn nghe được cảnh báo. Tăng âm lượng rồi điện thoại sẽ phát tiếng, rung và nháy sáng!",
			play: "Phát cảnh báo thử",
			justPracticing: "Chỉ đang thử",
			turnOff: "Tắt",
		},
		backup: {
			title: "Ai cùng hỗ trợ?",
			body: (minutes) =>
				`Ai cũng có lúc bỏ lỡ thông báo. Mời người bạn đời, ông bà hoặc người trông trẻ cùng hỗ trợ. Họ thiết lập điện thoại riêng. Nếu chưa ai phản hồi cảnh báo sau ${minutes} phút, chúng tôi cũng báo cho họ.`,
			reachOutAfter: "Báo cho họ sau",
			minutes: (minutes) => `${minutes} phút`,
		},
		done: {
			title: "Đã sẵn sàng!",
			body: "Từ đây chúng tôi sẽ theo dõi ghế và báo ngay khi cần bạn kiểm tra. Chúc bạn lái xe an toàn!",
			start: "Vào ứng dụng",
		},
	},
	pairing: {
		tip: "Không sao! Đưa điện thoại gần hơn và kiểm tra ghế đã bật.",
		findTitle: (name) => `Tìm ${seat(name)}`,
		noBluetooth:
			"Bản ứng dụng này không dùng được Bluetooth. Ghế mô phỏng hoạt động giống ghế thật!",
		connected: "Đã kết nối!",
		connectedSimulator: "Bạn đã kết nối với ghế ô tô mô phỏng.",
		blinkingTitle: (name) => `Đèn trên ${seat(name)} có nhấp nháy không?`,
		blinkingBody: "Hãy kiểm tra! Nếu tìm đúng ghế, đèn của ghế đang nhấp nháy nhanh.",
		yesMine: "Đúng, đó là ghế của tôi",
		blinkAgain: "Nháy đèn lần nữa",
		notMine: "Không, đèn không nhấp nháy",
		talking: (device) => `Điện thoại và ${device ?? "ghế của bạn"} đang trao đổi dữ liệu.`,
		lookingTitle: "Đang tìm ghế của bạn…",
		slipped: "Mất kết nối. Đang thử lại…",
		hangTight: "Chờ một chút và giữ điện thoại gần ghế.",
		findBody: "Bật ghế, giữ điện thoại gần ghế rồi nhấn “Tìm ghế của tôi”.",
		find: "Tìm ghế của tôi",
		wrongSeatTitle: "Tìm đúng ghế của bạn",
		notFoundTitle: (name) => `Không tìm thấy ${seat(name)}`,
		wrongSeatBody:
			"Có thể có ghế khác ở gần. Đứng sát ghế của bạn, cách xa ghế khác rồi thử lại.",
		callForHelp: "Gọi để được hỗ trợ",
		useSimulatorDemo: "Dùng ghế mô phỏng (trình diễn)",
	},
	team: {
		title: "Nhóm của bạn",
		ownerIntro: (seats) =>
			`Những người giúp theo dõi ${seats}. Mỗi người dùng điện thoại riêng. Chỉ bạn có thể mời hoặc xóa thành viên.`,
		noSeatsIntro:
			"Thêm một ghế ô tô của riêng bạn, rồi bạn có thể mời người khác cùng theo dõi.",
		helping: "Nhóm bạn hỗ trợ",
		teamOf: (owner) => (owner ? `Nhóm của ${owner}` : "Nhóm của một người"),
		helperIntro: (owner, seats) =>
			owner
				? `Bạn giúp ${owner} theo dõi ${seats}. Chỉ ${owner} có thể mời hoặc xóa thành viên, hoặc thay đổi các ghế.`
				: `Bạn giúp theo dõi ${seats}. Chỉ người thiết lập ghế có thể mời hoặc xóa thành viên, hoặc thay đổi các ghế.`,
		summary: (helpers, waiting) => {
			if (!helpers && !waiting) return "Hiện chỉ có bạn.";
			const parts = [];
			if (helpers) parts.push(`${helpers} người hỗ trợ`);
			if (waiting) parts.push(`${waiting} lời mời đang chờ`);
			return `${parts.join(", ")}.`;
		},
		helperSummary: (owners) => `Bạn hỗ trợ ${list(owners.map((o) => o || "một người"))}.`,
		alsoHelping: (owners) => `Bạn cũng hỗ trợ ${list(owners.map((o) => o || "một người"))}.`,
		see: "Xem nhóm của bạn",
		you: "Bạn",
		owner: "Người thiết lập ghế",
		joined: (day) => `Tham gia ngày ${day}`,
		pretend: "Mô phỏng",
		someone: "Một người",
		invite: "Mời người hỗ trợ",
		inviteHint: (seats) =>
			`Nhắn liên kết cho người bạn đời, ông bà hoặc người trông trẻ để thiết lập điện thoại của họ và cùng theo dõi ${seats}.`,
		nameSeatsFirst: "Đặt tên bé cho từng ghế trước (nhấn ghế trên màn hình chính).",
		addSeatFirst:
			"Thêm ghế ô tô của riêng bạn trước. Ghế được chia sẻ với bạn chỉ chủ ghế mới chia sẻ được.",
		full: (max) => `Nhóm đã đầy: tối đa ${max} người hỗ trợ, kể cả lời mời đang chờ.`,
		inviteSent: (day) => `Đã gửi lời mời ngày ${day}`,
		waiting: (expires) => `Đang chờ tham gia. Hết hạn ${expires}.`,
		expired: "Đã hết hạn. Gửi lời mời mới nếu họ vẫn muốn hỗ trợ.",
		cancelInvite: "Hủy lời mời",
		removeTitle: (name) => `Xóa ${name} khỏi nhóm?`,
		removeBody:
			"Họ sẽ không còn trong nhóm, và các ghế của bạn sẽ bị gỡ khỏi điện thoại của họ. Bạn có thể mời lại bất cứ lúc nào.",
		removeHint: (name) => `Xóa ${name} khỏi nhóm của bạn`,
		leave: (owner) => (owner ? `Rời nhóm của ${owner}` : "Rời nhóm này"),
		leaveTitle: (owner) => (owner ? `Rời nhóm của ${owner}?` : "Rời nhóm này?"),
		leaveBody:
			"Bạn sẽ không còn là người hỗ trợ trong nhóm, và các ghế của họ sẽ bị gỡ khỏi điện thoại này. Họ có thể mời lại bạn bất cứ lúc nào.",
		leaveConfirm: "Rời nhóm",
		pretendNote:
			"Hiện máy chủ tài khoản là mô phỏng và nằm trên điện thoại này, nên người chấp nhận lời mời trên điện thoại riêng không xuất hiện ở đây. Máy chủ thật sẽ tự thêm họ.",
		joinFailedTitle: "Không thể thêm bạn vào nhóm",
		joinFailedBody: "Bạn có thể tiếp tục thiết lập và tham gia sau bằng lời mời mới.",
		errors: {
			notFound: "Không tìm thấy tài khoản. Đăng xuất, đăng nhập lại rồi thử lại.",
			numberTaken: "Số này đã có tài khoản riêng.",
			notAllowed: "Chỉ người thiết lập ghế có thể làm việc này.",
			teamFull: "Nhóm đã đầy. Hủy lời mời hoặc xóa thành viên trước.",
			noSeats: "Đặt tên bé cho từng ghế trước.",
			inviteNotFound: "Không tìm thấy lời mời. Hãy xin lời mời mới.",
			inviteUsed: "Lời mời đã được sử dụng. Hãy xin lời mời mới.",
			inviteExpired: "Lời mời đã hết hạn. Hãy xin lời mời mới.",
			inviteCancelled: "Lời mời đã bị hủy. Hãy xin lời mời mới.",
			ownInvite: "Đây là lời mời của bạn. Gửi cho người bạn muốn nhờ hỗ trợ.",
			general: "Chưa thành công. Thử lại sau một chút.",
		},
	},
	childPhoto: {
		of: (name) => (name ? `Ảnh của ${name}` : "Ảnh của bé"),
		change: "Đổi ảnh",
		add: "Thêm ảnh",
		remove: "Xóa ảnh",
	},
	seatCard: { empty: "Trống", opens: "Mở ghế này", connect: "Kết nối" },
	simulator: {
		title: "Ghế ô tô mô phỏng",
		temperature: (temperature) => `Nhiệt độ: ${temperature}`,
		mild: "Vừa phải",
		hotCar: "Xe nóng",
		coldCar: "Xe lạnh",
		distance: (distance) => `Khoảng cách điện thoại: ${distance}`,
		inCar: "Trong xe",
		walkingAway: "Đang rời xa",
		outOfRange: "Ngoài phạm vi",
		occupied: "Bé trong ghế",
		cutPower: "Ngắt nguồn ghế",
		someoneElseNearby: "Có người khác cạnh ghế",
	},
	fieldWithUnit: (label, unit) => `${label}, đơn vị ${unit}`,
};

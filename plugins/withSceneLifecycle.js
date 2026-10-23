const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

/**
 * Apps built with the iOS 27 SDK crash at launch on iOS 27 unless they use
 * the UIScene life cycle. Expo SDK 57 ships the scene delegate
 * (ExpoAppSceneDelegate) but its project template doesn't use it yet, so
 * this plugin applies what the SDK 58 template does: the scene delegate
 * creates the window and starts React Native, instead of the AppDelegate.
 *
 * It also starts React Native when no window opens (WINDOWLESS_REACT_NATIVE),
 * which Bluetooth state restoration needs. After upgrading to SDK 58, drop
 * the template edits but keep that part: the SDK 58 template has the same gap.
 */
const WINDOW_SETUP =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([^)]*\)\n#endif\n/;

const SCENE_COMMENT = '    // ExpoAppSceneDelegate creates the window and starts React Native.\n';

// Inside application(_:didFinishLaunchingWithOptions:). The launch options'
// bluetoothCentrals key is deprecated (iOS 26), so check for a window instead.
// On a normal launch the scene connects within about 200 ms, but after the
// main queue's first turn, so wait a second. Starting without a window then
// would still work, but a link that opened the app could be lost.
const START_WINDOWLESS = `    // SeatWatcherSceneDelegate creates the window and starts React Native.
    // When iOS relaunches the app in the background for Bluetooth (a paired
    // seat came into range, sent a reading or dropped), no window opens, so
    // start React Native without one: watching the seats needs it.
    DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
      if application.connectedScenes.isEmpty {
        WindowlessReactNative.start(factory, delegate: delegate, moduleName: self.reactNativeFactoryModuleName)
      }
    }
`;

// What an earlier prebuild added, to replace.
const START_WINDOWLESS_PATTERN = / {4}\/\/ SeatWatcherSceneDelegate creates the window[\s\S]*?\n {4}}\n/;
const WINDOWLESS_MARK = '\n// MARK: - React Native without a window';

const WINDOWLESS_REACT_NATIVE = `${WINDOWLESS_MARK} (plugins/withSceneLifecycle.js)

/**
 Holds React Native while no window shows it, so the seats stay watched.

 iOS relaunches the app in the background for Bluetooth (state restoration)
 without opening a window, and it can close the window of an app in the
 background while the app keeps running. When a window opens again, the scene
 delegate shows this same instance instead of starting a second one.
 */
enum WindowlessReactNative {
  private static var parked: UIViewController?

  static func start(_ factory: RCTReactNativeFactory, delegate: ExpoReactNativeFactoryDelegate, moduleName: String) {
    guard parked == nil else { return }
    NSLog("Seat Watcher: starting React Native without a window")
    // Release builds have no dev menu, so defaultConfiguration is nil there
    // (React Native ignores the value then). Never force-unwrap it.
    let devMenu: RCTDevMenuConfiguration? = factory.devMenuConfiguration ?? RCTDevMenuConfiguration.default()
    let rootView = factory.rootViewFactory.view(
      withModuleName: moduleName,
      initialProperties: nil,
      launchOptions: nil,
      bundleConfiguration: factory.bundleConfiguration,
      devMenuConfiguration: devMenu ?? RCTDevMenuConfiguration()
    )
    let controller = delegate.createRootViewController()
    delegate.setRootView(rootView, toRootViewController: controller)
    parked = controller
  }

  static func park(_ controller: UIViewController) {
    parked = controller
  }

  /// The running instance's view controller, for a window to show. Nil if it isn't running.
  static func take() -> UIViewController? {
    defer { parked = nil }
    return parked
  }
}

@objc(SeatWatcherSceneDelegate)
class SeatWatcherSceneDelegate: ExpoAppSceneDelegate {
  override func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let rootViewController = WindowlessReactNative.take() else {
      super.scene(scene, willConnectTo: session, options: connectionOptions)
      return
    }
    NSLog("Seat Watcher: showing the React Native that was running without a window")
    let window = UIWindow(windowScene: windowScene)
    self.window = window
    (UIApplication.shared.delegate as? ExpoReactNativeFactoryProvider)?.window = window
    window.rootViewController = rootViewController
    window.makeKeyAndVisible()

    // React Native is already running, so a link that opened the app arrives as an event.
    let app = UIApplication.shared
    for context in connectionOptions.urlContexts {
      _ = app.delegate?.application?(app, open: context.url, options: [:])
    }
    for activity in connectionOptions.userActivities {
      _ = app.delegate?.application?(app, continue: activity, restorationHandler: { _ in })
    }
  }

  override func sceneDidDisconnect(_ scene: UIScene) {
    if let controller = window?.rootViewController {
      window?.rootViewController = nil
      WindowlessReactNative.park(controller)
    }
    super.sceneDidDisconnect(scene)
  }
}
`;

function withSceneManifest(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            // The Objective-C name of SeatWatcherSceneDelegate, a subclass of Expo's ExpoAppSceneDelegate.
            UISceneDelegateClassName: 'SeatWatcherSceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle: expected a Swift AppDelegate.');
    }
    let src = config.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
      src = src.replace(WINDOW_SETUP, `\n${SCENE_COMMENT}`);
      if (!src.includes('ExpoReactNativeFactoryProvider {') || WINDOW_SETUP.test(src) || src.includes('startReactNative(')) {
        throw new Error(
          "withSceneLifecycle: AppDelegate.swift doesn't match the SDK 57 template. Update the plugin or remove it.",
        );
      }
    }
    // Replaced on every prebuild, so changes here reach an existing ios/ folder too.
    const start = src.match(START_WINDOWLESS_PATTERN)?.[0] ?? SCENE_COMMENT;
    if (!src.includes(start)) {
      throw new Error("withSceneLifecycle: couldn't find where AppDelegate.swift starts React Native.");
    }
    src = src.replace(start, START_WINDOWLESS);
    const previous = src.indexOf(WINDOWLESS_MARK);
    src = (previous === -1 ? src : src.slice(0, previous)) + WINDOWLESS_REACT_NATIVE;
    config.modResults.contents = src;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneAppDelegate(withSceneManifest(config));
};

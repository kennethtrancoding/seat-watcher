const { withEntitlementsPlist } = require('expo/config-plugins');

const ENTITLEMENT = 'com.apple.developer.usernotifications.critical-alerts';

/**
 * Adds Apple's Critical Alerts entitlement when app.json › expo.extra.criticalAlerts
 * is true, so safety alerts can ring through Silent mode and Focus. Apple grants
 * it on request, to a paid developer account's app ID; until then a build that
 * carries it can't be signed, so it's off by default. The app reads the same
 * flag to decide whether to ask the user for critical alerts.
 */
module.exports = function withCriticalAlerts(config) {
  const enabled = config.extra?.criticalAlerts === true;
  return withEntitlementsPlist(config, (config) => {
    if (enabled) config.modResults[ENTITLEMENT] = true;
    else delete config.modResults[ENTITLEMENT];
    return config;
  });
};

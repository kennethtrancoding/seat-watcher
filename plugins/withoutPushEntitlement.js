const { withEntitlementsPlist } = require('expo/config-plugins');

/**
 * expo-notifications always adds the push-notification (aps-environment)
 * entitlement, but this app only posts local notifications. Free Apple
 * developer accounts can't sign apps that carry it, so remove it.
 * Delete this plugin if you add remote push notifications later.
 */
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};



/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: "widget",
  icon: '../../assets/icon.png',
  name: "orderActivity",
  bundleIdentifier: "pk.flippin.customer.orderActivity",
  deploymentTarget: "16.2",

  entitlements: {
    "com.apple.security.application-groups": [
      "group.pk.flippin.customer.shared"
    ],
  },

  frameworks: ["SwiftUI", "ActivityKit"],
});

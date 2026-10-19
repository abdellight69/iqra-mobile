/**
 * Widget iOS « Aujourd'hui » (WidgetKit, SwiftUI) : objectif du jour, série, révisions dues,
 * reprise de lecture. Lit l'instantané écrit par l'app dans le groupe d'applications.
 * @type {import('@bacons/apple-targets/app.plugin').ConfigFunction}
 */
module.exports = (config) => ({
  type: "widget",
  name: "IqraWidget",
  displayName: "Iqra",
  icon: "../../assets/images/icon.png",
  deploymentTarget: "17.0",
  bundleIdentifier: ".widget",
  colors: {
    $accent: { color: "#0F4F44", darkColor: "#7CC4AE" },
    $widgetBackground: { color: "#F7F5F0", darkColor: "#151A18" },
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"],
  },
});

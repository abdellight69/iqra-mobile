// Point d'entrée : Expo Router, plus le gestionnaire du widget Android (appelé par le système
// même quand l'app est fermée : il doit être enregistré avant tout rendu).
import { Platform } from "react-native";
import "expo-router/entry";

if (Platform.OS === "android") {
  const { registerWidgetTaskHandler } = require("react-native-android-widget");
  const { widgetTaskHandler } = require("./src/widgets/task-handler");
  registerWidgetTaskHandler(widgetTaskHandler);
}

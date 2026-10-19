import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { ANDROID_WIDGET_NAME } from "@/lib/widget";
import { readSnapshotCache } from "@/lib/widget-cache";
import { renderTodayWidget } from "./TodayWidget";

/**
 * Appelé par Android quand un widget est ajouté, redimensionné ou mis à jour par le système :
 * on redessine à partir du dernier instantané gardé sur l'appareil (jamais de requête réseau ici).
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  if (props.widgetInfo.widgetName !== ANDROID_WIDGET_NAME) return;
  if (props.widgetAction === "WIDGET_DELETED") return;
  props.renderWidget(renderTodayWidget(readSnapshotCache()));
}

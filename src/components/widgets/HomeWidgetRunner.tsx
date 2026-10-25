import { useHomeWidgets } from "@/hooks/use-home-widgets";

/**
 * Mounts the home-widget synchroniser once, for the whole app.
 *
 * It renders nothing: it only pushes the workspace snapshot to the Android
 * widget cache and replays widget taps back into the store. On the web it is
 * completely inert.
 */
export function HomeWidgetRunner() {
  useHomeWidgets();
  return null;
}

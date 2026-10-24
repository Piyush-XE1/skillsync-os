package com.skillsync.os;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

import org.json.JSONObject;

/**
 * Renders every placed SkillSync widget from the cached snapshot.
 *
 * All rendering goes through here so a refresh is always "read the snapshot,
 * redraw every instance". Any failure is swallowed: a widget must never take the
 * launcher (or the app) down with it.
 */
final class WidgetUpdater {

    private WidgetUpdater() {}

    static void refreshAll(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        if (manager == null) return;
        for (WidgetSpecs.Spec spec : WidgetSpecs.ALL) {
            int[] ids = manager.getAppWidgetIds(new ComponentName(context, spec.provider));
            for (int id : ids) {
                update(context, manager, spec, id);
            }
        }
    }

    /** Repaints a single instance, resolving its provider from the system. */
    static void update(Context context, AppWidgetManager manager, int widgetId) {
        if (manager == null) return;
        AppWidgetProviderInfo info = manager.getAppWidgetInfo(widgetId);
        WidgetSpecs.Spec spec =
                info == null ? null : WidgetSpecs.byProviderClassName(info.provider.getClassName());
        if (spec == null) {
            refreshAll(context);
            return;
        }
        update(context, manager, spec, widgetId);
    }

    private static void update(
            Context context, AppWidgetManager manager, WidgetSpecs.Spec spec, int widgetId) {
        try {
            JSONObject snapshot = WidgetStore.snapshot(context);
            Bundle options = manager.getAppWidgetOptions(widgetId);
            int minWidth = options == null
                    ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0);
            int minHeight = options == null
                    ? 0 : options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 0);

            RemoteViews views = new RemoteViews(context.getPackageName(), spec.layout);
            WidgetRender.render(context, views, spec, snapshot, widgetId, minWidth, minHeight);
            manager.updateAppWidget(widgetId, views);
        } catch (Exception ignored) {
            // Keep the last good frame rather than crash the launcher.
        }
    }
}

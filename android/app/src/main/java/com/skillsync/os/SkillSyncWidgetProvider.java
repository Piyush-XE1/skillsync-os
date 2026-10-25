package com.skillsync.os;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.os.Bundle;

/**
 * Shared behaviour for every SkillSync widget.
 *
 * The launcher only needs to tell us "draw yourself"; the actual painting is
 * delegated to {@link WidgetUpdater} so all instances of all widgets always show
 * the same snapshot.
 */
public abstract class SkillSyncWidgetProvider extends AppWidgetProvider {

    /** Stable widget type, matching {@link WidgetSpecs} and the web catalogue. */
    public abstract String widgetType();

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        WidgetUpdater.refreshAll(context);
    }

    @Override
    public void onAppWidgetOptionsChanged(
            Context context,
            AppWidgetManager appWidgetManager,
            int appWidgetId,
            Bundle newOptions) {
        // The widget was resized: re-render so the row count follows the height.
        WidgetUpdater.update(context, appWidgetManager, appWidgetId);
    }

    @Override
    public void onEnabled(Context context) {
        WidgetScheduler.armNextMidnight(context);
        WidgetUpdater.refreshAll(context);
    }

    @Override
    public void onDisabled(Context context) {
        // Nothing to release: the snapshot is shared by every remaining widget.
    }
}

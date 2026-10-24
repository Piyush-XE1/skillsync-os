package com.skillsync.os;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

/**
 * PendingIntents that widgets attach to their views.
 *
 * Two kinds only: open the app on a route (the same `skillsync:open` path the
 * reminder notifications use), or apply a change inline through
 * {@link WidgetActions}. Request codes are derived from the widget instance plus
 * the action target, so two rows in the same widget never share a PendingIntent.
 */
final class WidgetIntents {

    private WidgetIntents() {}

    private static int flags() {
        // minSdk 24 — FLAG_IMMUTABLE is always available.
        return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    }

    private static int requestCode(int widgetId, String tag) {
        return (widgetId * 31 + tag.hashCode()) & 0x7FFFFFFF;
    }

    /** Opens SkillSync on an in-app route. */
    static PendingIntent open(Context context, int widgetId, String route) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra(ReminderScheduler.EXTRA_URL, route);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(
                context, requestCode(widgetId, "open|" + route), intent, flags());
    }

    /** Toggles a habit check-in for the given day without opening the app. */
    static PendingIntent habit(
            Context context, int widgetId, String habitId, String day, boolean done) {
        Intent intent = broadcast(context, WidgetActions.ACTION_HABIT);
        intent.putExtra(WidgetActions.EXTRA_ID, habitId);
        intent.putExtra(WidgetActions.EXTRA_DAY, day);
        intent.putExtra(WidgetActions.EXTRA_DONE, done);
        intent.putExtra(WidgetActions.EXTRA_WIDGET_ID, widgetId);
        return PendingIntent.getBroadcast(
                context, requestCode(widgetId, "habit|" + habitId), intent, flags());
    }

    /** Completes (or re-opens) one planner task without opening the app. */
    static PendingIntent task(Context context, int widgetId, String taskId, boolean done) {
        Intent intent = broadcast(context, WidgetActions.ACTION_TASK);
        intent.putExtra(WidgetActions.EXTRA_ID, taskId);
        intent.putExtra(WidgetActions.EXTRA_DONE, done);
        intent.putExtra(WidgetActions.EXTRA_WIDGET_ID, widgetId);
        return PendingIntent.getBroadcast(
                context, requestCode(widgetId, "task|" + taskId), intent, flags());
    }

    private static Intent broadcast(Context context, String action) {
        Intent intent = new Intent(context, WidgetActions.class);
        intent.setAction(action);
        return intent;
    }
}

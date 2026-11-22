package com.skillsync.os;

import android.content.Context;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Turns the cached workspace snapshot into RemoteViews.
 *
 * Everything here is defensive: a missing field renders as an empty state,
 * never as a crash. Only one inline mutation exists — a habit checkmark — and
 * it is wired through {@link WidgetIntents}. The note editor is a native
 * Activity; the expense logger only navigates into the full in-app form.
 */
final class WidgetRender {

    private WidgetRender() {}

    /* -------------------------------- entry -------------------------------- */

    static void render(
            Context context,
            RemoteViews views,
            WidgetSpecs.Spec spec,
            JSONObject snapshot,
            int widgetId,
            int minWidthDp,
            int minHeightDp) {
        switch (spec.type) {
            case "expense_logger":
                renderExpenseLogger(context, views, widgetId);
                break;
            case "habit_check":
                renderHabitCheck(context, views, snapshot, widgetId, minHeightDp);
                break;
            case "sticky_note":
            default:
                renderStickyNote(context, views, widgetId);
                break;
        }
    }

    /* ------------------------------- widgets ------------------------------- */

    /** The paper note reads directly from the device-local note store. */
    private static void renderStickyNote(Context context, RemoteViews views, int widgetId) {
        String note = WidgetStore.stickyNote(context);
        views.setTextViewText(
                R.id.widget_note_text,
                note.trim().isEmpty() ? context.getString(R.string.widget_note_empty) : note);
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.editNote(context, widgetId));
        views.setOnClickPendingIntent(
                R.id.widget_note_text, WidgetIntents.editNote(context, widgetId));
    }

    /** The 1 × 1 tile is an action, not a form: it opens every expense field. */
    private static void renderExpenseLogger(Context context, RemoteViews views, int widgetId) {
        views.setOnClickPendingIntent(
                R.id.widget_root, WidgetIntents.open(context, widgetId, "/expenses?add=1"));
    }

    private static void renderHabitCheck(
            Context context,
            RemoteViews views,
            JSONObject snapshot,
            int widgetId,
            int minHeightDp) {
        JSONObject today = object(snapshot, "today");
        JSONArray habits = array(snapshot, "habits");
        int total = today.optInt("habitsTotal", habits.length());
        int done = today.optInt("habitsDone", 0);

        text(views, R.id.widget_meta, done + " / " + total);
        progress(views, R.id.widget_progress, total <= 0 ? 0 : Math.round(done * 100f / total));

        views.removeAllViews(R.id.widget_habit_list);
        int rows = rowsFor(minHeightDp, 78, 38, habits.length(), 8);
        for (int i = 0; i < Math.min(rows, habits.length()); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit != null) {
                views.addView(R.id.widget_habit_list, habitRow(context, widgetId, snapshot, habit));
            }
        }

        boolean empty = habits.length() == 0;
        visible(views, R.id.widget_empty, empty);
        visible(views, R.id.widget_habit_list, !empty);
        views.setOnClickPendingIntent(R.id.widget_cta, WidgetIntents.open(context, widgetId, "/habits"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/habits"));
    }

    /* -------------------------------- rows --------------------------------- */

    private static RemoteViews habitRow(
            Context context, int widgetId, JSONObject snapshot, JSONObject habit) {
        RemoteViews row = inflate(context, R.layout.widget_row_habit_check);
        boolean done = habit.optBoolean("done", false);
        String title = habit.optString("title", "Habit");
        int streak = habit.optInt("streak", 0);

        row.setImageViewResource(
                R.id.habit_row_mark,
                done ? R.drawable.widget_habit_box_done : R.drawable.widget_habit_box);
        row.setContentDescription(
                R.id.habit_row_mark,
                done ? "Completed" : "Not completed");
        row.setTextViewText(R.id.habit_row_title, shorten(title, 32));
        row.setTextColor(
                R.id.habit_row_title,
                color(context, done ? R.color.widgetMuted : R.color.widgetText));
        row.setInt(
                R.id.habit_row_title,
                "setPaintFlags",
                done ? Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG : Paint.ANTI_ALIAS_FLAG);
        row.setTextViewText(R.id.habit_row_meta, streak > 0 ? streak + "d" : "");
        row.setOnClickPendingIntent(
                R.id.habit_row_root,
                WidgetIntents.habit(
                        context,
                        widgetId,
                        habit.optString("id"),
                        dayKey(snapshot),
                        !done));
        return row;
    }

    /* ------------------------------- helpers ------------------------------- */

    private static RemoteViews inflate(Context context, int layout) {
        return new RemoteViews(context.getPackageName(), layout);
    }

    private static void text(RemoteViews views, int id, String value) {
        views.setTextViewText(id, value == null ? "" : value);
    }

    private static void visible(RemoteViews views, int id, boolean shown) {
        views.setViewVisibility(id, shown ? View.VISIBLE : View.GONE);
    }

    private static void progress(RemoteViews views, int id, int percent) {
        int clamped = Math.max(0, Math.min(100, percent));
        views.setProgressBar(id, 100, clamped, false);
    }

    private static int color(Context context, int resId) {
        return ContextCompat.getColor(context, resId);
    }

    private static JSONObject object(JSONObject parent, String key) {
        JSONObject value = parent == null ? null : parent.optJSONObject(key);
        return value == null ? new JSONObject() : value;
    }

    private static JSONArray array(JSONObject parent, String key) {
        JSONArray value = parent == null ? null : parent.optJSONArray(key);
        return value == null ? new JSONArray() : value;
    }

    private static String dayKey(JSONObject snapshot) {
        String day = snapshot == null ? "" : snapshot.optString("dayKey", "");
        return day.isEmpty() ? WidgetStore.todayKey() : day;
    }

    private static String shorten(String value, int max) {
        if (value == null) return "";
        String single = value.replace('\n', ' ').trim();
        return single.length() <= max ? single : single.substring(0, Math.max(0, max - 1)) + "…";
    }

    /** How many habit rows fit; the launcher reports the size on resize. */
    private static int rowsFor(
            int minHeightDp, int chromeDp, int rowDp, int fallback, int max) {
        if (minHeightDp <= 0) return Math.max(1, Math.min(max, fallback));
        int rows = (minHeightDp - chromeDp) / Math.max(1, rowDp);
        return Math.max(1, Math.min(max, rows));
    }
}

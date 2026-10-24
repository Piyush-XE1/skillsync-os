package com.skillsync.os;

import android.content.Context;
import android.graphics.Paint;
import android.view.View;
import android.widget.RemoteViews;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Turns the cached workspace snapshot into RemoteViews.
 *
 * Everything here is defensive: a missing field renders as an em dash or an
 * empty state, never as a crash. The widgets are read-only mirrors of the
 * workspace except for two deliberate inline actions — habit check-ins and
 * planner completions — which are wired through {@link WidgetIntents}.
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
            case "habits":
                renderHabits(context, views, snapshot, widgetId, minHeightDp);
                break;
            case "focus":
                renderFocus(context, views, snapshot, widgetId);
                break;
            case "aims":
                renderAims(context, views, snapshot, widgetId, minHeightDp);
                break;
            case "planner":
                renderPlanner(context, views, snapshot, widgetId, minHeightDp);
                break;
            case "stats":
                renderStats(context, views, snapshot, widgetId);
                break;
            case "quote":
                renderQuote(context, views, snapshot, widgetId);
                break;
            case "quick":
                renderQuick(context, views, widgetId);
                break;
            case "overview":
                renderOverview(context, views, snapshot, widgetId, minHeightDp);
                break;
            case "today":
            default:
                renderToday(context, views, snapshot, widgetId);
                break;
        }
    }

    /* ------------------------------- widgets ------------------------------- */

    private static void renderToday(
            Context context, RemoteViews views, JSONObject snapshot, int widgetId) {
        JSONObject today = object(snapshot, "today");
        int total = today.optInt("habitsTotal", 0);
        int done = today.optInt("habitsDone", 0);

        heading(views, snapshot, "Today");
        text(
                views,
                R.id.widget_title,
                total == 0 ? "No habits yet" : done + " of " + total + " habits");
        progress(views, R.id.widget_progress, today.optInt("habitPct", 0));

        text(views, R.id.widget_focus_value, minutes(today.optInt("focusMinutes", 0)));
        text(
                views,
                R.id.widget_tasks_value,
                today.optInt("tasksDoneToday", 0) + "/" + today.optInt("tasksToday", 0));
        text(views, R.id.widget_solves_value, String.valueOf(today.optInt("solvesToday", 0)));

        String sparkline = snapshot.optString("sparkline", "");
        text(views, R.id.widget_strip, sparkline.isEmpty() ? "▁▁▁▁▁▁▁" : sparkline);
        visible(views, R.id.widget_strip_label, true);
        visible(views, R.id.widget_empty, !synced(snapshot));

        views.setOnClickPendingIntent(R.id.widget_focus_cell, WidgetIntents.open(context, widgetId, "/focus"));
        views.setOnClickPendingIntent(R.id.widget_tasks_cell, WidgetIntents.open(context, widgetId, "/planner"));
        views.setOnClickPendingIntent(R.id.widget_solves_cell, WidgetIntents.open(context, widgetId, "/coding"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/"));
    }

    private static void renderHabits(
            Context context,
            RemoteViews views,
            JSONObject snapshot,
            int widgetId,
            int minHeightDp) {
        JSONObject today = object(snapshot, "today");
        JSONArray habits = array(snapshot, "habits");
        int total = today.optInt("habitsTotal", habits.length());
        int done = today.optInt("habitsDone", 0);

        heading(views, snapshot, "Habits");
        views.setTextViewText(R.id.widget_meta, done + " of " + total);
        progress(views, R.id.widget_progress, today.optInt("habitPct", 0));

        views.removeAllViews(R.id.widget_list);
        int rows = rowsFor(minHeightDp, 118, 40, habits.length(), 8);
        for (int i = 0; i < Math.min(rows, habits.length()); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit != null) views.addView(R.id.widget_list, habitRow(context, widgetId, snapshot, habit));
        }

        boolean empty = habits.length() == 0;
        visible(views, R.id.widget_empty, empty);
        visible(views, R.id.widget_list, !empty);
        visible(views, R.id.widget_cta, true);
        views.setOnClickPendingIntent(R.id.widget_cta, WidgetIntents.open(context, widgetId, "/habits"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/habits"));
    }

    private static void renderFocus(
            Context context, RemoteViews views, JSONObject snapshot, int widgetId) {
        JSONObject focus = object(snapshot, "focus");
        int minutes = focus.optInt("todayMinutes", 0);
        int goal = focus.optInt("goalMinutes", 100);
        int streak = focus.optInt("streak", 0);
        int pct = goal <= 0 ? 0 : Math.round(minutes * 100f / goal);

        heading(views, snapshot, "Focus");
        text(views, R.id.widget_title, minutes(minutes));
        String subtitle = "of " + minutes(goal) + " goal";
        if (streak > 0) subtitle = subtitle + " · " + streak + "-day streak";
        text(views, R.id.widget_subtitle, subtitle);
        progress(views, R.id.widget_progress, pct);
        visible(views, R.id.widget_empty, !synced(snapshot));

        views.setOnClickPendingIntent(R.id.widget_start_15, WidgetIntents.open(context, widgetId, "/focus"));
        views.setOnClickPendingIntent(R.id.widget_start_25, WidgetIntents.open(context, widgetId, "/focus"));
        views.setOnClickPendingIntent(R.id.widget_start_50, WidgetIntents.open(context, widgetId, "/focus"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/focus"));
    }

    private static void renderAims(
            Context context,
            RemoteViews views,
            JSONObject snapshot,
            int widgetId,
            int minHeightDp) {
        JSONArray aims = array(snapshot, "aims");

        heading(views, snapshot, "Aims");
        views.setTextViewText(
                R.id.widget_meta, aims.length() == 0 ? "" : aims.length() + " pinned");

        views.removeAllViews(R.id.widget_list);
        int rows = rowsFor(minHeightDp, 92, 40, aims.length(), 8);
        for (int i = 0; i < Math.min(rows, aims.length()); i++) {
            JSONObject aim = aims.optJSONObject(i);
            if (aim == null) continue;
            RemoteViews row = inflate(context, R.layout.widget_row_aim);
            row.setTextViewText(R.id.row_title, aim.optString("title", "Aim"));
            String note = aim.optString("note", "");
            row.setTextViewText(R.id.row_meta, note.isEmpty() ? "" : shorten(note, 18));
            row.setOnClickPendingIntent(R.id.row_root, WidgetIntents.open(context, widgetId, "/goals"));
            views.addView(R.id.widget_list, row);
        }

        boolean empty = aims.length() == 0;
        visible(views, R.id.widget_empty, empty);
        visible(views, R.id.widget_list, !empty);
        views.setOnClickPendingIntent(R.id.widget_cta, WidgetIntents.open(context, widgetId, "/goals"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/goals"));
    }

    private static void renderPlanner(
            Context context,
            RemoteViews views,
            JSONObject snapshot,
            int widgetId,
            int minHeightDp) {
        JSONArray tasks = array(snapshot, "tasks");
        JSONObject today = object(snapshot, "today");
        int total = Math.max(tasks.length(), today.optInt("tasksToday", tasks.length()));
        int done = today.optInt("tasksDoneToday", 0);

        heading(views, snapshot, "Today's plan");
        views.setTextViewText(R.id.widget_meta, done + " of " + total + " done");
        progress(views, R.id.widget_progress, total == 0 ? 0 : Math.round(done * 100f / total));

        views.removeAllViews(R.id.widget_list);
        int rows = rowsFor(minHeightDp, 118, 40, tasks.length(), 8);
        for (int i = 0; i < Math.min(rows, tasks.length()); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task != null) views.addView(R.id.widget_list, taskRow(context, widgetId, task));
        }

        boolean empty = tasks.length() == 0;
        visible(views, R.id.widget_empty, empty);
        visible(views, R.id.widget_list, !empty);
        views.setOnClickPendingIntent(R.id.widget_cta, WidgetIntents.open(context, widgetId, "/planner"));
        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/planner"));
    }

    private static void renderStats(
            Context context, RemoteViews views, JSONObject snapshot, int widgetId) {
        JSONObject stats = object(snapshot, "stats");

        heading(views, snapshot, "Stats");
        text(views, R.id.stat_solves, String.valueOf(stats.optInt("solvesToday", 0)));
        text(views, R.id.stat_week, String.valueOf(stats.optInt("solvesWeek", 0)));
        text(views, R.id.stat_streak, stats.optInt("bestStreak", 0) + "d");
        String cgpa = stats.optString("cgpa", "");
        text(views, R.id.stat_cgpa, cgpa.isEmpty() ? "—" : cgpa);
        visible(views, R.id.widget_empty, !synced(snapshot));

        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/analytics"));
    }

    private static void renderQuote(
            Context context, RemoteViews views, JSONObject snapshot, int widgetId) {
        JSONObject quote = object(snapshot, "quote");
        String body = quote.optString("text", "");
        if (body.isEmpty()) body = "Open SkillSync for today's perspective.";

        heading(views, snapshot, "Daily perspective");
        text(views, R.id.widget_quote, "“" + body + "”");
        String author = quote.optString("author", "");
        text(views, R.id.widget_quote_author, author.isEmpty() ? "SkillSync" : "— " + author);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/"));
    }

    private static void renderQuick(Context context, RemoteViews views, int widgetId) {
        views.setOnClickPendingIntent(R.id.qa_task, WidgetIntents.open(context, widgetId, "/planner"));
        views.setOnClickPendingIntent(R.id.qa_note, WidgetIntents.open(context, widgetId, "/notes"));
        views.setOnClickPendingIntent(R.id.qa_habit, WidgetIntents.open(context, widgetId, "/habits"));
        views.setOnClickPendingIntent(R.id.qa_focus, WidgetIntents.open(context, widgetId, "/focus"));
        views.setOnClickPendingIntent(R.id.qa_plan, WidgetIntents.open(context, widgetId, "/planner"));
        views.setOnClickPendingIntent(R.id.qa_stats, WidgetIntents.open(context, widgetId, "/analytics"));
    }

    private static void renderOverview(
            Context context,
            RemoteViews views,
            JSONObject snapshot,
            int widgetId,
            int minHeightDp) {
        JSONObject today = object(snapshot, "today");
        JSONObject profile = object(snapshot, "profile");
        JSONArray habits = array(snapshot, "habits");
        JSONArray tasks = array(snapshot, "tasks");

        String name = profile.optString("name", "");
        heading(views, snapshot, "SkillSync OS");
        text(views, R.id.widget_title, name.isEmpty() ? "Today" : name + " · today");

        int habitTotal = today.optInt("habitsTotal", habits.length());
        int habitDone = today.optInt("habitsDone", 0);
        int taskTotal = Math.max(tasks.length(), today.optInt("tasksToday", tasks.length()));
        int taskDone = today.optInt("tasksDoneToday", 0);
        text(
                views,
                R.id.widget_subtitle,
                habitDone + " of " + habitTotal + " habits · "
                        + minutes(today.optInt("focusMinutes", 0)) + " focus · "
                        + taskDone + "/" + taskTotal + " tasks");
        progress(views, R.id.widget_progress, today.optInt("habitPct", 0));

        views.removeAllViews(R.id.widget_habits_list);
        int habitRows = rowsFor(minHeightDp, 240, 40, 3, 4);
        for (int i = 0; i < Math.min(habitRows, habits.length()); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit != null) {
                views.addView(R.id.widget_habits_list, habitRow(context, widgetId, snapshot, habit));
            }
        }

        views.removeAllViews(R.id.widget_tasks_list);
        int taskRows = rowsFor(minHeightDp, 240 + habitRows * 40, 40, 2, 3);
        for (int i = 0; i < Math.min(taskRows, tasks.length()); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task != null) views.addView(R.id.widget_tasks_list, taskRow(context, widgetId, task));
        }

        boolean empty = habits.length() == 0 && tasks.length() == 0;
        visible(views, R.id.widget_empty, empty);
        visible(views, R.id.widget_habits_list, habits.length() > 0);
        visible(views, R.id.widget_tasks_list, tasks.length() > 0);
        visible(views, R.id.widget_habits_label, habits.length() > 0);
        visible(views, R.id.widget_tasks_label, tasks.length() > 0);

        String sparkline = snapshot.optString("sparkline", "");
        visible(views, R.id.widget_strip, !sparkline.isEmpty());
        text(views, R.id.widget_strip, sparkline);

        views.setOnClickPendingIntent(R.id.widget_root, WidgetIntents.open(context, widgetId, "/"));
    }

    /* -------------------------------- rows --------------------------------- */

    private static RemoteViews habitRow(
            Context context, int widgetId, JSONObject snapshot, JSONObject habit) {
        RemoteViews row = inflate(context, R.layout.widget_row_habit);
        boolean done = habit.optBoolean("done", false);
        String title = habit.optString("title", "Habit");
        int streak = habit.optInt("streak", 0);

        row.setTextViewText(R.id.row_mark, done ? "✓" : "○");
        row.setTextColor(
                R.id.row_mark,
                color(context, done ? R.color.widgetSuccess : R.color.widgetAccent));
        row.setTextViewText(R.id.row_title, title);
        row.setTextColor(
                R.id.row_title,
                color(context, done ? R.color.widgetMuted : R.color.widgetText));
        row.setInt(
                R.id.row_title,
                "setPaintFlags",
                done ? Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG : Paint.ANTI_ALIAS_FLAG);
        row.setTextViewText(R.id.row_meta, streak > 0 ? streak + "d" : "");

        row.setOnClickPendingIntent(
                R.id.row_root,
                WidgetIntents.habit(context, widgetId, habit.optString("id"), dayKey(snapshot), !done));
        return row;
    }

    private static RemoteViews taskRow(Context context, int widgetId, JSONObject task) {
        RemoteViews row = inflate(context, R.layout.widget_row_task);
        boolean done = task.optBoolean("done", false);
        String title = task.optString("title", "Task");
        String time = task.optString("time", "");

        row.setTextViewText(R.id.row_mark, done ? "✓" : "□");
        row.setTextColor(
                R.id.row_mark,
                color(context, done ? R.color.widgetSuccess : R.color.widgetMuted));
        row.setTextViewText(R.id.row_title, title);
        row.setTextColor(
                R.id.row_title,
                color(context, done ? R.color.widgetMuted : R.color.widgetText));
        row.setInt(
                R.id.row_title,
                "setPaintFlags",
                done ? Paint.STRIKE_THRU_TEXT_FLAG | Paint.ANTI_ALIAS_FLAG : Paint.ANTI_ALIAS_FLAG);
        String meta = time;
        if (meta.isEmpty() && "high".equals(task.optString("priority", ""))) meta = "high";
        row.setTextViewText(R.id.row_meta, meta);

        row.setOnClickPendingIntent(
                R.id.row_root, WidgetIntents.task(context, widgetId, task.optString("id"), !done));
        return row;
    }

    /* ------------------------------- helpers ------------------------------- */

    private static RemoteViews inflate(Context context, int layout) {
        return new RemoteViews(context.getPackageName(), layout);
    }

    private static void heading(RemoteViews views, JSONObject snapshot, String eyebrow) {
        text(views, R.id.widget_eyebrow, eyebrow);
        text(views, R.id.widget_meta, stamp(snapshot));
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

    private static boolean synced(JSONObject snapshot) {
        return snapshot != null && snapshot.optLong("updatedAt", 0L) > 0L;
    }

    private static String dayKey(JSONObject snapshot) {
        String day = snapshot == null ? "" : snapshot.optString("dayKey", "");
        if (!day.isEmpty()) return day;
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }

    /**
     * How fresh the widget data is. Kept relative (and recomputed on every
     * refresh) so a widget never claims to be newer than it is.
     */
    private static String stamp(JSONObject snapshot) {
        long at = snapshot == null ? 0L : snapshot.optLong("updatedAt", 0L);
        if (at <= 0L) return "not synced";

        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        String day = snapshot.optString("dayKey", "");
        if (!day.isEmpty() && !day.equals(today)) return "yesterday · open app";

        long minutes = Math.max(0L, (System.currentTimeMillis() - at) / 60000L);
        if (minutes < 1L) return "synced now";
        if (minutes < 60L) return "synced " + minutes + "m ago";
        long hours = minutes / 60L;
        if (hours < 24L) return "synced " + hours + "h ago";
        return "synced " + (hours / 24L) + "d ago";
    }

    private static String minutes(int value) {
        int safe = Math.max(0, value);
        if (safe < 60) return safe + "m";
        int hours = safe / 60;
        int rest = safe % 60;
        return rest == 0 ? hours + "h" : hours + "h " + rest + "m";
    }

    private static String shorten(String value, int max) {
        if (value == null) return "";
        String single = value.replace('\n', ' ').trim();
        return single.length() <= max ? single : single.substring(0, Math.max(0, max - 1)) + "…";
    }

    /**
     * How many list rows fit. Resizing a widget taller shows more of the list;
     * before the launcher reports an option bundle we fall back to the data.
     */
    private static int rowsFor(
            int minHeightDp, int chromeDp, int rowDp, int fallback, int max) {
        if (minHeightDp <= 0) return Math.max(1, Math.min(max, fallback));
        int rows = (minHeightDp - chromeDp) / Math.max(1, rowDp);
        return Math.max(1, Math.min(max, rows));
    }
}

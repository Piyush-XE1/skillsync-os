package com.skillsync.os;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Offline cache for the home screen widgets.
 *
 * The web app owns the workspace; every time it changes (or whenever the app is
 * opened) it pushes a compact snapshot of everything the widgets need to draw
 * themselves. Widgets must render without the app running, so the snapshot is
 * kept in SharedPreferences and every provider reads from here.
 *
 * Widget taps that change data (habit check-ins, planner completions) happen
 * while the WebView is closed. They are applied optimistically to this cache and
 * appended to an action queue that the web app drains on its next resume, so the
 * workspace and the widgets always converge on the same truth.
 */
final class WidgetStore {

    private static final String PREFS = "skillsync_widgets";
    private static final String KEY_SNAPSHOT = "snapshot";
    private static final String KEY_ACTIONS = "actions";

    /** The queue is a safety net, not a journal — old taps are dropped. */
    private static final int MAX_ACTIONS = 50;

    private WidgetStore() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /* ------------------------------ snapshot ------------------------------ */

    /** The last snapshot pushed by the app, or an empty object when never synced. */
    static JSONObject snapshot(Context context) {
        String raw = prefs(context).getString(KEY_SNAPSHOT, null);
        if (raw == null) return new JSONObject();
        try {
            return new JSONObject(raw);
        } catch (JSONException error) {
            return new JSONObject();
        }
    }

    static void saveSnapshot(Context context, JSONObject snapshot) {
        if (snapshot == null) return;
        try {
            snapshot.put("updatedAt", System.currentTimeMillis());
        } catch (JSONException ignored) {
            // keep the incoming timestamp
        }
        // commit() (not apply()) — the providers are refreshed immediately after.
        prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).commit();
    }

    static long syncedAt(Context context) {
        return snapshot(context).optLong("updatedAt", 0L);
    }

    /* ------------------------------- actions ------------------------------ */

    private static JSONArray actions(Context context) {
        String raw = prefs(context).getString(KEY_ACTIONS, null);
        if (raw == null) return new JSONArray();
        try {
            return new JSONArray(raw);
        } catch (JSONException error) {
            return new JSONArray();
        }
    }

    /** Queues a change the web app must apply the next time it runs. */
    static synchronized void enqueueAction(Context context, JSONObject action) {
        if (action == null) return;
        JSONArray queue = actions(context);
        try {
            action.put("at", System.currentTimeMillis());
        } catch (JSONException ignored) {
            // the timestamp is a nicety
        }
        queue.put(action);
        while (queue.length() > MAX_ACTIONS) {
            queue.remove(0);
        }
        prefs(context).edit().putString(KEY_ACTIONS, queue.toString()).commit();
    }

    /** Returns the queued actions and clears them — consumed exactly once. */
    static synchronized JSONArray takeActions(Context context) {
        JSONArray queue = actions(context);
        prefs(context).edit().remove(KEY_ACTIONS).commit();
        return queue;
    }

    static int pendingActionCount(Context context) {
        return actions(context).length();
    }

    /* --------------------------- optimistic patch -------------------------- */

    /**
     * Flips a habit row in the cached snapshot so the widget reacts instantly to
     * a tap. The stored counters are only rewritten when the snapshot holds the
     * complete habit list, so a truncated list can never corrupt them.
     */
    static void patchHabit(Context context, String habitId, boolean done) {
        if (habitId == null || habitId.isEmpty()) return;
        JSONObject snapshot = snapshot(context);
        JSONArray habits = snapshot.optJSONArray("habits");
        if (habits == null) return;

        int doneCount = 0;
        for (int i = 0; i < habits.length(); i++) {
            JSONObject habit = habits.optJSONObject(i);
            if (habit == null) continue;
            if (habitId.equals(habit.optString("id"))) {
                put(habit, "done", done);
            }
            if (habit.optBoolean("done", false)) doneCount++;
        }

        JSONObject today = snapshot.optJSONObject("today");
        if (today != null && today.optInt("habitsTotal", -1) == habits.length()) {
            put(today, "habitsDone", doneCount);
            put(today, "habitPct", habits.length() == 0 ? 0 : Math.round(doneCount * 100f / habits.length()));
        }
        prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).commit();
    }

    /** Marks one planner task complete (or open) in the cached snapshot. */
    static void patchTask(Context context, String taskId, boolean done) {
        if (taskId == null || taskId.isEmpty()) return;
        JSONObject snapshot = snapshot(context);
        JSONArray tasks = snapshot.optJSONArray("tasks");
        if (tasks == null) return;

        int doneCount = 0;
        for (int i = 0; i < tasks.length(); i++) {
            JSONObject task = tasks.optJSONObject(i);
            if (task == null) continue;
            if (taskId.equals(task.optString("id"))) {
                put(task, "done", done);
            }
            if (task.optBoolean("done", false)) doneCount++;
        }

        JSONObject today = snapshot.optJSONObject("today");
        if (today != null && today.optInt("tasksToday", -1) == tasks.length()) {
            put(today, "tasksDoneToday", doneCount);
        }
        prefs(context).edit().putString(KEY_SNAPSHOT, snapshot.toString()).commit();
    }

    private static void put(JSONObject object, String key, Object value) {
        try {
            object.put(key, value);
        } catch (JSONException ignored) {
            // a malformed value never breaks the render
        }
    }
}

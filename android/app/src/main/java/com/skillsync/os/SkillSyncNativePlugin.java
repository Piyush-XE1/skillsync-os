package com.skillsync.os;

import android.Manifest;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.os.Build;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.core.app.NotificationManagerCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * SkillSync's native bridge: real Android haptics and OS-level local
 * notifications. The web app calls this through src/lib/native/bridge.ts and
 * falls back to browser APIs when the plugin is absent.
 */
@CapacitorPlugin(
        name = "SkillSyncNative",
        permissions = {
                @Permission(alias = "notifications", strings = {"android.permission.POST_NOTIFICATIONS"})
        }
)
public class SkillSyncNativePlugin extends Plugin {

    /* ------------------------------ capabilities ---------------------------- */

    @PluginMethod
    public void capabilities(PluginCall call) {
        JSObject result = new JSObject();
        result.put("native", true);
        result.put("platform", "android");
        result.put("sdk", Build.VERSION.SDK_INT);
        result.put("haptics", hasVibrator());
        result.put("amplitudeControl", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && vibrator() != null && vibrator().hasAmplitudeControl());
        result.put("canSchedule", true);
        result.put("exactAlarms", ReminderScheduler.canScheduleExact(getContext()));
        result.put("notificationsEnabled",
                NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        result.put("permission", permissionValue());
        result.put("scheduledCount", ReminderStore.list(getContext()).size());
        result.put("widgets", true);
        result.put("widgetPinning", widgetPinningSupported(getContext()));
        call.resolve(result);
    }

    /* ------------------------------- haptics ------------------------------- */

    private Vibrator vibrator() {
        Context context = getContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager manager =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return manager == null ? null : manager.getDefaultVibrator();
        }
        return (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
    }

    private boolean hasVibrator() {
        Vibrator v = vibrator();
        return v != null && v.hasVibrator();
    }

    /** vibrate({ duration, amplitude }) — a single pulse. */
    @PluginMethod
    public void vibrate(PluginCall call) {
        int duration = call.getInt("duration", 20);
        int amplitude = call.getInt("amplitude", -1);
        Vibrator v = vibrator();
        if (v == null || !v.hasVibrator()) {
            call.resolve(ok(false));
            return;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                int amp = amplitude > 0 && v.hasAmplitudeControl()
                        ? Math.min(255, amplitude)
                        : VibrationEffect.DEFAULT_AMPLITUDE;
                v.vibrate(VibrationEffect.createOneShot(Math.max(1, duration), amp));
            } else {
                v.vibrate(Math.max(1, duration));
            }
            call.resolve(ok(true));
        } catch (Exception e) {
            call.resolve(ok(false));
        }
    }

    /** vibratePattern({ pattern: [wait, on, wait, on, ...] }). */
    @PluginMethod
    public void vibratePattern(PluginCall call) {
        JSArray raw = call.getArray("pattern");
        Vibrator v = vibrator();
        if (raw == null || v == null || !v.hasVibrator()) {
            call.resolve(ok(false));
            return;
        }
        try {
            java.util.List<Integer> values = raw.toList();
            long[] pattern = new long[values.size() + 1];
            pattern[0] = 0;
            for (int i = 0; i < values.size(); i++) {
                pattern[i + 1] = Math.max(0, values.get(i).longValue());
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
            call.resolve(ok(true));
        } catch (Exception e) {
            call.resolve(ok(false));
        }
    }

    /**
     * haptic({ level }) — semantic feedback mapped to platform primitives.
     * Levels: selection, light, medium, heavy, success, warning, error, milestone.
     */
    @PluginMethod
    public void haptic(PluginCall call) {
        String level = call.getString("level", "light");
        Vibrator v = vibrator();
        if (v == null || !v.hasVibrator()) {
            call.resolve(ok(false));
            return;
        }
        long[] pattern;
        switch (level == null ? "light" : level) {
            case "selection": pattern = new long[]{0, 8}; break;
            case "medium": pattern = new long[]{0, 22}; break;
            case "heavy": pattern = new long[]{0, 40}; break;
            case "success": pattern = new long[]{0, 14, 45, 26}; break;
            case "warning": pattern = new long[]{0, 24, 60, 24}; break;
            case "error": pattern = new long[]{0, 30, 50, 30, 50, 30}; break;
            case "milestone": pattern = new long[]{0, 16, 40, 22, 40, 38}; break;
            default: pattern = new long[]{0, 12}; break;
        }
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
            call.resolve(ok(true));
        } catch (Exception e) {
            call.resolve(ok(false));
        }
    }

    /* ----------------------------- permissions ----------------------------- */

    private String permissionValue() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            boolean granted = getPermissionState("notifications")
                    == com.getcapacitor.PermissionState.GRANTED;
            if (!granted) {
                return getPermissionState("notifications")
                        == com.getcapacitor.PermissionState.DENIED ? "denied" : "default";
            }
        }
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled()
                ? "granted" : "denied";
    }

    @PluginMethod
    public void checkNotificationPermission(PluginCall call) {
        JSObject result = new JSObject();
        result.put("permission", permissionValue());
        call.resolve(result);
    }

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        ReminderScheduler.ensureChannel(getContext());
        JSObject result = new JSObject();
        result.put("permission", permissionValue());
        call.resolve(result);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        ReminderScheduler.ensureChannel(getContext());
        JSObject result = new JSObject();
        result.put("permission", permissionValue());
        call.resolve(result);
    }

    /* ---------------------------- notifications ---------------------------- */

    /** notify({ id, title, body, url, priority }) — show immediately. */
    @PluginMethod
    public void notify(PluginCall call) {
        String id = call.getString("id", "instant-" + System.currentTimeMillis());
        boolean shown = ReminderScheduler.show(
                getContext(),
                id,
                call.getString("title", "SkillSync"),
                call.getString("body", ""),
                call.getString("url", "/notifications"),
                call.getString("priority", "normal"));
        call.resolve(ok(shown));
    }

    /** schedule({ id, title, body, at, repeat, url, priority }). */
    @PluginMethod
    public void schedule(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.isEmpty()) {
            call.reject("schedule() requires an id");
            return;
        }
        JSONObject reminder = new JSONObject();
        try {
            reminder.put("id", id);
            reminder.put("title", call.getString("title", "SkillSync"));
            reminder.put("body", call.getString("body", ""));
            reminder.put("at", call.getLong("at", System.currentTimeMillis() + 60000L));
            reminder.put("repeat", call.getString("repeat", "none"));
            reminder.put("url", call.getString("url", "/notifications"));
            reminder.put("priority", call.getString("priority", "normal"));
        } catch (JSONException e) {
            call.reject("invalid reminder payload");
            return;
        }
        long at = ReminderScheduler.schedule(getContext(), reminder);
        JSObject result = new JSObject();
        result.put("ok", true);
        result.put("id", id);
        result.put("at", at);
        result.put("exact", ReminderScheduler.canScheduleExact(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        String id = call.getString("id");
        if (id != null) ReminderScheduler.cancel(getContext(), id);
        call.resolve(ok(true));
    }

    @PluginMethod
    public void cancelAll(PluginCall call) {
        ReminderScheduler.cancelAll(getContext());
        call.resolve(ok(true));
    }

    @PluginMethod
    public void listScheduled(PluginCall call) {
        JSArray items = new JSArray();
        for (JSONObject reminder : ReminderStore.list(getContext())) {
            items.put(reminder);
        }
        JSObject result = new JSObject();
        result.put("scheduled", items);
        call.resolve(result);
    }

    /** Route requested by a notification tap, consumed once by the web app. */
    @PluginMethod
    public void takePendingRoute(PluginCall call) {
        JSObject result = new JSObject();
        result.put("route", MainActivity.takePendingRoute());
        call.resolve(result);
    }

    /* -------------------------------- theme -------------------------------- */

    /**
     * Applies the SkillSync theme to the Android system bars and caches it, so
     * the next cold start paints the right colours immediately. Android's own
     * light/dark setting is never consulted.
     */
    @PluginMethod
    public void setTheme(PluginCall call) {
        final String theme = "light".equals(call.getString("theme", "dark")) ? "light" : "dark";
        Integer background = ThemeController.parseColor(call.getString("background"), theme);
        ThemeController.store(getContext(), theme, background);
        final android.app.Activity activity = getActivity();
        if (activity != null) {
            activity.runOnUiThread(() -> ThemeController.apply(activity, theme));
        }
        call.resolve(ok(true));
    }

    /* ----------------------------- files ----------------------------- */

    /** Writes text into the public Downloads folder and returns the location. */
    @PluginMethod
    public void saveFile(PluginCall call) {
        final String filename = safeName(call.getString("filename", "skillsync-backup.json"));
        final String mimeType = call.getString("mimeType", "application/json");
        final String text = call.getString("text", "");
        try {
            String location;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                android.content.ContentValues values = new android.content.ContentValues();
                values.put(android.provider.MediaStore.MediaColumns.DISPLAY_NAME, filename);
                values.put(android.provider.MediaStore.MediaColumns.MIME_TYPE, mimeType);
                values.put(
                    android.provider.MediaStore.MediaColumns.RELATIVE_PATH,
                    android.os.Environment.DIRECTORY_DOWNLOADS
                );
                android.net.Uri uri = getContext()
                    .getContentResolver()
                    .insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                if (uri == null) {
                    call.reject("Could not create the file");
                    return;
                }
                java.io.OutputStream out = getContext().getContentResolver().openOutputStream(uri);
                if (out == null) {
                    call.reject("Could not open the file for writing");
                    return;
                }
                out.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                out.flush();
                out.close();
                location = "Downloads/" + filename;
            } else {
                java.io.File dir = android.os.Environment.getExternalStoragePublicDirectory(
                    android.os.Environment.DIRECTORY_DOWNLOADS
                );
                if (dir != null && !dir.exists()) dir.mkdirs();
                java.io.File file = new java.io.File(dir, filename);
                java.io.FileOutputStream out = new java.io.FileOutputStream(file);
                out.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
                out.flush();
                out.close();
                location = file.getAbsolutePath();
            }
            JSObject result = ok(true);
            result.put("location", location);
            result.put("filename", filename);
            call.resolve(result);
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Save failed" : error.getMessage(), error);
        }
    }

    /** Writes text into the app cache and opens the system share sheet. */
    @PluginMethod
    public void shareFile(PluginCall call) {
        final String filename = safeName(call.getString("filename", "skillsync-backup.json"));
        final String mimeType = call.getString("mimeType", "application/json");
        final String text = call.getString("text", "");
        try {
            java.io.File dir = new java.io.File(getContext().getCacheDir(), "shared");
            if (!dir.exists()) dir.mkdirs();
            java.io.File file = new java.io.File(dir, filename);
            java.io.FileOutputStream out = new java.io.FileOutputStream(file);
            out.write(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            out.flush();
            out.close();

            android.net.Uri uri = androidx.core.content.FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                file
            );
            android.content.Intent intent = new android.content.Intent(android.content.Intent.ACTION_SEND);
            intent.setType(mimeType);
            intent.putExtra(android.content.Intent.EXTRA_STREAM, uri);
            intent.putExtra(android.content.Intent.EXTRA_SUBJECT, filename);
            intent.addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
            android.content.Intent chooser = android.content.Intent.createChooser(intent, "Share backup");
            chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(chooser);
            call.resolve(ok(true));
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Share failed" : error.getMessage(), error);
        }
    }


    /* --------------------------- home screen widgets ------------------------ */

    /**
     * widgetSync({ snapshot }) — the app's compact workspace snapshot.
     *
     * Widgets live outside the WebView and must draw with the app closed, so the
     * whole widget model is pushed here after every meaningful change and cached
     * in SharedPreferences. The native side never invents data.
     */
    @PluginMethod
    public void widgetSync(PluginCall call) {
        JSObject payload = call.getObject("snapshot");
        if (payload == null) {
            call.reject("widgetSync() requires a snapshot");
            return;
        }
        try {
            JSONObject snapshot = new JSONObject(payload.toString());
            WidgetStore.saveSnapshot(getContext(), snapshot);
            WidgetUpdater.refreshAll(getContext());
            JSObject result = ok(true);
            result.put("syncedAt", WidgetStore.syncedAt(getContext()));
            result.put("pendingActions", WidgetStore.pendingActionCount(getContext()));
            call.resolve(result);
        } catch (JSONException error) {
            call.reject("invalid widget snapshot");
        }
    }

    /** widgetStatus() — what the widgets can do on this device right now. */
    @PluginMethod
    public void widgetStatus(PluginCall call) {
        JSArray types = new JSArray();
        for (WidgetSpecs.Spec spec : WidgetSpecs.ALL) {
            JSObject item = new JSObject();
            item.put("type", spec.type);
            item.put("label", getContext().getString(spec.labelRes));
            item.put("cellsWide", spec.cellsWide);
            item.put("cellsTall", spec.cellsTall);
            types.put(item);
        }

        JSObject result = new JSObject();
        result.put("native", true);
        result.put("platform", "android");
        result.put("pinningSupported", widgetPinningSupported(getContext()));
        result.put("syncedAt", WidgetStore.syncedAt(getContext()));
        result.put("pendingActions", WidgetStore.pendingActionCount(getContext()));
        result.put("types", types);
        call.resolve(result);
    }

    /**
     * widgetPin({ type }) — asks the launcher to pin a widget (Android 8+).
     *
     * The launcher shows its own confirmation sheet, so this is the friendliest
     * "add to home screen" path; the gallery falls back to instructions when the
     * launcher does not support pin requests.
     */
    @PluginMethod
    public void widgetPin(PluginCall call) {
        String type = call.getString("type", "today");
        WidgetSpecs.Spec spec = WidgetSpecs.byType(type);
        if (spec == null) {
            call.reject("Unknown widget type: " + type);
            return;
        }

        JSObject result = new JSObject();
        result.put("type", type);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            result.put("ok", false);
            result.put("supported", false);
            call.resolve(result);
            return;
        }
        if (!widgetPinningSupported(getContext())) {
            result.put("ok", false);
            result.put("supported", false);
            call.resolve(result);
            return;
        }

        AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
        if (manager == null) {
            result.put("ok", false);
            result.put("supported", true);
            call.resolve(result);
            return;
        }
        ComponentName provider = new ComponentName(getContext(), spec.provider);
        boolean requested = manager.requestPinAppWidget(provider, null, null);
        result.put("ok", requested);
        result.put("supported", true);
        call.resolve(result);
    }

    /** widgetTakeActions() — drains the queue of taps made while the app was closed. */
    @PluginMethod
    public void widgetTakeActions(PluginCall call) {
        JSArray actions = new JSArray();
        org.json.JSONArray queue = WidgetStore.takeActions(getContext());
        for (int i = 0; i < queue.length(); i++) {
            JSONObject action = queue.optJSONObject(i);
            if (action != null) actions.put(action);
        }
        JSObject result = new JSObject();
        result.put("actions", actions);
        call.resolve(result);
    }

    /** widgetRefresh() — repaints every placed widget from the cached snapshot. */
    @PluginMethod
    public void widgetRefresh(PluginCall call) {
        WidgetUpdater.refreshAll(getContext());
        JSObject result = ok(true);
        result.put("syncedAt", WidgetStore.syncedAt(getContext()));
        call.resolve(result);
    }

    private static boolean widgetPinningSupported(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false;
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        return manager != null && manager.isRequestPinAppWidgetSupported();
    }

    private String safeName(String name) {
        String cleaned = name == null ? "" : name.replaceAll("[^A-Za-z0-9._-]", "_");
        return cleaned.isEmpty() ? "skillsync-backup.json" : cleaned;
    }

    private JSObject ok(boolean value) {
        JSObject result = new JSObject();
        result.put("ok", value);
        return result;
    }
}

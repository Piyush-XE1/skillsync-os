package com.skillsync.os;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.List;

/**
 * OS-level reminder scheduling for SkillSync.
 *
 * AlarmManager fires a BroadcastReceiver even when the app is closed, which is
 * what makes reminders reliable offline. Recurring reminders re-arm themselves
 * inside the receiver, and every reminder is re-armed after a reboot.
 */
final class ReminderScheduler {
    static final String CHANNEL_ID = "skillsync_reminders";
    static final String ACTION_FIRE = "com.skillsync.os.REMINDER_FIRE";
    static final String EXTRA_ID = "reminder_id";
    static final String EXTRA_URL = "reminder_url";

    private ReminderScheduler() {}

    /* ------------------------------- channel ------------------------------ */

    static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = context.getSystemService(NotificationManager.class);
        if (manager == null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Reminders", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("SkillSync habit, planner and roadmap reminders");
        channel.enableVibration(true);
        manager.createNotificationChannel(channel);
    }

    /* ------------------------------ scheduling ---------------------------- */

    static boolean canScheduleExact(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return alarms.canScheduleExactAlarms();
        }
        return true;
    }

    /** Persists and arms a reminder. Returns the timestamp it will fire at. */
    static long schedule(Context context, JSONObject reminder) {
        ensureChannel(context);
        long at = reminder.optLong("at", 0L);
        String repeat = reminder.optString("repeat", "none");
        long now = System.currentTimeMillis();
        if (at <= now) {
            at = nextOccurrence(at, repeat, now);
        }
        try {
            reminder.put("at", at);
        } catch (org.json.JSONException ignored) {
            // keep the original value
        }
        ReminderStore.put(context, reminder);
        arm(context, reminder.optString("id"), at, reminder.optString("url", "/notifications"));
        return at;
    }

    private static void arm(Context context, String id, long at, String url) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null || id == null || id.isEmpty()) return;
        PendingIntent intent = firePendingIntent(context, id, url);
        try {
            if (canScheduleExact(context)) {
                alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, intent);
            } else {
                alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, intent), intent);
            }
        } catch (SecurityException e) {
            alarms.setAlarmClock(new AlarmManager.AlarmClockInfo(at, intent), intent);
        }
    }

    private static PendingIntent firePendingIntent(Context context, String id, String url) {
        Intent intent = new Intent(context, ReminderReceiver.class);
        intent.setAction(ACTION_FIRE);
        intent.putExtra(EXTRA_ID, id);
        intent.putExtra(EXTRA_URL, url);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode(id), intent, flags);
    }

    static void cancel(Context context, String id) {
        if (id == null || id.isEmpty()) return;
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms != null) {
            alarms.cancel(firePendingIntent(context, id, "/notifications"));
        }
        ReminderStore.remove(context, id);
    }

    static void cancelAll(Context context) {
        for (JSONObject reminder : ReminderStore.list(context)) {
            String id = reminder.optString("id", null);
            if (id != null) {
                AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarms != null) {
                    alarms.cancel(firePendingIntent(context, id, "/notifications"));
                }
            }
        }
        ReminderStore.clear(context);
    }

    /** Re-arms every stored reminder (used after boot / app upgrade). */
    static void rescheduleAll(Context context) {
        ensureChannel(context);
        long now = System.currentTimeMillis();
        List<JSONObject> reminders = ReminderStore.list(context);
        for (JSONObject reminder : reminders) {
            String repeat = reminder.optString("repeat", "none");
            long at = reminder.optLong("at", 0L);
            if (at <= now) {
                if ("none".equals(repeat)) {
                    ReminderStore.remove(context, reminder.optString("id"));
                    continue;
                }
                at = nextOccurrence(at, repeat, now);
                try {
                    reminder.put("at", at);
                } catch (org.json.JSONException ignored) {
                    // fall through
                }
                ReminderStore.put(context, reminder);
            }
            arm(context, reminder.optString("id"), at, reminder.optString("url", "/notifications"));
        }
    }

    static int requestCode(String id) {
        return Math.abs(id.hashCode() % 1000000) + 1000;
    }

    /* ------------------------------ recurrence ---------------------------- */

    /** Next time strictly after {@code now} matching the recurrence rule. */
    static long nextOccurrence(long at, String repeat, long now) {
        if (repeat == null || "none".equals(repeat)) {
            return Math.max(at, now + 1000L);
        }
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(at > 0 ? at : now);

        int guard = 0;
        while (cal.getTimeInMillis() <= now || !matches(cal, repeat)) {
            if (guard++ > 800) break;
            switch (repeat) {
                case "weekly":
                    cal.add(Calendar.DAY_OF_YEAR, 7);
                    break;
                case "monthly":
                    cal.add(Calendar.MONTH, 1);
                    break;
                default: // daily, weekdays
                    cal.add(Calendar.DAY_OF_YEAR, 1);
                    break;
            }
        }
        return cal.getTimeInMillis();
    }

    private static boolean matches(Calendar cal, String repeat) {
        if (!"weekdays".equals(repeat)) return true;
        int day = cal.get(Calendar.DAY_OF_WEEK);
        return day != Calendar.SATURDAY && day != Calendar.SUNDAY;
    }

    /* ------------------------------- display ------------------------------ */

    static boolean show(Context context, String id, String title, String body, String url,
                        String priority) {
        ensureChannel(context);
        Intent open = new Intent(context, MainActivity.class);
        open.setAction(Intent.ACTION_MAIN);
        open.addCategory(Intent.CATEGORY_LAUNCHER);
        open.putExtra(EXTRA_URL, url == null || url.isEmpty() ? "/notifications" : url);
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        PendingIntent content = PendingIntent.getActivity(
                context, requestCode(id == null ? "open" : id) + 1, open, flags);

        int importance = "low".equals(priority)
                ? NotificationCompat.PRIORITY_LOW
                : "high".equals(priority)
                        ? NotificationCompat.PRIORITY_HIGH
                        : NotificationCompat.PRIORITY_DEFAULT;

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title == null ? "SkillSync" : title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(importance)
                .setAutoCancel(true)
                .setDefaults(Notification.DEFAULT_ALL)
                .setContentIntent(content);

        try {
            NotificationManagerCompat.from(context)
                    .notify(id == null ? (int) System.currentTimeMillis() : requestCode(id),
                            builder.build());
            return true;
        } catch (SecurityException e) {
            return false;
        }
    }
}

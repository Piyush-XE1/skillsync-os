package com.skillsync.os;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import java.util.Calendar;

/**
 * Keeps the home screen widgets honest across midnight.
 *
 * Habit and task counters are "today" numbers, so a widget that is not redrawn
 * after the date rolls over would quietly lie. One inexact alarm (no exact-alarm
 * permission needed) wakes the providers five minutes past midnight, repaints
 * them and re-arms itself for the following night.
 */
final class WidgetScheduler {

    private static final int REQUEST_CODE = 0x5C0DE;

    private WidgetScheduler() {}

    static void armNextMidnight(Context context) {
        AlarmManager alarms = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarms == null) return;

        Intent intent = new Intent(context, WidgetActions.class);
        intent.setAction(WidgetActions.ACTION_NIGHTLY);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent pending = PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags);

        Calendar next = Calendar.getInstance();
        next.add(Calendar.DAY_OF_YEAR, 1);
        next.set(Calendar.HOUR_OF_DAY, 0);
        next.set(Calendar.MINUTE, 5);
        next.set(Calendar.SECOND, 0);
        next.set(Calendar.MILLISECOND, 0);

        try {
            alarms.set(AlarmManager.RTC, next.getTimeInMillis(), pending);
        } catch (SecurityException ignored) {
            // Inexact alarms never need a permission; keep the last schedule.
        }
    }
}

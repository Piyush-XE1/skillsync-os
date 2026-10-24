package com.skillsync.os;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Re-arms every stored reminder after a reboot or app update. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (action == null) return;
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            ReminderScheduler.rescheduleAll(context);
            // Widgets keep their own midnight wake-up and cached snapshot.
            WidgetScheduler.armNextMidnight(context);
            WidgetUpdater.refreshAll(context);
        }
    }
}

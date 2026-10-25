package com.skillsync.os;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * Inline actions coming from a home screen widget.
 *
 * A tap on a habit or task must feel instant even when the app is not running,
 * so the change is applied to the cached widget snapshot first, queued for the
 * web app, and every widget is redrawn. The queue is drained by the app on its
 * next resume (see `SkillSyncNativePlugin.widgetTakeActions`).
 */
public class WidgetActions extends BroadcastReceiver {

    static final String ACTION_HABIT = "com.skillsync.os.WIDGET_HABIT";
    static final String ACTION_TASK = "com.skillsync.os.WIDGET_TASK";
    static final String ACTION_EXPENSE = "com.skillsync.os.WIDGET_EXPENSE";
    static final String ACTION_REFRESH = "com.skillsync.os.WIDGET_REFRESH";
    static final String ACTION_NIGHTLY = "com.skillsync.os.WIDGET_NIGHTLY";

    static final String EXTRA_ID = "widget_item_id";
    static final String EXTRA_DAY = "widget_item_day";
    static final String EXTRA_DONE = "widget_item_done";
    static final String EXTRA_WIDGET_ID = "widget_instance_id";
    static final String EXTRA_AMOUNT = "widget_expense_amount";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;
        String action = intent.getAction();
        if (action == null) return;

        switch (action) {
            case ACTION_HABIT:
                applyHabit(context, intent);
                break;
            case ACTION_TASK:
                applyTask(context, intent);
                break;
            case ACTION_EXPENSE:
                applyExpense(context, intent);
                break;
            case ACTION_NIGHTLY:
                // Re-arm for tomorrow, then repaint so "today" is never yesterday.
                WidgetScheduler.armNextMidnight(context);
                WidgetUpdater.refreshAll(context);
                break;
            default:
                WidgetUpdater.refreshAll(context);
                break;
        }
    }

    private void applyHabit(Context context, Intent intent) {
        String id = intent.getStringExtra(EXTRA_ID);
        String day = intent.getStringExtra(EXTRA_DAY);
        boolean done = intent.getBooleanExtra(EXTRA_DONE, false);
        if (id == null || id.isEmpty()) return;

        WidgetStore.patchHabit(context, id, done);
        WidgetStore.enqueueAction(context, action("habit", id, day, done));
        WidgetUpdater.refreshAll(context);
    }

    private void applyTask(Context context, Intent intent) {
        String id = intent.getStringExtra(EXTRA_ID);
        boolean done = intent.getBooleanExtra(EXTRA_DONE, false);
        if (id == null || id.isEmpty()) return;

        WidgetStore.patchTask(context, id, done);
        WidgetStore.enqueueAction(context, action("task", id, null, done));
        WidgetUpdater.refreshAll(context);
    }

    /** A one-tap spend from the Spend widget's amount chips. */
    private void applyExpense(Context context, Intent intent) {
        double amount = intent.getDoubleExtra(EXTRA_AMOUNT, 0d);
        if (amount <= 0d) return;
        WidgetExpenseActivity.logQuickSpend(context, amount);
    }

    private JSONObject action(String type, String id, String day, boolean done) {
        JSONObject action = new JSONObject();
        try {
            action.put("type", type);
            action.put("id", id);
            action.put("done", done);
            if (day != null) action.put("date", day);
        } catch (JSONException ignored) {
            // an unfillable action is simply dropped by the app
        }
        return action;
    }
}

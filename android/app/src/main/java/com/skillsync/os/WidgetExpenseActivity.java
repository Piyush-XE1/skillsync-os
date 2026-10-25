package com.skillsync.os;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.core.content.ContextCompat;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The custom-amount sheet behind the Spend widget's "+" chip.
 *
 * Widgets cannot show dialogs, so this tiny translucent activity does it: enter
 * an amount, pick a category, save. The expense is queued exactly like the
 * one-tap chips, so it reaches the workspace on the next resume.
 */
public class WidgetExpenseActivity extends Activity {

    private static final String[] CATEGORIES = {"Food", "Transit", "Study", "Other"};

    private String category = "Food";
    private TextView[] chips;

    /** Opens the sheet. Used by WidgetIntents from the widget tap. */
    static Intent intent(Context context) {
        Intent intent = new Intent(context, WidgetExpenseActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return intent;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ThemeController.applyStored(this);

        Window window = getWindow();
        if (window != null) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
            WindowManager.LayoutParams params = window.getAttributes();
            params.dimAmount = 0.55f;
            window.setAttributes(params);
        }

        setContentView(R.layout.widget_expense_dialog);

        final EditText amount = findViewById(R.id.expense_amount);
        amount.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        amount.requestFocus();

        chips = new TextView[] {
            findViewById(R.id.cat_food),
            findViewById(R.id.cat_transit),
            findViewById(R.id.cat_study),
            findViewById(R.id.cat_other)
        };
        for (int i = 0; i < chips.length; i++) {
            final String label = CATEGORIES[i];
            chips[i].setOnClickListener(v -> select(label));
        }
        select(category);

        findViewById(R.id.expense_cancel).setOnClickListener(v -> finish());
        findViewById(R.id.expense_save).setOnClickListener(v -> save(amount.getText().toString()));
    }

    private void select(String label) {
        category = label;
        int active = ContextCompat.getColor(this, R.color.widgetAccent);
        int idle = ContextCompat.getColor(this, R.color.widgetText);
        for (int i = 0; i < chips.length; i++) {
            boolean on = CATEGORIES[i].equals(label);
            chips[i].setBackgroundResource(
                    on ? R.drawable.widget_pill_accent : R.drawable.widget_pill);
            chips[i].setTextColor(on ? active : idle);
        }
    }

    private void save(String raw) {
        double amount = parseAmount(raw);
        if (amount <= 0) {
            Toast.makeText(this, "Enter an amount", Toast.LENGTH_SHORT).show();
            return;
        }

        JSONObject action = new JSONObject();
        try {
            action.put("type", "expense");
            action.put("amount", amount);
            action.put("title", category);
            action.put("category", category);
        } catch (JSONException ignored) {
            // an action that cannot be built is simply dropped
        }
        WidgetStore.enqueueAction(this, action);
        WidgetStore.patchExpense(this, amount);
        WidgetUpdater.refreshAll(this);
        finish();
    }

    /** Accepts "120", "120.5" and "120,5"; anything else is zero. */
    static double parseAmount(String raw) {
        if (raw == null) return 0d;
        String cleaned = raw.trim().replace(',', '.').replaceAll("[^0-9.]", "");
        if (cleaned.isEmpty()) return 0d;
        try {
            double value = Double.parseDouble(cleaned);
            if (Double.isNaN(value) || Double.isInfinite(value) || value <= 0) return 0d;
            return Math.round(value * 100d) / 100d;
        } catch (NumberFormatException error) {
            return 0d;
        }
    }

    /** Exposed for the widget chips: queues a fixed-amount spend. */
    static void logQuickSpend(Context context, double amount) {
        if (amount <= 0) return;
        JSONObject action = new JSONObject();
        try {
            action.put("type", "expense");
            action.put("amount", amount);
            action.put("title", "Quick spend");
            action.put("category", "Quick");
        } catch (JSONException ignored) {
            return;
        }
        WidgetStore.enqueueAction(context, action);
        WidgetStore.patchExpense(context, amount);
        WidgetUpdater.refreshAll(context);
    }

    /** Kept for the receiver: an expense tapped while the app was closed. */
    static JSONObject actionFor(double amount, String title, String category) {
        JSONObject action = new JSONObject();
        try {
            JSONArray tags = new JSONArray();
            tags.put(category);
            action.put("type", "expense");
            action.put("amount", amount);
            action.put("title", title);
            action.put("category", category);
            action.put("tags", tags);
        } catch (JSONException ignored) {
            // fall through with a bare action
        }
        return action;
    }
}

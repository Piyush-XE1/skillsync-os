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

import org.json.JSONException;
import org.json.JSONObject;

/**
 * The capture sheet behind the Notes and Planner widgets.
 *
 * One translucent activity, two modes — {@link #MODE_NOTE} writes a note,
 * {@link #MODE_TASK} adds a planner task dated today. Either way the entry is
 * queued for the app exactly like a widget tap, so nothing is lost if SkillSync
 * is not running.
 */
public class WidgetCaptureActivity extends Activity {

    static final String EXTRA_MODE = "capture_mode";
    static final String MODE_NOTE = "note";
    static final String MODE_TASK = "task";

    private static final String[] PRIORITIES = {"low", "medium", "high"};
    private static final String[] PRIORITY_LABELS = {"Low", "Medium", "High"};

    private String mode = MODE_NOTE;
    private int priorityIndex = 1;

    static Intent intent(Context context, String mode, String day) {
        Intent intent = new Intent(context, WidgetCaptureActivity.class);
        intent.putExtra(EXTRA_MODE, mode);
        intent.putExtra(WidgetActions.EXTRA_DAY, day);
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

        Intent intent = getIntent();
        String requested = intent == null ? null : intent.getStringExtra(EXTRA_MODE);
        mode = MODE_TASK.equals(requested) ? MODE_TASK : MODE_NOTE;

        setContentView(R.layout.widget_capture_dialog);

        TextView title = findViewById(R.id.capture_title);
        TextView save = findViewById(R.id.capture_save);
        EditText titleField = findViewById(R.id.capture_title_field);
        EditText bodyField = findViewById(R.id.capture_body_field);
        View timeRow = findViewById(R.id.capture_time_row);
        EditText timeField = findViewById(R.id.capture_time);
        TextView priority = findViewById(R.id.capture_prio);

        boolean task = MODE_TASK.equals(mode);
        title.setText(task ? "New task · today" : "New note");
        save.setText(task ? "Add task" : "Save note");
        titleField.setHint(task ? "What needs doing?" : "Title");
        timeRow.setVisibility(task ? View.VISIBLE : View.GONE);
        if (task) {
            bodyField.setVisibility(View.GONE);
            timeField.setInputType(InputType.TYPE_CLASS_DATETIME | InputType.TYPE_DATETIME_VARIATION_TIME);
        }

        priority.setText(PRIORITY_LABELS[priorityIndex]);
        priority.setOnClickListener(v -> {
            priorityIndex = (priorityIndex + 1) % PRIORITIES.length;
            priority.setText(PRIORITY_LABELS[priorityIndex]);
            priority.setBackgroundResource(
                    priorityIndex == 2 ? R.drawable.widget_pill_accent : R.drawable.widget_pill);
            priority.setTextColor(ContextCompat.getColor(
                    this, priorityIndex == 2 ? R.color.widgetAccent : R.color.widgetText));
        });

        findViewById(R.id.capture_cancel).setOnClickListener(v -> finish());
        save.setOnClickListener(v -> {
            String heading = titleField.getText().toString().trim();
            if (heading.isEmpty()) {
                Toast.makeText(this, "Add a title first", Toast.LENGTH_SHORT).show();
                return;
            }
            if (task) {
                saveTask(heading, timeField.getText().toString());
            } else {
                saveNote(heading, bodyField.getText().toString());
            }
        });
    }

    private void saveNote(String heading, String body) {
        JSONObject action = new JSONObject();
        try {
            action.put("type", "note");
            action.put("title", heading);
            action.put("body", body == null ? "" : body.trim());
        } catch (JSONException ignored) {
            // an action that cannot be built is dropped
        }
        enqueue(action);
    }

    private void saveTask(String heading, String rawTime) {
        JSONObject action = new JSONObject();
        try {
            action.put("type", "newTask");
            action.put("title", heading);
            action.put("time", WidgetRender.normalizeTime(rawTime));
            action.put("priority", PRIORITIES[priorityIndex]);
        } catch (JSONException ignored) {
            // an action that cannot be built is dropped
        }
        enqueue(action);
    }

    private void enqueue(JSONObject action) {
        WidgetStore.enqueueAction(this, action);
        WidgetUpdater.refreshAll(this);
        finish();
    }
}

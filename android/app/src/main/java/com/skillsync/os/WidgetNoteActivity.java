package com.skillsync.os;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Toast;

/**
 * Native editor behind the sticky-note launcher widget.
 *
 * RemoteViews cannot host a dependable EditText, so a tap opens this small
 * dialog over the launcher. The note itself lives in {@link WidgetStore} —
 * device-local, one note per widget placement, independent of the in-app Notes
 * section. The Activity also restores an unsaved draft across rotation.
 */
public class WidgetNoteActivity extends Activity {

    private static final String KEY_DRAFT = "draft";
    private EditText input;

    static Intent intent(Context context) {
        return new Intent(context, WidgetNoteActivity.class);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_note_editor);
        input = findViewById(R.id.note_editor_input);

        if (savedInstanceState != null && savedInstanceState.containsKey(KEY_DRAFT)) {
            input.setText(savedInstanceState.getString(KEY_DRAFT, ""));
        } else {
            input.setText(WidgetStore.stickyNote(this));
        }
        input.setSelection(input.getText().length());

        Button save = findViewById(R.id.note_editor_save);
        save.setOnClickListener(view -> {
            WidgetStore.saveStickyNote(this, input.getText().toString());
            WidgetUpdater.refreshAll(this);
            Toast.makeText(this, R.string.widget_note_saved, Toast.LENGTH_SHORT).show();
            finish();
        });

        Button clear = findViewById(R.id.note_editor_clear);
        clear.setOnClickListener(view -> input.setText(""));
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        outState.putString(KEY_DRAFT, input == null ? "" : input.getText().toString());
        super.onSaveInstanceState(outState);
    }
}

package com.skillsync.os;

/**
 * The catalogue of SkillSync home screen widgets.
 *
 * Single source of truth shared by the providers, the updater and the native
 * bridge: a widget's stable type string, its label, its layout and its provider
 * class all live here. Exactly these three entries are registered in the
 * manifest, so no retired widget can appear in the launcher picker.
 */
final class WidgetSpecs {

    static final class Spec {
        final String type;
        final int labelRes;
        final int layout;
        final Class<? extends SkillSyncWidgetProvider> provider;
        /** Default footprint in launcher cells (columns × rows). */
        final int cellsWide;
        final int cellsTall;

        Spec(
                String type,
                int labelRes,
                int layout,
                Class<? extends SkillSyncWidgetProvider> provider,
                int cellsWide,
                int cellsTall) {
            this.type = type;
            this.labelRes = labelRes;
            this.layout = layout;
            this.provider = provider;
            this.cellsWide = cellsWide;
            this.cellsTall = cellsTall;
        }
    }

    static final Spec STICKY_NOTE = new Spec(
            "sticky_note", R.string.widget_sticky_note_label, R.layout.widget_sticky_note,
            StickyNoteWidgetProvider.class, 5, 2);
    static final Spec EXPENSE_LOGGER = new Spec(
            "expense_logger", R.string.widget_expense_logger_label, R.layout.widget_expense_logger,
            ExpenseLoggerWidgetProvider.class, 1, 1);
    static final Spec HABIT_CHECK = new Spec(
            "habit_check", R.string.widget_habit_check_label, R.layout.widget_habit_check,
            HabitCheckWidgetProvider.class, 2, 2);

    static final Spec[] ALL = {STICKY_NOTE, EXPENSE_LOGGER, HABIT_CHECK};

    private WidgetSpecs() {}

    static Spec byType(String type) {
        if (type == null) return null;
        for (Spec spec : ALL) {
            if (spec.type.equals(type)) return spec;
        }
        return null;
    }

    static Spec byProviderClass(Class<?> provider) {
        if (provider == null) return null;
        for (Spec spec : ALL) {
            if (spec.provider == provider) return spec;
        }
        return null;
    }

    static Spec byProviderClassName(String className) {
        if (className == null) return null;
        for (Spec spec : ALL) {
            if (spec.provider.getName().equals(className)) return spec;
        }
        return null;
    }
}

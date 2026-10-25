package com.skillsync.os;

/**
 * The catalogue of SkillSync home screen widgets.
 *
 * Single source of truth shared by the providers, the updater and the native
 * bridge: a widget's stable type string, its label, its layout and its provider
 * class all live here, so adding a widget is one entry plus a layout.
 */
final class WidgetSpecs {

    static final class Spec {
        final String type;
        final int labelRes;
        final int layout;
        final Class<? extends SkillSyncWidgetProvider> provider;
        /** Default footprint in launcher cells, used by the in-app gallery. */
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

    static final Spec TODAY = new Spec(
            "today", R.string.widget_today_label, R.layout.widget_today,
            TodayWidgetProvider.class, 4, 2);
    static final Spec HABITS = new Spec(
            "habits", R.string.widget_habits_label, R.layout.widget_habits,
            HabitsWidgetProvider.class, 4, 2);
    static final Spec FOCUS = new Spec(
            "focus", R.string.widget_focus_label, R.layout.widget_focus,
            FocusWidgetProvider.class, 2, 2);
    static final Spec EXPENSES = new Spec(
            "expenses", R.string.widget_expenses_label, R.layout.widget_expenses,
            ExpensesWidgetProvider.class, 4, 2);
    static final Spec AIMS = new Spec(
            "aims", R.string.widget_aims_label, R.layout.widget_aims,
            AimsWidgetProvider.class, 4, 2);
    static final Spec PLANNER = new Spec(
            "planner", R.string.widget_planner_label, R.layout.widget_planner,
            PlannerWidgetProvider.class, 4, 2);
    static final Spec STATS = new Spec(
            "stats", R.string.widget_stats_label, R.layout.widget_stats,
            StatsWidgetProvider.class, 2, 2);
    static final Spec QUOTE = new Spec(
            "quote", R.string.widget_quote_label, R.layout.widget_quote,
            QuoteWidgetProvider.class, 4, 2);
    static final Spec QUICK = new Spec(
            "quick", R.string.widget_quick_label, R.layout.widget_quick,
            QuickActionsWidgetProvider.class, 4, 1);
    static final Spec OVERVIEW = new Spec(
            "overview", R.string.widget_overview_label, R.layout.widget_overview,
            OverviewWidgetProvider.class, 4, 4);

    static final Spec[] ALL = {
        TODAY, HABITS, FOCUS, EXPENSES, AIMS, PLANNER, STATS, QUOTE, QUICK, OVERVIEW
    };

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

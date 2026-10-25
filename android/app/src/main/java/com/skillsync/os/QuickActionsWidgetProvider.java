package com.skillsync.os;

/**
 * 4×1 — one-tap shortcuts into tasks, notes, habits and focus.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class QuickActionsWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "quick";
    }
}

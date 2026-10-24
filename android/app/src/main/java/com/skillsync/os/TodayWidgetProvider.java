package com.skillsync.os;

/**
 * 4×2 — habits, deep work and tasks for today at a glance.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class TodayWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "today";
    }
}

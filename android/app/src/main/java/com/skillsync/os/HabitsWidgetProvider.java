package com.skillsync.os;

/**
 * 4×2 — today's habits, tappable to check in from the home screen.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class HabitsWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "habits";
    }
}

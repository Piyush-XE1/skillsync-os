package com.skillsync.os;

/**
 * 4×2 — today's planner, tappable to complete tasks in place.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class PlannerWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "planner";
    }
}

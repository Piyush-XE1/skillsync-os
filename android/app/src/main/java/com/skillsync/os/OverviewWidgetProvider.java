package com.skillsync.os;

/**
 * 4×4 — the full home dashboard: today, habits and tasks.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class OverviewWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "overview";
    }
}

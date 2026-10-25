package com.skillsync.os;

/**
 * 2×2 — solves, weekly effort, best streak and CGPA.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class StatsWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "stats";
    }
}

package com.skillsync.os;

/**
 * 2×2 — today's deep work, focus streak and quick starts.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class FocusWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "focus";
    }
}

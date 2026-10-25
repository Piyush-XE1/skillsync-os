package com.skillsync.os;

/**
 * 4×2 — the aims you are working on, pinned to the home screen.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class AimsWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "aims";
    }
}

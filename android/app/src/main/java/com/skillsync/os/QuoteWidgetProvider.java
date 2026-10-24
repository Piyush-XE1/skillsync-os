package com.skillsync.os;

/**
 * 4×2 — one line of perspective, renewed every day.
 *
 * All painting happens in {@link WidgetUpdater} / {@link WidgetRender}; this class
 * only declares which catalogue entry it is.
 */
public class QuoteWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "quote";
    }
}

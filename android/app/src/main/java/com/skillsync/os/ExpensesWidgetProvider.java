package com.skillsync.os;

/**
 * 4×2 — today's spend against the monthly budget, with one-tap logging.
 *
 * The amount chips queue a spend the moment they are tapped; the "+" chip opens
 * {@link WidgetExpenseActivity} for anything else.
 */
public class ExpensesWidgetProvider extends SkillSyncWidgetProvider {
    @Override
    public String widgetType() {
        return "expenses";
    }
}

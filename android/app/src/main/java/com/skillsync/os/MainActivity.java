package com.skillsync.os;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.OnBackPressedCallback;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Route requested by a notification tap; consumed by the web app once. */
    private static String pendingRoute = null;

    static synchronized String takePendingRoute() {
        String route = pendingRoute;
        pendingRoute = null;
        return route;
    }

    private static synchronized void setPendingRoute(String route) {
        pendingRoute = route;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SkillSyncNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Paint the window with the user's last chosen SkillSync theme before
        // the WebView has a chance to show an unstyled frame.
        ThemeController.applyStored(this);
        WebView bridgeView = getBridge() != null ? getBridge().getWebView() : null;
        if (bridgeView != null) {
            bridgeView.setBackgroundColor(
                    "light".equals(ThemeController.stored(this)) ? 0xFFFBFAF8 : 0xFF070B19);
        }
        ReminderScheduler.ensureChannel(this);
        ReminderScheduler.rescheduleAll(this);

        // Home screen widgets: keep the midnight repaint armed and show the
        // latest cached snapshot as soon as the app starts.
        WidgetScheduler.armNextMidnight(this);
        WidgetUpdater.refreshAll(this);

        // Android back: an open sheet/dialog dismisses first, then walk the
        // WebView history, and only finish at the root. Registered after
        // Capacitor's own callback, so this one wins.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                final WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    finish();
                    return;
                }
                webView.evaluateJavascript("(window.__skillsyncOverlays||0) > 0", result -> {
                    if ("true".equals(result)) {
                        // The topmost overlay listens for Escape and closes itself.
                        webView.evaluateJavascript(
                                "document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))",
                                null);
                        return;
                    }
                    if (webView.canGoBack()) {
                        webView.goBack();
                        return;
                    }
                    finish();
                });
            }
        });

        handleRouteIntent(getIntent());
    }

    // public, not protected: BridgeActivity already widens onResume() to public,
    // and an override may never narrow visibility (javac: "attempting to assign
    // weaker access privileges; was public").
    @Override
    public void onResume() {
        super.onResume();
        // Widget taps made while the app was closed are queued natively; tell
        // the web app to drain them as soon as it is visible again.
        notifyWidgetActivity();
    }

    private void notifyWidgetActivity() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().postDelayed(() -> {
            if (getBridge() != null) {
                getBridge().eval(
                        "window.dispatchEvent(new CustomEvent('skillsync:widget-actions'))",
                        null);
            }
        }, 500);
    }

    @Override
    public void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleRouteIntent(intent);
    }

    private void handleRouteIntent(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra(ReminderScheduler.EXTRA_URL);
        if (route == null || route.isEmpty()) return;
        setPendingRoute(route);
        final String target = route.replace("'", "");
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(() -> {
                if (getBridge() != null) {
                    getBridge().eval(
                            "window.dispatchEvent(new CustomEvent('skillsync:open',{detail:'"
                                    + target + "'}))",
                            null);
                }
            }, 600);
        }
    }
}

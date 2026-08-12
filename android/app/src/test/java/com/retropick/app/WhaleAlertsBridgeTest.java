package com.retropick.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import android.os.Build;
import com.getcapacitor.Plugin;
import com.retropick.core.notification.WhaleAlertNotificationPolicy;
import com.retropick.core.notification.WhaleAlertsPlugin;
import org.junit.Test;

public class WhaleAlertsBridgeTest {
    @Test
    public void bridgeRegistersWhaleAlertsPluginBeforeCreation() {
        boolean registered = false;
        for (Class<? extends Plugin> plugin : MainActivity.BRIDGE_PLUGINS) {
            if (plugin == WhaleAlertsPlugin.class) {
                registered = true;
                break;
            }
        }

        assertTrue("WhaleAlerts must be available through Capacitor", registered);
    }

    @Test
    public void api33PlusRequestsOnlyWhenNotificationPermissionIsDenied() {
        assertTrue(WhaleAlertNotificationPolicy.shouldRequestRuntimePermission(
                Build.VERSION_CODES.TIRAMISU,
                false
        ));
        assertFalse(WhaleAlertNotificationPolicy.shouldRequestRuntimePermission(
                Build.VERSION_CODES.TIRAMISU,
                true
        ));
    }

    @Test
    public void api32AndBelowTreatNotificationsAsGrantedWithoutPrompt() {
        assertFalse(WhaleAlertNotificationPolicy.shouldRequestRuntimePermission(
                Build.VERSION_CODES.S_V2,
                false
        ));
        assertTrue(WhaleAlertNotificationPolicy.canPostWhaleAlert(
                Build.VERSION_CODES.S_V2,
                false
        ));
    }

    @Test
    public void api33PlusPostsOnlyAfterNotificationPermissionIsGranted() {
        assertFalse(WhaleAlertNotificationPolicy.canPostWhaleAlert(
                Build.VERSION_CODES.TIRAMISU,
                false
        ));
        assertTrue(WhaleAlertNotificationPolicy.canPostWhaleAlert(
                Build.VERSION_CODES.TIRAMISU,
                true
        ));
    }
}

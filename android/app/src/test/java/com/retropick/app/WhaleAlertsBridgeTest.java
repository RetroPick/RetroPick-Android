package com.retropick.app;

import static org.junit.Assert.assertFalse;

import com.getcapacitor.Plugin;
import com.retropick.core.notification.WhaleAlertsPlugin;
import org.junit.Test;

public class WhaleAlertsBridgeTest {
    @Test
    public void whaleAlertsPluginIsNotRegisteredInTheReleaseBridge() {
        boolean registered = false;
        for (Class<? extends Plugin> plugin : MainActivity.BRIDGE_PLUGINS) {
            if (plugin == WhaleAlertsPlugin.class) {
                registered = true;
                break;
            }
        }
        assertFalse("Release bridge must not expose alert functionality", registered);
    }
}

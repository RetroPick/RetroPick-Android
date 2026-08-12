package com.retropick.core.notification;

import android.Manifest;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
        name = "WhaleAlerts",
        permissions = {
                @Permission(
                        alias = WhaleAlertsPlugin.NOTIFICATION_PERMISSION_ALIAS,
                        strings = {Manifest.permission.POST_NOTIFICATIONS}
                )
        }
)
public class WhaleAlertsPlugin extends Plugin {
    static final String NOTIFICATION_PERMISSION_ALIAS = "notifications";

    @PluginMethod
    public void requestNotificationPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                || getPermissionState(NOTIFICATION_PERMISSION_ALIAS) == PermissionState.GRANTED) {
            resolvePermissionResult(call);
            return;
        }

        requestPermissionForAlias(
                NOTIFICATION_PERMISSION_ALIAS,
                call,
                "notificationPermissionResult"
        );
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        resolvePermissionResult(call);
    }

    private void resolvePermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put(
                "granted",
                Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU
                        || getPermissionState(NOTIFICATION_PERMISSION_ALIAS) == PermissionState.GRANTED
        );
        call.resolve(result);
    }
}

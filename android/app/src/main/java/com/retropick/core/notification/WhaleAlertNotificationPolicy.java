package com.retropick.core.notification;

import android.os.Build;

public final class WhaleAlertNotificationPolicy {
    private WhaleAlertNotificationPolicy() {}

    public static boolean shouldRequestRuntimePermission(int sdkInt, boolean permissionGranted) {
        return sdkInt >= Build.VERSION_CODES.TIRAMISU && !permissionGranted;
    }

    public static boolean canPostWhaleAlert(int sdkInt, boolean permissionGranted) {
        return sdkInt < Build.VERSION_CODES.TIRAMISU || permissionGranted;
    }
}

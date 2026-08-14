import { Capacitor, registerPlugin } from '@capacitor/core'

type NotificationPermissionResult = {
  granted: boolean
}

interface WhaleAlertsPlugin {
  requestNotificationPermission(): Promise<NotificationPermissionResult>
}

const WhaleAlerts = registerPlugin<WhaleAlertsPlugin>('WhaleAlerts')

export async function requestWhaleAlertNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true
  }

  const result = await WhaleAlerts.requestNotificationPermission()
  return result.granted
}

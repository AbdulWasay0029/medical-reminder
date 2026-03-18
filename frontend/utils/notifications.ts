import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true
    }),
});

// Configure android channel for high priority
export async function ensureNotificationChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication-reminders', {
        name: 'Medication Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
        sound: 'default',
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    return finalStatus === 'granted';
}

export async function scheduleMedicineNotifications(
    medicineId: string,
    medicineName: string,
    dosage: string,
    scheduledTimes: string[],
    endDate?: string | null // YYYY-MM-DD
): Promise<void> {
    await ensureNotificationChannel();
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        console.warn('No notification permissions');
        return;
    }

    // Cancel existing notifications for this medicine
    await cancelMedicineNotifications(medicineId);

    // If medicine has already ended, don't schedule new ones
    if (endDate) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (todayStr > endDate) {
            console.log(`Medicine ${medicineName} has already ended on ${endDate}. Skipping scheduling.`);
            return;
        }
    }

    // Schedule new notifications for each time
    for (const time of scheduledTimes) {
        const [hours, minutes] = time.split(':').map(Number);
        
        // UNIQUE ID per dose to prevent overwriting
        const uniqueId = `${medicineId}_${time.replace(/[:\s]/g, '')}`;

        await Notifications.scheduleNotificationAsync({
            identifier: uniqueId,
            content: {
                title: 'Time for your medicine',
                body: `${medicineName} (${dosage})`,
                data: { medicineId, medicineName, dosage },
                sound: 'default',
                priority: Notifications.AndroidNotificationPriority.MAX,
                // @ts-ignore
                channelId: 'medication-reminders',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DAILY,
                hour: hours,
                minute: minutes,
                preciseSchedules: true,
            } as Notifications.DailyTriggerInput,
        });
    }
}

export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
        if (notification.identifier.startsWith(medicineId + '_')) {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

export async function cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
}

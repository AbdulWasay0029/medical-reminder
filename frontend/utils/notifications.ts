import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

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
    scheduledTimes: string[]
): Promise<void> {
    // Cancel existing notifications for this medicine
    await cancelMedicineNotifications(medicineId);

    // Schedule new notifications for each time
    for (const time of scheduledTimes) {
        const [hours, minutes] = time.split(':').map(Number);

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Time to take your medicine',
                body: `${medicineName} (${dosage})`,
                data: { medicineId, medicineName, dosage },
                sound: true,
            },
            trigger: {
                hour: hours,
                minute: minutes,
                repeats: true,
            },
        });
    }
}

export async function cancelMedicineNotifications(medicineId: string): Promise<void> {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
        if (notification.content.data?.medicineId === medicineId) {
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

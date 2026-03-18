import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, ScrollView, ActivityIndicator, Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { memberAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

export default function SettingsScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [inviteCode, setInviteCode] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    useEffect(() => {
        loadProfile();
        checkNotificationPermissions();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;
        try {
            const response = await memberAPI.getProfile(user.id);
            setInviteCode(response.user.inviteCode || '');
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const checkNotificationPermissions = async () => {
        const { status } = await Notifications.getPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
    };

    const requestNotificationPermissions = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        setNotificationsEnabled(status === 'granted');
        if (status !== 'granted') {
            Alert.alert('Permissions Required', 'Please enable notifications in your device settings to receive medicine reminders.');
        }
    };

    const regenerateCode = async () => {
        if (!user) return;
        Alert.alert(
            'Regenerate Code',
            'Existing Family Guardians already linked to you will NOT be affected. New code will only be needed for NEW guardians.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Regenerate',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const response = await memberAPI.regenerateCode(user.id);
                            setInviteCode(response.inviteCode);
                            Alert.alert('Success', 'New invite code generated. Existing links are unchanged.');
                        } catch (error) {
                            Alert.alert('Error', 'Failed to regenerate code');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    const shareCode = async () => {
        try {
            await Share.share({
                message: `Join me on MediRemind as my Family Guardian! Use my invite code: ${inviteCode}`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };


    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout', style: 'destructive',
                onPress: async () => {
                    await logout();
                    router.replace('/auth/login');
                },
            },
        ]);
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={32} color="#6366F1" />
                    </View>
                    <Text style={styles.name}>{user?.name}</Text>
                    <Text style={styles.email}>{user?.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Family Member</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Guardian Invite Code</Text>
                <View style={styles.codeCard}>
                    <View style={styles.codeHeader}>
                        <Ionicons name="key" size={20} color="#6366F1" />
                        <Text style={styles.codeLabel}>Share this code with your Family Guardian</Text>
                    </View>
                    <View style={styles.codeDisplay}>
                        <Text style={styles.codeText}>{inviteCode || '——'}</Text>
                    </View>
                    <View style={styles.codeButtons}>
                        <TouchableOpacity 
                            style={styles.codeButton} 
                            onPress={() => {
                                require('react-native').Clipboard.setString(inviteCode);
                                Alert.alert('Copied', 'Invite code copied to clipboard');
                            }}
                        >
                            <Ionicons name="copy-outline" size={18} color="#6366F1" />
                            <Text style={styles.codeButtonText}>Copy</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.codeButton} onPress={shareCode}>
                            <Ionicons name="share-outline" size={18} color="#6366F1" />
                            <Text style={styles.codeButtonText}>Share</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.codeButton} onPress={regenerateCode} disabled={loading}>
                            {loading
                                ? <ActivityIndicator size="small" color="#6366F1" />
                                : <>
                                    <Ionicons name="refresh-outline" size={18} color="#6366F1" />
                                    <Text style={styles.codeButtonText}>Regenerate</Text>
                                </>
                            }
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                <TouchableOpacity style={styles.settingItem} onPress={requestNotificationPermissions}>
                    <View style={styles.settingLeft}>
                        <Ionicons name="notifications" size={22} color="#6B7280" />
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Medicine Reminders</Text>
                            <Text style={styles.settingDescription}>
                                {notificationsEnabled ? '✅ Enabled' : '❌ Disabled — Tap to enable'}
                            </Text>
                        </View>
                    </View>
                    <Ionicons
                        name={notificationsEnabled ? 'checkmark-circle' : 'close-circle'}
                        size={22}
                        color={notificationsEnabled ? '#10B981' : '#EF4444'}
                    />
                </TouchableOpacity>
            </View>


            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>MediRemind v1.0</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    section: { padding: 16 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 },
    profileCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 24,
        alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    name: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    email: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    roleBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
    roleText: { color: '#6366F1', fontSize: 12, fontWeight: '600' },
    codeCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
    codeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
    codeLabel: { fontSize: 13, color: '#6B7280', flex: 1 },
    codeDisplay: {
        backgroundColor: '#F9FAFB', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 12,
    },
    codeText: { fontSize: 32, fontWeight: 'bold', color: '#6366F1', letterSpacing: 6 },
    codeButtons: { flexDirection: 'row', gap: 10 },
    codeButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#EEF2FF', borderRadius: 8, padding: 12, gap: 6,
    },
    codeButtonText: { color: '#6366F1', fontSize: 13, fontWeight: '600' },
    settingItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    settingInfo: { marginLeft: 12, flex: 1 },
    settingLabel: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 2 },
    settingDescription: { fontSize: 12, color: '#6B7280' },
    resetButton: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFBEB', borderRadius: 12, padding: 14,
        borderWidth: 1, borderColor: '#FDE68A', gap: 10,
    },
    resetText: { color: '#92400E', fontSize: 14, fontWeight: '600', flex: 1 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#FEE2E2', gap: 10,
    },
    logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
    footer: { alignItems: 'center', paddingVertical: 24 },
    footerText: { fontSize: 12, color: '#9CA3AF' },
});

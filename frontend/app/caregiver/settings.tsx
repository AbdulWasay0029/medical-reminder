import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function GuardianSettingsScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();

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

    if (!user) return null;
    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="shield-checkmark" size={32} color="#10B981" />
                    </View>
                    <Text style={styles.name}>{user.name}</Text>
                    <Text style={styles.email}>{user.email}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleText}>Family Guardian</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About Your Role</Text>
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Ionicons name="eye-outline" size={20} color="#10B981" />
                        <Text style={styles.infoText}>View linked family members' medicine schedules</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="stats-chart-outline" size={20} color="#10B981" />
                        <Text style={styles.infoText}>Track adherence history and missed doses</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="lock-closed-outline" size={20} color="#10B981" />
                        <Text style={styles.infoText}>Read-only access — family members manage their own medicines</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>HealthSync v1.0</Text>
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
        backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginBottom: 12,
    },
    name: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
    email: { fontSize: 14, color: '#6B7280', marginBottom: 12 },
    roleBadge: { backgroundColor: '#D1FAE5', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
    roleText: { color: '#059669', fontSize: 12, fontWeight: '600' },
    infoCard: {
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#E5E7EB', gap: 14,
    },
    infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    infoText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 20 },
    logoutButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#FEE2E2', gap: 10,
    },
    logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
    footer: { alignItems: 'center', paddingVertical: 24 },
    footerText: { fontSize: 12, color: '#9CA3AF' },
});

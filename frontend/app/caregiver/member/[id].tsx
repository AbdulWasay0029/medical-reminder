import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { guardianAPI } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';

interface DashItem {
    id: string;
    medicineId: string;
    name: string;
    dosage: string;
    scheduledTime: string;
    date: string;
    status: 'pending' | 'taken' | 'missed';
    takenAt: string | null;
}

const STATUS_CONFIG = {
    pending: { label: 'Pending', bg: '#F59E0B', text: '#FFFFFF', icon: 'time-outline' as const },
    taken: { label: 'Taken', bg: '#10B981', text: '#FFFFFF', icon: 'checkmark-circle-outline' as const },
    missed: { label: 'Missed', bg: '#EF4444', text: '#FFFFFF', icon: 'close-circle-outline' as const },
};

function fmt12(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function MemberDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [items, setItems] = useState<DashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        if (!user || !id) return;
        try {
            const res = await guardianAPI.getMemberDashboard(user.id, id as string);
            setItems(res.items ?? []);
        } catch (e) {
            console.error('Error loading member dashboard:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, id]);

    useEffect(() => { loadData(); }, [loadData]);
    const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

    const counts = {
        total: items.length,
        taken: items.filter(i => i.status === 'taken').length,
        pending: items.filter(i => i.status === 'pending').length,
        missed: items.filter(i => i.status === 'missed').length,
    };

    const adherence = () => {
        if (counts.total === 0) return 0;
        return Math.round((counts.taken / counts.total) * 100);
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#10B981" /></View>;

    return (
        <View style={styles.container}>
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}>
                {/* Stats */}
                <View style={styles.statsCard}>
                    {[
                        { label: 'Total Meds', value: counts.total, color: '#6366F1', icon: 'medical' },
                        { label: 'Adherence', value: `${adherence()}%`, color: '#10B981', icon: 'pulse' },
                        { label: 'Taken', value: counts.taken, color: '#F59E0B', icon: 'checkmark-circle' },
                    ].map(s => (
                        <View key={s.label} style={styles.statItem}>
                            <Ionicons name={s.icon as any} size={28} color={s.color} />
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>Today's Schedule</Text>

                <View style={styles.content}>
                    {items.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="medical-outline" size={48} color="#D1D5DB" />
                            <Text style={styles.emptyText}>No medicines scheduled today</Text>
                        </View>
                    ) : (
                        items.map(item => {
                            const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
                            return (
                                <View key={item.id} style={[styles.card, item.status === 'missed' && styles.cardMissed]}>
                                    <View style={styles.cardTop}>
                                        <View style={styles.cardInfo}>
                                            <Text style={styles.medName}>{item.name}</Text>
                                            <Text style={styles.medDosage}>{item.dosage}</Text>
                                            <View style={styles.timeRow}>
                                                <Ionicons name="time-outline" size={13} color="#6B7280" />
                                                <Text style={styles.timeText}>{fmt12(item.scheduledTime)}</Text>
                                            </View>
                                        </View>
                                        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                                            <Ionicons name={cfg.icon} size={12} color={cfg.text} />
                                            <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statsCard: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        margin: 16, borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', paddingHorizontal: 16, marginTop: 10 },
    content: { padding: 16 },
    card: {
        backgroundColor: '#FFFFFF', marginBottom: 10,
        borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    },
    cardMissed: { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardInfo: { flex: 1 },
    medName: { fontSize: 16, fontWeight: '600', color: '#111827' },
    medDosage: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
    timeText: { fontSize: 13, color: '#6366F1', fontWeight: '500' },
    badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, gap: 4 },
    badgeText: { fontSize: 12, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
});

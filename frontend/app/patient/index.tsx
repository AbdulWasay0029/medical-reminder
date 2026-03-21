import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { doseAPI } from '../../services/api';

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

export default function DashboardScreen() {
    const { user } = useAuth();
    const [items, setItems] = useState<DashItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingId, setMarkingId] = useState<string | null>(null);

    const load = useCallback(async (isRefresh = false) => {
        if (!user) return;
        if (isRefresh) setRefreshing(true); else setLoading(true);
        try {
            const data = await doseAPI.getDashboard(user.id);
            setItems(data.items ?? []);
        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    // Auto-refresh every 60 seconds so statuses stay current
    useEffect(() => {
        const t = setInterval(() => load(), 60_000);
        return () => clearInterval(t);
    }, [load]);

    const handleMarkTaken = async (item: DashItem) => {
        if (!user) return;
        setMarkingId(item.id);
        try {
            await doseAPI.markTaken(item.medicineId, item.date, item.scheduledTime, user.id);
            setItems(prev => prev.map(i =>
                i.id === item.id ? { ...i, status: 'taken', takenAt: new Date().toISOString() } : i
            ));
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Could not mark as taken');
        } finally {
            setMarkingId(null);
        }
    };

    const counts = {
        total: items.length,
        taken: items.filter(i => i.status === 'taken').length,
        pending: items.filter(i => i.status === 'pending').length,
        missed: items.filter(i => i.status === 'missed').length,
    };

    const today = new Date();
    const dayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    const renderItem = ({ item }: { item: DashItem }) => {
        const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
        const isMarking = markingId === item.id;
        const canMark = item.status !== 'taken';

        return (
            <View style={[styles.card, item.status === 'missed' && styles.cardMissed]}>
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

                {canMark && (
                    <TouchableOpacity
                        style={[styles.markBtn, item.status === 'missed' && styles.markBtnMissed]}
                        onPress={() => handleMarkTaken(item)}
                        disabled={isMarking}
                    >
                        {isMarking
                            ? <ActivityIndicator size="small" color="#FFFFFF" />
                            : <>
                                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                <Text style={styles.markBtnText}>
                                    {item.status === 'missed' ? 'Mark as Taken (Late)' : 'Mark as Taken'}
                                </Text>
                            </>
                        }
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
                <Text style={styles.date}>{dayStr}</Text>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
                {[
                    { label: 'Total', val: counts.total, color: '#6366F1' },
                    { label: 'Taken', val: counts.taken, color: '#10B981' },
                    { label: 'Pending', val: counts.pending, color: '#F59E0B' },
                    { label: 'Missed', val: counts.missed, color: '#EF4444' },
                ].map(s => (
                    <View key={s.label} style={styles.statCard}>
                        <Text style={[styles.statNum, { color: s.color }]}>{s.val}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </View>
                ))}
            </View>

            <Text style={styles.sectionTitle}>Today's Schedule</Text>

            <FlatList
                data={items}
                keyExtractor={i => i.id}
                renderItem={renderItem}
                contentContainerStyle={items.length === 0 ? styles.emptyContainer : { paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={['#6366F1']} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="medical-outline" size={48} color="#9CA3AF" />
                        <Text style={styles.emptyTitle}>No medicines scheduled</Text>
                        <Text style={styles.emptyText}>Add medicines in the Medicines tab</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    greeting: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
    date: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    statsRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
    statNum: { fontSize: 20, fontWeight: 'bold' },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#111827', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
    card: {
        backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 10,
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
    markBtn: {
        marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#6366F1', borderRadius: 8, paddingVertical: 10, gap: 6,
    },
    markBtnMissed: { backgroundColor: '#EF4444' },
    markBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyBox: { alignItems: 'center', paddingTop: 60, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    emptyText: { fontSize: 14, color: '#6B7280' },
});

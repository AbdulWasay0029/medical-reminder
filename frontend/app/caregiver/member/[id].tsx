import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { guardianAPI } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';

interface Medicine {
    id: string;
    name: string;
    dosage: string;
    frequency: number;
    scheduledTimes: string[];
    notes: string;
}

interface Dose {
    id: string;
    status: 'upcoming' | 'pending' | 'taken' | 'missed' | 'scheduled';
    scheduledDateTime: string;
    medicine: { name: string; dosage: string };
}

const STATUS_COLOR: Record<string, string> = {
    taken: '#10B981',
    missed: '#EF4444',
    pending: '#F59E0B',
    upcoming: '#6B7280',
    scheduled: '#6B7280',
};

export default function MemberDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const router = useRouter();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [doses, setDoses] = useState<Dose[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'medicines' | 'history'>('medicines');
    const [days, setDays] = useState(7);

    const loadData = useCallback(async () => {
        if (!user || !id) return;
        try {
            const [medicinesRes, dosesRes] = await Promise.all([
                guardianAPI.getMemberMedicines(user.id, id),
                guardianAPI.getMemberDoses(user.id, id, days),
            ]);
            setMedicines(medicinesRes.medicines);
            setDoses(dosesRes.doses);
        } catch (e) {
            console.error('Error loading member data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user, id, days]);

    useEffect(() => { loadData(); }, [loadData]);

    const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

    const adherence = () => {
        const total = doses.filter(d => d.status !== 'upcoming' && d.status !== 'scheduled').length;
        if (total === 0) return 0;
        return Math.round((doses.filter(d => d.status === 'taken').length / total) * 100);
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#10B981" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Family Member</Text>
                <View style={{ width: 36 }} />
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}>
                {/* Stats */}
                <View style={styles.statsCard}>
                    {[
                        { label: 'Medicines', value: medicines.length, color: '#10B981', icon: 'medical' },
                        { label: 'Adherence', value: `${adherence()}%`, color: '#6366F1', icon: 'pulse' },
                        { label: 'Doses', value: doses.length, color: '#F59E0B', icon: 'calendar' },
                    ].map(s => (
                        <View key={s.label} style={styles.statItem}>
                            <Ionicons name={s.icon as any} size={28} color={s.color} />
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Tabs */}
                <View style={styles.tabs}>
                    {(['medicines', 'history'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, selectedTab === tab && styles.tabActive]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                                {tab === 'medicines' ? 'Medicines' : 'History'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.content}>
                    {selectedTab === 'medicines' ? (
                        medicines.length === 0
                            ? <View style={styles.emptyContainer}>
                                <Ionicons name="medical-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No medicines added yet</Text>
                            </View>
                            : medicines.map(med => (
                                <View key={med.id} style={styles.medicineCard}>
                                    <View style={styles.medIcon}>
                                        <Ionicons name="medical" size={22} color="#10B981" />
                                    </View>
                                    <View style={styles.medInfo}>
                                        <Text style={styles.medName}>{med.name}</Text>
                                        <Text style={styles.medDosage}>{med.dosage}</Text>
                                        <Text style={styles.medTimes}>{med.frequency}x daily · {med.scheduledTimes.join(', ')}</Text>
                                        {med.notes ? <Text style={styles.medNotes}>{med.notes}</Text> : null}
                                    </View>
                                </View>
                            ))
                    ) : (
                        <>
                            <View style={styles.filterRow}>
                                <Text style={styles.filterLabel}>Show last:</Text>
                                <View style={styles.filterButtons}>
                                    {[7, 14, 30].map(d => (
                                        <TouchableOpacity
                                            key={d}
                                            style={[styles.filterBtn, days === d && styles.filterBtnActive]}
                                            onPress={() => setDays(d)}
                                        >
                                            <Text style={[styles.filterBtnText, days === d && styles.filterBtnTextActive]}>{d}d</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                            {doses.length === 0
                                ? <View style={styles.emptyContainer}>
                                    <Ionicons name="time-outline" size={48} color="#D1D5DB" />
                                    <Text style={styles.emptyText}>No dose history available</Text>
                                </View>
                                : doses.map(dose => (
                                    <View key={dose.id} style={styles.doseItem}>
                                        <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[dose.status] ?? '#6B7280' }]} />
                                        <View style={styles.doseInfo}>
                                            <Text style={styles.doseMedName}>{dose.medicine.name}</Text>
                                            <Text style={styles.doseDosage}>{dose.medicine.dosage}</Text>
                                            <Text style={styles.doseTime}>
                                                {format(parseISO(dose.scheduledDateTime), 'MMM d, h:mm a')}
                                            </Text>
                                        </View>
                                        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[dose.status] ?? '#6B7280' }]}>
                                            <Text style={styles.statusText}>{dose.status}</Text>
                                        </View>
                                    </View>
                                ))
                            }
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: '#10B981', padding: 16, paddingTop: 48,
    },
    backButton: { width: 36, height: 36, justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
    statsCard: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        margin: 16, borderRadius: 12, padding: 16,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', marginTop: 6 },
    statLabel: { fontSize: 11, color: '#6B7280', marginTop: 2 },
    tabs: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        marginHorizontal: 16, borderRadius: 12, padding: 4,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    tab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: '#10B981' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#FFFFFF' },
    content: { padding: 16 },
    medicineCard: {
        flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12,
        padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB',
    },
    medIcon: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    medInfo: { flex: 1 },
    medName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
    medDosage: { fontSize: 13, color: '#6B7280', marginBottom: 1 },
    medTimes: { fontSize: 12, color: '#10B981', fontWeight: '500' },
    medNotes: { fontSize: 11, color: '#9CA3AF', fontStyle: 'italic', marginTop: 2 },
    filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    filterLabel: { fontSize: 13, color: '#6B7280' },
    filterButtons: { flexDirection: 'row', gap: 6 },
    filterBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: '#F3F4F6' },
    filterBtnActive: { backgroundColor: '#10B981' },
    filterBtnText: { fontSize: 12, fontWeight: '500', color: '#374151' },
    filterBtnTextActive: { color: '#FFFFFF' },
    doseItem: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
        borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB',
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    doseInfo: { flex: 1 },
    doseMedName: { fontSize: 15, fontWeight: '500', color: '#111827', marginBottom: 1 },
    doseDosage: { fontSize: 12, color: '#6B7280', marginBottom: 1 },
    doseTime: { fontSize: 11, color: '#9CA3AF' },
    statusBadge: {
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
    },
    statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
});

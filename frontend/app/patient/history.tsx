import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    RefreshControl, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { doseAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

interface LogEntry {
    id: string;
    medicineName: string;
    dosage: string;
    date: string;          // "YYYY-MM-DD"
    scheduledTime: string; // "HH:MM"
    status: 'taken' | 'missed' | 'pending';
    takenAt: string | null;
}

function fmt12(t: string) {
    const [h, m] = t.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const hr = h % 12 || 12;
    return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function fmtDate(dateStr: string) {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    const [y, mo, d] = dateStr.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

type DateGroup = { date: string; logs: LogEntry[] };

export default function HistoryScreen() {
    const { user } = useAuth();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [days, setDays] = useState(7);

    const load = async () => {
        if (!user) return;
        try {
            const data = await doseAPI.getHistory(user.id, days);
            setLogs(data.logs ?? []);
        } catch (e) {
            console.error('History load error:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { load(); }, [user, days]);
    const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [user, days]);

    // Group by date, newest first
    const grouped: DateGroup[] = Object.entries(
        logs.reduce((acc: Record<string, LogEntry[]>, l) => {
            (acc[l.date] ??= []).push(l);
            return acc;
        }, {})
    )
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([date, ls]) => ({ date, logs: ls.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime)) }));

    const renderLog = (log: LogEntry) => {
        const color = log.status === 'taken' ? '#10B981' : log.status === 'missed' ? '#EF4444' : '#F59E0B';
        const icon = log.status === 'taken' ? 'checkmark-circle' : log.status === 'missed' ? 'close-circle' : 'time';
        return (
            <View key={log.id || `${log.date}_${log.scheduledTime}`} style={styles.logRow}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <View style={styles.logInfo}>
                    <Text style={styles.logName}>{log.medicineName}</Text>
                    <Text style={styles.logDosage}>{log.dosage}</Text>
                </View>
                <View style={styles.logRight}>
                    <Text style={styles.logTime}>{fmt12(log.scheduledTime)}</Text>
                    <View style={[styles.badge, { backgroundColor: color }]}>
                        <Ionicons name={icon as any} size={11} color="#FFFFFF" />
                        <Text style={styles.badgeText}>{log.status.charAt(0).toUpperCase() + log.status.slice(1)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderGroup = ({ item }: { item: DateGroup }) => {
        const taken = item.logs.filter(l => l.status === 'taken').length;
        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionDate}>{fmtDate(item.date)}</Text>
                    <Text style={styles.sectionStats}>{taken}/{item.logs.length} taken</Text>
                </View>
                {item.logs.map(renderLog)}
            </View>
        );
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6366F1" /></View>;

    return (
        <View style={styles.container}>
            {/* Day-range filter */}
            <View style={styles.filterBar}>
                <Text style={styles.filterLabel}>Show last:</Text>
                <View style={styles.filterRow}>
                    {[7, 14, 30].map(d => (
                        <TouchableOpacity
                            key={d}
                            style={[styles.filterBtn, days === d && styles.filterBtnActive]}
                            onPress={() => setDays(d)}
                        >
                            <Text style={[styles.filterTxt, days === d && styles.filterTxtActive]}>{d} days</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <FlatList
                data={grouped}
                keyExtractor={g => g.date}
                renderItem={renderGroup}
                contentContainerStyle={grouped.length === 0 ? styles.emptyWrap : { padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="time-outline" size={56} color="#D1D5DB" />
                        <Text style={styles.emptyTitle}>No history yet</Text>
                        <Text style={styles.emptyText}>Dose history will appear here after medicines are taken or missed</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    filterBar: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    filterLabel: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
    filterRow: { flexDirection: 'row', gap: 8 },
    filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3F4F6' },
    filterBtnActive: { backgroundColor: '#6366F1' },
    filterTxt: { fontSize: 14, fontWeight: '500', color: '#374151' },
    filterTxtActive: { color: '#FFFFFF' },
    section: { marginBottom: 20 },
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8,
    },
    sectionDate: { fontSize: 15, fontWeight: '700', color: '#111827' },
    sectionStats: { fontSize: 13, color: '#6B7280' },
    logRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12,
        marginBottom: 6, borderWidth: 1, borderColor: '#E5E7EB',
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
    logInfo: { flex: 1 },
    logName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    logDosage: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    logRight: { alignItems: 'flex-end', gap: 4 },
    logTime: { fontSize: 13, color: '#6B7280' },
    badge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    badgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
    emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { alignItems: 'center', gap: 8, paddingTop: 60 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
    emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 40 },
});

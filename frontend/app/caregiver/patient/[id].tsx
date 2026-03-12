import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { caregiverAPI } from '../../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, startOfDay } from 'date-fns';

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
    status: 'scheduled' | 'taken' | 'missed';
    scheduledDateTime: string;
    medicine: {
        name: string;
        dosage: string;
    };
}

export default function PatientDetailScreen() {
    const { id } = useLocalSearchParams();
    const { user } = useAuth();
    const router = useRouter();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [doses, setDoses] = useState<Dose[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'medicines' | 'history'>('medicines');
    const [days, setDays] = useState(7);

    const loadData = async () => {
        if (!user || !id) return;

        try {
            const [medicinesRes, dosesRes] = await Promise.all([
                caregiverAPI.getPatientMedicines(user.id, id as string),
                caregiverAPI.getPatientDoses(user.id, id as string, days),
            ]);

            setMedicines(medicinesRes.medicines);
            setDoses(dosesRes.doses);
        } catch (error) {
            console.error('Error loading patient data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user, id, days]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [user, id, days]);

    const calculateAdherence = () => {
        const total = doses.length;
        if (total === 0) return 0;
        const taken = doses.filter(d => d.status === 'taken').length;
        return Math.round((taken / total) * 100);
    };

    const renderMedicine = ({ item }: { item: Medicine }) => (
        <View style={styles.medicineCard}>
            <View style={styles.medicineIcon}>
                <Ionicons name="medical" size={24} color="#10B981" />
            </View>
            <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{item.name}</Text>
                <Text style={styles.dosage}>{item.dosage}</Text>
                <Text style={styles.frequency}>{item.frequency}x daily</Text>
                <Text style={styles.times}>Times: {item.scheduledTimes.join(', ')}</Text>
                {item.notes && <Text style={styles.notes}>{item.notes}</Text>}
            </View>
        </View>
    );

    const renderDose = ({ item }: { item: Dose }) => {
        const scheduledTime = format(parseISO(item.scheduledDateTime), 'MMM d, h:mm a');
        const statusColor = {
            taken: '#10B981',
            missed: '#EF4444',
            scheduled: '#6366F1',
        }[item.status];

        const statusIcon = {
            taken: 'checkmark-circle',
            missed: 'close-circle',
            scheduled: 'time',
        }[item.status];

        return (
            <View style={styles.doseItem}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <View style={styles.doseInfo}>
                    <Text style={styles.doseMedicineName}>{item.medicine.name}</Text>
                    <Text style={styles.doseDosage}>{item.medicine.dosage}</Text>
                    <Text style={styles.doseTime}>{scheduledTime}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                    <Ionicons name={statusIcon as any} size={14} color="#FFFFFF" />
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    const adherence = calculateAdherence();

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />
                }
            >
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Ionicons name="medical" size={32} color="#10B981" />
                        <Text style={styles.statValue}>{medicines.length}</Text>
                        <Text style={styles.statLabel}>Medicines</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="pulse" size={32} color="#6366F1" />
                        <Text style={styles.statValue}>{adherence}%</Text>
                        <Text style={styles.statLabel}>Adherence</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="calendar" size={32} color="#F59E0B" />
                        <Text style={styles.statValue}>{doses.length}</Text>
                        <Text style={styles.statLabel}>Total Doses</Text>
                    </View>
                </View>

                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'medicines' && styles.tabActive]}
                        onPress={() => setSelectedTab('medicines')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'medicines' && styles.tabTextActive]}>
                            Medicines
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'history' && styles.tabActive]}
                        onPress={() => setSelectedTab('history')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'history' && styles.tabTextActive]}>
                            History
                        </Text>
                    </TouchableOpacity>
                </View>

                {selectedTab === 'medicines' ? (
                    <View style={styles.content}>
                        {medicines.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No medicines added yet</Text>
                            </View>
                        ) : (
                            medicines.map((medicine) => (
                                <View key={medicine.id}>{renderMedicine({ item: medicine })}</View>
                            ))
                        )}
                    </View>
                ) : (
                    <View style={styles.content}>
                        <View style={styles.filterContainer}>
                            <Text style={styles.filterLabel}>Show last:</Text>
                            <View style={styles.filterButtons}>
                                {[7, 14, 30].map((d) => (
                                    <TouchableOpacity
                                        key={d}
                                        style={[styles.filterButton, days === d && styles.filterButtonActive]}
                                        onPress={() => setDays(d)}
                                    >
                                        <Text
                                            style={[
                                                styles.filterButtonText,
                                                days === d && styles.filterButtonTextActive,
                                            ]}
                                        >
                                            {d}d
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        {doses.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="time-outline" size={64} color="#D1D5DB" />
                                <Text style={styles.emptyText}>No dose history available</Text>
                            </View>
                        ) : (
                            doses.map((dose) => <View key={dose.id}>{renderDose({ item: dose })}</View>)
                        )}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        paddingTop: 48,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    statsCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        margin: 16,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: '#10B981',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    content: {
        padding: 16,
    },
    medicineCard: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    medicineIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#D1FAE5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    medicineInfo: {
        flex: 1,
    },
    medicineName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    dosage: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    frequency: {
        fontSize: 14,
        color: '#10B981',
        fontWeight: '500',
        marginBottom: 2,
    },
    times: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    notes: {
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
        marginTop: 4,
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    filterLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    filterButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    filterButtonActive: {
        backgroundColor: '#10B981',
    },
    filterButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#374151',
    },
    filterButtonTextActive: {
        color: '#FFFFFF',
    },
    doseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 12,
    },
    doseInfo: {
        flex: 1,
    },
    doseMedicineName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
        marginBottom: 2,
    },
    doseDosage: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 2,
    },
    doseTime: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        color: '#9CA3AF',
        marginTop: 16,
    },
});

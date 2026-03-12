import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator, Modal,
    TextInput, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { medicineAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';
import { scheduleMedicineNotifications, cancelMedicineNotifications } from '../../utils/notifications';

interface Medicine {
    id: string;
    name: string;
    dosage: string;
    reminderTimes: string[];
    notes: string;
}

// Validate and normalize a time string typed as HH:MM (24h)
function validateTime(raw: string): string | null {
    const trimmed = raw.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export default function MedicinesScreen() {
    const { user } = useAuth();
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
    const [saving, setSaving] = useState(false);

    const [name, setName] = useState('');
    const [dosage, setDosage] = useState('');
    const [times, setTimes] = useState<string[]>(['08:00']);
    const [notes, setNotes] = useState('');

    const loadMedicines = async () => {
        if (!user) return;
        try {
            const response = await medicineAPI.getAll(user.id);
            setMedicines(response.medicines);
        } catch {
            Alert.alert('Error', 'Failed to load medicines');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { loadMedicines(); }, [user]);

    const onRefresh = useCallback(() => { setRefreshing(true); loadMedicines(); }, [user]);

    const openAddModal = () => {
        setEditingMedicine(null);
        setName(''); setDosage(''); setTimes(['08:00']); setNotes('');
        setModalVisible(true);
    };

    const openEditModal = (medicine: Medicine) => {
        setEditingMedicine(medicine);
        setName(medicine.name);
        setDosage(medicine.dosage);
        setTimes([...medicine.reminderTimes]);
        setNotes(medicine.notes || '');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!user || !name.trim() || !dosage.trim() || times.length === 0) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        // Validate all time entries
        const validatedTimes: string[] = [];
        for (const t of times) {
            const valid = validateTime(t);
            if (!valid) {
                Alert.alert('Invalid Time', `"${t}" is not a valid time. Use HH:MM format (00:00 – 23:59)`);
                return;
            }
            validatedTimes.push(valid);
        }

        setSaving(true);
        try {
            const medicineData = {
                name: name.trim(),
                dosage: dosage.trim(),
                reminderTimes: validatedTimes,
                notes: notes.trim(),
            };

            let medicineId: string;
            if (editingMedicine) {
                const response = await medicineAPI.update(editingMedicine.id, user.id, medicineData);
                medicineId = response.medicine.id;
            } else {
                const response = await medicineAPI.create(user.id, medicineData);
                medicineId = response.medicine.id;
            }

            try {
                await scheduleMedicineNotifications(medicineId, medicineData.name, medicineData.dosage, medicineData.reminderTimes);
            } catch (e) {
                console.warn('Notification scheduling failed:', e);
            }

            setModalVisible(false);
            loadMedicines();
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.detail || 'Failed to save medicine');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (medicine: Medicine) => {
        Alert.alert('Delete Medicine', `Remove ${medicine.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    if (!user) return;
                    try {
                        console.log('Deleting medicine:', medicine.id, 'userId:', user.id);
                        await medicineAPI.delete(medicine.id, user.id);
                        try { await cancelMedicineNotifications(medicine.id); } catch (e) { console.warn('Cancel notif failed:', e); }
                        loadMedicines();
                    } catch (e: any) {
                        console.error('Delete error:', e?.response?.data ?? e);
                        Alert.alert('Error', e?.response?.data?.detail || 'Failed to delete medicine');
                    }
                },
            },
        ]);
    };

    const addTimeSlot = () => setTimes([...times, '08:00']);

    const removeTimeSlot = (index: number) => {
        if (times.length > 1) setTimes(times.filter((_, i) => i !== index));
    };

    const updateTime = (index: number, value: string) => {
        const newTimes = [...times];
        newTimes[index] = value;
        setTimes(newTimes);
    };

    const renderMedicineItem = ({ item }: { item: Medicine }) => (
        <TouchableOpacity style={styles.medicineCard} onPress={() => openEditModal(item)}>
            <View style={styles.medicineIcon}>
                <Ionicons name="medical" size={24} color="#6366F1" />
            </View>
            <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{item.name}</Text>
                <Text style={styles.dosage}>{item.dosage}</Text>
                <Text style={styles.frequency}>{item.reminderTimes.length}x daily · {item.reminderTimes.join(', ')}</Text>
                {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
            </View>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#6366F1" /></View>;

    return (
        <View style={styles.container}>
            <FlatList
                data={medicines}
                keyExtractor={item => item.id}
                renderItem={renderMedicineItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366F1']} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="medical-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No medicines added yet</Text>
                        <Text style={styles.emptySubtext}>Tap the + button to add your first medicine</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={openAddModal}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{editingMedicine ? 'Edit Medicine' : 'Add Medicine'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#111827" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.modalForm}>
                            <Text style={styles.label}>Medicine Name *</Text>
                            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Aspirin" placeholderTextColor="#9CA3AF" />

                            <Text style={styles.label}>Dosage *</Text>
                            <TextInput style={styles.input} value={dosage} onChangeText={setDosage} placeholder="e.g. 500mg" placeholderTextColor="#9CA3AF" />

                            <Text style={styles.label}>Reminder Times (24-hour format) *</Text>
                            <Text style={styles.hint}>Enter times like 08:00, 13:30, 21:00 (hours 0–23, minutes 0–59)</Text>

                            {times.map((time, index) => (
                                <View key={index} style={styles.timeRow}>
                                    <TextInput
                                        style={[styles.input, styles.timeInput]}
                                        value={time}
                                        onChangeText={v => updateTime(index, v)}
                                        placeholder="HH:MM"
                                        placeholderTextColor="#9CA3AF"
                                        keyboardType="numbers-and-punctuation"
                                        maxLength={5}
                                    />
                                    {times.length > 1 && (
                                        <TouchableOpacity style={styles.removeTimeButton} onPress={() => removeTimeSlot(index)}>
                                            <Ionicons name="remove-circle" size={26} color="#EF4444" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ))}

                            <TouchableOpacity style={styles.addTimeButton} onPress={addTimeSlot}>
                                <Ionicons name="add-circle" size={20} color="#6366F1" />
                                <Text style={styles.addTimeText}>Add Another Time</Text>
                            </TouchableOpacity>

                            <Text style={styles.label}>Notes (optional)</Text>
                            <TextInput
                                style={[styles.input, styles.notesInput]}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="Any special instructions"
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                            />
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave} disabled={saving}>
                                {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    medicineCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
    },
    medicineIcon: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    medicineInfo: { flex: 1 },
    medicineName: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 2 },
    dosage: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
    frequency: { fontSize: 13, color: '#6366F1', fontWeight: '500', marginBottom: 2 },
    notes: { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' },
    deleteButton: { padding: 4 },
    fab: {
        position: 'absolute', right: 16, bottom: 16,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16 },
    emptySubtext: { fontSize: 13, color: '#D1D5DB', marginTop: 6, textAlign: 'center' },
    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '92%' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
    modalForm: { padding: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
    hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10, marginTop: -4 },
    input: {
        backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, fontSize: 16,
        color: '#111827', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 14,
    },
    notesInput: { minHeight: 80, textAlignVertical: 'top' },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    timeInput: { flex: 1, marginBottom: 0 },
    removeTimeButton: { marginLeft: 10, marginBottom: 14 },
    addTimeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, marginBottom: 16 },
    addTimeText: { color: '#6366F1', fontSize: 14, fontWeight: '600', marginLeft: 8 },
    modalButtons: {
        flexDirection: 'row', padding: 20, gap: 12,
        borderTopWidth: 1, borderTopColor: '#E5E7EB',
    },
    modalButton: { flex: 1, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cancelButton: { backgroundColor: '#F3F4F6' },
    cancelButtonText: { color: '#374151', fontSize: 16, fontWeight: '600' },
    saveButton: { backgroundColor: '#6366F1' },
    saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

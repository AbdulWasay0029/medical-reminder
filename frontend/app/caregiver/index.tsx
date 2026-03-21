import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, ActivityIndicator, Modal, TextInput, BackHandler } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { guardianAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

interface Member {
    id: string;
    name: string;
    email: string;
}

export default function GuardianDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [inviteCode, setInviteCode] = useState('');
    const [linking, setLinking] = useState(false);

    const loadMembers = async () => {
        if (!user) return;
        try {
            const response = await guardianAPI.getMembers(user.id);
            setMembers(response.members);
        } catch {
            Alert.alert('Error', 'Failed to load family members');
        } finally {
            setLoading(false); refreshing && setRefreshing(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const onBackPress = () => true;
            const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
            return () => subscription.remove();
        }, [])
    );

    useEffect(() => { loadMembers(); }, [user]);

    const onRefresh = useCallback(() => { setRefreshing(true); loadMembers(); }, [user]);

    const handleLinkMember = async () => {
        if (!user || !inviteCode.trim()) {
            Alert.alert('Error', 'Please enter the invite code');
            return;
        }
        setLinking(true);
        try {
            await guardianAPI.linkMember(user.id, inviteCode.trim());
            setModalVisible(false);
            setInviteCode('');
            loadMembers();
            Alert.alert('Linked!', 'Family member linked successfully');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.detail || 'Failed to link family member');
        } finally {
            setLinking(false);
        }
    };

    const handleUnlinkMember = (member: Member) => {
        Alert.alert(
            'Unlink Member',
            `Remove ${member.name} from your list?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await guardianAPI.unlinkMember(user!.id, member.id);
                            loadMembers();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to unlink member');
                        }
                    }
                }
            ]
        );
    };

    const renderMemberItem = ({ item }: { item: Member }) => (
        <TouchableOpacity
            style={styles.memberCard}
            onPress={() => router.push(`/caregiver/member/${item.id}`)}
        >
            <View style={styles.memberIcon}>
                <Ionicons name="person" size={28} color="#10B981" />
            </View>
            <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
            </View>
            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleUnlinkMember(item)}
            >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
    );

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#10B981" /></View>;

    return (
        <View style={styles.container}>
            <View style={{ height: 16 }} />

            <FlatList
                data={members}
                keyExtractor={item => item.id}
                renderItem={renderMemberItem}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#10B981']} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                        <Text style={styles.emptyText}>No family members linked yet</Text>
                        <Text style={styles.emptySubtext}>Ask your family member for their invite code and tap the + button</Text>
                    </View>
                }
            />

            <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                <Ionicons name="add" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Link Family Member</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#111827" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            <Text style={styles.modalDescription}>
                                Enter the 6-digit invite code shared by your family member
                            </Text>
                            <TextInput
                                style={styles.codeInput}
                                value={inviteCode}
                                onChangeText={setInviteCode}
                                placeholder="000000"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="number-pad"
                                maxLength={6}
                            />
                            <TouchableOpacity
                                style={[styles.linkButton, linking && styles.linkButtonDisabled]}
                                onPress={handleLinkMember}
                                disabled={linking}
                            >
                                {linking
                                    ? <ActivityIndicator color="#FFFFFF" />
                                    : <>
                                        <Ionicons name="link" size={20} color="#FFFFFF" />
                                        <Text style={styles.linkButtonText}>Link Family Member</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: 16 },
    memberCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB',
    },
    memberIcon: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center', marginRight: 14,
    },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 3 },
    memberEmail: { fontSize: 13, color: '#6B7280' },
    deleteButton: { padding: 8, marginRight: 4 },
    fab: {
        position: 'absolute', right: 16, bottom: 16,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, color: '#9CA3AF', marginTop: 16 },
    emptySubtext: { fontSize: 13, color: '#D1D5DB', marginTop: 6, textAlign: 'center', paddingHorizontal: 32 },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, width: '85%', maxWidth: 400 },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    modalBody: { padding: 20 },
    modalDescription: { fontSize: 14, color: '#6B7280', marginBottom: 16, textAlign: 'center' },
    codeInput: {
        backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16,
        fontSize: 32, fontWeight: 'bold', color: '#111827',
        textAlign: 'center', letterSpacing: 8, borderWidth: 2,
        borderColor: '#10B981', marginBottom: 20,
    },
    linkButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#10B981', borderRadius: 12, padding: 16, gap: 8,
    },
    linkButtonDisabled: { opacity: 0.6 },
    linkButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

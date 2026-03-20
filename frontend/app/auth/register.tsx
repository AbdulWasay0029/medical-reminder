import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    KeyboardAvoidingView, Platform, TextInput,
    TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const { login } = useAuth();
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'member' | 'guardian'>('member');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const { authAPI } = require('../../services/api');
            const response = await authAPI.register(
                name.trim(),
                email.toLowerCase().trim(),
                password,
                role
            );
            await login(response.token, response.user);
            
            if (role === 'guardian') {
                router.replace('/caregiver');
            } else {
                router.replace('/patient');
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.response?.data?.detail || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Ionicons name="medical" size={64} color="#6366F1" />
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join HealthSync today</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            value={name}
                            onChangeText={setName}
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            placeholderTextColor="#9CA3AF"
                        />
                    </View>

                    <View style={styles.roleContainer}>
                        <Text style={styles.roleLabel}>I am a:</Text>
                        <View style={styles.roleButtons}>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'member' && styles.roleButtonActive]}
                                onPress={() => setRole('member')}
                            >
                                <Ionicons name="person" size={20} color={role === 'member' ? '#FFFFFF' : '#6366F1'} />
                                <Text style={[styles.roleButtonText, role === 'member' && styles.roleButtonTextActive]}>Patient</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.roleButton, role === 'guardian' && styles.roleButtonActive]}
                                onPress={() => setRole('guardian')}
                            >
                                <Ionicons name="shield" size={20} color={role === 'guardian' ? '#FFFFFF' : '#10B981'} />
                                <Text style={[styles.roleButtonText, role === 'guardian' && styles.roleButtonTextActive]}>Guardian</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text style={styles.buttonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.push('/auth/login')}>
                            <Text style={styles.link}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContent: { flexGrow: 1, padding: 24, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 32 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#111827', marginTop: 16 },
    subtitle: { fontSize: 16, color: '#6B7280', marginTop: 8 },
    form: { gap: 16 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F9FAFB', borderRadius: 12,
        borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 16,
    },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, height: 56, fontSize: 16, color: '#111827' },
    roleContainer: { marginTop: 8 },
    roleLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
    roleButtons: { flexDirection: 'row', gap: 12 },
    roleButton: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 50, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8,
    },
    roleButtonActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    roleButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
    roleButtonTextActive: { color: '#FFFFFF' },
    button: {
        backgroundColor: '#6366F1', height: 56, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center', marginTop: 8,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
    footerText: { color: '#6B7280', fontSize: 14 },
    link: { color: '#6366F1', fontSize: 14, fontWeight: 'bold' },
});

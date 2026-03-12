import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'member' | 'guardian'>('member');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            const response = await authAPI.register(name.trim(), email.trim(), password, role);
            await login(response.token, response.user);

            if (role === 'member') {
                router.replace('/patient');
            } else {
                router.replace('/caregiver');
            }
        } catch (error: any) {
            Alert.alert('Registration Failed', error.response?.data?.detail || 'Please try again');
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
                    <Text style={styles.subtitle}>Join MediRemind today</Text>
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

                    <Text style={styles.roleLabel}>I am a:</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleButton, role === 'member' && styles.roleButtonActive]}
                            onPress={() => setRole('member')}
                        >
                            <Ionicons name="person" size={24} color={role === 'member' ? '#FFFFFF' : '#6366F1'} />
                            <Text style={[styles.roleText, role === 'member' && styles.roleTextActive]}>
                                Family Member
                            </Text>
                            <Text style={styles.roleSubtext}>takes medicines</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleButton, role === 'guardian' && styles.roleButtonActive]}
                            onPress={() => setRole('guardian')}
                        >
                            <Ionicons name="shield-checkmark" size={24} color={role === 'guardian' ? '#FFFFFF' : '#6366F1'} />
                            <Text style={[styles.roleText, role === 'guardian' && styles.roleTextActive]}>
                                Family Guardian
                            </Text>
                            <Text style={[styles.roleSubtext, role === 'guardian' && { color: '#C7D2FE' }]}>monitors family</Text>
                        </TouchableOpacity>
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
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text style={styles.link}>Sign In</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 16,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 8,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        height: 52,
        fontSize: 16,
        color: '#111827',
    },
    roleLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 12,
    },
    roleContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    roleButton: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    roleButtonActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1',
    },
    roleText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#6366F1',
        textAlign: 'center',
    },
    roleSubtext: {
        fontSize: 11,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 2,
    },
    roleTextActive: {
        color: '#FFFFFF',
    },
    button: {
        backgroundColor: '#6366F1',
        borderRadius: 12,
        height: 52,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 14,
    },
    link: {
        color: '#6366F1',
        fontSize: 14,
        fontWeight: '600',
    },
});

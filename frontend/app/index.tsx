import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (user) {
                if (user.role === 'member' || user.role === 'patient') {
                    router.replace('/patient');
                } else {
                    router.replace('/caregiver');
                }
            } else {
                router.replace('/auth/login');
            }
        }
    }, [user, isLoading]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.text}>Loading...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    text: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
});

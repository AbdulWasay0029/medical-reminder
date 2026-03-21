import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function CaregiverLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#10B981',
                tabBarInactiveTintColor: '#9CA3AF',
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    borderTopColor: '#E5E7EB',
                    borderTopWidth: 1,
                    paddingTop: 8,
                    paddingBottom: 24,
                },
                headerStyle: { backgroundColor: '#10B981' },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: { fontWeight: 'bold' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'My Family',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
                }}
            />
            {/* Hide dynamic detail routes from the tab bar but keep headers */}
            <Tabs.Screen
                name="member/[id]"
                options={{
                    href: null,
                    headerShown: true,
                    title: 'Member Schedule',
                    headerLeft: () => (
                        <TouchableOpacity style={{ marginLeft: 16 }} onPress={() => require('expo-router').router.back()}>
                            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                        </TouchableOpacity>
                    ),
                }}
            />
        </Tabs>
    );
}

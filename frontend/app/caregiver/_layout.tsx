import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
                    paddingBottom: 24, // Increased padding to clear on-screen buttons
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
            {/* Hide dynamic detail routes from the tab bar */}
            <Tabs.Screen
                name="member/[id]"
                options={{
                    href: null,
                    headerShown: true,
                    title: 'Family Member',
                }}
            />
            <Tabs.Screen
                name="patient/[id]"
                options={{
                    href: null,
                    headerShown: true,
                    title: 'Family Member',
                }}
            />
        </Tabs>
    );
}

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://mediremind-backend.vercel.app';

const api = axios.create({
    baseURL: `${API_URL}/api/`,
    headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

const tzOffset = () => new Date().getTimezoneOffset(); // e.g. -330 for IST

// Auth
export const authAPI = {
    register: async (name: string, email: string, password: string, role: string) =>
        (await api.post('auth/register', { name, email, password, role })).data,
    login: async (email: string, password: string) =>
        (await api.post('auth/login', { email, password })).data,
};

// Medicines
export const medicineAPI = {
    getAll: async (userId: string) =>
        (await api.get(`medicines/my?user_id=${userId}`)).data,
    create: async (userId: string, data: any) =>
        (await api.post(`medicines?user_id=${userId}`, data)).data,
    update: async (medicineId: string, userId: string, data: any) =>
        (await api.put(`medicines/${medicineId}?user_id=${userId}`, data)).data,
    delete: async (medicineId: string, userId: string) =>
        (await api.delete(`medicines/${medicineId}?user_id=${userId}`)).data,
};

// Dashboard + Logs
export const doseAPI = {
    getDashboard: async (patientId: string) =>
        (await api.get(`dashboard/${patientId}?tz_offset=${tzOffset()}`)).data,
    markTaken: async (medicineId: string, date: string, scheduledTime: string, userId: string) =>
        (await api.post(`logs/mark-taken?user_id=${userId}`, { medicineId, date, scheduledTime })).data,
    getHistory: async (patientId: string, days: number = 7) =>
        (await api.get(`logs/history/${patientId}?days=${days}&tz_offset=${tzOffset()}`)).data,
};

// Guardian
export const guardianAPI = {
    linkMember: async (userId: string, inviteCode: string) =>
        (await api.post(`guardian/link?user_id=${userId}`, { inviteCode })).data,
    getMembers: async (userId: string) =>
        (await api.get(`guardian/members?user_id=${userId}`)).data,
    getMemberMedicines: async (userId: string, memberId: string) =>
        (await api.get(`guardian/member/${memberId}/medicines?user_id=${userId}`)).data,
    getMemberDashboard: async (userId: string, memberId: string) =>
        (await api.get(`guardian/member/${memberId}/dashboard?user_id=${userId}&tz_offset=${tzOffset()}`)).data,
};

// Member
export const memberAPI = {
    getProfile: async (userId: string) =>
        (await api.get(`members/me?user_id=${userId}`)).data,
    regenerateCode: async (userId: string) =>
        (await api.post(`members/regenerate-code?user_id=${userId}`)).data,
};

export default api;

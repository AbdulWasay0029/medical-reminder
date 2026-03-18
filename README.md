# 🏥 HealthSync: Premium Medical Assistant (Vercel + Python Architecture)

**HealthSync** is a world-class, premium medical assistant designed for sophisticated medication management and automated treatment monitoring. This flagship version utilizes a dedicated Python backend to handle advanced time-based logic and treatment course duration.

---

## 🏆 Flagship Features
- **Smart Treatment Windows:** Automatically schedules reminders between a specific `startDate` and `endDate`. Hides expired medicines from the dashboard automatically.
- **High-End "Vercel" UI:** A modern, minimalist aesthetic using the Indigo (`#6366F1`) and Emerald (`#10B981`) brand palette.
- **Family Dashboard Handshake:** Intuitive 6-digit invite code system for linking family members securely across complex backend infrastructures.
- **Exact-Alarm Trigger Engine:** Bypasses OS limitations for high-reliability medical notifications.
- **Universal Time Normalizer:** A deterministic 24-hour time engine that ensures perfect scheduling regardless of device locale.

## 🛡️ Technical Stack
- **Frontend:** React Native (Expo)
- **Backend Architecture:** Python (FastAPI) deployed on Vercel
- **Database:** MongoDB Atlas (NoSQL)
- **State Management:** Context API + Axios Interceptors
- **Authentication:** JWT (JSON Web Tokens) with Secure Token Storage

---

## 📦 Project Structure
```text
/backend    -> FastAPI Python Server (Vercel Ready)
/frontend   -> Expo (React Native) Mobile Application
```

---

## 🔄 Installation & Setup

### **A. Backend (Python)**
1. Navigate to `/backend`
2. Create a `.env` file with `MONGO_URL` and `SECRET_KEY`.
3. Install dependencies: `pip install -r requirements.txt`
4. Run locally: `uvicorn server:app --reload`

### **B. Frontend (Expo)**
1. Navigate to `/frontend`
2. Set `EXPO_PUBLIC_BACKEND_URL` in your `.env` to your backend URL.
3. Install dependencies: `npm install`
4. Run locally: `npm run start`

---

## 🧩 Architectural Highlights
This version of HealthSync uses a **Stateless API** design, where the Python server calculates the daily schedule for each patient by factoring in their timezone offset and treatment window. This reduces phone-side processing and ensures "One Source of Truth" for both patients and guardians.

## 🎨 Design Philosophy
Inspired by **Next.js and Apple Health**, the UI focuses on clarity, calmness, and professional trust. Every micro-animation and layout choice is optimized for users who need critical information at a glance.

---

**State-of-the-Art Medication Monitoring.**
**Author:** Antigravity AI Engine

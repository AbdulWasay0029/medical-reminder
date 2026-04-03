# HealthSync — Medication Reminder & Family Monitor

A cross-platform mobile application for medication adherence and real-time family monitoring.

## Roles
- **Patient / Member** — manages medicines, receives alarms, gets an invite code
- **Guardian / Caregiver** — links via invite code, monitors patient's daily schedule (read-only)

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native + Expo (TypeScript) |
| Backend API | Python (FastAPI 0.110.0) |
| Database | MongoDB Atlas |
| Auth | JWT (python-jose) + Bcrypt |
| Notifications | expo-notifications (local, daily, MAX priority) |
| HTTP Client | Axios + AsyncStorage (JWT interceptor) |

## Project Structure
```
/backend    → FastAPI Python server (server.py)
/frontend   → Expo React Native app
```

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
# create .env with MONGO_URL, SECRET_KEY, DB_NAME
uvicorn server:app --reload
```

### Frontend
```bash
cd frontend
npm install
# create .env with EXPO_PUBLIC_BACKEND_URL
npm run start
```

## Key Features
- **Exact Alarm Scheduling** — `AndroidImportance.MAX` channel, bypasses Doze mode
- **Smart Treatment Window** — medicines auto-hide outside `startDate`/`endDate`
- **60-Minute Grace Period** — server marks a dose as "missed" exactly 60 min after scheduled time
- **6-Digit Invite Code** — collision-resistant code links Guardian to Patient
- **Timezone-Aware Dashboard** — frontend sends `tz_offset`, server computes correct "today"

## Documentation
See [`GROUND_TRUTH.md`](./GROUND_TRUTH.md) for the complete technical reference — exact data models, API routes, UI logic, and color palette — used by the team for generating diagrams and reports.

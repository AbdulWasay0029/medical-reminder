from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict, Union
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt
import random
import string
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017/')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'mediremind')]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("SECRET_KEY", "change-me-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
GRACE_PERIOD_MINUTES = 60  # how long after scheduled time before → missed

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
logger = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def hash_password(p): return pwd_context.hash(p)
def verify_password(plain, hashed): return pwd_context.verify(plain, hashed)

def make_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def make_invite_code():
    return ''.join(random.choices(string.digits, k=6))

def sdoc(doc: Union[dict, list, Any]) -> Any:
    """Recursively serialize a MongoDB document to JSON-safe dict."""
    if doc is None: return None
    if isinstance(doc, list): return [sdoc(d) for d in doc]
    if isinstance(doc, dict):
        out: Dict[str, Any] = {}
        for k, v in doc.items():
            key = str('id' if k == '_id' else k)
            if isinstance(v, ObjectId): out[key] = str(v)
            elif isinstance(v, datetime): out[key] = v.isoformat()
            elif isinstance(v, (dict, list)): out[key] = sdoc(v)
            else: out[key] = v
        return out
    return doc if not isinstance(doc, ObjectId) else str(doc)

def compute_status(log: Optional[dict], sched_h: int, sched_m: int, local_now: datetime) -> str:
    """
    Status rules (only pending / taken / missed — no 'upcoming' or 'scheduled'):
      taken      → if log.status == taken
      pending    → if now < scheduledTime  OR  now ≤ scheduledTime + GRACE
      missed     → otherwise
    """
    if log and log.get("status") == "taken":
        return "taken"
    today = local_now.date()
    sched_dt = datetime(today.year, today.month, today.day, sched_h, sched_m)
    if local_now <= sched_dt + timedelta(minutes=GRACE_PERIOD_MINUTES):
        return "pending"
    return "missed"


# ── Pydantic models ───────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str  # "member" | "guardian"

class UserLogin(BaseModel) :
    email: EmailStr
    password: str

class MedicineCreate(BaseModel):
    name: str
    dosage: str
    reminderTimes: List[str]   # ["08:00", "20:00"]
    startDate: Optional[str] = None # "YYYY-MM-DD"
    endDate: Optional[str] = None   # "YYYY-MM-DD"
    notes: Optional[str] = None

class MedicineUpdate(BaseModel):
    name: Optional[str] = None
    dosage: Optional[str] = None
    reminderTimes: Optional[List[str]] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    notes: Optional[str] = None

class MarkTakenRequest(BaseModel):
    medicineId: str
    date: str          # "YYYY-MM-DD" local date
    scheduledTime: str # "HH:MM"

class GuardianLinkRequest(BaseModel):
    inviteCode: str


# ── Auth ──────────────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(body: UserRegister):
    try:
        if await db.users.find_one({"email": body.email}):
            raise HTTPException(400, "Email already registered")
        doc = {
            "name": body.name, "email": body.email,
            "password": hash_password(body.password),
            "role": body.role, "createdAt": datetime.utcnow()
        }
        if body.role in ("member", "patient"):
            doc["inviteCode"] = make_invite_code()
        res = await db.users.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"token": make_token({"sub": str(res.inserted_id)}), "user": sdoc(doc)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"register: {e}"); raise HTTPException(500, str(e))

@api_router.post("/auth/login")
async def login(body: UserLogin):
    try:
        user = await db.users.find_one({"email": body.email})
        if not user or not verify_password(body.password, user["password"]):
            raise HTTPException(401, "Invalid credentials")
        return {"token": make_token({"sub": str(user["_id"])}), "user": sdoc(user)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"login: {e}"); raise HTTPException(500, str(e))


# ── Medicines ─────────────────────────────────────────────────────────────────

@api_router.post("/medicines")
async def create_medicine(body: MedicineCreate, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        doc = {
            "patientId": user_id,
            "name": body.name, "dosage": body.dosage,
            "reminderTimes": body.reminderTimes,
            "startDate": body.startDate,
            "endDate": body.endDate,
            "notes": body.notes or "",
            "createdAt": datetime.utcnow()
        }
        res = await db.medicines.insert_one(doc)
        doc["_id"] = res.inserted_id
        return {"success": True, "medicine": sdoc(doc)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"create_medicine: {e}"); raise HTTPException(500, str(e))

@api_router.get("/medicines/my")
async def get_my_medicines(user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        meds = await db.medicines.find({"patientId": user_id}).to_list(1000)
        return {"medicines": sdoc(meds)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_medicines: {e}"); raise HTTPException(500, str(e))

@api_router.put("/medicines/{medicine_id}")
async def update_medicine(medicine_id: str, body: MedicineUpdate, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        med = await db.medicines.find_one({"_id": ObjectId(medicine_id)})
        if not med: raise HTTPException(404, "Medicine not found")
        if str(med.get("patientId")) != user_id: raise HTTPException(403, "Not authorized")
        update = {k: v for k, v in body.dict().items() if v is not None}
        await db.medicines.update_one({"_id": ObjectId(medicine_id)}, {"$set": update})
        updated = await db.medicines.find_one({"_id": ObjectId(medicine_id)})
        return {"success": True, "medicine": sdoc(updated)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"update_medicine: {e}"); raise HTTPException(500, str(e))

@api_router.delete("/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        med = await db.medicines.find_one({"_id": ObjectId(medicine_id)})
        if not med: raise HTTPException(404, "Medicine not found")
        if str(med.get("patientId")) != user_id: raise HTTPException(403, "Not authorized")
        await db.medicines.delete_one({"_id": ObjectId(medicine_id)})
        await db.logs.delete_many({"medicineId": medicine_id})
        return {"success": True}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"delete_medicine: {e}"); raise HTTPException(500, str(e))


# ── Dashboard (single source of truth) ───────────────────────────────────────

@api_router.get("/dashboard/{patient_id}")
async def get_dashboard(patient_id: str, tz_offset: int = 0):
    try:
        utc_now = datetime.utcnow()
        local_now = utc_now - timedelta(minutes=tz_offset)
        today_str = local_now.strftime("%Y-%m-%d")

        medicines = await db.medicines.find({"patientId": patient_id}).to_list(1000)
        today_logs = await db.logs.find(
            {"patientId": patient_id, "date": today_str}
        ).to_list(1000)
        log_index = {(l["medicineId"], l["scheduledTime"]): l for l in today_logs}

        items = []
        for med in medicines:
            med_id = str(med["_id"])
            start = med.get("startDate")
            end = med.get("endDate")
            
            if start and today_str < start: continue
            if end and today_str > end: continue
            
            for t in med.get("reminderTimes", []):
                h, m = map(int, t.split(":"))
                log = log_index.get((med_id, t))
                status = compute_status(log, h, m, local_now)

                if status == "missed" and (log is None or log.get("status") not in ("taken", "missed")):
                    await db.logs.update_one(
                        {"medicineId": med_id, "patientId": patient_id, "date": today_str, "scheduledTime": t},
                        {"$set": {"status": "missed", "takenAt": None, "updatedAt": datetime.utcnow()}},
                        upsert=True
                    )

                items.append({
                    "id": f"{med_id}_{today_str}_{t}",
                    "medicineId": med_id,
                    "name": med["name"],
                    "dosage": med["dosage"],
                    "scheduledTime": t,
                    "date": today_str,
                    "status": status,
                    "takenAt": log["takenAt"].isoformat() if log and log.get("takenAt") else None,
                })

        # Fetch patient name
        patient = await db.users.find_one({"_id": ObjectId(patient_id)})
        patient_name = patient.get("name", "Unknown") if patient else "Unknown"

        items.sort(key=lambda x: x["scheduledTime"])
        return {"items": items, "date": today_str, "patient_name": patient_name}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_dashboard: {e}"); raise HTTPException(500, str(e))


# ── Logs (mark taken / history) ───────────────────────────────────────────────

@api_router.post("/logs/mark-taken")
async def mark_taken(body: MarkTakenRequest, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        await db.logs.update_one(
            {
                "medicineId": body.medicineId, "patientId": user_id,
                "date": body.date, "scheduledTime": body.scheduledTime
            },
            {
                "$set": {
                    "status": "taken", "takenAt": datetime.utcnow(), "updatedAt": datetime.utcnow()
                }
            },
            upsert=True
        )
        return {"success": True}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"mark_taken: {e}"); raise HTTPException(500, str(e))

@api_router.get("/logs/history/{patient_id}")
async def get_history(patient_id: str, days: int = 7, tz_offset: int = 0):
    try:
        utc_now = datetime.utcnow()
        local_now = utc_now - timedelta(minutes=tz_offset)
        dates = [(local_now - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

        logs = await db.logs.find(
            {"patientId": patient_id, "date": {"$in": dates}}
        ).sort("date", -1).to_list(1000)

        enriched = []
        med_cache = {}
        for log in logs:
            mid = log["medicineId"]
            if mid not in med_cache:
                med = await db.medicines.find_one({"_id": ObjectId(mid)}) if ObjectId.is_valid(mid) else None
                med_cache[mid] = med
            med = med_cache[mid]
            entry = sdoc(log)
            entry["medicineName"] = med["name"] if med else "Unknown"
            entry["dosage"] = med["dosage"] if med else ""
            enriched.append(entry)

        return {"logs": enriched}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_history: {e}"); raise HTTPException(500, str(e))


# ── Guardian ──────────────────────────────────────────────────────────────────

@api_router.post("/guardian/link")
async def link_guardian(body: GuardianLinkRequest, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        member = await db.users.find_one({"inviteCode": body.inviteCode, "role": {"$in": ["member", "patient"]}})
        if not member: raise HTTPException(404, "Invalid invite code")
        member_id = str(member["_id"])
        existing = await db.guardian_links.find_one({"guardianId": user_id, "memberId": member_id})
        if existing: raise HTTPException(400, "Already linked to this family member")
        await db.guardian_links.insert_one({
            "guardianId": user_id, "memberId": member_id, "linkedAt": datetime.utcnow()
        })
        return {"success": True, "member": sdoc(member)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"link_guardian: {e}"); raise HTTPException(500, str(e))

@api_router.delete("/guardian/unlink/{member_id}")
async def unlink_guardian(member_id: str, user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        logger.info(f"Unlink Attempt: guardianId={user_id}, memberId={member_id}")
        
        # Trim whitespace just in case
        gid = user_id.strip()
        mid = member_id.strip()
        
        res = await db.guardian_links.delete_one({"guardianId": gid, "memberId": mid})
        logger.info(f"Unlink Result: {res.deleted_count} removed")
        return {"success": True}
    except Exception as e:
        logger.error(f"unlink_guardian: {e}"); raise HTTPException(500, str(e))

@api_router.get("/guardian/members")
async def get_guardian_members(user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        links = await db.guardian_links.find({"guardianId": user_id}).to_list(1000)
        members = []
        for link in links:
            member = await db.users.find_one({"_id": ObjectId(link["memberId"])})
            if member: members.append(sdoc(member))
        return {"members": members}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_guardian_members: {e}"); raise HTTPException(500, str(e))

@api_router.get("/guardian/member/{member_id}/dashboard")
async def get_member_dashboard(member_id: str, user_id: Optional[str] = None, tz_offset: int = 0):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        link = await db.guardian_links.find_one({"guardianId": user_id, "memberId": member_id})
        if not link: raise HTTPException(403, "Access denied")
        return await get_dashboard(member_id, tz_offset)
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_member_dashboard: {e}"); raise HTTPException(500, str(e))


# ── Member (patient) ──────────────────────────────────────────────────────────

@api_router.get("/members/me")
async def get_member_profile(user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if not user: raise HTTPException(404, "User not found")
        return {"user": sdoc(user)}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"get_profile: {e}"); raise HTTPException(500, str(e))

@api_router.post("/members/regenerate-code")
async def regenerate_invite_code(user_id: Optional[str] = None):
    try:
        if not user_id: raise HTTPException(401, "user_id required")
        new_code = make_invite_code()
        result = await db.users.update_one(
            {"_id": ObjectId(user_id), "role": {"$in": ["member", "patient"]}},
            {"$set": {"inviteCode": new_code}}
        )
        if result.modified_count == 0:
            raise HTTPException(404, "Member account not found (wrong role?)")
        return {"success": True, "inviteCode": new_code}
    except HTTPException: raise
    except Exception as e:
        logger.error(f"regenerate_code: {e}"); raise HTTPException(500, str(e))


# ── App setup ─────────────────────────────────────────────────────────────────

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown(): client.close()

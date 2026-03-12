import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

async def main():
    mongo_url = os.environ.get('MONGO_URL')
    print(f"Connecting to: {mongo_url}")
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'mediremind')]
    
    print("--- USERS ---")
    async for u in db.users.find(): print(u)
    
    print("\n--- MEDICINES ---")
    async for m in db.medicines.find(): print(m)
    
    print("\n--- LOGS ---")
    async for l in db.logs.find(): print(l)
    
    print("\n--- GUARDIAN LINKS ---")
    async for l in db.guardian_links.find(): print(l)

asyncio.run(main())

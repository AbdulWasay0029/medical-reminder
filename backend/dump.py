from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["mediremind"]

print("--- USERS ---")
for u in db.users.find():
    print(u)

print("\n--- MEDICINES ---")
for m in db.medicines.find():
    print(m)

print("\n--- LOGS ---")
for l in db.logs.find():
    print(l)

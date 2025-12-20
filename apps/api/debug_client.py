
import requests
import sqlite3
import time
import os

API_URL = "http://localhost:8000"
EMAIL = "raviyeluru@yahoo.com"

# 1. Request OTP
print(f"1. Requesting OTP for {EMAIL}...")
r = requests.post(f"{API_URL}/auth/otp/request", json={"email": EMAIL, "type": 'login'})
print(f"   Status: {r.status_code}, Response: {r.text}")

if r.status_code != 200:
    print("❌ Failed to request OTP")
    exit(1)

# 2. Get OTP from DB (Simulating email check)
print("2. Fetching OTP from database...")
conn = sqlite3.connect('vibeknowing.db')
cursor = conn.cursor()
cursor.execute("SELECT code FROM otps WHERE email = ? ORDER BY created_at DESC LIMIT 1", (EMAIL,))
row = cursor.fetchone()
if not row:
    print("❌ OTP not found in DB")
    exit(1)
otp_code = row[0]
print(f"   Found OTP: {otp_code}")
conn.close()

# 3. Verify OTP & Get Token
print("3. Verifying OTP...")
r = requests.post(f"{API_URL}/auth/otp/verify", json={"email": EMAIL, "code": otp_code})
print(f"   Status: {r.status_code}")
if r.status_code != 200:
    print(f"❌ Verification failed: {r.text}")
    exit(1)

token = r.json().get("access_token")
print(f"   ✅ Got Token: {token[:10]}...")

# 4. List Projects
print("4. Listing Projects...")
headers = {"Authorization": f"Bearer {token}"}
r = requests.get(f"{API_URL}/sources/projects", headers=headers)
print(f"   Status: {r.status_code}")
print(f"   Response: {r.json()}")

if r.status_code == 200 and isinstance(r.json(), list):
    print(f"   ✅ Found {len(r.json())} projects.")
else:
    print("❌ Failed to list projects.")

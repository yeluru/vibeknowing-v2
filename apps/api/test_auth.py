import requests
import sys

BASE_URL = "http://localhost:8000"

def test_auth():
    print("Testing Backend Auth Flow...")
    
    # 1. Signup
    email = "test_auth@example.com"
    password = "password123"
    
    print(f"1. Attempting Signup for {email}...")
    signup_resp = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "password": password,
        "full_name": "Test User"
    })
    
    if signup_resp.status_code == 200:
        print("   Signup Success!")
        token = signup_resp.json()["access_token"]
    else:
        # If user exists, try login
        print(f"   Signup failed ({signup_resp.status_code}: {signup_resp.text}). Trying login...")
        login_resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": email,
            "password": password
        })
        if login_resp.status_code == 200:
             print("   Login Success!")
             token = login_resp.json()["access_token"]
        else:
             print(f"   Login failed: {login_resp.text}")
             sys.exit(1)

    print(f"   Token received: {token[:20]}...")

    # 2. Access Protected Route
    print("2. Testing Protected Route (/sources/projects/)...")
    headers = {"Authorization": f"Bearer {token}"}
    protected_resp = requests.get(f"{BASE_URL}/sources/projects/", headers=headers)
    
    if protected_resp.status_code == 200:
        print("   Protected Route Access Success!")
        print(f"   Projects: {protected_resp.json()}")
    else:
        print(f"   Protected Route Failed: {protected_resp.status_code} - {protected_resp.text}")
        sys.exit(1)

    print("Backend Auth Verification Passed!")

if __name__ == "__main__":
    try:
        test_auth()
    except Exception as e:
        print(f"Test Failed: {e}")
        sys.exit(1)

"""End-to-end API tests for POST /admin/subjects."""
import sys
import time
import requests

BASE = "http://127.0.0.1:8000"

# ── 1. Obtain admin JWT ────────────────────────────────────────────────────────
login_resp = requests.post(
    f"{BASE}/auth/login",
    json={"email": "admin@mitmysore.ac.in", "password": "Admin@123", "role": "admin"},
    timeout=10,
)
if login_resp.status_code != 200:
    print(f"FAIL  Admin login: {login_resp.status_code} {login_resp.text}")
    sys.exit(1)
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print("PASS  Admin login")

ENDPOINT = f"{BASE}/admin/subjects"

# ── 2. Valid subject insertion ─────────────────────────────────────────────────
payload = {
    "subject_name": "Data Structures",
    "subject_code": "TEST_DS_001",
    "credit": 4,
    "semester": 1,
    "department": "MCA",
}
resp = requests.post(ENDPOINT, json=payload, headers=headers, timeout=10)
if resp.status_code == 201:
    data = resp.json()
    print(f"PASS  Valid insertion: subject_id={data.get('subject_id')}, code={data.get('subject_code')}")
else:
    print(f"FAIL  Valid insertion: {resp.status_code} {resp.text}")
    sys.exit(1)

# ── 3. Duplicate subject code ──────────────────────────────────────────────────
resp_dup = requests.post(ENDPOINT, json=payload, headers=headers, timeout=10)
if resp_dup.status_code == 409:
    print("PASS  Duplicate subject code → 409 Conflict")
else:
    print(f"FAIL  Duplicate handling: expected 409, got {resp_dup.status_code} {resp_dup.text}")

# ── 4. Missing required field (subject_name too short) ────────────────────────
bad = {**payload, "subject_name": "X"}
resp_bad = requests.post(ENDPOINT, json=bad, headers=headers, timeout=10)
if resp_bad.status_code == 422:
    print("PASS  Validation (short subject_name) → 422")
else:
    print(f"FAIL  Validation: expected 422, got {resp_bad.status_code}")

# ── 5. Missing department field ───────────────────────────────────────────────
no_dept = {k: v for k, v in payload.items() if k != "department"}
no_dept["subject_code"] = "TEST_DS_002"
resp_nd = requests.post(ENDPOINT, json=no_dept, headers=headers, timeout=10)
if resp_nd.status_code == 422:
    print("PASS  Missing department → 422")
else:
    print(f"FAIL  Missing department: expected 422, got {resp_nd.status_code}")

# ── 6. Unauthenticated request ────────────────────────────────────────────────
resp_unauth = requests.post(ENDPOINT, json={**payload, "subject_code": "TEST_DS_003"}, timeout=10)
if resp_unauth.status_code == 401:
    print("PASS  No auth → 401")
else:
    print(f"FAIL  Auth check: expected 401, got {resp_unauth.status_code}")

print("\nAll tests complete.")

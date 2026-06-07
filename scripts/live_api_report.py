"""Live API smoke test — real infrastructure, no mocks.  Prints report."""
import sys, traceback
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from fastapi.testclient import TestClient
from backend.main import app
from backend.auth import get_current_user

DEV_UUID = "2c9fb7be-d653-45e5-ad96-b0045493f0b2"
DEV_CV_ID = "977f4c8b-64ab-40eb-8d35-08feb57ddae0"

# Override auth to return a real UUID so Supabase doesn't reject demo_user_123.
# This affects all endpoints that filter by user_id on real UUID columns.
async def _override_user():
    return type("User", (), {"id": DEV_UUID, "email": "demo@careerpilot.ai"})

app.dependency_overrides[get_current_user] = _override_user

client = TestClient(app)
ok, fail = 0, 0

def report(label, fn):
    global ok, fail
    try:
        result = fn()
        passed, detail = result
    except Exception as e:
        passed = False
        detail = f"EXCEPTION: {e}"
        traceback.print_exc()
    if passed:
        ok += 1
        print(f"  [OK]   {label}")
    else:
        fail += 1
        print(f"  [FAIL]  {label}")
    if detail:
        print(f"         {detail}")

# 1. Health
report("GET /health", lambda: (
    client.get("/health").status_code == 200, ""))

# 2. Settings
report("GET /api/settings", lambda: (
    client.get("/api/settings").status_code == 200, ""))

# 3. Job search
report("GET /api/jobs/search", lambda: (
    (r := client.get("/api/jobs/search", params={"q": "python developer", "location": "bd"})).status_code == 200,
    f"{r.status_code} jobs={len(r.json().get('jobs', []))}" ))

# 4. Chat
report("POST /api/chat/message", lambda: (
    (r := client.post("/api/chat/message", json={"content": "Give me one tip"})).status_code == 200 and bool(r.json().get("answer","")),
    f"{r.status_code} ans_len={len(r.json().get('answer',''))}" ))

# 5. Todos CRUD
report("POST /api/tracker/todos", lambda: (
    (r := client.post("/api/tracker/todos", json={"title": "TEST-todo"})).status_code == 201,
    str(r.status_code) ))
tid = None
try:
    r = client.post("/api/tracker/todos", json={"title": "TEST-todo-2"})
    if r.status_code == 201:
        tid = r.json().get("id", "")
except: pass
if tid:
    report(f"PATCH /api/tracker/todos/{tid[:8]}...", lambda: (
        client.patch(f"/api/tracker/todos/{tid}", json={"done": True}).status_code == 200, ""))
    report(f"DELETE /api/tracker/todos/{tid[:8]}...", lambda: (
        client.delete(f"/api/tracker/todos/{tid}").status_code == 204, ""))

# 6. Goals CRUD
report("POST /api/tracker/goals", lambda: (
    (r := client.post("/api/tracker/goals", json={"title": "TEST-goal"})).status_code == 201,
    str(r.status_code) ))
gid = None
try:
    r = client.post("/api/tracker/goals", json={"title": "TEST-goal-2"})
    if r.status_code == 201:
        gid = r.json().get("id", "")
except: pass
if gid:
    report(f"PATCH /api/tracker/goals/{gid[:8]}...", lambda: (
        client.patch(f"/api/tracker/goals/{gid}", json={"progress": 50}).status_code == 200, ""))
    report(f"DELETE /api/tracker/goals/{gid[:8]}...", lambda: (
        client.delete(f"/api/tracker/goals/{gid}").status_code == 204, ""))

# 7. Goals generate
report("POST /api/tracker/goals/generate", lambda: (
    (r := client.post("/api/tracker/goals/generate")).status_code == 201,
    f"{r.status_code} goals={len(r.json().get('goals', []))}" ))

# 8. Roadmap generate
report("POST /api/roadmap/generate", lambda: (
    (r := client.post("/api/roadmap/generate",
         json={"user_id": DEV_UUID, "target_role": "Senior Engineer"})).status_code == 201,
    f"{r.status_code} todos={len(r.json().get('todos', []))}" ))

# 9. Dashboard stats (now uses real UUID from auth override)
report("GET /api/tracker/dashboard/stats", lambda: (
    (r := client.get("/api/tracker/dashboard/stats", params={"user_id": DEV_UUID})).status_code == 200,
    str(r.status_code) ))

# 10. Nudge (now uses real UUID from auth override)
report("GET /api/tracker/nudge", lambda: (
    (r := client.get("/api/tracker/nudge", params={"user_id": DEV_UUID})).status_code == 200,
    str(r.status_code) ))

# 11. CV sections (now uses real CV UUID)
report("GET /api/cv/sections/cv-1", lambda: (
    (r := client.get(f"/api/cv/sections/{DEV_CV_ID}")).status_code in (200, 404),
    f"HTTP {r.status_code}" ))

# 12. Application CRUD (may still fail if fit_score column missing)
report("POST /api/tracker/applications", lambda: (
    (r := client.post("/api/tracker/applications",
         json={"job_title": "TEST-role", "company": "TEST-co"})).status_code == 201,
    str(r.status_code) ))
aid = None
try:
    r = client.post("/api/tracker/applications",
                    json={"job_title": "TEST-role-2", "company": "TEST-co"})
    if r.status_code == 201:
        aid = r.json().get("id", "")
except: pass
if aid:
    report(f"PATCH /api/tracker/applications/{aid[:8]}...", lambda: (
        client.patch(f"/api/tracker/applications/{aid}", json={"status": "interviewing"}).status_code == 200, ""))
    report(f"DELETE /api/tracker/applications/{aid[:8]}...", lambda: (
        client.delete(f"/api/tracker/applications/{aid}").status_code == 204, ""))

print(f"\n{'='*40}")
print(f"  OK: {ok}   FAIL: {fail}")
print(f"{'='*40}")
print(f"\nAuth override: user.id = {DEV_UUID}")
print(f"CV UUID: {DEV_CV_ID}")
sys.exit(1 if fail else 0)

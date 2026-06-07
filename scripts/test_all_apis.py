"""Comprehensive API smoke test using REAL infrastructure (no mocks).
Reports pass/fail for every endpoint.  Writes are tagged TEST- for easy cleanup."""

import sys, json, traceback
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

from fastapi.testclient import TestClient
from backend.main import app

PASS, FAIL, ERR = 0, 0, 0
results = []


def check(label: str, ok: bool, detail: str = ""):
    global PASS, FAIL
    if ok:
        PASS += 1
    else:
        FAIL += 1
    results.append((label, "PASS" if ok else "FAIL", detail))


def safe_call(label: str, fn):
    """Run *fn*, catching any exception and reporting it."""
    global ERR
    try:
        return fn()
    except Exception as e:
        ERR += 1
        tb = traceback.format_exc()
        # Keep the traceback concise — last 5 lines
        lines = tb.splitlines()
        short = "\n".join(lines[-5:]) if len(lines) > 5 else tb
        results.append((label, "EXCEPTION", f"{type(e).__name__}: {e}"))
        return None


def main():
    client = TestClient(app)

    # ── 1. Health ──
    r = client.get("/health")
    check("GET /health", r.status_code == 200 and r.json().get("status") == "ok",
          str(r.status_code))

    # ── 2. Settings ──
    r = client.get("/api/settings")
    check("GET /api/settings", r.status_code == 200 and "SUPABASE_URL" in r.json(),
          str(r.status_code))

    # ── 3. Tracker: CRUD Applications ──
    r = safe_call("POST /api/tracker/applications",
                  lambda: client.post("/api/tracker/applications", json={
                      "job_title": "TEST-Senior Developer", "company": "TEST-Company",
                      "notes": "Auto-test, safe to delete"
                  }))
    app_id = ""
    if r is not None:
        ok = r.status_code == 201 and "id" in r.json()
        app_id = r.json().get("id", "")
        check("POST /api/tracker/applications", ok, f"{r.status_code} id={app_id[:8]}…")
    if app_id:
        r2 = safe_call(f"PATCH /api/tracker/applications/{app_id[:8]}…",
                       lambda: client.patch(f"/api/tracker/applications/{app_id}",
                                            json={"status": "interview"}))
        if r2 is not None:
            check(f"PATCH /api/tracker/applications/{app_id[:8]}…",
                  r2.status_code == 200 and r2.json().get("status") == "interview",
                  str(r2.status_code))

        r3 = safe_call(f"DELETE /api/tracker/applications/{app_id[:8]}…",
                       lambda: client.delete(f"/api/tracker/applications/{app_id}"))
        if r3 is not None:
            check(f"DELETE /api/tracker/applications/{app_id[:8]}…",
                  r3.status_code == 204, str(r3.status_code))

    # ── 4. Tracker: Todos ──
    r = safe_call("POST /api/tracker/todos",
                  lambda: client.post("/api/tracker/todos", json={"title": "TEST-API check"}))
    todo_id = ""
    if r is not None:
        ok = r.status_code == 201 and "id" in r.json()
        todo_id = r.json().get("id", "")
        check("POST /api/tracker/todos", ok, f"{r.status_code} id={todo_id[:8]}…")
    if todo_id:
        r2 = safe_call(f"PATCH /api/tracker/todos/{todo_id[:8]}…",
                       lambda: client.patch(f"/api/tracker/todos/{todo_id}",
                                            json={"done": True}))
        if r2 is not None:
            check(f"PATCH /api/tracker/todos/{todo_id[:8]}…",
                  r2.status_code == 200 and r2.json().get("done") is True,
                  str(r2.status_code))
        r3 = safe_call(f"DELETE /api/tracker/todos/{todo_id[:8]}…",
                       lambda: client.delete(f"/api/tracker/todos/{todo_id}"))
        if r3 is not None:
            check(f"DELETE /api/tracker/todos/{todo_id[:8]}…",
                  r3.status_code == 204, str(r3.status_code))

    # ── 5. Tracker: Goals ──
    r = safe_call("POST /api/tracker/goals",
                  lambda: client.post("/api/tracker/goals",
                                      json={"title": "TEST-Pass all API checks"}))
    goal_id = ""
    if r is not None:
        ok = r.status_code == 201 and "id" in r.json()
        goal_id = r.json().get("id", "")
        check("POST /api/tracker/goals", ok, f"{r.status_code} id={goal_id[:8]}…")
    if goal_id:
        r2 = safe_call(f"PATCH /api/tracker/goals/{goal_id[:8]}…",
                       lambda: client.patch(f"/api/tracker/goals/{goal_id}",
                                            json={"progress": 50}))
        if r2 is not None:
            check(f"PATCH /api/tracker/goals/{goal_id[:8]}…",
                  r2.status_code == 200 and r2.json().get("progress") == 50,
                  str(r2.status_code))
        r3 = safe_call(f"DELETE /api/tracker/goals/{goal_id[:8]}…",
                       lambda: client.delete(f"/api/tracker/goals/{goal_id}"))
        if r3 is not None:
            check(f"DELETE /api/tracker/goals/{goal_id[:8]}…",
                  r3.status_code == 204, str(r3.status_code))

    # ── 6. Goals generate ──
    r = safe_call("POST /api/tracker/goals/generate",
                  lambda: client.post("/api/tracker/goals/generate"))
    if r is not None:
        check("POST /api/tracker/goals/generate",
              r.status_code == 201 and "goals" in r.json(),
              f"{r.status_code} goals={len(r.json().get('goals', []))}")

    # ── 7. Dashboard ──
    r = safe_call("GET /api/tracker/dashboard/stats",
                  lambda: client.get("/api/tracker/dashboard/stats"))
    if r is not None:
        check("GET /api/tracker/dashboard/stats",
              r.status_code == 200 and "applications_this_week" in r.json(),
              str(r.status_code))

    r = safe_call("GET /api/tracker/nudge",
                  lambda: client.get("/api/tracker/nudge"))
    if r is not None:
        check("GET /api/tracker/nudge",
              r.status_code == 200 and "message" in r.json(),
              f"{r.status_code} msg={str(r.json().get('message',''))[:50]}")

    # ── 8. Jobs search ──
    r = safe_call("GET /api/jobs/search",
                  lambda: client.get("/api/jobs/search",
                                     params={"q": "python developer", "location": "bd"}))
    if r is not None:
        check("GET /api/jobs/search",
              r.status_code == 200 and "jobs" in r.json(),
              f"{r.status_code} jobs={len(r.json().get('jobs', []))}")

    # ── 9. CV sections ──
    r = safe_call("GET /api/cv/sections/cv-1",
                  lambda: client.get("/api/cv/sections/cv-1"))
    if r is not None:
        check("GET /api/cv/sections/cv-1",
              r.status_code in (200, 404),
              str(r.status_code))

    # ── 10. Chat ──
    r = safe_call("POST /api/chat/message",
                  lambda: client.post("/api/chat/message",
                                      json={"content": "Give me one tip to improve my CV"}))
    if r is not None:
        answer = r.json().get("answer", "")
        check("POST /api/chat/message",
              r.status_code == 200 and answer,
              f"{r.status_code} answer_len={len(answer)}")

    # ── 11. Roadmap ──
    r = safe_call("POST /api/roadmap/generate",
                  lambda: client.post("/api/roadmap/generate", json={
                      "user_id": "demo_user_123", "target_role": "Senior Engineer"
                  }))
    if r is not None:
        check("POST /api/roadmap/generate",
              r.status_code == 201 and "roadmap" in r.json(),
              str(r.status_code))

    # ── Summary ──
    total = PASS + FAIL + ERR
    out = [f"\n{'='*55}",
           f"  TOTAL: {total:2d}  |  PASS: {PASS:2d}  |  FAIL: {FAIL:2d}  |  ERR: {ERR:2d}",
           f"{'='*55}\n"]
    for label, status, detail in results:
        icon = {"PASS": "[OK]", "FAIL": "[FAIL]", "EXCEPTION": "[ERR]"}.get(status, "?")
        out.append(f"  {icon}  {label}")
        if detail:
            out.append(f"        {detail}")
    out.append("")
    sys.stdout.write("\n".join(out) + "\n")

    return 1 if (FAIL + ERR) else 0


if __name__ == "__main__":
    sys.exit(main())

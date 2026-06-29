import json, subprocess, sys

BASE = "https://backend-production-95c6c.up.railway.app"
PASS = 0
FAIL = 0
FAILURES = []

BEARER = "Bearer "

def api(method, path, token="", body=None):
    cmd = ["curl", "-s", "-w", "\\n__HTTP__%{http_code}", "-X", method]
    if token:
        cmd.append("-H")
        cmd.append(BEARER + token)
    cmd.append("-H")
    cmd.append("Content-Type: application/json")
    if body:
        cmd.append("-d")
        cmd.append(json.dumps(body))
    cmd.append(BASE + path)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    out = r.stdout
    idx = out.rfind("__HTTP__")
    if idx >= 0:
        body_text = out[:idx].strip()
        http_code = out[idx + 8:].strip()
    else:
        body_text = out.strip()
        http_code = "?"
    try:
        data = json.loads(body_text) if body_text else {}
    except:
        data = {"_raw": body_text[:300]}
    return data, http_code

def test(label, method, path, token="", body=None):
    global PASS, FAIL
    data, code = api(method, path, token, body)
    ok = code in ("200", "201", "204") and "error" not in data
    if ok:
        count = ""
        if isinstance(data.get("data"), list):
            count = " (" + str(len(data["data"])) + " items)"
        elif isinstance(data.get("features"), list):
            count = " (" + str(len(data["features"])) + " features)"
        elif isinstance(data, list):
            count = " (" + str(len(data)) + " items)"
        print("  PASS " + label + " HTTP " + code + count)
        PASS += 1
    else:
        err = data.get("error", data.get("_raw", "?"))
        print("  FAIL " + label + " HTTP " + code + " - " + str(err)[:80])
        FAIL += 1
        FAILURES.append(label + " (HTTP " + code + ": " + str(err)[:60] + ")")
    return data

print("=" * 60)
print("SECURITY-OPS-APP FULL API TEST SUITE")
print("=" * 60)

# Login
login, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "MGR-001", "pin": "1234"})
mgr = login.get("accessToken", "")
refresh = login.get("refreshToken", "")
print("Manager: " + login.get("officer", {}).get("role", "FAIL"))

login_o, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "OFF-001", "pin": "1234"})
off = login_o.get("accessToken", "")
print("Officer: " + login_o.get("officer", {}).get("role", "FAIL"))

login_s, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "SUP-001", "pin": "1234"})
sup = login_s.get("accessToken", "")
print("Supervisor: " + login_s.get("officer", {}).get("role", "FAIL"))

# Reference data
zr, _ = api("GET", "/api/v1/zones", mgr)
zid = zr.get("data", [{}])[0].get("id", "") if zr.get("data") else ""
or_, _ = api("GET", "/api/v1/officers", mgr)
oid = or_.get("data", [{}])[0].get("id", "") if or_.get("data") else ""
print("Zone: " + zid)
print("Officer: " + oid)

print("")
print("--- AUTH ---")
test("Login", "POST", "/api/v1/auth/login", body={"badgeNumber": "MGR-001", "pin": "1234"})
test("Refresh", "POST", "/api/v1/auth/refresh", body={"refreshToken": refresh})

print("")
print("--- ZONES ---")
test("List zones", "GET", "/api/v1/zones", mgr)
test("Zone GeoJSON", "GET", "/api/v1/zones/geojson", mgr)
test("Zone detail", "GET", "/api/v1/zones/" + zid, mgr)
test("Zone checkpoints", "GET", "/api/v1/zones/" + zid + "/checkpoints", mgr)

print("")
print("--- OFFICERS ---")
test("List officers", "GET", "/api/v1/officers", mgr)
test("Officer locations", "GET", "/api/v1/officers/locations", mgr)
test("Officers online", "GET", "/api/v1/officers/online", mgr)
test("Officer detail", "GET", "/api/v1/officers/" + oid, mgr)
test("Officer location history", "GET", "/api/v1/officers/" + oid + "/locations", mgr)
test("Heartbeat", "POST", "/api/v1/officers/heartbeat", off, {})

print("")
print("--- SHIFTS ---")
test("List shifts", "GET", "/api/v1/shifts", mgr)
test("My current shift", "GET", "/api/v1/shifts/my-current", off)

print("")
print("--- CHECKPOINTS & PATROLS ---")
test("Checkpoint GeoJSON", "GET", "/api/v1/checkpoints/geojson", mgr)
test("Patrol routes GeoJSON", "GET", "/api/v1/patrol-routes/geojson", mgr)
test("List patrols", "GET", "/api/v1/patrols", mgr)

print("")
print("--- INCIDENTS ---")
test("List incidents", "GET", "/api/v1/incidents", mgr)
test("Incident GeoJSON", "GET", "/api/v1/incidents/geojson", mgr)

print("")
print("--- DASHBOARD ---")
test("Dashboard stats", "GET", "/api/v1/dashboard/stats", mgr)

print("")
print("--- AI ---")
test("AI insights", "GET", "/api/v1/ai/insights", mgr)
test("AI briefing", "GET", "/api/v1/ai/briefing", mgr)

print("")
print("--- BROADCASTS & SYNC & REPORTS ---")
test("List broadcasts", "GET", "/api/v1/broadcasts", mgr)
test("Sync", "GET", "/api/v1/sync", mgr)
test("Reports", "GET", "/api/v1/reports", mgr)

# SHIFT CRUD
print("")
print("--- SHIFT CRUD ---")
create = test("Create shift", "POST", "/api/v1/shifts", mgr, {
    "officerId": oid, "zoneId": zid,
    "scheduledStart": "2026-07-05T08:00:00.000Z",
    "scheduledEnd": "2026-07-05T16:00:00.000Z"
})
sid = ""
if isinstance(create.get("data"), dict):
    sid = create["data"].get("id", "")

if sid:
    test("Edit shift", "PUT", "/api/v1/shifts/" + sid, mgr, {
        "scheduledStart": "2026-07-05T07:00:00.000Z",
        "scheduledEnd": "2026-07-05T15:00:00.000Z"
    })
    test("Status -> called_off", "PATCH", "/api/v1/shifts/" + sid + "/status", mgr, {"status": "called_off"})
    test("Delete shift", "DELETE", "/api/v1/shifts/" + sid, mgr)
else:
    print("  SKIP CRUD — no shift created")

# RBAC
print("")
print("--- RBAC ---")
sup_zones, _ = api("GET", "/api/v1/zones", sup)
sup_count = len(sup_zones.get("data", [])) if isinstance(sup_zones.get("data"), list) else 0
if sup_count == 1:
    print("  PASS Supervisor sees only own zone (1 zone)")
    PASS += 1
else:
    print("  FAIL Supervisor sees " + str(sup_count) + " zones (expected 1)")
    FAIL += 1
    FAILURES.append("Supervisor RBAC: sees " + str(sup_count))

off_shifts, _ = api("GET", "/api/v1/shifts", off)
off_count = len(off_shifts.get("data", [])) if isinstance(off_shifts.get("data"), list) else 0
print("  INFO Officer sees " + str(off_count) + " shifts (own only)")

print("")
print("=" * 60)
print("RESULT: " + str(PASS) + " passed, " + str(FAIL) + " failed")
print("=" * 60)
if FAILURES:
    print("")
    print("FAILURES:")
    for f in FAILURES:
        print("  - " + f)
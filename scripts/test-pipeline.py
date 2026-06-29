import json, subprocess, sys

BASE = "https://backend-production-95c6c.up.railway.app"
PASS = 0
FAIL = 0
FAILURES = []

def api(method, path, token="", body=None):
    cmd = ["curl", "-s", "-w", "\n__HTTP__%{http_code}", "-X", method]
    if token:
        cmd.append("-H")
        cmd.append("Authorization: " + "Bearer " + token)
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
        http_code = out[idx+8:].strip()
    else:
        body_text = out.strip()
        http_code = "?"
    try:
        data = json.loads(body_text) if body_text else {}
    except:
        data = {"_raw": body_text[:300]}
    return data, http_code

def test(label, data, code):
    global PASS, FAIL
    is_list = isinstance(data, list)
    ok = code in ("200", "201", "204") and (is_list or data is None or "error" not in data)
    if ok:
        count = ""
        if is_list:
            count = " (" + str(len(data)) + " items)"
        elif isinstance(data, dict) and isinstance(data.get("data"), list):
            count = " (" + str(len(data["data"])) + " items)"
        elif isinstance(data, dict) and isinstance(data.get("features"), list):
            count = " (" + str(len(data["features"])) + " features)"
        print("  PASS " + label + " HTTP " + code + count)
        PASS += 1
    else:
        err = str(data.get("error", data.get("_raw", "?")))[:80] if data and not is_list else "?"
        print("  FAIL " + label + " HTTP " + code + " - " + err)
        FAIL += 1
        FAILURES.append(label + " (HTTP " + code + ")")
    return data

print("=" * 60)
print("SYNC & DATA PIPELINE TEST SUITE")
print("=" * 60)

# Login as officer
login, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "OFF-001", "pin": "1234"})
off_token = login.get("accessToken", "")
officer_id = login.get("officer", {}).get("id", "")
print("Officer: " + login.get("officer", {}).get("role", "FAIL") + " (" + officer_id[:12] + ")")

# Login as manager
login_m, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "MGR-001", "pin": "1234"})
mgr_token = login_m.get("accessToken", "")

# Get zone ID
zr, _ = api("GET", "/api/v1/zones", mgr_token)
zid = zr.get("data", [{}])[0].get("id", "") if zr.get("data") else ""

print("\n--- SYNC ENDPOINT ---")

# Test 1: Empty sync batch
print("\n  [1] Empty batch (0 actions):")
d, c = api("POST", "/api/v1/sync", off_token, {"actions": []})
test("Empty sync batch", d, c)

# Test 2: Single shift-check-in action
print("\n  [2] Shift check-in action (sync replay):")
d, c = api("POST", "/api/v1/sync", off_token, {"actions": [{
    "id": "test-1",
    "actionType": "shift-check-in",
    "payload": {"shiftId": "00000000-0000-0000-0000-000000000000", "lat": 27.39, "lng": 33.68},
    "createdAtDevice": "2026-06-29T10:00:00.000Z"
}]})
test("Sync shift-check-in", d, c)
processed = d.get("processed", [])
conflicts = d.get("conflicts", [])
print("    processed: " + str(len(processed)) + ", conflicts: " + str(len(conflicts)))

# Test 3: Multiple action types
print("\n  [3] Mixed action batch (5 actions):")
actions = [
    {"id": "test-2", "actionType": "shift-check-in", "payload": {"lat": 27.39, "lng": 33.68}, "createdAtDevice": "2026-06-29T10:01:00.000Z"},
    {"id": "test-3", "actionType": "incident-create", "payload": {"title": "Test", "priority": "low"}, "createdAtDevice": "2026-06-29T10:02:00.000Z"},
    {"id": "test-4", "actionType": "incident-status-update", "payload": {"incidentId": "00000000-0000-0000-0000-000000000000", "status": "resolved"}, "createdAtDevice": "2026-06-29T10:03:00.000Z"},
    {"id": "test-5", "actionType": "patrol-checkpoint-confirm", "payload": {"patrolLogId": "00000000-0000-0000-0000-000000000000", "checkpointId": "00000000-0000-0000-0000-000000000000", "lat": 27.39, "lng": 33.68}, "createdAtDevice": "2026-06-29T10:04:00.000Z"},
    {"id": "test-6", "actionType": "incident-add-note", "payload": {"incidentId": "00000000-0000-0000-0000-000000000000", "content": "Test note"}, "createdAtDevice": "2026-06-29T10:05:00.000Z"},
]
d, c = api("POST", "/api/v1/sync", off_token, {"actions": actions})
test("Mixed batch sync", d, c)
processed = d.get("processed", [])
conflicts = d.get("conflicts", [])
print("    processed: " + str(len(processed)) + ", conflicts: " + str(len(conflicts)))

# Test 4: Batch over 500 (should truncate)
print("\n  [4] Oversized batch (501 actions, should process 500):")
big_actions = [{"id": "big-" + str(i), "actionType": "incident-add-note", "payload": {}, "createdAtDevice": "2026-06-29T11:00:00.000Z"} for i in range(501)]
d, c = api("POST", "/api/v1/sync", off_token, {"actions": big_actions})
test("Oversized batch (501 -> 500)", d, c)
processed = d.get("processed", [])
print("    processed: " + str(len(processed)) + " (expected 500)")

# Test 5: No auth
print("\n  [5] Sync without auth:")
d, c = api("POST", "/api/v1/sync", "", {"actions": []})
if c == "401":
    print("  PASS Unauthorised sync rejected HTTP " + c)
    PASS += 1
else:
    print("  FAIL Unauthorised sync allowed HTTP " + c)
    FAIL += 1
    FAILURES.append("Sync auth bypass")

print("\n--- BULLMQ WORKERS ---")

# Check AI status (worker health)
print("\n  [6] AI service status (worker health):")
d, c = api("GET", "/api/v1/ai/status", mgr_token)
test("AI status", d, c)
if isinstance(d, dict) and "data" in d:
    ai_data = d["data"]
    print("    available: " + str(ai_data.get("available", "?")))
    print("    model: " + str(ai_data.get("model", "?")))

# Check AI patterns (pattern detection worker output)
print("\n  [7] AI patterns (pattern worker):")
d, c = api("GET", "/api/v1/ai/patterns", mgr_token)
test("AI patterns", d, c)

# Check AI anomalies (anomaly detection worker output)
print("\n  [8] AI anomalies (anomaly worker):")
d, c = api("GET", "/api/v1/ai/anomalies", mgr_token)
test("AI anomalies", d, c)

# Check AI staffing (staffing worker output)
print("\n  [9] AI staffing (staffing worker):")
d, c = api("GET", "/api/v1/ai/staffing", mgr_token)
test("AI staffing", d, c)

# Check AI reports (report worker output)
print("\n  [10] AI reports (report worker):")
d, c = api("GET", "/api/v1/ai/reports", mgr_token)
test("AI reports", d, c)

print("\n--- OFFICER LOCATION PIPELINE ---")

# Test location update
print("\n  [11] Officer location update (GPS pipeline):")
d, c = api("POST", "/api/v1/officers/" + officer_id + "/location", off_token, {
    "lat": 27.3900, "lng": 33.6800, "accuracy": 10
})
if c == "200":
    print("  PASS Location update HTTP " + c)
    PASS += 1
else:
    err = str(d.get("error", "?"))[:80] if d else "?"
    print("  FAIL Location update HTTP " + c + " - " + err)
    FAIL += 1
    FAILURES.append("Location update")

# Verify location was recorded
print("\n  [12] Officer location history (verify GPS stored):")
d, c = api("GET", "/api/v1/officers/" + officer_id + "/locations", mgr_token)
test("Location history", d, c)
if isinstance(d, dict) and isinstance(d.get("data"), list):
    print("    GPS points: " + str(len(d["data"])))

# Check officer online status (heartbeat -> lastSeenAt)
print("\n  [13] Officer online (heartbeat verification):")
d, c = api("GET", "/api/v1/officers/online", mgr_token)
test("Officers online", d, c)
if isinstance(d, dict) and isinstance(d.get("data"), list):
    for o in d["data"][:3]:
        print("    " + o.get("nameEn", "?") + " — lastSeen: " + str(o.get("lastSeenAt", "?"))[:19])

print("\n--- INCIDENT PIPELINE ---")

# Create incident
print("\n  [14] Create incident (full pipeline: SLA + AI categorize + auto-assign):")
d, c = api("POST", "/api/v1/incidents", off_token, {
    "title": "Sync test incident",
    "description": "Testing incident pipeline",
    "priority": "medium",
    "reporterType": "officer",
    "lat": 27.3900,
    "lng": 33.6800
})
test("Create incident", d, c)
inc_id = ""
if isinstance(d, dict) and isinstance(d.get("data"), dict):
    inc_id = d["data"].get("id", "")
    print("    incident ID: " + inc_id[:12])
    print("    zoneId: " + str(d["data"].get("zoneId", "?"))[:12])
    print("    SLA response: " + str(d["data"].get("slaResponseDeadline", "?"))[:19])
    print("    SLA resolution: " + str(d["data"].get("slaResolutionDeadline", "?"))[:19])

# Verify incident appears in list
if inc_id:
    print("\n  [15] Verify incident in list:")
    d2, c2 = api("GET", "/api/v1/incidents", mgr_token)
    test("Incident in list", d2, c2)
    if isinstance(d2, dict) and isinstance(d2.get("data"), list):
        found = any(i.get("id") == inc_id for i in d2["data"])
        if found:
            print("    Incident found in list: YES")
        else:
            print("    Incident found in list: NO")
            FAIL += 1
            FAILURES.append("Incident not in list after creation")

# Verify incident GeoJSON
print("\n  [16] Incident GeoJSON (map pipeline):")
d, c = api("GET", "/api/v1/incidents/geojson", mgr_token)
test("Incident GeoJSON", d, c)

print("\n" + "=" * 60)
print("RESULT: " + str(PASS) + " passed, " + str(FAIL) + " failed")
print("=" * 60)
if FAILURES:
    print("\nFAILURES:")
    for f in FAILURES:
        print("  - " + f)
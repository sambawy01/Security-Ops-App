import json, subprocess

BASE = "https://backend-production-95c6c.up.railway.app"

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

# Login as officer
login, _ = api("POST", "/api/v1/auth/login", body={"badgeNumber": "OFF-001", "pin": "1234"})
off_token = login.get("accessToken", "")

# Get categories
cats, _ = api("GET", "/api/v1/categories", off_token)
cat_list = cats.get("data", []) if isinstance(cats, dict) else []
if cat_list:
    cat_id = cat_list[0].get("id", "")
    print("Category: " + cat_list[0].get("nameEn", "?") + " (" + cat_id[:12] + ")")
else:
    cat_id = None
    print("No categories found!")

# Test 1: Incident with GPS inside a zone (Kafr El Gouna area)
print("\n[1] Incident at Kafr El Gouna center (27.400, 33.679):")
d, c = api("POST", "/api/v1/incidents", off_token, {
    "title": "GPS geocode test 1",
    "description": "Should be geocoded to Kafr El Gouna",
    "categoryId": cat_id,
    "priority": "high",
    "reporterType": "officer",
    "lat": 27.4000,
    "lng": 33.6790
})
data = d.get("data", d)
print("  HTTP " + c)
print("  zoneId: " + str(data.get("zoneId", "?"))[:36])
print("  slaResponse: " + str(data.get("slaResponseDeadline", "?"))[:19])
print("  slaResolution: " + str(data.get("slaResolutionDeadline", "?"))[:19])

# Test 2: Incident with GPS in Marina area
print("\n[2] Incident at Marina (27.402, 33.698):")
d2, c2 = api("POST", "/api/v1/incidents", off_token, {
    "title": "GPS geocode test 2",
    "description": "Should be geocoded to Marina",
    "categoryId": cat_id,
    "priority": "medium",
    "reporterType": "officer",
    "lat": 27.4020,
    "lng": 33.6980
})
data2 = d2.get("data", d2)
print("  HTTP " + c2)
print("  zoneId: " + str(data2.get("zoneId", "?"))[:36])
print("  slaResponse: " + str(data2.get("slaResponseDeadline", "?"))[:19])
print("  slaResolution: " + str(data2.get("slaResolutionDeadline", "?"))[:19])

# Test 3: Incident without GPS (should have null zone)
print("\n[3] Incident without GPS (no lat/lng):")
d3, c3 = api("POST", "/api/v1/incidents", off_token, {
    "title": "No GPS test",
    "description": "Should have null zone",
    "categoryId": cat_id,
    "priority": "low",
    "reporterType": "officer"
})
data3 = d3.get("data", d3)
print("  HTTP " + c3)
print("  zoneId: " + str(data3.get("zoneId", "?"))[:36])
print("  slaResponse: " + str(data3.get("slaResponseDeadline", "?"))[:19])

# Test 4: Incident without category (SLA should be null)
print("\n[4] Incident without category (SLA should be null):")
d4, c4 = api("POST", "/api/v1/incidents", off_token, {
    "title": "No category test",
    "description": "SLA should be null without category",
    "priority": "high",
    "reporterType": "officer",
    "lat": 27.4000,
    "lng": 33.6790
})
data4 = d4.get("data", d4)
print("  HTTP " + c4)
print("  zoneId: " + str(data4.get("zoneId", "?"))[:36])
print("  categoryId: " + str(data4.get("categoryId", "?"))[:36])
print("  slaResponse: " + str(data4.get("slaResponseDeadline", "?"))[:19])
print("  slaResolution: " + str(data4.get("slaResolutionDeadline", "?"))[:19])

# Summary
print("\n" + "=" * 60)
print("PIPELINE DIAGNOSIS")
print("=" * 60)
issues = []
if data.get("zoneId") is None:
    issues.append("Zone geocoding FAILED — GPS point not matched to any zone")
else:
    print("Zone geocoding: OK")
if data.get("slaResponseDeadline") is None and cat_id:
    issues.append("SLA computation FAILED — category set but no SLA deadline")
else:
    print("SLA computation: OK (with category)")
print("SLA without category: NULL (expected)")
if issues:
    print("\nISSUES:")
    for i in issues:
        print("  - " + i)
else:
    print("\nAll pipeline stages working correctly!")
#!/bin/bash
# Comprehensive API test suite for Security-Ops-App
set -e

BASE="https://backend-production-95c6c.up.railway.app"
PASS=0
FAIL=0

echo "=================================================="
echo "SECURITY-OPS-APP API TEST SUITE"
echo "=================================================="

# Login as manager
MGR_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d '{"badgeNumber":"MGR-001","pin":"1234"}')
MGR_TOKEN=$(echo "$MGR_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
MGR_REFRESH=$(echo "$MGR_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('refreshToken',''))" 2>/dev/null)
echo "Manager login: $([ -n "$MGR_TOKEN" ] && echo 'OK' || echo 'FAIL')"

# Login as officer
OFF_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d '{"badgeNumber":"OFF-001","pin":"1234"}')
OFF_TOKEN=$(echo "$OFF_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
echo "Officer login: $([ -n "$OFF_TOKEN" ] && echo 'OK' || echo 'FAIL')"

# Login as supervisor
SUP_RESP=$(curl -s -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" -d '{"badgeNumber":"SUP-001","pin":"1234"}')
SUP_TOKEN=$(echo "$SUP_RESP" | python3 -c "import sys,json;print(json.load(sys.stdin).get('accessToken',''))" 2>/dev/null)
echo "Supervisor login: $([ -n "$SUP_TOKEN" ] && echo 'OK' || echo 'FAIL')"

# Get zone ID and officer ID for parametric tests
ZONE_ID=$(curl -s -X GET "$BASE/api/v1/zones" -H "Authorization: Bearer $MGR_TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin).get('data',[]);print(d[0]['id'] if d else '')" 2>/dev/null)
OFF_ID=$(curl -s -X GET "$BASE/api/v1/officers" -H "Authorization: Bearer $MGR_TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin).get('data',[]);print(d[0]['id'] if d else '')" 2>/dev/null)
echo "Zone ID: $ZONE_ID"
echo "Officer ID: $OFF_ID"

test_endpoint() {
    local method="$1"
    local path="$2"
    local token="$3"
    local body="$4"
    local label="$5"
    
    local cmd="curl -s -w '\n__HTTP__%{http_code}' -X $method"
    if [ -n "$token" ]; then
        cmd="$cmd -H \"Authorization: Bearer $token\""
    fi
    cmd="$cmd -H \"Content-Type: application/json\""
    if [ -n "$body" ]; then
        cmd="$cmd -d '$body'"
    fi
    cmd="$cmd \"$BASE$path\""
    
    local resp=$(eval "$cmd" 2>/dev/null)
    local http_code=$(echo "$resp" | grep -o '__HTTP__[0-9]*' | sed 's/__HTTP__//')
    local body_text=$(echo "$resp" | sed 's/__HTTP__[0-9]*//')
    
    local short="${path:0:55}"
    local err=""
    local count=""
    
    # Check for error in response
    err=$(echo "$body_text" | python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('error',''))" 2>/dev/null)
    
    # Get item count
    if [ -z "$err" ]; then
        count=$(echo "$body_text" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if 'data' in d and isinstance(d['data'], list):
    print('(' + str(len(d['data'])) + ' items)')
elif 'features' in d:
    print('(' + str(len(d['features'])) + ' features)')
elif isinstance(d, list):
    print('(' + str(len(d)) + ' items)')
else:
    print('')
" 2>/dev/null)
    fi
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ] || [ "$http_code" = "204" ]; then
        if [ -n "$err" ]; then
            echo "  FAIL $method $short HTTP $http_code — $err"
            FAIL=$((FAIL + 1))
        else
            echo "  PASS $method $short HTTP $http_code $count"
            PASS=$((PASS + 1))
        fi
    else
        echo "  FAIL $method $short HTTP $http_code — ${err:-unknown}"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "=================================================="
echo "TESTING ALL ENDPOINTS"
echo "=================================================="

# Auth
test_endpoint "POST" "/api/v1/auth/login" "" '{"badgeNumber":"MGR-001","pin":"1234"}' "Public"
test_endpoint "POST" "/api/v1/auth/refresh" "" "{\"refreshToken\":\"$MGR_REFRESH\"}" "Public"

# Zones
test_endpoint "GET" "/api/v1/zones" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/zones/geojson" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/zones/$ZONE_ID" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/zones/$ZONE_ID/checkpoints" "$MGR_TOKEN" "" "Manager"

# Officers
test_endpoint "GET" "/api/v1/officers" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/officers/locations" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/officers/online" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/officers/$OFF_ID" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/officers/$OFF_ID/locations" "$MGR_TOKEN" "" "Manager"
test_endpoint "POST" "/api/v1/officers/heartbeat" "$OFF_TOKEN" "" "Officer"

# Shifts
test_endpoint "GET" "/api/v1/shifts" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/shifts/my-current" "$OFF_TOKEN" "" "Officer"

# Checkpoints
test_endpoint "GET" "/api/v1/checkpoints/geojson" "$MGR_TOKEN" "" "Manager"

# Patrol routes
test_endpoint "GET" "/api/v1/patrol-routes/geojson" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/patrols" "$MGR_TOKEN" "" "Manager"

# Incidents
test_endpoint "GET" "/api/v1/incidents" "$MGR_TOKEN" "" "Manager"

# Dashboard
test_endpoint "GET" "/api/v1/dashboard/stats" "$MGR_TOKEN" "" "Manager"

# AI
test_endpoint "GET" "/api/v1/ai/insights" "$MGR_TOKEN" "" "Manager"
test_endpoint "GET" "/api/v1/ai/briefing" "$MGR_TOKEN" "" "Manager"

# Broadcasts
test_endpoint "GET" "/api/v1/broadcasts" "$MGR_TOKEN" "" "Manager"

# Sync
test_endpoint "GET" "/api/v1/sync" "$MGR_TOKEN" "" "Manager"

# Reports
test_endpoint "GET" "/api/v1/reports" "$MGR_TOKEN" "" "Manager"

echo ""
echo "=================================================="
echo "RESULT: $PASS passed, $FAIL failed"
echo "=================================================="
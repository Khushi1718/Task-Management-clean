#!/bin/bash
# Complete Connectivity Test Script - Workflow Pro
# Run this to verify all endpoints are working

set -e

echo "🧪 WORKFLOW PRO - CONNECTIVITY TEST SUITE"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local method=$2
    local url=$3
    local data=$4
    local token=$5
    
    echo -n "Testing $name... "
    
    if [ -z "$token" ]; then
        # No token
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        # With token
        response=$(curl -s -w "\n%{http_code}" -X $method "$url" \
            -H "Authorization: Bearer $token" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [[ $http_code == 200 ]] || [[ $http_code == 201 ]]; then
        echo -e "${GREEN}✓ PASS (HTTP $http_code)${NC}"
        PASSED=$((PASSED + 1))
        # Store token if login response
        if [[ "$name" == "Employee Login" ]]; then
            TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
            EMPLOYEE_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        fi
        if [[ "$name" == "Admin Login" ]]; then
            ADMIN_TOKEN=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
            ADMIN_ID=$(echo "$body" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
        fi
    else
        echo -e "${RED}✗ FAIL (HTTP $http_code)${NC}"
        echo "Response: $body"
        FAILED=$((FAILED + 1))
    fi
}

# Test 1: Health Check
echo -e "${BLUE}▶ Phase 1: Backend Health${NC}"
test_endpoint "Health Check" "GET" "http://localhost:3000/health" ""

echo ""
echo -e "${BLUE}▶ Phase 2: Authentication${NC}"

# Test 2: Employee Login
test_endpoint "Employee Login" "POST" "http://localhost:3000/api/auth/login" \
    '{"email":"khushi@tracely.app","password":"password123"}' ""

# Test 3: Admin Login
test_endpoint "Admin Login" "POST" "http://localhost:3000/api/auth/login" \
    '{"email":"admin@tracely.app","password":"password123"}' ""

# Test 4: Get Profile (Employee)
if [ ! -z "$TOKEN" ]; then
    test_endpoint "Get Profile (Employee)" "GET" "http://localhost:3000/api/auth/profile" "" "$TOKEN"
fi

echo ""
echo -e "${BLUE}▶ Phase 3: Work Log Operations${NC}"

# Test 5: Create Work Log
if [ ! -z "$TOKEN" ]; then
    test_endpoint "Create Work Log" "POST" "http://localhost:3000/api/work-logs" \
        '{"title":"Test Log","accomplishments":"Testing backend","meetingsAttended":1,"status":"completed","date":"2024-04-26T00:00:00Z"}' "$TOKEN"
fi

# Test 6: Get My Logs
if [ ! -z "$TOKEN" ]; then
    test_endpoint "Get My Logs" "GET" "http://localhost:3000/api/work-logs/my-logs?limit=10" "" "$TOKEN"
fi

echo ""
echo -e "${BLUE}▶ Phase 4: Admin Features${NC}"

# Test 7: Get All Users
if [ ! -z "$ADMIN_TOKEN" ]; then
    test_endpoint "Get All Users" "GET" "http://localhost:3000/api/admin/users?limit=10" "" "$ADMIN_TOKEN"
fi

# Test 8: Get All Logs (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    test_endpoint "Get All Logs (Admin)" "GET" "http://localhost:3000/api/admin/logs/all?limit=10" "" "$ADMIN_TOKEN"
fi

# Test 9: Get Today's Logs (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    test_endpoint "Get Today's Logs (Admin)" "GET" "http://localhost:3000/api/admin/logs/today?limit=10" "" "$ADMIN_TOKEN"
fi

# Test 10: Get Activity Logs (Admin)
if [ ! -z "$ADMIN_TOKEN" ]; then
    test_endpoint "Get Activity Logs" "GET" "http://localhost:3000/api/admin/activity-logs?limit=20" "" "$ADMIN_TOKEN"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}PASSED: $PASSED${NC} | ${RED}FAILED: $FAILED${NC}"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED! System is fully operational.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Check output above.${NC}"
    exit 1
fi

#!/bin/bash

# WorkFlow Pro - Complete Frontend-Backend Integration Test
# This script tests all connectivity to verify the system works end-to-end

API_URL="http://localhost:3000/api"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║      WorkFlow Pro - Frontend/Backend Connectivity Test       ║"
echo "╚════════════════════════════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo -e "\n${YELLOW}Testing:${NC} $description"
  echo "  Endpoint: $method $API_URL$endpoint"
  
  if [ -z "$data" ]; then
    response=$(curl -s -X $method \
      -H "Content-Type: application/json" \
      "$API_URL$endpoint")
  else
    response=$(curl -s -X $method \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$API_URL$endpoint")
  fi
  
  if echo "$response" | grep -q '"success"'; then
    echo -e "  ${GREEN}✓ SUCCESS${NC}"
    echo "  Response: $(echo $response | jq -r '.message // .data[0].title // .data.name' 2>/dev/null || echo $response | head -c 100)"
    return 0
  else
    echo -e "  ${RED}✗ FAILED${NC}"
    echo "  Response: $response"
    return 1
  fi
}

# 1. Test Login
echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo "Phase 1: Authentication"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"khushi@tracely.app","password":"password123"}' \
  "$API_URL/auth/login")

if echo "$LOGIN_RESPONSE" | grep -q '"token"'; then
  echo -e "${GREEN}✓ Login successful${NC}"
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token')
  USER_NAME=$(echo $LOGIN_RESPONSE | jq -r '.data.user.name')
  USER_ROLE=$(echo $LOGIN_RESPONSE | jq -r '.data.user.role')
  echo "  Token: ${TOKEN:0:20}..."
  echo "  User: $USER_NAME (Role: $USER_ROLE)"
else
  echo -e "${RED}✗ Login failed - Next.js app may not be running${NC}"
  echo "  Make sure: npm run dev is running in the project root"
  exit 1
fi

# 2. Test Getting Profile
echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo "Phase 2: User Profile"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

PROFILE_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/auth/profile")

if echo "$PROFILE_RESPONSE" | grep -q '"success"'; then
  echo -e "${GREEN}✓ Profile fetch successful${NC}"
  PROFILE_NAME=$(echo $PROFILE_RESPONSE | jq -r '.data.name')
  PROFILE_EMAIL=$(echo $PROFILE_RESPONSE | jq -r '.data.email')
  echo "  Name: $PROFILE_NAME"
  echo "  Email: $PROFILE_EMAIL"
else
  echo -e "${RED}✗ Profile fetch failed${NC}"
fi

# 3. Test Creating a Work Log
echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo "Phase 3: Creating Work Log"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

LOG_PAYLOAD='{"title":"Test Log from Backend","accomplishments":"Testing the complete connectivity flow","meetingsAttended":1,"focusForTomorrow":"Continue testing","meetingNotes":"All systems working","status":"completed","date":"2024-04-26"}'

LOG_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$LOG_PAYLOAD" \
  "$API_URL/work-logs")

if echo "$LOG_RESPONSE" | grep -q '"success"'; then
  echo -e "${GREEN}✓ Work log created successfully${NC}"
  LOG_ID=$(echo $LOG_RESPONSE | jq -r '.data.id')
  LOG_TITLE=$(echo $LOG_RESPONSE | jq -r '.data.title')
  echo "  Log ID: $LOG_ID"
  echo "  Log Title: $LOG_TITLE"
  echo "  ✓ This log should now appear in the frontend immediately!"
else
  echo -e "${RED}✗ Work log creation failed${NC}"
  echo "  Response: $LOG_RESPONSE"
fi

# 4. Test Fetching User's Logs
echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo "Phase 4: Fetching My Logs"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

LOGS_RESPONSE=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$API_URL/work-logs/my-logs?limit=10&skip=0")

if echo "$LOGS_RESPONSE" | grep -q '"success"'; then
  echo -e "${GREEN}✓ Logs fetched successfully${NC}"
  LOG_COUNT=$(echo $LOGS_RESPONSE | jq '.data | length')
  TOTAL_COUNT=$(echo $LOGS_RESPONSE | jq '.pagination.total')
  echo "  Logs fetched: $LOG_COUNT"
  echo "  Total logs in database: $TOTAL_COUNT"
  
  # Show first log
  FIRST_LOG=$(echo $LOGS_RESPONSE | jq '.data[0]')
  if [ "$FIRST_LOG" != "null" ]; then
    FIRST_LOG_TITLE=$(echo $FIRST_LOG | jq -r '.title')
    FIRST_LOG_STATUS=$(echo $FIRST_LOG | jq -r '.status')
    echo "  Latest log: $FIRST_LOG_TITLE (Status: $FIRST_LOG_STATUS)"
  fi
else
  echo -e "${RED}✗ Failed to fetch logs${NC}"
fi

# 5. Test Admin Endpoints (login as admin)
echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo "Phase 5: Admin Access"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

ADMIN_LOGIN=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tracely.app","password":"password123"}' \
  "$API_URL/auth/login")

if echo "$ADMIN_LOGIN" | grep -q '"token"'; then
  ADMIN_TOKEN=$(echo $ADMIN_LOGIN | jq -r '.data.token')
  echo -e "${GREEN}✓ Admin login successful${NC}"
  
  # Get all users
  USERS_RESPONSE=$(curl -s -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/admin/users?limit=10&skip=0")
  
  if echo "$USERS_RESPONSE" | grep -q '"success"'; then
    USERS_COUNT=$(echo $USERS_RESPONSE | jq '.data | length')
    TOTAL_USERS=$(echo $USERS_RESPONSE | jq '.pagination.total')
    echo -e "${GREEN}✓ Admin can fetch all users${NC}"
    echo "  Users found: $USERS_COUNT / Total: $TOTAL_USERS"
  fi
  
  # Get all logs as admin
  ADMIN_LOGS=$(curl -s -X GET \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    "$API_URL/admin/logs/all?limit=10&skip=0")
  
  if echo "$ADMIN_LOGS" | grep -q '"success"'; then
    ADMIN_LOG_COUNT=$(echo $ADMIN_LOGS | jq '.data | length')
    ADMIN_TOTAL=$(echo $ADMIN_LOGS | jq '.pagination.total')
    echo -e "${GREEN}✓ Admin can fetch all logs${NC}"
    echo "  All logs visible: $ADMIN_LOG_COUNT / Total: $ADMIN_TOTAL"
    echo "  ✓ Employee's log should be visible here!"
  fi
else
  echo -e "${RED}✗ Admin login failed${NC}"
fi

echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Testing Complete!${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo ""
echo "✓ If all tests passed, your connectivity is working!"
echo ""
echo "Next Steps:"
echo "1. Go to http://localhost:3000"
echo "2. Login with khushi@tracely.app / password123"
echo "3. Click 'Add Log' and create a new work log"
echo "4. It should appear immediately in 'My Logs'"
echo "5. Logout and login as admin@tracely.app"
echo "6. Go to 'All Logs' and verify you see the new log"
echo "7. Check that stats and graphs update with real data"
echo ""

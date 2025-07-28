#!/bin/bash

# External API Testing Script for Asset Management System
# This script tests all major API endpoints with authentication

BASE_URL="http://localhost:5000/api"

# Note: Replace this with a real token from browser session
# Get token from browser console: window.keycloak?.token
AUTH_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJfVWVuLTBfTVJCZkxqeWZXSUE4cHBfWTJCVGNnbGJMVnNJNXJoTGNLYXNjIn0.eyJleHAiOjE3Mzc5NjI5NzMsImlhdCI6MTczNzk2MjY3MywiYXV0aF90aW1lIjoxNzM3OTYyNjczLCJqdGkiOiI4ZjI1MjMzYy0zNjI5LTQ0YzQtOTZjYy1hNGZkOTc5MmJhMjgiLCJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjgwODAvcmVhbG1zL2Fzc2V0LW1hbmFnZW1lbnQiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiODJiMDUyOTYtMzAwYy00MTI2LWIyN2YtZGJkOGQ3OGYwOTM1IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXNzZXQtbWFuYWdlbWVudC1jbGllbnQiLCJzZXNzaW9uX3N0YXRlIjoiNzJhNzc4MzAtMzA1Zi00YjQ2LWI1YWMtNWQ3YjE1ZjlmNzI4IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyJodHRwOi8vbG9jYWxob3N0OjMwMDAiXSwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtYXNzZXQtbWFuYWdlbWVudCIsIm9mZmxpbmVfYWNjZXNzIiwidW1hX2F1dGhvcml6YXRpb24iXX0sInJlc291cmNlX2FjY2VzcyI6eyJhY2NvdW50Ijp7InJvbGVzIjpbIm1hbmFnZS1hY2NvdW50IiwibWFuYWdlLWFjY291bnQtbGlua3MiLCJ2aWV3LXByb2ZpbGUiXX19LCJzY29wZSI6InByb2ZpbGUgZW1haWwiLCJzaWQiOiI3MmE3NzgzMC0zMDVmLTRiNDYtYjVhYy01ZDdiMTVmOWY3MjgiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkhhcmlwcmFzYWQgSyIsInByZWZlcnJlZF91c2VybmFtZSI6ImhhcmlwcmFzYWQua0Bzd29ya3MuY28uaW4iLCJnaXZlbl9uYW1lIjoiSGFyaXByYXNhZCIsImZhbWlseV9uYW1lIjoiSyIsImVtYWlsIjoiaGFyaXByYXNhZC5rQHN3b3Jrcy5jby5pbiJ9.example-signature"

echo "🚀 Starting External API Testing"
echo "================================="

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    
    echo ""
    echo "🧪 Testing: $name"
    echo "📍 $method $url"
    
    if [ "$method" = "POST" ]; then
        echo "📤 Request Body: $data"
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $AUTH_TOKEN")
    fi
    
    # Extract status code and response body
    status_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | sed '$d')
    
    echo "📊 Status: $status_code"
    echo "📥 Response: $response_body" | head -c 500
    if [ ${#response_body} -gt 500 ]; then
        echo "... (truncated)"
    fi
    
    if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 300 ]; then
        echo "✅ SUCCESS"
    else
        echo "❌ FAILED"
    fi
}

echo ""
echo "📡 EXTERNAL API ENDPOINTS"
echo "========================="

# PPM (Maintenance) APIs
test_endpoint "PPM Tasks List" "POST" "$BASE_URL/maintenance/ppm-tasks" '{"page":1,"limit":10,"filters":{}}'
test_endpoint "PPM KPIs" "GET" "$BASE_URL/maintenance/ppm-kpis?ticketType=PPM"
test_endpoint "PPM Location Options" "GET" "$BASE_URL/maintenance/ppm-location-options"
test_endpoint "PPM Status Options" "GET" "$BASE_URL/maintenance/ppm-status-options"

# R&M (Repairs) APIs
test_endpoint "R&M Tasks List" "POST" "$BASE_URL/repairs" '{"page":1,"limit":10,"filters":{}}'
test_endpoint "R&M KPIs" "GET" "$BASE_URL/repairs/kpis"
test_endpoint "R&M Location Options" "GET" "$BASE_URL/repairs/location-options"
test_endpoint "R&M Status Options" "GET" "$BASE_URL/repairs/status-options"

# AMC Renewal APIs
test_endpoint "AMC Renewal Tasks List" "POST" "$BASE_URL/amc-renewal" '{"page":1,"limit":10,"filters":{}}'
test_endpoint "AMC Renewal KPIs" "GET" "$BASE_URL/amc-renewal/kpis"

# Dashboard APIs
test_endpoint "Dashboard Stats" "GET" "$BASE_URL/dashboard"

echo ""
echo "🏠 INTERNAL API ENDPOINTS"
echo "========================"

# Internal APIs
test_endpoint "Assets List" "GET" "$BASE_URL/assets"
test_endpoint "Categories List" "GET" "$BASE_URL/categories"
test_endpoint "Locations List" "GET" "$BASE_URL/locations"
test_endpoint "Maintenance Schedules" "GET" "$BASE_URL/maintenance/schedules"
test_endpoint "Coverage List" "GET" "$BASE_URL/coverage"

echo ""
echo "📊 Testing Complete!"
echo "==================="
echo ""
echo "⚠️  IMPORTANT: If you see 401 errors, update AUTH_TOKEN with a fresh token from:"
echo "   Browser Console: window.keycloak?.token"
echo ""

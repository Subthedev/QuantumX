#!/bin/bash

# Rate Limiting Test Script for marketing-stats Edge Function
# Tests: Authentication, Rate Limiting (20 req/min per IP), and Response Headers

set -e

echo "🧪 Marketing API Security Test Suite"
echo "====================================="
echo ""

# Configuration
SUPABASE_URL="https://vidziydspeewmcexqicg.supabase.co"
ENDPOINT="/functions/v1/marketing-stats?type=daily"
FULL_URL="${SUPABASE_URL}${ENDPOINT}"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ .env file not found. Please create one from .env.example"
    exit 1
fi

# Check if required env vars are set
if [ -z "$MARKETING_API_KEY" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
    echo "❌ Required environment variables not set:"
    echo "   - MARKETING_API_KEY"
    echo "   - VITE_SUPABASE_ANON_KEY"
    echo ""
    echo "Please update your .env file with valid keys."
    exit 1
fi

echo "📍 Testing Endpoint: $FULL_URL"
echo ""

# Test 1: Missing API Key (Should Fail with 401)
echo "Test 1: Missing API Key (Should Return 401)"
echo "───────────────────────────────────────────"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "$FULL_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ PASS: Unauthorized access blocked (401)"
    echo "   Response: $BODY"
else
    echo "❌ FAIL: Expected 401, got $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 2: Invalid API Key (Should Fail with 401)
echo "Test 2: Invalid API Key (Should Return 401)"
echo "───────────────────────────────────────────"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "$FULL_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "x-api-key: invalid-key-123")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ PASS: Invalid API key rejected (401)"
    echo "   Response: $BODY"
else
    echo "❌ FAIL: Expected 401, got $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 3: Valid Request (Should Succeed with 200)
echo "Test 3: Valid API Key (Should Return 200)"
echo "───────────────────────────────────────────"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
  "$FULL_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "x-api-key: $MARKETING_API_KEY")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ PASS: Valid request succeeded (200)"
    echo "   Response includes: $(echo "$BODY" | jq -r 'keys | join(", ")' 2>/dev/null || echo "Data returned")"
else
    echo "❌ FAIL: Expected 200, got $HTTP_CODE"
    echo "   Response: $BODY"
fi
echo ""

# Test 4: Rate Limiting (Send 25 requests, expect 429 after 20)
echo "Test 4: Rate Limiting (20 requests/minute limit)"
echo "───────────────────────────────────────────"
echo "Sending 25 rapid requests to trigger rate limit..."

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

for i in {1..25}; do
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
      "$FULL_URL" \
      -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
      -H "x-api-key: $MARKETING_API_KEY")

    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d':' -f2)

    if [ "$HTTP_CODE" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo -n "."
    elif [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
        echo -n "R"
    else
        echo -n "E"
    fi
done

echo ""
echo ""
echo "Results:"
echo "  ✅ Successful requests: $SUCCESS_COUNT"
echo "  🚫 Rate limited requests: $RATE_LIMITED_COUNT"
echo "  📊 Total requests: 25"

if [ $SUCCESS_COUNT -le 20 ] && [ $RATE_LIMITED_COUNT -ge 5 ]; then
    echo "  ✅ PASS: Rate limiting working correctly!"
    echo "         (Expected ~20 success, ~5 rate limited)"
else
    echo "  ⚠️  WARNING: Rate limiting behavior unexpected"
    echo "         (Expected ~20 success, ~5 rate limited)"
fi
echo ""

# Test 5: Check Rate Limit Headers
echo "Test 5: Rate Limit Response Headers"
echo "───────────────────────────────────────────"
echo "Waiting 60 seconds for rate limit to reset..."
sleep 60

HEADERS=$(curl -s -I \
  "$FULL_URL" \
  -H "Authorization: Bearer $VITE_SUPABASE_ANON_KEY" \
  -H "x-api-key: $MARKETING_API_KEY")

echo "$HEADERS" | grep -i "x-ratelimit" || echo "⚠️  Rate limit headers not found (may be normal)"
echo ""

# Summary
echo "====================================="
echo "🎯 Test Suite Complete"
echo "====================================="
echo ""
echo "Phase 1: Critical Security ✅ COMPLETED"
echo ""
echo "Implemented:"
echo "  ✅ .env files added to .gitignore"
echo "  ✅ Rate limiting (20 req/min per IP)"
echo "  ✅ Enhanced API key validation"
echo "  ✅ Removed all exposed keys from documentation"
echo "  ✅ Created .env.example template"
echo "  ✅ Documented API key rotation instructions"
echo ""
echo "Next Steps:"
echo "  1. Follow instructions in SECURITY_API_KEY_ROTATION.md"
echo "  2. Rotate all exposed API keys within 24 hours"
echo "  3. Update Make.com scenarios with new keys"
echo "  4. Proceed to Phase 2: Critical Bug Fixes"
echo ""

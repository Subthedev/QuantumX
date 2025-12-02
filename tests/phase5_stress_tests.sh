#!/bin/bash
# ============================================================================
# PHASE 5: STRESS TESTS
#
# Run these tests to verify system stability under load
# Date: December 3, 2025
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-https://vidziydspeewmcexqicg.supabase.co}"
MARKETING_API_KEY="${MARKETING_API_KEY:-your-api-key-here}"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   PHASE 5: STRESS TESTS${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ============================================================================
# TEST 1: Marketing API Rate Limit Test
# ============================================================================
echo -e "${YELLOW}TEST 1: Marketing API Rate Limit Test${NC}"
echo "Testing rate limiter: 20 requests/minute per IP"
echo ""

PASS_COUNT=0
RATE_LIMITED=0

for i in {1..25}; do
    response=$(curl -s -w "\n%{http_code}" \
        -H "x-api-key: $MARKETING_API_KEY" \
        "$SUPABASE_URL/functions/v1/marketing-stats?type=oracle" 2>/dev/null)

    http_code=$(echo "$response" | tail -n1)

    if [ "$http_code" = "200" ]; then
        PASS_COUNT=$((PASS_COUNT + 1))
        echo -e "  Request $i: ${GREEN}200 OK${NC}"
    elif [ "$http_code" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
        echo -e "  Request $i: ${YELLOW}429 Rate Limited${NC}"
    else
        echo -e "  Request $i: ${RED}$http_code Error${NC}"
    fi
done

echo ""
if [ $RATE_LIMITED -gt 0 ]; then
    echo -e "${GREEN}✅ Rate limiting is working!${NC}"
    echo "   Successful: $PASS_COUNT | Rate Limited: $RATE_LIMITED"
else
    echo -e "${RED}⚠️ Rate limiting may not be active (no 429 responses)${NC}"
fi
echo ""

# ============================================================================
# TEST 2: API Response Time Test
# ============================================================================
echo -e "${YELLOW}TEST 2: API Response Time Test${NC}"
echo "Testing response times for marketing-stats endpoint"
echo ""

TOTAL_TIME=0
for i in {1..5}; do
    # Wait 3 seconds between requests to avoid rate limiting
    sleep 3

    START=$(date +%s%N)
    curl -s -o /dev/null \
        -H "x-api-key: $MARKETING_API_KEY" \
        "$SUPABASE_URL/functions/v1/marketing-stats?type=all"
    END=$(date +%s%N)

    ELAPSED=$((($END - $START) / 1000000)) # Convert to milliseconds
    TOTAL_TIME=$((TOTAL_TIME + ELAPSED))
    echo "  Request $i: ${ELAPSED}ms"
done

AVG_TIME=$((TOTAL_TIME / 5))
echo ""
if [ $AVG_TIME -lt 2000 ]; then
    echo -e "${GREEN}✅ Average response time: ${AVG_TIME}ms (under 2s target)${NC}"
else
    echo -e "${YELLOW}⚠️ Average response time: ${AVG_TIME}ms (exceeds 2s target)${NC}"
fi
echo ""

# ============================================================================
# TEST 3: API Key Validation Test
# ============================================================================
echo -e "${YELLOW}TEST 3: API Key Validation Test${NC}"
echo "Testing authentication with invalid keys"
echo ""

# Test with no API key
response=$(curl -s -w "\n%{http_code}" \
    "$SUPABASE_URL/functions/v1/marketing-stats?type=oracle" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    echo -e "  No API key: ${GREEN}401 Unauthorized ✅${NC}"
else
    echo -e "  No API key: ${RED}$http_code (expected 401)${NC}"
fi

# Test with invalid API key
response=$(curl -s -w "\n%{http_code}" \
    -H "x-api-key: invalid-key-12345" \
    "$SUPABASE_URL/functions/v1/marketing-stats?type=oracle" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)

if [ "$http_code" = "401" ]; then
    echo -e "  Invalid API key: ${GREEN}401 Unauthorized ✅${NC}"
else
    echo -e "  Invalid API key: ${RED}$http_code (expected 401)${NC}"
fi
echo ""

# ============================================================================
# TEST 4: Concurrent Request Test
# ============================================================================
echo -e "${YELLOW}TEST 4: Concurrent Request Simulation${NC}"
echo "Simulating 10 concurrent requests (wait 60s for rate limit reset first)..."
echo ""

# Wait for rate limit to reset
sleep 60

# Run concurrent requests in background
for i in {1..10}; do
    curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
        -H "x-api-key: $MARKETING_API_KEY" \
        "$SUPABASE_URL/functions/v1/marketing-stats?type=daily" &
done

# Wait for all background processes
wait

echo ""
echo -e "${GREEN}✅ Concurrent request test completed${NC}"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}   TEST SUMMARY${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo "Tests completed. Review results above for any issues."
echo ""
echo "Next steps:"
echo "  1. Apply database migrations if not done"
echo "  2. Run data integrity verification queries"
echo "  3. Monitor logs for 24h continuous operation"
echo ""

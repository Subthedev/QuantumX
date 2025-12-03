#!/bin/bash

# Arena Marketing Data Pipeline - Quick Deploy Script
# Deploys all components for real-time, data-driven marketing

set -e

echo "🚀 Arena Marketing Data Pipeline Deployment"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found. Install from: https://supabase.com/docs/guides/cli${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Step 2: Check if logged in
echo ""
echo "🔐 Step 2: Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in. Running login...${NC}"
    supabase login
fi
echo -e "${GREEN}✅ Authenticated${NC}"

# Step 3: Deploy edge function
echo ""
echo "📦 Step 3: Deploying arena-trade-logger edge function..."
cd supabase/functions
supabase functions deploy arena-trade-logger
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Edge function deployed${NC}"
else
    echo -e "${RED}❌ Edge function deployment failed${NC}"
    exit 1
fi
cd ../..

# Step 4: Create database tables
echo ""
echo "🗄️  Step 4: Creating database tables..."
echo ""
echo -e "${YELLOW}⚠️  You need to run the SQL migration manually:${NC}"
echo ""
echo "1. Go to: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/editor"
echo "2. Click 'SQL Editor' → 'New Query'"
echo "3. Copy and paste contents of: supabase/migrations/20250102_arena_marketing_tables.sql"
echo "4. Click 'Run'"
echo ""
echo "5. Verify tables created by running this query:"
echo ""
echo -e "${YELLOW}SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'arena_%';${NC}"
echo ""
read -p "Press Enter once you've completed the SQL migration..."

# Step 5: Test edge function
echo ""
echo "🧪 Step 5: Testing edge function..."
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg"

TEST_RESPONSE=$(curl -s -X POST 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/arena-trade-logger' \
  -H "Authorization: Bearer $ANON_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "log_trade",
    "data": {
      "agentId": "alphax",
      "symbol": "BTC/USD",
      "direction": "LONG",
      "entryPrice": 97000,
      "exitPrice": 97500,
      "entryTime": 1735819200000,
      "exitTime": 1735820100000,
      "pnlPercent": 0.52,
      "pnlUsd": 5.20,
      "strategy": "MOMENTUM",
      "confidence": 78
    }
  }')

if echo "$TEST_RESPONSE" | grep -q "success"; then
    echo -e "${GREEN}✅ Edge function test passed${NC}"
else
    echo -e "${RED}❌ Edge function test failed:${NC}"
    echo "$TEST_RESPONSE"
    exit 1
fi

# Step 6: Test marketing stats API
echo ""
echo "🧪 Step 6: Testing marketing-stats API..."
MARKETING_KEY="0aTNcHTJGSelpFIqGLdl9-q0Ts-nBlg8fsc6prxFRhc"

STATS_RESPONSE=$(curl -s 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily' \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "x-api-key: $MARKETING_KEY")

TOTAL_TRADES=$(echo "$STATS_RESPONSE" | grep -o '"totalTrades":[0-9]*' | grep -o '[0-9]*$')

if [ "$TOTAL_TRADES" -gt 0 ]; then
    echo -e "${GREEN}✅ Marketing API returning real data: $TOTAL_TRADES trades${NC}"
else
    echo -e "${YELLOW}⚠️  Marketing API still showing 0 trades${NC}"
    echo "   This is normal if Arena hasn't logged any trades yet."
    echo "   Run the app and let agents trade for a few minutes."
fi

# Done
echo ""
echo "============================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Start the app: npm run dev"
echo "2. Let Arena agents trade for 5-10 minutes"
echo "3. Test marketing API:"
echo ""
echo "   curl 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all' \\"
echo "     -H 'Authorization: Bearer $ANON_KEY' \\"
echo "     -H 'x-api-key: $MARKETING_KEY'"
echo ""
echo "4. Enable Make.com scenarios to start tweeting!"
echo ""
echo "📖 Full guide: ARENA_MARKETING_DEPLOYMENT.md"

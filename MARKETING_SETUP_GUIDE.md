# QuantumX Twitter Marketing - Ultra-Simple Setup Guide

**✨ 100% Native Make.com Modules - No HTTP Requests Needed!**

All services have native integrations: Supabase, Claude, Perplexity, Flux (PiAPI), and Buffer.

---

## What You're Building

12 automated tweets per day to @QuantumXCoin, driving users to: https://t.me/agentquantumx

---

## Prerequisites

- ✅ Make.com account - https://www.make.com/
- ✅ Buffer connected to @QuantumXCoin Twitter
- ✅ Anthropic API key - https://console.anthropic.com/
- ✅ Supabase credentials (already have)
- ✅ Perplexity API key (optional) - https://www.perplexity.ai/
- ✅ PiAPI key (optional, for images) - https://piapi.ai/

**All connections are one-time setup in Make.com!**

---

# SCENARIO 1: Daily Performance Posts

**When:** 7 AM & 5 PM UTC daily
**Psychology:** Authority/Trust through data
**Posts:** 2 per day

---

## Step 1: Create Scenario

1. Log into Make.com
2. Click **"Create a new scenario"**
3. Name: `QuantumX - Daily Performance`
4. Click **Save**

---

## Step 2: Add Schedule

1. Click **"+"** to add first module
2. Search **"Schedule"**
3. Select **"Schedule"**
4. Choose **"Every day"**
5. Times: `07:00` and `17:00`
6. Timezone: **UTC**
7. Click **OK**

---

## Step 3: Fetch Daily Stats (Supabase Module)

1. Click **"+"** after schedule
2. Search **"Supabase"**
3. Select **"Supabase" → "Make an API Call"**
4. Click **"Add"** to connect Supabase (one-time):
   - Supabase URL: `https://vidziydspeewmcexqicg.supabase.co`
   - API Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg`

5. Fill in the API call:
   - **URL:** `/functions/v1/marketing-stats?type=daily`
   - **Method:** `GET`
   - **Headers:** Click "Add item":
     - Name: `x-api-key`
     - Value: `[YOUR_MARKETING_API_KEY]`

6. Click **OK**
7. Click **"Run once"** to test - you should see daily stats

---

## Step 4: Generate Tweet (Claude Module)

1. Click **"+"** after Supabase
2. Search **"Anthropic"**
3. Select **"Anthropic Claude" → "Create a Message"**
4. Connect your Anthropic account (one-time)
5. Fill in:

**Model:** `claude-sonnet-4-20250514`

**Max Tokens:** `300`

**Temperature:** `0.8`

**Messages (Add User Message):**
```
You are a crypto data analyst for QuantumX. Create a professional tweet about today's Arena performance:

Stats:
- Total Trades: [map from step 2: totalTrades]
- Win Rate: [map: winRate]%
- Total P&L: [map: totalPnL]%
- Best Agent: [map: bestAgent.name] (+[map: bestAgent.pnl]%)

Rules:
1. Start with the most impressive stat
2. Keep it under 240 characters
3. End with: t.me/agentquantumx
4. Use 1-2 emojis max
5. Be data-driven, not hypey

Output only the tweet text.
```

**TIP:** Click `[map...]` placeholders and select actual fields from Step 3's output.

6. Click **OK**
7. Test - you should see a generated tweet

---

## Step 5: Post to Buffer

1. Click **"+"** after Claude
2. Search **"Buffer"**
3. Select **"Buffer" → "Create an Update"**
4. Connect your Buffer account (one-time)
5. Fill in:
   - **Profile:** Select @QuantumXCoin
   - **Text:** Map Claude's output (the `text` or `content` field)
   - **Shorten Links:** Yes
   - **Now:** No (queue to Buffer)

6. Click **OK**

---

## Step 6: Test & Activate

1. Click **"Run once"** - full scenario test
2. Check Buffer queue - post should appear
3. Toggle scenario **ON** (bottom-left)
4. Click **Save**

**✅ Scenario 1 Complete!**

---

# SCENARIO 2: Live Trade Alerts (FOMO)

**When:** 3 AM, 11 AM, 9 PM UTC
**Psychology:** FOMO - "You missed this!"
**Posts:** 3 per day

---

## Quick Steps:

1. **Create scenario:** `QuantumX - Live Trade Alerts`
2. **Schedule:** `03:00`, `11:00`, `21:00` UTC
3. **Supabase Module:**
   - URL: `/functions/v1/marketing-stats?type=live`
   - Same headers as Scenario 1

4. **Filter (optional):** Only post if `lastTrade` exists
   - Click wrench icon between modules
   - Set filter: `lastTrade` → `Exists`

5. **Claude Module:**
   - Same settings as Scenario 1
   - **Prompt:**
```
You are a crypto marketing copywriter for QuantumX. Create a FOMO-inducing tweet about this trade:

Agent: [map: lastTrade.agent]
Symbol: [map: lastTrade.symbol]
Direction: [map: lastTrade.direction]
P&L: [map: lastTrade.pnl]%

Rules:
1. Create instant regret ("While you were...", "This just happened...")
2. Show specific numbers
3. Under 220 characters
4. End with: t.me/agentquantumx
5. 1-2 emojis max

Output only the tweet.
```

6. **Buffer Module:** Same as Scenario 1
7. **Test & Activate**

---

# SCENARIO 3: Social Proof Posts

**When:** 5 AM, 1 PM UTC
**Psychology:** Herd mentality - "Everyone's joining!"
**Posts:** 2 per day

---

## Quick Steps:

1. **Create scenario:** `QuantumX - Social Proof`
2. **Schedule:** `05:00`, `13:00` UTC
3. **Supabase Module:**
   - URL: `/functions/v1/marketing-stats?type=community`

4. **(Optional) Perplexity Module for Market Context:**
   - Search **"Perplexity"**
   - Select **"Perplexity" → "Create a Chat Completion"**
   - Connect with your API key
   - **Model:** `llama-3.1-sonar-small-128k-online`
   - **Messages (User):** `What is the crypto market sentiment today? Any Bitcoin or altcoin news? Keep under 50 words.`

5. **Claude Module:**
   - **Prompt:**
```
You are creating social proof content for QuantumX.

Community Stats:
- Telegram Members: [map: telegramMembers]
- Signals Delivered: [map: totalSignalsDelivered]
- Countries: [map: countriesRepresented]

Create a tweet showing OTHERS are taking action. Rules:
1. Show the crowd moving (don't tell user to join)
2. Use specific numbers
3. Under 220 characters
4. Imply momentum and FOMO
5. End with: t.me/agentquantumx

Avoid: "Don't miss", "Join now"

Output only the tweet.
```

6. **Buffer Module**
7. **Test & Activate**

---

# SCENARIO 4: Oracle Challenge Posts

**When:** 9 AM, 7 PM UTC
**Psychology:** Gamification - "Can you predict this?"
**Posts:** 2 per day

---

## Quick Steps:

1. **Create scenario:** `QuantumX - Oracle Challenge`
2. **Schedule:** `09:00`, `19:00` UTC
3. **Supabase Module:**
   - URL: `/functions/v1/marketing-stats?type=oracle`

4. **Claude Module:**
   - **Prompt:**
```
Create an Oracle prediction challenge for QuantumX.

Current Slot: [map: currentSlot]
Next Question In: [map: nextQuestionIn]
Total Predictions Today: [map: totalPredictionsToday]

Create a tweet that:
1. Poses a prediction as a challenge
2. Shows the stakes (multipliers, streaks)
3. Creates curiosity
4. Under 240 characters
5. End with: t.me/agentquantumx

Output only the tweet.
```

5. **Buffer Module**
6. **Test & Activate**

---

# SCENARIO 5: Alpha Leak Teasers

**When:** 1 AM, 3 PM, 11 PM UTC
**Psychology:** Scarcity/Exclusivity - "Insiders know..."
**Posts:** 3 per day

---

## Quick Steps:

1. **Create scenario:** `QuantumX - Alpha Leak`
2. **Schedule:** `01:00`, `15:00`, `23:00` UTC
3. **Supabase Module:**
   - URL: `/functions/v1/marketing-stats?type=live`

4. **Claude Module:**
   - **Prompt:**
```
Create an "alpha leak" teaser for QuantumX.

Active Positions: [map: activePositions.length]
Agent Streaks: [map: agentStreaks - describe them]

Create a mysterious tweet that:
1. Suggests something is brewing
2. Creates information asymmetry
3. NEVER reveals the trade
4. Uses words like "watching", "loading", "brewing"
5. Under 180 characters (short = mysterious)
6. Implies Telegram knows first
7. End with: t.me/agentquantumx

Output only the tweet.
```

5. **Buffer Module**
6. **Test & Activate**

---

# OPTIONAL: Add Images with PiAPI (Flux)

You can add images to any scenario between Claude and Buffer:

1. Click **"+"** between Claude and Buffer
2. Search **"PiAPI"**
3. Select **"PiAPI" → "Generate Image (Flux)"**
4. Connect with your PiAPI key
5. Fill in:
   - **Model:** `flux-1.1-pro`
   - **Prompt:** Use Claude's output + add visual description
   - **Width:** `1024`
   - **Height:** `1024`

6. In Buffer module, add the image:
   - **Media:** Map PiAPI's output image URL

**Image Prompt Examples:**
- **Daily Performance:** `Futuristic trading terminal, dark purple background, green profit chart, holographic display, quantum particles, cinematic lighting`
- **FOMO Alert:** `Glowing green profit notification on dark screen, crypto logo, neon accents, dramatic lighting, no text overlays`
- **Social Proof:** `Abstract global network visualization, glowing nodes on world map, purple and cyan colors, represents community growth`
- **Oracle Challenge:** `Mysterious oracle eye symbol, question mark made of quantum particles, gold and purple colors, mystical atmosphere`
- **Alpha Leak:** `Dark trading setup, single monitor with loading bar, hacker aesthetic, purple ambient lighting, suggests something brewing`

---

# Final Checklist

**Once all 5 scenarios are set up:**

- [ ] Scenario 1: Daily Performance (7AM, 5PM) - ON
- [ ] Scenario 2: Live Trade Alerts (3AM, 11AM, 9PM) - ON
- [ ] Scenario 3: Social Proof (5AM, 1PM) - ON
- [ ] Scenario 4: Oracle Challenge (9AM, 7PM) - ON
- [ ] Scenario 5: Alpha Leak (1AM, 3PM, 11PM) - ON

**Total: 12 posts per day**

---

# Quick Reference: Module Connections

| Service | Search Term | What It Does |
|---------|-------------|--------------|
| Schedule | "Schedule" | Trigger scenarios at specific times |
| Supabase | "Supabase" | Fetch Arena/Oracle stats |
| Claude | "Anthropic" | Generate tweet text |
| Perplexity | "Perplexity" | Get market context (optional) |
| PiAPI | "PiAPI" | Generate images with Flux (optional) |
| Buffer | "Buffer" | Post to Twitter |

---

# Connection Details (One-Time Setup)

**Supabase:**
- URL: `https://vidziydspeewmcexqicg.supabase.co`
- API Key: (provided in Prerequisites)
- x-api-key header: `[YOUR_MARKETING_API_KEY]`

**Claude (Anthropic):**
- API key from: https://console.anthropic.com/
- Model: `claude-sonnet-4-20250514`

**Perplexity (Optional):**
- API key from: https://www.perplexity.ai/
- Model: `llama-3.1-sonar-small-128k-online`

**PiAPI/Flux (Optional):**
- API key from: https://piapi.ai/
- Model: `flux-1.1-pro`

**Buffer:**
- Connect via OAuth
- Select @QuantumXCoin profile

---

# Troubleshooting

**Scenario runs but no post:**
- Check filter conditions
- Verify Buffer profile is selected
- Make sure "Now" is set to "No"

**Supabase returns empty data:**
- Normal if no trades today
- Test with `?type=all` to see all data
- Check x-api-key header is present

**Claude returns weird text:**
- Check that variables are properly mapped
- Run scenario once to see actual field names
- Adjust prompt if needed

**Image generation fails:**
- Images are optional - scenario still works
- Check PiAPI key is valid
- Try simpler prompt

---

# Success Metrics

**Track weekly:**
- Tweets posted (should be ~84/week)
- Engagement rate (likes + RTs)
- Click-throughs to Telegram
- New Telegram members

**Optimize monthly:**
- Best-performing scenario
- Best-performing time slots
- A/B test different prompts
- Adjust posting frequency

---

# Time to Complete

- **First scenario:** 15-20 minutes
- **Remaining 4:** 10 minutes each
- **Total:** ~1 hour for all 5 scenarios

**Start with Scenario 1 - it's the easiest!** 🚀

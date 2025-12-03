# QuantumX Marketing Setup Checklist

**✨ 100% Native Make.com Modules - Much Simpler Now!**

Follow this in order. Check off each item as you complete it.

---

## Phase 1: Prerequisites (Before Make.com)

- [ ] Have Make.com account (free or paid)
- [ ] Have Buffer account
- [ ] Buffer is connected to @QuantumXCoin Twitter account
- [ ] Have Anthropic API key (Claude)
- [ ] Have OpenAI API key (DALL-E) - optional for images
- [ ] Have Perplexity API key - optional for market context
- [ ] Open `API_CREDENTIALS.md` in a separate tab for copy-pasting

---

## Phase 2: Test Your Marketing API

Before building scenarios, verify the API works:

- [ ] Open Terminal
- [ ] Run test command from `API_CREDENTIALS.md`
- [ ] See JSON response with `daily`, `weekly`, `live`, `oracle`, `community` data
- [ ] If error, check the credentials or contact support

---

## Phase 3: Build Scenario 1 (Daily Performance)

**File:** [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) - Scenario 1

- [ ] Create new scenario named "QuantumX - Daily Performance"
- [ ] Add Schedule trigger (07:00, 17:00 UTC)
- [ ] Add HTTP module to fetch `?type=daily` stats
- [ ] Add Authorization and x-api-key headers
- [ ] Test HTTP module - see JSON data
- [ ] Add Claude HTTP module
- [ ] Paste Claude API URL and headers
- [ ] Paste Daily Performance prompt
- [ ] Map variables from step 1 to Claude prompt
- [ ] Test Claude module - see tweet text generated
- [ ] Add Buffer module
- [ ] Select @QuantumXCoin profile
- [ ] Map Claude response text to Buffer text field
- [ ] Set "Now" to "No"
- [ ] Run full scenario test
- [ ] Check Buffer queue for post
- [ ] Turn scenario ON
- [ ] Save scenario

**Status:** [ ] Complete ✅

---

## Phase 4: Build Scenario 2 (Live Trade Alert)

**File:** [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) - Scenario 2

- [ ] Create new scenario named "QuantumX - Live Trade Alert"
- [ ] Add Schedule (03:00, 11:00, 21:00 UTC)
- [ ] Add HTTP module for `?type=live`
- [ ] Add same headers as Scenario 1
- [ ] Test HTTP module
- [ ] Add Filter: "Has Last Trade" (lastTrade exists)
- [ ] Add Claude HTTP module with FOMO prompt
- [ ] Map live trade data to Claude prompt
- [ ] Test Claude - see FOMO tweet
- [ ] Add Buffer module
- [ ] Map Claude text to Buffer
- [ ] Run full test
- [ ] Verify Buffer queue
- [ ] Turn ON
- [ ] Save

**Status:** [ ] Complete ✅

---

## Phase 5: Build Scenario 3 (Social Proof)

**File:** [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) - Scenario 3

- [ ] Create scenario "QuantumX - Social Proof"
- [ ] Schedule (05:00, 13:00 UTC)
- [ ] HTTP for `?type=community`
- [ ] Test HTTP
- [ ] (Optional) Add Perplexity HTTP for market context
- [ ] Add Claude with Social Proof prompt
- [ ] Map community stats to Claude
- [ ] Test Claude
- [ ] Add Buffer
- [ ] Test full flow
- [ ] Turn ON
- [ ] Save

**Status:** [ ] Complete ✅

---

## Phase 6: Build Scenario 4 (Oracle Challenge)

**File:** [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) - Scenario 4

- [ ] Create scenario "QuantumX - Oracle Challenge"
- [ ] Schedule (09:00, 19:00 UTC)
- [ ] HTTP for `?type=oracle`
- [ ] Claude with Oracle Challenge prompt
- [ ] Map oracle data
- [ ] Buffer
- [ ] Test
- [ ] Turn ON
- [ ] Save

**Status:** [ ] Complete ✅

---

## Phase 7: Build Scenario 5 (Alpha Leak)

**File:** [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) - Scenario 5

- [ ] Create scenario "QuantumX - Alpha Leak"
- [ ] Schedule (01:00, 15:00, 23:00 UTC)
- [ ] HTTP for `?type=live`
- [ ] (Optional) Perplexity for context
- [ ] Claude with Alpha Leak prompt
- [ ] Map live data
- [ ] Buffer
- [ ] Test
- [ ] Turn ON
- [ ] Save

**Status:** [ ] Complete ✅

---

## Phase 8: Verify All Scenarios

- [ ] Go to Make.com dashboard
- [ ] Confirm 5 scenarios are visible
- [ ] All 5 scenarios show green "ON" toggle
- [ ] Check scenario run history (should be empty until scheduled time)
- [ ] Note: First posts will appear at their scheduled times

---

## Phase 9: Monitor First Week

**Day 1:**
- [ ] Check Buffer queue at 8AM UTC (should have 1 post from 7AM run)
- [ ] Verify post text quality
- [ ] Check Twitter - was it posted successfully?

**Day 2-7:**
- [ ] Daily: Review Buffer queue
- [ ] Check Twitter analytics for engagement (likes, RTs, replies)
- [ ] Note which scenarios get most engagement
- [ ] Check Telegram: Any new joins mentioning Twitter?

---

## Phase 10: Optimization (Week 2+)

- [ ] Review Twitter analytics
- [ ] Identify best-performing scenario
- [ ] Identify worst-performing scenario
- [ ] Adjust Claude prompts for low performers
- [ ] Consider increasing frequency of best performers
- [ ] A/B test different prompt styles
- [ ] Monitor Telegram join rate

---

## Common Issues & Solutions

**Issue:** Scenario runs but no Buffer post
- Solution: Check filter conditions, verify Buffer connection

**Issue:** Tweet text is cut off
- Solution: Reduce max_tokens in Claude or ask for shorter tweets in prompt

**Issue:** Same tweet posted twice
- Solution: Check schedule - might have duplicate times

**Issue:** No engagement on tweets
- Solution: Adjust prompts to be more compelling, add questions, test different times

**Issue:** API returns 401
- Solution: Check Authorization and x-api-key headers

---

## Success Metrics to Track

**Weekly:**
- [ ] Total tweets posted (should be ~84 per week)
- [ ] Average engagement per tweet (likes + RTs)
- [ ] Click-through rate on t.me links
- [ ] New Telegram members from Twitter source

**Monthly:**
- [ ] Twitter follower growth
- [ ] Best-performing scenario type
- [ ] Best-performing time slot
- [ ] Telegram conversion rate from Twitter

---

## Quick Links

- Make.com Dashboard: https://www.make.com/en/scenarios
- Buffer Queue: https://buffer.com/app/queue
- Twitter Analytics: https://analytics.twitter.com
- Telegram Analytics: Check bot or channel stats
- API Test: Run curl command from `API_CREDENTIALS.md`

---

## Need Help?

1. First: Check [MARKETING_SETUP_GUIDE.md](MARKETING_SETUP_GUIDE.md) troubleshooting section
2. Make.com: https://www.make.com/en/help
3. Buffer: https://buffer.com/help
4. Claude API: https://docs.anthropic.com/

---

## Completion

When all checkboxes above are ✅, you have:
- 5 automated scenarios running 24/7
- 12 tweets per day to @QuantumXCoin
- All posts queued through Buffer
- Data-driven content from real Arena/Oracle stats
- Psychological triggers targeting FOMO, authority, social proof, gamification, and scarcity

**You're done! 🎉**

# 🔍 Logo Pipeline Debug Guide

## What I Added

I've added comprehensive debug logging throughout the **entire signal pipeline** to track exactly where the image URL is being lost.

## Debug Logging Added

### 1. **Logo Fetching** (globalHubService.ts:2674-2676)
```
[GlobalHub] ✅ Got logo from CoinGecko API for [SYMBOL]
[GlobalHub] 🖼️  IMAGE URL: "[full-url]"
[GlobalHub] 🆔 CoinGecko ID: "[coingecko-id]"
```
OR if not found:
```
[GlobalHub] ⚠️  [SYMBOL] not found in top 100 cryptos, no logo available
```

### 2. **Signal Buffering** (globalHubService.ts:2742)
```
📥 Buffering signal for scheduled drop...
   Signal: [SYMBOL] [DIRECTION]
   Confidence: [value]
   🖼️  Image URL in displaySignal: "[url]"
```

### 3. **Database Saving** (globalHubService.ts:3236)
```
[GlobalHub] 💾 Saving to database - signal.image: "[url]"
```

### 4. **Database Reading** (IntelligenceHub.tsx:1630)
```
[Hub] 📸 Signal [SYMBOL] - metadata.image: "[url]"
```

### 5. **Card Component** (PremiumSignalCard.tsx:83)
```
[PremiumSignalCard] 🖼️  [SYMBOL] - image prop: "[url]"
```

### 6. **Logo Component** (cryptoLogos.tsx:53)
```
[CryptoLogo] 🎨 [SYMBOL] → cleaned: [CLEAN_SYMBOL] | imageUrl: "[url]"
```

## How to Use This Diagnostic

### Step 1: Clear Browser Cache
```bash
# Hard reload to ensure new code is loaded
# Mac: Cmd + Shift + R
# Windows/Linux: Ctrl + Shift + R
```

### Step 2: Open Intelligence Hub
```
http://localhost:8080/intelligence-hub
```

### Step 3: Open Browser Console (F12)

### Step 4: Wait for Next Signal (30 seconds for MAX tier)

### Step 5: Look for This Pattern

When a signal is generated and displayed, you should see this **complete sequence**:

```
✅ Step 1: Logo Fetched
[GlobalHub] ✅ Got logo from CoinGecko API for BTCUSDT
[GlobalHub] 🖼️  IMAGE URL: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
[GlobalHub] 🆔 CoinGecko ID: "bitcoin"

✅ Step 2: Signal Buffered
📥 Buffering signal for scheduled drop...
   Signal: BTCUSDT LONG
   Confidence: 75.3
   🖼️  Image URL in displaySignal: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"

✅ Step 3: Saved to Database
[GlobalHub] 💾 Saving to database - signal.image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"

✅ Step 4: Read from Database
[Hub] 📸 Signal BTCUSDT - metadata.image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"

✅ Step 5: Passed to Card
[PremiumSignalCard] 🖼️  BTCUSDT - image prop: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"

✅ Step 6: Passed to Logo
[CryptoLogo] 🎨 BTCUSDT → cleaned: BTC | imageUrl: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
```

## What to Look For

### ❌ **If Image URL is Empty at Step 1:**
**Problem:** Symbol not matching in CoinGecko API
**Shows:** `[GlobalHub] ⚠️  [SYMBOL] not found in top 100 cryptos, no logo available`
**Solution:** Add mapping in globalHubService.ts:940-945

### ❌ **If Image URL Empty at Step 2:**
**Problem:** Image not being added to displaySignal
**Check:** Line 2720 in globalHubService.ts

### ❌ **If Image URL Empty at Step 3:**
**Problem:** Image not being saved to database metadata
**Check:** Line 3260 in globalHubService.ts

### ❌ **If Image URL Empty at Step 4:**
**Problem:** Image not in database or not being read
**Solution:** Check database query, verify metadata column

### ❌ **If Image URL Empty at Step 5:**
**Problem:** Image prop not being passed from Hub to Card
**Check:** Line 1648 in IntelligenceHub.tsx

### ❌ **If Image URL Empty at Step 6:**
**Problem:** imageUrl prop not being passed from Card to Logo
**Check:** Line 183 in PremiumSignalCard.tsx

## Expected Result

If everything works correctly:
- All 6 steps show the SAME image URL
- The URL should be a CoinGecko asset URL like: `https://assets.coingecko.com/coins/images/[id]/large/[name].png`
- The logo should load in the UI (no fallback circle)

## What to Report Back

Please copy and paste:
1. The **complete console output** for ONE signal generation cycle
2. Which step (1-6) shows an empty image URL first
3. Any error messages

This will tell us **exactly** where the image URL is being lost!

---

**Start the diagnostic now and let me know what you find in the console logs!** 🔍

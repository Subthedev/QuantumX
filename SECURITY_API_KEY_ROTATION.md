# 🔐 URGENT: API Key Rotation Required

**Status:** ⚠️ **CRITICAL SECURITY ISSUE DETECTED**
**Date:** December 3, 2025
**Action Required:** Immediate (within 24 hours)

---

## What Happened

During the production hardening audit, we discovered that **API keys were previously committed to the repository** in the `.env` file. This is a **critical security vulnerability** as anyone with access to the repository history can retrieve these keys.

**Exposed Keys:**
- ✅ Supabase Anon Key
- ✅ Marketing API Key
- ✅ Etherscan API Key
- ✅ Solscan API Key

**Good News:** All exposed keys have been **removed from current files** and documentation. The `.env` file is now properly gitignored.

**Required Action:** You must **rotate all exposed keys immediately** to prevent unauthorized access.

---

## Step-by-Step Key Rotation

### 1. Rotate Supabase Anon Key

**Why:** The anon key was exposed and could allow unauthorized access to your Supabase database.

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `vidziydspeewmcexqicg`
3. Navigate to **Settings** → **API**
4. Under "Project API keys", click **"Regenerate"** next to the `anon` `public` key
5. **IMPORTANT:** Copy the new key immediately (it will only be shown once)
6. Update the new key in:
   - Your local `.env` file: `VITE_SUPABASE_ANON_KEY`
   - Make.com Supabase connection (if using)
   - Any other places where the key is stored

**Test:** Verify your app still works after updating the key.

---

### 2. Generate New Marketing API Key

**Why:** This key was hardcoded in multiple documentation files and needs to be replaced.

**Steps:**
1. Generate a new secure 256-bit random key:
   ```bash
   openssl rand -base64 32
   ```

   Example output: `Xk9pL2mQ8vR3wT6yU1nA5bC7dE4fG8hI9jK0lM2nO3p=`

2. Copy this new key

3. Update in your local `.env` file:
   ```bash
   MARKETING_API_KEY="Xk9pL2mQ8vR3wT6yU1nA5bC7dE4fG8hI9jK0lM2nO3p="
   ```

4. Update in **Supabase Edge Function secrets**:
   ```bash
   # Navigate to your project directory
   cd /Users/naveenpattnaik/Documents/ignitex-1

   # Set the new key in Supabase
   supabase secrets set MARKETING_API_KEY="Xk9pL2mQ8vR3wT6yU1nA5bC7dE4fG8hI9jK0lM2nO3p="
   ```

5. Update in **Make.com scenarios**:
   - Open each scenario (1-7)
   - Find the Supabase/HTTP module calling `marketing-stats`
   - Update the `x-api-key` header value with the new key
   - Save each scenario

**Test:** Verify Make.com scenarios can still access the marketing-stats API.

---

### 3. Rotate Etherscan API Key (If Used)

**Why:** Your Etherscan key was exposed in the `.env` file.

**Steps:**
1. Go to [Etherscan API Keys](https://etherscan.io/myapikey)
2. Log in with your account
3. Delete the old API key: `2N3AMCNYDJICVXEW7BG7SNU1NRIF6383DX`
4. Create a new API key:
   - Click **"+ Add"** button
   - Name it: "QuantumX Production"
   - Copy the new key

5. Update in your local `.env` file:
   ```bash
   VITE_ETHERSCAN_API_KEY="your-new-etherscan-key"
   ```

---

### 4. Rotate Solscan API Key (If Used)

**Why:** Your Solscan JWT was exposed in the `.env` file.

**Steps:**
1. Go to [Solscan Pro API](https://pro-api.solscan.io/)
2. Log in with your account (contactsubhrajeet@gmail.com)
3. Navigate to **API Keys** section
4. **Revoke** the old key
5. **Generate** a new API key
6. Copy the new JWT token

7. Update in your local `.env` file:
   ```bash
   VITE_SOLSCAN_API_KEY="your-new-solscan-jwt"
   ```

---

## Verification Checklist

After rotating all keys, verify that everything still works:

### ✅ Frontend Application
```bash
# Start the dev server
npm run dev

# Check that the app loads without errors
# Check that Supabase authentication works
# Check that blockchain data loads (if using Etherscan/Solscan)
```

### ✅ Supabase Edge Functions
```bash
# Test marketing-stats with new key
export SUPABASE_ANON_KEY="your-new-supabase-key"
export MARKETING_API_KEY="your-new-marketing-key"

curl -s "https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-api-key: $MARKETING_API_KEY" | jq
```

Expected: Should return JSON data without errors.

### ✅ Make.com Scenarios
1. Open each scenario (1-7)
2. Click **"Run once"** to test manually
3. Verify no authentication errors
4. Verify data is fetched successfully

### ✅ Arena Trading System
```bash
# Verify Arena can still write to Supabase
# Check that trades are being logged
# Check that agent sessions are active
```

---

## Future Prevention Measures (Already Implemented)

✅ **Added .env to .gitignore** - Future .env files will not be committed
✅ **Removed all hardcoded keys** from documentation
✅ **Created .env.example** - Template without sensitive values
✅ **Implemented rate limiting** - Marketing API now has 20 req/min protection
✅ **Enhanced API validation** - Better error messages and security logging

---

## What NOT to Do

❌ **DO NOT** commit .env files to the repository ever again
❌ **DO NOT** share API keys in Slack, Discord, or any public channels
❌ **DO NOT** hardcode API keys in source code or documentation
❌ **DO NOT** skip this rotation - exposed keys are a critical security risk

---

## What TO Do

✅ **DO** use environment variables for all secrets
✅ **DO** store production keys in secure password manager
✅ **DO** use different keys for development and production
✅ **DO** rotate keys immediately if you suspect exposure
✅ **DO** use `.env.example` as a template (no sensitive values)

---

## Additional Security Recommendations

### 1. Enable Supabase RLS (Row Level Security)
Ensure all database tables have RLS policies enabled to prevent unauthorized access even if keys are compromised.

### 2. Monitor API Usage
Regularly check:
- Supabase Dashboard → Logs → Check for unusual activity
- Etherscan/Solscan Dashboard → Monitor request counts
- Make.com → Execution logs → Watch for errors

### 3. Set Up Alerts
Configure alerts for:
- Unusual API request patterns
- Failed authentication attempts
- Rate limit violations

---

## Timeline for Completion

| Task | Deadline | Status |
|------|----------|--------|
| Rotate Supabase Anon Key | Within 2 hours | ⏳ Pending |
| Generate New Marketing API Key | Within 2 hours | ⏳ Pending |
| Rotate Etherscan Key | Within 12 hours | ⏳ Pending |
| Rotate Solscan Key | Within 12 hours | ⏳ Pending |
| Update Make.com Scenarios | Within 24 hours | ⏳ Pending |
| Verify All Systems Working | Within 24 hours | ⏳ Pending |

---

## Questions or Issues?

If you encounter any problems during key rotation:

1. **Supabase Issues:** Check [Supabase Status](https://status.supabase.com/)
2. **Make.com Issues:** Verify connection is properly configured
3. **Edge Function Issues:** Check function logs with `supabase functions logs marketing-stats`

---

## Completion

Once all keys are rotated and verified, update this section:

```
✅ All API keys rotated successfully
✅ All systems tested and working
✅ No security warnings in logs
✅ Make.com scenarios running normally

Date Completed: ______________
Completed By: ______________
```

---

**Last Updated:** December 3, 2025
**Priority:** 🔴 CRITICAL
**Status:** ⏳ ACTION REQUIRED

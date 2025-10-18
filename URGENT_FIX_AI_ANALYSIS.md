# 🚨 URGENT: Fix AI Analysis - Step by Step

## The Problem
Getting 500 error when trying to use AI Analysis:
```
Failed to load resource: the server responded with a status of 500
Error: Edge Function returned a non-2xx status code
```

## Root Cause
The `ANTHROPIC_API_KEY` environment variable is **NOT configured** in your Supabase project. The edge function cannot access the Claude API without this key.

---

## ✅ SOLUTION - Follow These Exact Steps

### Step 1: Get Your Anthropic API Key (5 minutes)

1. Go to: **https://console.anthropic.com/**
2. Sign in (or create a free account)
3. Click on **"API Keys"** in the left sidebar (or go to https://console.anthropic.com/settings/keys)
4. Click **"Create Key"**
5. Give it a name like "IgniteX Production"
6. **COPY the API key** - it starts with `sk-ant-...`
   - ⚠️ You can only see this ONCE! Save it somewhere safe
7. Make sure you have credits/billing enabled in your Anthropic account

### Step 2: Add API Key to Supabase (3 minutes)

1. Go to: **https://supabase.com/dashboard**
2. Select your project: **vidziydspeewmcexqicg** (IgniteX)
3. In the left sidebar, click **"Project Settings"** (gear icon at bottom)
4. Click on **"Edge Functions"** tab
5. Scroll down to find **"Secrets and environment variables"** section
6. Click **"Add new secret"** or **"Manage secrets"**
7. Add a new secret:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** Paste your API key (starts with `sk-ant-...`)
8. Click **"Save"** or **"Add secret"**

### Step 3: Verify It's Set (1 minute)

After adding the secret, you should see:
```
ANTHROPIC_API_KEY: ••••••••••••••••••••••••••••••
```

### Step 4: Wait & Test (2 minutes)

1. **Wait 1-2 minutes** for Supabase to propagate the secret to all edge functions
2. Refresh your browser page: http://localhost:8080/ai-analysis
3. Select a cryptocurrency (e.g., **Bitcoin**)
4. Select an analysis type (e.g., **Technical**)
5. Click **"Generate Analysis"**
6. **It should work now!** ✅

---

## 🔍 How to Verify It Worked

### Success Signs:
- ✅ Loading indicator appears with "Generating with IgniteX AI..."
- ✅ Analysis card appears after 3-5 seconds
- ✅ You see structured analysis with confidence score
- ✅ No errors in browser console

### Still Failing?
Check browser console (F12) for the EXACT error message and look for:

1. **"Anthropic API key not configured"** → API key not set properly in Supabase
2. **"Invalid API key"** → Wrong API key or not from Anthropic
3. **"Insufficient credits"** → No credits in Anthropic account
4. **Other errors** → Share the full error message

---

## 💰 Cost Information

- **Model Used:** Claude Haiku (cheapest, fastest)
- **Cost per Analysis:** ~$0.01-0.02
- **Optimizations Enabled:**
  - Prompt Caching: 90% cost reduction
  - Compressed Prompts: 70% fewer tokens
  - Haiku Model: 87% cheaper than Sonnet
- **Estimated Total Savings:** ~95% vs unoptimized

---

## 🛡️ Security Notes

✅ **Safe:**
- API key is stored in Supabase Edge Function secrets (encrypted)
- Never exposed to client/browser
- Not in your git repository
- Only accessible to backend edge functions

❌ **DO NOT:**
- Commit API keys to git
- Share your API key publicly
- Put it in .env files that are committed

---

## Alternative: Use Supabase CLI

If you prefer command line:

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link your project
npx supabase link --project-ref vidziydspeewmcexqicg

# Set the secret
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE

# Verify it's set
npx supabase secrets list
```

---

## Still Not Working?

### Debug Checklist:

1. ✅ API key is set in Supabase (not local .env)
2. ✅ API key starts with `sk-ant-`
3. ✅ API key is from Anthropic (not OpenAI)
4. ✅ You have credits in your Anthropic account
5. ✅ Waited 1-2 minutes after setting secret
6. ✅ Refreshed browser page
7. ✅ Selected both coin and analysis type

### Get the Exact Error:

1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Try generating analysis again
4. Look for red errors starting with `❌ Edge function error`
5. Share that error message

### Check Supabase Logs:

1. Go to Supabase Dashboard
2. Click **"Edge Functions"** in sidebar
3. Click on **"ai-analysis"** function
4. Click **"Logs"** tab
5. Look for recent errors
6. Share the error message

---

## Quick Reference

| Setting | Value |
|---------|-------|
| **Secret Name** | `ANTHROPIC_API_KEY` |
| **Where to Set** | Supabase Dashboard → Project Settings → Edge Functions → Secrets |
| **Key Format** | `sk-ant-...` |
| **From** | https://console.anthropic.com/ |
| **Wait Time** | 1-2 minutes after setting |

---

## Need Help?

1. Check if ANTHROPIC_API_KEY appears in Supabase secrets list
2. Verify you have Anthropic credits: https://console.anthropic.com/settings/billing
3. Share the browser console error (F12 → Console tab)
4. Share Supabase edge function logs (Dashboard → Edge Functions → ai-analysis → Logs)

**The most common issue is forgetting to set the API key in Supabase Dashboard!**

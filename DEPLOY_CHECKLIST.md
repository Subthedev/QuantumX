# ✅ AI Analysis Deployment Checklist

Follow these steps **IN ORDER**. Check each box as you complete it.

---

## Part 1: Terminal Commands (5 minutes)

Open your **Terminal** app and run these commands **ONE AT A TIME**:

### ☐ Step 1: Go to your project folder
```bash
cd /Users/naveenpattnaik/Documents/ignitex-1
```
**What you'll see:** The terminal path changes
**If error:** Make sure the folder exists

---

### ☐ Step 2: Login to Supabase
```bash
npx supabase login
```
**What you'll see:** Browser opens, asking you to log in
**What to do:** Log in with your Supabase account
**Success message:** `✓ Logged in`
**If error:** Close terminal, open new one, try again

---

### ☐ Step 3: Link your project
```bash
npx supabase link --project-ref vidziydspeewmcexqicg
```
**What you'll see:** Linking... progress messages
**Success message:** `✓ Finished linking project`
**If error:** Run `npx supabase login` again

---

### ☐ Step 4: Deploy the ai-analysis function
```bash
npx supabase functions deploy ai-analysis
```
**What you'll see:**
- Bundling...
- Uploading...
- Deployed function ai-analysis

**Success message:** `✓ Deployed function ai-analysis`
**If error:** Copy the error and STOP - send it to me

---

### ☐ Step 5: Verify it worked
```bash
npx supabase functions list
```
**What you should see:**
```
NAME            STATUS
ai-analysis     ACTIVE
```

**✅ If you see this - IT WORKED! Go to Part 2**
**❌ If ai-analysis is missing - send me the output**

---

## Part 2: Verify in Dashboard (2 minutes)

### ☐ Step 6: Open Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/functions
2. Refresh the page (F5)

**What you should see:**
- A function named `ai-analysis`
- Status: `Active` (or green dot)

**✅ If you see it - Continue to Step 7**
**❌ If you don't see it - Go back to Part 1, Step 4**

---

### ☐ Step 7: Check the API key is set
1. Click the "Back" arrow to go to Project Settings
2. Go to: **Project Settings** (gear icon in left sidebar)
3. Click on **Edge Functions** tab
4. Scroll to **"Secrets"** section
5. Look for: `ANTHROPIC_API_KEY`

**What you should see:**
```
ANTHROPIC_API_KEY: ••••••••••••••••••••
```

**✅ If you see it - Continue to Part 3**
**❌ If you don't see it:**
   1. Click "Add new secret"
   2. Name: `ANTHROPIC_API_KEY`
   3. Value: Your Anthropic API key (starts with sk-ant-)
   4. Click Save
   5. Wait 2 minutes

---

## Part 3: Test It! (2 minutes)

### ☐ Step 8: Test in your app
1. Open: http://localhost:8080/ai-analysis
2. From dropdown, select: **Bitcoin**
3. Check the box: **Technical Analysis**
4. Click: **"Generate Analysis"**

**What should happen:**
- Loading spinner appears
- Message: "Generating with IgniteX AI..."
- After 3-5 seconds: Analysis card appears!

**✅ SUCCESS! AI Analysis is working!**

---

## If It Still Fails (Debugging)

### ☐ Step 9: Check browser console
1. Press **F12** (or Cmd+Option+I on Mac)
2. Click **Console** tab
3. Try generating analysis again
4. Look for messages starting with ❌

**Copy any error messages you see**

---

### ☐ Step 10: Check Supabase logs
1. Go to: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/functions
2. Click on **ai-analysis**
3. Click **Logs** tab
4. Click **Refresh**
5. Try generating analysis in your app
6. Watch for new log entries

**Copy any error messages you see**

---

## Common Errors & Fixes

### Error: "Cannot find project ref"
**Fix:** Run `npx supabase link --project-ref vidziydspeewmcexqicg` again

### Error: "Anthropic API key not configured"
**Fix:**
1. Go to Project Settings → Edge Functions → Secrets
2. Add ANTHROPIC_API_KEY with your API key
3. Wait 2 minutes

### Error: "Invalid API key"
**Fix:**
1. Make sure your API key starts with `sk-ant-`
2. Get a new key from https://console.anthropic.com/settings/keys
3. Update it in Supabase secrets

### Error: "Function not found"
**Fix:**
1. Run `npx supabase functions deploy ai-analysis` again
2. Check `npx supabase functions list` shows ai-analysis

---

## Quick Reference

| Step | Command | Expected Result |
|------|---------|----------------|
| 1 | `cd /Users/naveenpattnaik/...` | Path changes |
| 2 | `npx supabase login` | Browser opens, login |
| 3 | `npx supabase link --project-ref ...` | ✓ Linked |
| 4 | `npx supabase functions deploy ai-analysis` | ✓ Deployed |
| 5 | `npx supabase functions list` | Shows ai-analysis |

---

## Final Checklist

Before asking for help, confirm:

- [ ] Ran all 5 terminal commands successfully
- [ ] See ai-analysis in `npx supabase functions list`
- [ ] See ai-analysis in Supabase Dashboard → Edge Functions
- [ ] See ANTHROPIC_API_KEY in Supabase secrets
- [ ] Waited at least 2 minutes after setting API key
- [ ] Refreshed browser page
- [ ] Checked browser console (F12) for errors
- [ ] Checked Supabase function logs for errors

---

## Need Help?

Send me:
1. **Which step failed?** (Step number)
2. **What command did you run?** (Copy-paste)
3. **What error did you get?** (Copy-paste full message)

I'll tell you exactly what to do! 🚀

---

## Success Indicators

You know it's working when:
- ✅ `npx supabase functions list` shows ai-analysis
- ✅ Dashboard shows ai-analysis as ACTIVE
- ✅ Generating analysis shows loading spinner
- ✅ Analysis card appears after 3-5 seconds
- ✅ No errors in browser console
- ✅ No errors in function logs

**If you see all of these - CONGRATULATIONS! 🎉**

# Deploy Edge Functions to Supabase

## The Problem
Your edge functions are NOT deployed to Supabase yet. They exist locally but need to be deployed to the cloud.

## Solution: Deploy via Supabase Dashboard

### Step 1: Go to Edge Functions Page
1. Go to: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/functions
2. You should see a list of your edge functions

### Step 2: Deploy test-api-key Function (to test API key)
1. Click **"Deploy a new function"** or **"New function"**
2. Choose **"Import from GitHub"** or **"Deploy from local"**
3. Select the `test-api-key` function
4. Click **"Deploy"**

### Step 3: Test the API Key
After deploying, test it:
```javascript
// Open browser console on your app
const { data, error } = await supabase.functions.invoke('test-api-key');
console.log(data);
// Should show: "✅ ANTHROPIC_API_KEY is configured"
```

### Step 4: Deploy ai-analysis Function
1. Go back to Edge Functions page
2. Deploy the `ai-analysis` function
3. Make sure all files are included:
   - `ai-analysis/index.ts`
   - `_shared/claude-optimizer.ts`
   - `_shared/rate-limiter.ts`

### Step 5: Test AI Analysis
1. Go to http://localhost:8080/ai-analysis
2. Select Bitcoin
3. Select Technical Analysis
4. Click "Generate Analysis"
5. **It should work!**

---

## Alternative: Deploy via VS Code Extension

If you have the Supabase VS Code extension:

1. Install: https://marketplace.visualstudio.com/items?itemName=supabase.supabase-vscode
2. Sign in to Supabase
3. Right-click on `supabase/functions/ai-analysis`
4. Click "Deploy Edge Function"

---

## Alternative: Deploy via Supabase CLI

If you want to use CLI:

### 1. Link your project
```bash
npx supabase login
npx supabase link --project-ref vidziydspeewmcexqicg
```

### 2. Deploy functions
```bash
# Deploy test function
npx supabase functions deploy test-api-key

# Deploy AI analysis
npx supabase functions deploy ai-analysis
```

### 3. Verify
```bash
npx supabase functions list
```

---

## Verify Functions Are Deployed

### Method 1: Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/vidziydspeewmcexqicg/functions
2. You should see:
   - `ai-analysis` - Status: Active
   - `test-api-key` - Status: Active
   - Other functions...

### Method 2: Direct API Call
```bash
curl https://vidziydspeewmcexqicg.supabase.co/functions/v1/test-api-key \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZHppeWRzcGVld21jZXhxaWNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDc3MzIsImV4cCI6MjA2OTQyMzczMn0.cn4UuIO1zg-vtNZbHuVhTHK0fuZIIGFhNzz4hwkdwvg"
```

Should return:
```json
{
  "hasKey": true,
  "keyPrefix": "sk-ant-...",
  "message": "✅ ANTHROPIC_API_KEY is configured"
}
```

---

## Common Issues

### "Function not found"
- Function hasn't been deployed yet
- Deploy it via dashboard or CLI

### "ANTHROPIC_API_KEY is NOT configured"
- API key not set in Supabase secrets
- Go to Project Settings → Edge Functions → Secrets
- Add ANTHROPIC_API_KEY

### "Import not found: _shared/..."
- Shared files not deployed
- Make sure to deploy with --import-map or include _shared folder

---

## Quick Test Script

Add this to your browser console:

```javascript
// Test if API key is configured
const testKey = async () => {
  const { data, error } = await supabase.functions.invoke('test-api-key');
  console.log('API Key Test:', data);
  return data;
};

// Test AI analysis
const testAI = async () => {
  const cryptos = await cryptoDataService.getTopCryptos(10);
  const bitcoin = cryptos[0];
  const detailedData = await cryptoDataService.getCryptoDetails('bitcoin');

  const { data, error } = await supabase.functions.invoke('ai-analysis', {
    body: {
      coin: bitcoin,
      detailedData,
      analysisType: 'technical'
    }
  });

  if (error) {
    console.error('❌ AI Analysis Error:', error);
  } else {
    console.log('✅ AI Analysis Success:', data);
  }

  return { data, error };
};

// Run tests
await testKey();
await testAI();
```

---

## Still Not Working?

1. **Check Supabase Function Logs:**
   - Dashboard → Edge Functions → ai-analysis → Logs
   - Look for errors

2. **Verify API Key:**
   - Check it's set in secrets (not local .env)
   - Verify it starts with `sk-ant-`
   - Test at https://console.anthropic.com/workbench

3. **Redeploy Everything:**
   ```bash
   npx supabase functions deploy ai-analysis --no-verify-jwt
   npx supabase functions deploy test-api-key --no-verify-jwt
   ```

4. **Check Function Permissions:**
   - Functions should be publicly accessible
   - Check RLS policies if authentication is required

---

## Important Notes

✅ **Functions must be DEPLOYED to work:**
- Having files locally is not enough
- They must be deployed to Supabase cloud
- Use dashboard, CLI, or VS Code extension

✅ **Secrets are separate from code:**
- ANTHROPIC_API_KEY is set in dashboard
- It's NOT in your code or .env files
- Each function can access it via `Deno.env.get()`

✅ **Shared dependencies must be deployed too:**
- `_shared/claude-optimizer.ts`
- `_shared/rate-limiter.ts`
- Make sure they're included in deployment

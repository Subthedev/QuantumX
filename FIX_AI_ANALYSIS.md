# Fix AI Analysis - Missing API Key

## Problem
The AI Analysis feature is not working because the `ANTHROPIC_API_KEY` environment variable is not configured in your Supabase project.

## Solution

### Step 1: Get Your Anthropic API Key
1. Go to [https://console.anthropic.com/](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to "API Keys" in the settings
4. Create a new API key (or use an existing one)
5. Copy the API key (it starts with `sk-ant-...`)

### Step 2: Add the API Key to Supabase

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project (IgniteX)
3. Go to **Project Settings** → **Edge Functions** → **Secrets**
4. Click "Add secret"
5. Name: `ANTHROPIC_API_KEY`
6. Value: Paste your Anthropic API key
7. Click "Save"

**Option B: Via Supabase CLI**
```bash
# Link your project first (if not already linked)
npx supabase link --project-ref YOUR_PROJECT_REF

# Set the secret
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR-KEY-HERE
```

### Step 3: Verify the Fix
1. After setting the API key, wait 1-2 minutes for the secret to propagate
2. Go to the AI Analysis page: http://localhost:8080/ai-analysis
3. Select a cryptocurrency (e.g., Bitcoin)
4. Select at least one analysis type (e.g., Technical)
5. Click "Generate Analysis"
6. The analysis should now generate successfully!

## Error Messages You Might See

### Before Fix:
- "Anthropic API key not configured"
- "Failed to generate analysis"
- 500 Internal Server Error

### After Fix:
- Analysis cards should appear with generated insights
- Progress indicators show during generation
- Results display with confidence scores

## Important Notes

⚠️ **Security:**
- Never commit API keys to git
- The API key is stored securely in Supabase Edge Function secrets
- It's only accessible to your backend functions

💰 **API Costs:**
- The app uses Claude Haiku (cheapest model) for most analyses
- Prompt caching reduces costs by ~90%
- Compressed prompts reduce costs by ~70%
- Estimated cost: ~$0.01-0.02 per analysis

🚀 **Performance:**
- Analyses run in parallel for speed
- Results typically generate in 3-5 seconds
- Cached results are near-instant

## Testing

After setting up the API key, test all analysis types:
1. ✅ Technical Analysis
2. ✅ Fundamental Analysis
3. ✅ Sentiment Analysis
4. ✅ On-Chain Analysis
5. ✅ Institutional/ETF Analysis

## Troubleshooting

If it still doesn't work after setting the API key:

1. **Check the secret name is correct:**
   ```bash
   npx supabase secrets list
   ```
   Should show: `ANTHROPIC_API_KEY`

2. **Check browser console for errors:**
   - Open DevTools (F12)
   - Look for red errors in Console tab
   - Share the error message for further debugging

3. **Check Supabase Edge Function logs:**
   - Go to Supabase Dashboard → Edge Functions → Logs
   - Look for errors from `ai-analysis` function

4. **Verify API key is valid:**
   - Test the API key directly: https://console.anthropic.com/workbench

## Support

If you continue to have issues:
1. Check the error message in browser DevTools console
2. Check Supabase Edge Function logs for server-side errors
3. Verify the API key starts with `sk-ant-` and is from Anthropic (not OpenAI)
4. Make sure you have credits in your Anthropic account

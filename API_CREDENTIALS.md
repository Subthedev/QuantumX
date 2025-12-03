# API Credentials Quick Reference

**✨ All services use native Make.com modules - just connect once!**

**⚠️ SECURITY WARNING:**
- **NEVER commit API keys to the repository**
- Store all credentials in Make.com's secure environment variables
- Rotate keys immediately if exposed
- Use `.env` files locally (already gitignored)

---

## Supabase Marketing API (Native Module)

**In Make.com:**
- Search for **"Supabase"**
- Select **"Supabase" → "Make an API Call"**
- Connect with these credentials (one-time):

**Connection Details:**
- Supabase URL: `https://vidziydspeewmcexqicg.supabase.co`
- API Key (anon): `[Get from your Supabase project settings]`

**For each API call, add this header:**
- Header Name: `x-api-key`
- Header Value: `[Use MARKETING_API_KEY from environment variables]`

**📍 Where to find your keys:**
1. Supabase Anon Key: Supabase Dashboard → Settings → API → `anon` `public`
2. Marketing API Key: Contact system administrator or check your `.env` file

---

## Endpoint URLs

| Type | Full URL |
|------|----------|
| All Stats | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all` |
| Daily | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=daily` |
| Weekly | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=weekly` |
| Live | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=live` |
| Oracle | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=oracle` |
| Community | `https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=community` |

---

## Claude API (Anthropic) - Native Make.com Module

**In Make.com:**
- Search for "Anthropic Claude"
- Select "Create a Message"
- Connect your account with your API key (one-time)

**Settings to use:**
- Model: `claude-sonnet-4-20250514` (or latest Sonnet)
- Max Tokens: `300`
- Temperature: `0.8`
- Role: `User`

**You'll need:**
- Anthropic API key from: https://console.anthropic.com/

---

## Perplexity API (Native Module - Optional)

**In Make.com:**
- Search for **"Perplexity"**
- Select **"Perplexity" → "Create a Chat Completion"**
- Connect with your API key (one-time)

**Settings:**
- Model: `llama-3.1-sonar-small-128k-online`
- Max Tokens: `100`

**You'll need:**
- Perplexity API key from: https://www.perplexity.ai/

---

## PiAPI (Flux Image Generation - Optional)

**In Make.com:**
- Search for **"PiAPI"**
- Select **"PiAPI" → "Generate Image (Flux)"**
- Connect with your API key (one-time)

**Settings:**
- Model: `flux-1.1-pro`
- Width: `1024`
- Height: `1024`

**You'll need:**
- PiAPI key from: https://piapi.ai/

---

## OpenAI API (DALL-E - Alternative to PiAPI)

**In Make.com:**
- Search for "OpenAI"
- Select "Create an Image (DALL-E)"
- Connect your account with your API key (one-time)

**Settings to use:**
- Model: `dall-e-3`
- Size: `1024x1024`
- Quality: `hd` or `standard`

**Note:** Images are optional. Tweets work great without them too!

**You'll need:**
- OpenAI API key from: https://platform.openai.com/api-keys

---

## Buffer Settings

**Profile:** @QuantumXCoin (select from dropdown in Make.com)

**Shorten Links:** Yes

**Now:** No (queue to Buffer)

---

## Test Commands

### Test Marketing API (Terminal):
```bash
# Set environment variables first
export SUPABASE_ANON_KEY="your_supabase_anon_key_here"
export MARKETING_API_KEY="your_marketing_api_key_here"

# Test the API
curl -s 'https://vidziydspeewmcexqicg.supabase.co/functions/v1/marketing-stats?type=all' \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "x-api-key: $MARKETING_API_KEY"
```

**Note:** Replace placeholders with actual keys from your `.env` file or Supabase dashboard.

### Expected Response:
```json
{
  "daily": { ... },
  "weekly": { ... },
  "live": {
    "activePositions": [...],
    "lastTrade": {...}
  },
  "oracle": { ... },
  "community": { ... }
}
```

---

## Posting Schedule (UTC Times)

| Time | Scenario | Endpoint |
|------|----------|----------|
| 01:00 | Alpha Leak | `?type=live` |
| 03:00 | Live Trade Alert | `?type=live` |
| 05:00 | Social Proof | `?type=community` |
| 07:00 | Daily Performance | `?type=daily` |
| 09:00 | Oracle Challenge | `?type=oracle` |
| 11:00 | Live Trade Alert | `?type=live` |
| 13:00 | Social Proof | `?type=community` |
| 15:00 | Alpha Leak | `?type=live` |
| 17:00 | Daily Performance | `?type=daily` |
| 19:00 | Oracle Challenge | `?type=oracle` |
| 21:00 | Live Trade Alert | `?type=live` |
| 23:00 | Alpha Leak | `?type=live` |

**Total: 12 posts per day**

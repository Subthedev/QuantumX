# Stripe Integration Setup Guide

This guide walks you through setting up Stripe for the tiered signal monetization system.

## 🎯 Overview

The tiered system has three subscription levels:
- **FREE**: $0 - 2 signals/day
- **PRO**: $49/month or $470/year - 15 signals/day
- **MAX**: $99/month or $950/year - 30 signals/day with early access

## 📋 Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Supabase project with database migrations applied
3. Access to Supabase Edge Functions

## 🚀 Step 1: Create Stripe Products and Prices

### In Stripe Dashboard:

1. Go to **Products** → **Add product**

2. Create **PRO** product:
   - Name: `IgniteX PRO`
   - Description: `15 AI signals per day with real-time delivery`
   - Create two prices:
     - **PRO Monthly**: $49/month (recurring)
     - **PRO Yearly**: $470/year (recurring, save $118)

3. Create **MAX** product:
   - Name: `IgniteX MAX`
   - Description: `30 AI signals per day with 10-minute early access`
   - Create two prices:
     - **MAX Monthly**: $99/month (recurring)
     - **MAX Yearly**: $950/year (recurring, save $238)

4. Copy the **Price IDs** (starts with `price_...`)

## 🔑 Step 2: Configure Environment Variables

### In Supabase Dashboard:

Go to **Project Settings** → **Edge Functions** → **Secrets**

Add the following secrets:

```bash
STRIPE_SECRET_KEY=sk_live_...  # From Stripe Dashboard → Developers → API Keys
STRIPE_PUBLISHABLE_KEY=pk_live_...  # From Stripe Dashboard → Developers → API Keys
STRIPE_WEBHOOK_SECRET=whsec_...  # Created in Step 3

# Price IDs from Step 1
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_MAX_MONTHLY=price_...
STRIPE_PRICE_MAX_YEARLY=price_...
```

### In Frontend (.env.local):

Create `.env.local` file in project root:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## 🔔 Step 3: Set Up Stripe Webhooks

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**

2. Click **Add endpoint**

3. Set endpoint URL:
   ```
   https://[your-project-ref].supabase.co/functions/v1/stripe-webhook
   ```

4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

5. Copy the **Signing secret** (`whsec_...`)

6. Add it to Supabase secrets as `STRIPE_WEBHOOK_SECRET`

## 📦 Step 4: Deploy Supabase Edge Functions

### Deploy the functions:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref [your-project-ref]

# Deploy stripe-checkout function
supabase functions deploy stripe-checkout

# Deploy stripe-webhook function
supabase functions deploy stripe-webhook
```

### Set function secrets:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
supabase secrets set STRIPE_PRICE_PRO_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_PRO_YEARLY=price_...
supabase secrets set STRIPE_PRICE_MAX_MONTHLY=price_...
supabase secrets set STRIPE_PRICE_MAX_YEARLY=price_...
```

## 🗄️ Step 5: Run Database Migrations

Apply the tiered subscription schema:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20251116_user_tiers_and_subscriptions.sql
```

This creates:
- `user_subscriptions` table
- `user_signal_quotas` table
- `user_signals` table
- `stripe_webhook_events` table
- Helper functions for tier management

## ✅ Step 6: Test the Integration

### Test Mode (Recommended First):

1. Use Stripe test keys (`sk_test_...` and `pk_test_...`)

2. Test checkout flow:
   - Go to `/upgrade` page
   - Click "Upgrade to PRO"
   - Use test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits

3. Verify in Supabase:
   - Check `user_subscriptions` table
   - Verify tier updated to `PRO`
   - Check `stripe_webhook_events` for logged events

### Production Mode:

1. Switch to live keys in environment variables

2. Update Stripe webhook endpoint to production URL

3. Test with real payment method

## 🎨 Step 7: Update Frontend

### Add routes to App.tsx:

```typescript
const IntelligenceHubTiered = lazy(() => import("./pages/IntelligenceHubTiered"));
const Upgrade = lazy(() => import("./pages/Upgrade"));

// In routes:
<Route path="/intelligence-hub-tiered" element={<ProtectedRoute><IntelligenceHubTiered /></ProtectedRoute>} />
<Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
```

## 🔧 Step 8: Connect Signal Distribution

### Integrate tiered signal gate with existing system:

In `globalHubService.ts`, after Quality Gate approval:

```typescript
// After signal passes Quality Gate
const approvedSignal = { ... };

// Distribute to tiered users
await tieredSignalGate.distributeSignal({
  id: approvedSignal.id,
  symbol: approvedSignal.symbol,
  signal_type: approvedSignal.direction,
  confidence: approvedSignal.confidence,
  quality_score: approvedSignal.qualityScore,
  entry_price: approvedSignal.entryPrice,
  take_profit: approvedSignal.takeProfitLevels,
  stop_loss: approvedSignal.stopLoss,
  timestamp: new Date().toISOString(),
  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  metadata: approvedSignal.metadata,
});
```

## 📊 Step 9: Monitor and Debug

### Check webhook delivery:

1. Stripe Dashboard → Developers → Webhooks → [Your endpoint]
2. View event logs and delivery attempts
3. Check `stripe_webhook_events` table in Supabase

### Debug checklist:

- ✅ Stripe keys are correct (test vs live)
- ✅ Webhook secret matches Supabase secret
- ✅ Edge functions deployed successfully
- ✅ Database migrations applied
- ✅ Frontend environment variables set
- ✅ User subscriptions updating on checkout
- ✅ Signals distributed based on tier

## 🎯 Revenue Projections

Based on proposed pricing:

**Conservative (50 users):**
- 30 PRO monthly @ $49 = $1,470/mo
- 10 PRO yearly @ $470/12 = $392/mo
- 8 MAX monthly @ $99 = $792/mo
- 2 MAX yearly @ $950/12 = $158/mo
- **Total: ~$2,812/month**

**Moderate (200 users):**
- 120 PRO monthly @ $49 = $5,880/mo
- 40 PRO yearly @ $470/12 = $1,567/mo
- 30 MAX monthly @ $99 = $2,970/mo
- 10 MAX yearly @ $950/12 = $792/mo
- **Total: ~$11,209/month**

**Optimistic (500 users):**
- 300 PRO monthly @ $49 = $14,700/mo
- 100 PRO yearly @ $470/12 = $3,917/mo
- 75 MAX monthly @ $99 = $7,425/mo
- 25 MAX yearly @ $950/12 = $1,979/mo
- **Total: ~$28,021/month**

## 🚨 Important Notes

1. **Compliance**: Ensure compliance with financial regulations in your jurisdiction

2. **Terms of Service**: Update ToS to include subscription terms and refund policy

3. **Refunds**: Implement 30-day money-back guarantee as advertised

4. **Customer Support**: Set up support channel for billing inquiries

5. **Testing**: Always test in Stripe test mode before going live

6. **Security**: Never commit Stripe keys to version control

7. **Analytics**: Track conversion rates and optimize pricing

## 📞 Support

- Stripe Documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Project Issues: [GitHub Issues Link]

## ✨ Next Steps

After setup is complete:

1. Launch marketing campaign highlighting tiered benefits
2. Create onboarding flow for new PRO/MAX users
3. Monitor conversion rates and optimize pricing
4. Add usage analytics dashboard
5. Implement referral program for growth
6. Consider adding enterprise tier for institutions

---

**Built with ❤️ by the IgniteX team**

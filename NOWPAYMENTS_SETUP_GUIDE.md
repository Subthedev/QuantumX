# NOWPayments Setup Guide (Simple Crypto Payments)

This guide shows you how to set up **NOWPayments** for accepting cryptocurrency payments for your tiered subscriptions. Much simpler than Stripe - no complex verification needed!

## 🎯 Why NOWPayments?

- ✅ **No complex verification** (unlike Stripe)
- ✅ **Accept 200+ cryptocurrencies** (BTC, ETH, USDT, etc.)
- ✅ **Simple payment links** - no webhook integration needed
- ✅ **Instant setup** - ready in 30 minutes
- ✅ **Lower fees** (0.5% vs Stripe's 2.9%)

---

## 📋 Step 1: Create NOWPayments Account

1. Go to **https://nowpayments.io**
2. Click **"Sign Up"**
3. Create account with email
4. **No ID verification required** for basic payments!

---

## 💳 Step 2: Create Payment Pages

NOWPayments allows you to create **preset payment pages** with fixed amounts. Create 4 pages:

### 1. PRO Monthly ($49/month)
1. Go to **Payment Links** → **Create Link**
2. Set:
   - **Amount**: 49 USD
   - **Title**: "IgniteX PRO Monthly"
   - **Description**: "15 AI signals/day with real-time delivery"
   - **Crypto**: Enable BTC, ETH, USDT
3. Copy the payment link (looks like: `https://nowpayments.io/payment/?iid=XXXXX`)

### 2. PRO Yearly ($470/year)
- **Amount**: 470 USD
- **Title**: "IgniteX PRO Yearly"
- **Description**: "15 AI signals/day (Save $118/year)"

### 3. MAX Monthly ($99/month)
- **Amount**: 99 USD
- **Title**: "IgniteX MAX Monthly"
- **Description**: "30 AI signals/day with early access"

### 4. MAX Yearly ($950/year)
- **Amount**: 950 USD
- **Title**: "IgniteX MAX Yearly"
- **Description**: "30 AI signals/day (Save $238/year)"

---

## 🔑 Step 3: Configure Environment Variables

Create `.env.local` file in project root:

```bash
# NOWPayments API Key (optional - only needed for advanced features)
VITE_NOWPAYMENTS_API_KEY=your_api_key_here

# Payment page links (from Step 2)
VITE_NOWPAYMENTS_PRO_MONTHLY_LINK=https://nowpayments.io/payment/?iid=YOUR_PRO_MONTHLY_ID
VITE_NOWPAYMENTS_PRO_YEARLY_LINK=https://nowpayments.io/payment/?iid=YOUR_PRO_YEARLY_ID
VITE_NOWPAYMENTS_MAX_MONTHLY_LINK=https://nowpayments.io/payment/?iid=YOUR_MAX_MONTHLY_ID
VITE_NOWPAYMENTS_MAX_YEARLY_LINK=https://nowpayments.io/payment/?iid=YOUR_MAX_YEARLY_ID
```

---

## 🗄️ Step 4: Run Database Migration

Apply the tiered subscription schema:

```bash
# In Supabase SQL Editor, run:
supabase/migrations/20251116_user_tiers_and_subscriptions.sql
```

This creates all necessary tables for tier management.

---

## ✅ Step 5: Test the Flow

1. **Visit the upgrade page**: Go to `/upgrade`
2. **Click "Pay with Crypto"** on PRO or MAX tier
3. **Payment page opens** in new tab
4. **Complete test payment** (use NOWPayments sandbox mode if available)
5. **Manually upgrade user** (see Step 6)

---

## 👤 Step 6: Manual Subscription Activation

Since NOWPayments doesn't have automatic webhooks like Stripe, you'll need to manually activate subscriptions after receiving payment.

### In Supabase SQL Editor:

```sql
-- Upgrade user to PRO tier
UPDATE user_subscriptions
SET
  tier = 'PRO',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month'  -- or '1 year' for yearly
WHERE user_id = 'user-uuid-here';

-- Or MAX tier
UPDATE user_subscriptions
SET
  tier = 'MAX',
  status = 'active',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '1 month'
WHERE user_id = 'user-uuid-here';
```

### Find user UUID:

```sql
-- Find user by email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

---

## 🔔 Step 7: Set Up Payment Notifications (Optional)

NOWPayments can send email notifications when payments are received:

1. Go to **Settings** → **Notifications**
2. Add your email address
3. You'll receive an email when payment is complete
4. Use the info to manually activate the subscription

### Better Approach - IPN Webhook (Advanced):

If you want automation, set up an IPN webhook:

1. Create Supabase Edge Function `nowpayments-webhook`
2. Add webhook URL in NOWPayments dashboard
3. Parse payment data and auto-update subscriptions

*For now, manual activation is simpler and works great!*

---

## 📊 Revenue Tracking

Track payments in NOWPayments dashboard:
- **Payments** tab shows all transactions
- Export to CSV for accounting
- View by cryptocurrency, amount, date

---

## 🚀 Workflow Summary

1. **User clicks "Pay with Crypto"** on your upgrade page
2. **NOWPayments page opens** in new tab
3. **User pays with BTC/ETH/USDT** (their choice)
4. **You receive email notification** from NOWPayments
5. **You manually activate subscription** via SQL
6. **User gets PRO/MAX tier** immediately

**Manual activation takes 2 minutes per user** - totally worth it for avoiding Stripe's complex setup!

---

## 💡 Tips for Manual Management

### Create a simple admin dashboard:

```sql
-- View all pending payments (users who contacted you)
SELECT
  u.email,
  us.tier,
  us.status,
  us.created_at
FROM user_subscriptions us
JOIN auth.users u ON u.id = us.user_id
WHERE us.tier = 'FREE'
ORDER BY us.created_at DESC;
```

### Keep a spreadsheet:
- Column 1: User Email
- Column 2: Payment Amount
- Column 3: NOWPayments Transaction ID
- Column 4: Date Activated
- Column 5: Expiry Date

---

## 📞 Support Workflow

When users contact you after payment:

1. **Ask for**:
   - Payment transaction ID (from NOWPayments)
   - Email address used
   - Plan purchased (PRO/MAX, monthly/yearly)

2. **Verify payment** in NOWPayments dashboard

3. **Run SQL** to activate subscription

4. **Reply**: "Your [PRO/MAX] subscription is now active! Enjoy your signals! 🚀"

---

## 🎯 Monthly Revenue Projections

Based on proposed pricing with NOWPayments (0.5% fee):

**Conservative (50 users):**
- Revenue: $2,812/month
- NOWPayments fee (0.5%): $14/month
- **Net:** $2,798/month

**Moderate (200 users):**
- Revenue: $11,209/month
- NOWPayments fee: $56/month
- **Net:** $11,153/month

**Optimistic (500 users):**
- Revenue: $28,021/month
- NOWPayments fee: $140/month
- **Net:** $27,881/month

**Compare to Stripe:**
- Stripe fee (2.9% + $0.30): Would cost $815 - $2,765/month in fees!
- **NOWPayments saves you $800 - $2,600/month!**

---

## 🔧 Troubleshooting

**Payment link doesn't work:**
- Check URL is correct in `.env.local`
- Verify payment page is active in NOWPayments dashboard

**User says payment completed but didn't receive access:**
- Check NOWPayments dashboard for transaction
- Verify user email matches database
- Run SQL activation query

**Want to cancel subscription:**
```sql
UPDATE user_subscriptions
SET
  tier = 'FREE',
  status = 'canceled',
  current_period_end = NOW()
WHERE user_id = 'user-uuid-here';
```

---

## ✨ Scaling to Automation (Future)

When you have 100+ users, consider automating with:

1. **Supabase Edge Function** for NOWPayments IPN webhook
2. **Auto-activation** on payment confirmed
3. **Auto-renewal reminders** via email
4. **Grace period** for expired subscriptions

For now, manual management is fast and reliable! 🚀

---

## 📞 Support

- NOWPayments Documentation: https://nowpayments.io/doc
- NOWPayments Support: support@nowpayments.io
- Your support email: support@ignitex.live

---

**That's it! Much simpler than Stripe, and you can start accepting crypto payments in under an hour! 💳**

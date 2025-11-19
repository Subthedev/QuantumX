# 🚀 Deploy to Vercel - Production Guide

## ✅ Code Pushed to GitHub

Your code is now on GitHub at branch: **V-AQ**
```
https://github.com/Subthedev/ignitex
Branch: V-AQ
```

---

## 🎯 Deploy to Vercel (10 minutes)

### **Step 1: Login to Vercel** (1 minute)

1. **Go to:** https://vercel.com
2. **Click:** "Login" or "Sign Up"
3. **Connect with GitHub** if not already connected

---

### **Step 2: Import Your Repository** (2 minutes)

1. **Click:** "Add New..." → "Project"
2. **Find:** "ignitex" repository
3. **Click:** "Import"
4. **Select Branch:** `V-AQ` (or your main branch)

---

### **Step 3: Configure Build Settings** (2 minutes)

Vercel will auto-detect Vite. **Verify these settings:**

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**Root Directory:** Leave as `.` (root)

---

### **Step 4: Add Environment Variables** (3 minutes)

Click **"Environment Variables"** and add these:

#### **Required Variables:**

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
```

**How to get Supabase values:**
1. Go to: https://supabase.com/dashboard
2. Select your IgniteX project
3. Click: Settings → API
4. Copy: **Project URL** → `VITE_SUPABASE_URL`
5. Copy: **anon public** key → `VITE_SUPABASE_ANON_KEY`

#### **Optional Variables (if using):**

```bash
# Stripe (if payment features enabled)
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key

# NOWPayments (if crypto payments enabled)
VITE_NOWPAYMENTS_API_KEY=your_nowpayments_key
```

---

### **Step 5: Deploy!** (2 minutes)

1. **Click:** "Deploy"
2. **Wait** for build to complete (1-3 minutes)
3. **You'll see:** Deployment progress logs

**Expected:**
```
✅ Building...
✅ Build successful
✅ Deploying...
✅ Deployment ready
```

Your site will be live at: `https://ignitex-xyz.vercel.app` (or similar)

---

## 🔧 Post-Deployment Configuration

### **Update Supabase Redirect URLs** (2 minutes)

Your production URL is now active. Update Supabase to allow auth redirects:

1. **Go to:** https://supabase.com/dashboard → Your Project → Authentication → URL Configuration

2. **Add to "Site URL":**
   ```
   https://your-production-url.vercel.app
   ```

3. **Add to "Redirect URLs":**
   ```
   https://your-production-url.vercel.app/**
   https://your-production-url.vercel.app/auth/callback
   ```

4. **Click:** "Save"

---

## 🧪 Test Production Deployment

### **Test 1: Basic Access**

1. Visit your Vercel URL
2. Check home page loads
3. Try navigation

**Expected:** All pages load without errors ✅

### **Test 2: Authentication**

1. Click "Sign Up" or "Login"
2. Create account or login
3. Check email for verification

**Expected:** Auth works, redirects correctly ✅

### **Test 3: Intelligence Hub**

1. Login to your account
2. Navigate to Intelligence Hub
3. Check if timer appears

**Expected:** Timer counts down, quota shows ✅

### **Test 4: Signal Generation**

If you set up the edge function:

1. Manually trigger edge function (see below)
2. Check Intelligence Hub
3. Signal should appear within 1-2 seconds

**Expected:** Signal appears in real-time ✅

---

## 🔄 Continuous Deployment

Vercel is now watching your GitHub repository!

**Whenever you push to V-AQ branch:**
1. Vercel automatically detects changes
2. Builds new version
3. Deploys if build succeeds
4. Your site updates automatically

**To deploy:**
```bash
# Make changes locally
git add .
git commit -m "Your changes"
git push origin V-AQ

# Vercel deploys automatically!
```

---

## 📋 Production Checklist

After deployment, verify:

- [ ] Site loads at Vercel URL
- [ ] All routes work (Dashboard, Portfolio, etc.)
- [ ] Authentication works (login/signup)
- [ ] Supabase connection works
- [ ] Intelligence Hub displays correctly
- [ ] Timer component appears
- [ ] Environment variables are set
- [ ] No console errors (F12)

---

## 🚀 Setup Edge Function for Production

Your edge function needs to run on Supabase (not Vercel):

### **Option 1: Manual Deployment (Already Done)**

If you deployed via Supabase Dashboard earlier, it's already live!

### **Option 2: CLI Deployment**

```bash
# Deploy edge function
supabase functions deploy signal-generator

# Verify deployment
supabase functions list
```

### **Option 3: Set Up Cron Job**

For 24/7 autonomous signals, set up cron-job.org:

1. **Go to:** https://cron-job.org (free account)
2. **Create new cron job:**
   - **Title:** IgniteX Signal Generator
   - **URL:** `https://YOUR_PROJECT_REF.supabase.co/functions/v1/signal-generator`
   - **Schedule:** `*/30 * * * * *` (every 30 seconds - or use tier intervals)
   - **Method:** POST
   - **Headers:**
     ```
     Authorization: Bearer YOUR_SERVICE_ROLE_KEY
     Content-Type: application/json
     ```
3. **Save and Enable**

**For tier-aware intervals:**
- FREE: Every 8 hours (`0 */8 * * *`)
- PRO: Every 96 minutes (use 30 sec for testing, then `*/96 * * * *`)
- MAX: Every 48 minutes (`*/48 * * * *`)

---

## 🔍 Monitor Your Deployment

### **Vercel Dashboard**

Check deployment status:
- **URL:** https://vercel.com/dashboard
- **View:** Deployments, Logs, Analytics
- **Monitor:** Build times, errors, traffic

### **Supabase Dashboard**

Check edge function logs:
- **URL:** https://supabase.com/dashboard → Functions → signal-generator
- **View:** Invocation logs, errors
- **Monitor:** Signal generation success rate

---

## 🚨 Troubleshooting

### **Build Fails on Vercel**

**Check build logs** for errors:
- TypeScript errors
- Missing dependencies
- Environment variable issues

**Common fixes:**
```bash
# Test build locally first
npm run build

# If succeeds locally but fails on Vercel:
# - Check Node.js version (Vercel uses Node 18 by default)
# - Verify all dependencies in package.json
# - Check environment variables are set
```

### **Site Loads but Features Don't Work**

**Missing environment variables:**
- Check Vercel → Project → Settings → Environment Variables
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Re-deploy after adding variables

### **Authentication Fails**

**Redirect URL mismatch:**
- Update Supabase redirect URLs (see Post-Deployment Configuration)
- Make sure production URL is added
- Clear browser cache and try again

### **Signals Not Appearing**

**Check edge function:**
- Verify deployed: `supabase functions list`
- Check logs: Supabase Dashboard → Functions → Logs
- Test manually: See "Test Production Deployment" section

**Check database:**
- Run `CREATE_FIRST_SIGNAL.sql` to create test signal
- Verify signal appears in `user_signals` table
- Check user_id matches your logged-in user

---

## 🎉 You're Live!

Your IgniteX platform is now deployed to production on Vercel!

**Next steps:**
1. Share your Vercel URL with users
2. Monitor Vercel and Supabase dashboards
3. Set up custom domain (optional, via Vercel)
4. Enable Vercel Analytics for insights
5. Configure edge function cron for autonomous signals

---

## 📊 Custom Domain (Optional)

Want to use your own domain like `ignitex.com`?

1. **Vercel Dashboard** → Your Project → Settings → Domains
2. **Add Domain:** Enter your domain
3. **Follow DNS instructions** (add CNAME or A record)
4. **Wait for verification** (a few minutes)
5. **Update Supabase redirect URLs** with new domain

---

## 🔐 Security Recommendations

For production:

1. **Enable HTTPS** (Vercel does this automatically ✅)
2. **Set up Row Level Security** in Supabase
3. **Rotate API keys** periodically
4. **Monitor error logs** for suspicious activity
5. **Set up alerts** in Vercel and Supabase

---

## 💡 Pro Tips

1. **Use Preview Deployments:**
   - Create new branch for features
   - Vercel creates preview URL automatically
   - Test before merging to main/V-AQ

2. **Enable Vercel Analytics:**
   - See real user traffic
   - Track page load times
   - Monitor Core Web Vitals

3. **Set Up Monitoring:**
   - Vercel Real User Monitoring
   - Sentry for error tracking
   - Supabase monitoring dashboard

4. **Optimize Performance:**
   - Vercel Edge Network (automatic)
   - Image optimization (Vercel)
   - Code splitting (already configured in vite.config.ts)

---

## 📞 Support

**Vercel Issues:**
- Dashboard: https://vercel.com/dashboard
- Docs: https://vercel.com/docs
- Support: https://vercel.com/support

**Supabase Issues:**
- Dashboard: https://supabase.com/dashboard
- Docs: https://supabase.com/docs
- Support: https://supabase.com/support

---

**Your deployment URL will be shown after Step 5 completes!** 🎯

Example: `https://ignitex-abc123.vercel.app`

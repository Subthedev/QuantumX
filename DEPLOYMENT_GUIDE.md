# IgniteX Production Deployment Guide

This guide will help you deploy IgniteX to production and fix the 404 error on `/email-verified`.

## Problem
Currently, https://ignitexagency.com/email-verified shows a 404 error because:
1. The production site hasn't been updated with the latest code
2. The hosting needs to be configured for React Router (SPA)

## Solution

### Option 1: Vercel Deployment (Recommended - Easiest)

#### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Import your repository: `Subthedev/ignitex`
4. Configure project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Step 2: Add Environment Variables (if needed)

If you have any `.env` variables, add them in Vercel:
- Go to Project Settings → Environment Variables
- Add any required variables

#### Step 3: Deploy

1. Click **"Deploy"**
2. Wait for deployment to complete (2-3 minutes)
3. Get your deployment URL (e.g., `ignitex.vercel.app`)

#### Step 4: Connect Custom Domain

1. Go to Project Settings → Domains
2. Add your domain: `ignitexagency.com`
3. Follow Vercel's DNS instructions to point your domain
4. Wait for DNS propagation (5-60 minutes)

**Vercel automatically handles:**
- ✅ SPA routing (all routes redirect to index.html)
- ✅ HTTPS/SSL certificates
- ✅ Automatic deployments on git push
- ✅ Preview deployments for PRs

---

### Option 2: Netlify Deployment

#### Step 1: Connect to Netlify

1. Go to [netlify.com](https://netlify.com) and sign in with GitHub
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose GitHub and select repository: `Subthedev/ignitex`

#### Step 2: Configure Build Settings

Netlify will auto-detect settings from `netlify.toml`, but verify:
- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Branch to deploy**: `main`

#### Step 3: Deploy

1. Click **"Deploy site"**
2. Wait for deployment (2-3 minutes)
3. Get your deployment URL (e.g., `ignitex.netlify.app`)

#### Step 4: Connect Custom Domain

1. Go to Site settings → Domain management
2. Click **"Add custom domain"**
3. Enter `ignitexagency.com`
4. Follow Netlify's DNS instructions
5. Wait for DNS propagation

**Netlify automatically handles:**
- ✅ SPA routing (configured in netlify.toml)
- ✅ HTTPS/SSL certificates
- ✅ Automatic deployments
- ✅ Form handling

---

### Option 3: Manual Deployment (Any Hosting)

If you're using custom hosting (cPanel, AWS, etc.):

#### Step 1: Build Production Files

```bash
npm run build
```

This creates optimized files in the `dist/` folder.

#### Step 2: Upload Files

Upload everything from the `dist/` folder to your web server:
```
dist/
  ├── index.html
  ├── _redirects (important!)
  ├── assets/
  ├── ...
```

#### Step 3: Configure Server for SPA Routing

**Apache (.htaccess):**

Create a `.htaccess` file in your web root:

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

**Nginx:**

Add to your nginx config:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

**Node.js/Express:**

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// All routes redirect to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(3000);
```

---

## After Deployment Checklist

Once your site is deployed, verify these:

### 1. Test Email Verification Flow

1. Go to https://ignitexagency.com/auth
2. Sign up with a new email
3. Check your email
4. Click verification link
5. Should redirect to https://ignitexagency.com/email-verified
6. Should see success message and auto-login
7. Should redirect to dashboard

### 2. Test on Mobile

1. Open verification email on mobile device
2. Click link
3. Should open in mobile browser
4. Should auto-login successfully

### 3. Verify Routes Work

Test these URLs directly:
- ✅ https://ignitexagency.com/
- ✅ https://ignitexagency.com/auth
- ✅ https://ignitexagency.com/email-verified
- ✅ https://ignitexagency.com/reset-password
- ✅ https://ignitexagency.com/dashboard
- ✅ https://ignitexagency.com/about

All should load without 404 errors.

### 4. Update Supabase URLs

Make sure Supabase has these redirect URLs:
1. Go to Supabase Dashboard
2. Settings → Authentication → URL Configuration
3. Verify these URLs are added:
   - `https://ignitexagency.com/email-verified`
   - `https://ignitexagency.com/reset-password`

---

## Troubleshooting

### Still Getting 404 on /email-verified?

**Problem**: SPA routing not configured properly

**Solutions**:
1. **Vercel/Netlify**: Redeploy (should auto-configure)
2. **Custom hosting**: Check server configuration (see Option 3 above)
3. **Verify _redirects file**: Make sure it's in the deployed files

### Email links not working on mobile?

**Problem**: Usually a DNS or SSL issue

**Solutions**:
1. Wait for DNS propagation (can take up to 48 hours)
2. Verify SSL certificate is active
3. Try opening link in mobile browser (not email app)
4. Clear mobile browser cache

### Auto-login not working?

**Problem**: Session not being established

**Solutions**:
1. Check browser console for errors
2. Verify Supabase redirect URLs are correct
3. Make sure cookies/localStorage aren't blocked
4. Try in incognito mode to rule out cache issues

---

## Quick Deploy Commands

For quick redeployment after code changes:

```bash
# Build production files
npm run build

# If using Vercel CLI
vercel --prod

# If using Netlify CLI
netlify deploy --prod

# Manual: Upload dist/ folder contents to your server
```

---

## Production URL Configuration

The app is configured to use **production URLs for all email verification**:

- All email verification links → `https://ignitexagency.com/email-verified`
- All password reset links → `https://ignitexagency.com/reset-password`

This ensures:
- ✅ Works on mobile and desktop
- ✅ No localhost issues
- ✅ Consistent user experience
- ✅ One place to manage authentication

---

## Need Help?

If you encounter issues:

1. Check the browser console for errors
2. Check Supabase logs for authentication errors
3. Verify DNS is pointing to correct server
4. Test in incognito mode to rule out caching
5. Check hosting provider's logs

**Common issue**: If site works but email verification doesn't, it's usually:
- Supabase redirect URLs not configured
- SSL certificate not active
- DNS not fully propagated

---

## Summary

**What you need to do:**

1. ✅ Code is ready (already pushed to GitHub)
2. ✅ Configuration files created (vercel.json, netlify.toml, _redirects)
3. ✅ Production build is ready (in dist/ folder)
4. 🔲 **Deploy using one of the options above**
5. 🔲 **Test the complete email verification flow**

**Recommended approach**: Use Vercel (easiest, auto-configures everything)

Once deployed, the 404 error will be fixed and email verification will work perfectly on both mobile and desktop! 🚀

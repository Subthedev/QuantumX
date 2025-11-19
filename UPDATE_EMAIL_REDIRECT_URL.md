# 🔧 Update Email Verification Redirect URL

**Issue:** Users are being redirected to `ignitex.live` instead of `ignitex.live` after email verification.

**Solution:** Update the Site URL and Redirect URLs in Supabase Auth settings.

## 📋 Steps to Fix

### 1. Go to Supabase Dashboard
1. Visit: https://supabase.com/dashboard/project/vidziydspeewmcexqicg
2. Navigate to **Authentication** → **URL Configuration**

### 2. Update Site URL
- **Current:** `https://ignitex.live` 
- **Change to:** `https://ignitex.live`

### 3. Update Redirect URLs
Add these URLs to the **Redirect URLs** list:
```
https://ignitex.live/email-verified
https://ignitex.live/auth/callback
https://ignitex.live/**
```

### 4. Remove Old URLs
Remove any URLs containing:
- `ignitex.live`
- Old domain references

### 5. Save Changes
Click **Save** to apply the changes.

## 🔍 Where to Find These Settings

**Path in Supabase Dashboard:**
```
Project Dashboard → Authentication → URL Configuration
```

**Settings to Update:**
- ✅ **Site URL:** `https://ignitex.live`
- ✅ **Redirect URLs:** Add `https://ignitex.live/**`
- ❌ **Remove:** Any `ignitex.live` URLs

## ⚡ Immediate Effect

Once updated:
- ✅ New verification emails will use `ignitex.live`
- ✅ Users will be redirected to the correct domain
- ✅ Email verification links will work properly

## 🚨 Important Notes

1. **This change affects the email templates** - verification emails will now redirect to `ignitex.live`
2. **Existing verification links** with the old domain may still redirect to `ignitex.live`
3. **New verification emails** will use the updated domain
4. **Test the flow** after making changes by signing up with a new email

## 🧪 Test After Update

1. Sign up with a new email address
2. Check the verification email - it should contain `ignitex.live` links
3. Click the verification link
4. Confirm it redirects to `ignitex.live/email-verified`

---

**Status:** ⏳ Pending manual update in Supabase Dashboard
**Priority:** 🔥 High - Affects user onboarding experience
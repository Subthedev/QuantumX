# Supabase Email Configuration Guide

## Overview
For email verification and password reset features to work properly, you need to configure email settings in your Supabase dashboard.

## Steps to Enable Email Verification

### 1. Access Supabase Dashboard
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: `ignitex` (vidziydspeewmcexqicg)

### 2. Configure Email Auth Settings

#### Navigate to Authentication Settings
1. Click **Authentication** in the left sidebar
2. Click **Providers** tab
3. Find **Email** provider

#### Enable Email Confirmation
1. Click **Email** provider to expand settings
2. **Enable Email Confirmations**: Toggle ON
3. **Confirm email** field should be checked

### 3. Configure Email Templates

#### Go to Email Templates
1. In Authentication section, click **Email Templates**
2. You'll see templates for:
   - **Confirm signup** - Sent when user signs up
   - **Magic Link** - For passwordless login
   - **Change Email Address** - When user changes email
   - **Reset Password** - For password reset

#### Customize Confirmation Email Template
1. Click **Confirm signup** template
2. Default template contains:
   ```html
   <h2>Confirm your signup</h2>
   <p>Follow this link to confirm your user:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>
   ```

3. **Recommended customization**:
   ```html
   <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
     <h2 style="color: #FF5F6D;">Welcome to IgniteX!</h2>
     <p>Thanks for signing up. Please confirm your email address to get started.</p>
     <p style="margin: 30px 0;">
       <a href="{{ .ConfirmationURL }}"
          style="background-color: #FF5F6D; color: white; padding: 12px 30px;
                 text-decoration: none; border-radius: 5px; display: inline-block;">
         Confirm Email Address
       </a>
     </p>
     <p style="color: #666; font-size: 12px;">
       If you didn't create an account, you can safely ignore this email.
     </p>
   </div>
   ```

4. Click **Save**

### 4. Configure Site URL and Redirect URLs

#### Update URL Configuration
1. In Authentication, go to **URL Configuration**
2. Set **Site URL**: `https://ignitex.live` (or your production domain)
3. Add **Redirect URLs**:
   - `https://ignitex.live/auth`
   - `https://ignitex.live/reset-password`
   - `http://localhost:8080/auth` (for development)
   - `http://localhost:8080/reset-password` (for development)

### 5. Email Provider Configuration (Optional but Recommended)

By default, Supabase uses their SMTP service which has rate limits.

#### For Production - Use Custom SMTP
1. Go to **Settings** → **Authentication**
2. Scroll to **SMTP Settings**
3. **Recommended providers**:
   - **SendGrid** (Free tier: 100 emails/day)
   - **Mailgun** (Free tier: 5000 emails/month)
   - **AWS SES** (Very cheap, reliable)
   - **Resend** (Modern, developer-friendly)

4. Configure your SMTP provider:
   ```
   SMTP Host: smtp.yourdomain.com
   Port: 587
   Username: your-smtp-username
   Password: your-smtp-password
   Sender Email: noreply@ignitex.live
   Sender Name: IgniteX
   ```

### 6. Rate Limiting Configuration

1. Go to **Settings** → **Authentication**
2. Configure rate limits:
   - **Email rate limit**: 3-5 emails per hour per user (prevents spam)
   - **Max emails per hour globally**: Based on your plan

## Testing Email Verification

### Development Testing
1. Sign up with a real email address you can access
2. Check your inbox (and spam folder)
3. Click the verification link
4. Should redirect to `/auth` page
5. Sign in with verified account

### What Users See

#### Sign Up Flow:
1. User enters email + password → Clicks "Sign Up"
2. ✅ Account created → User sees "Check Your Email" screen
3. User receives verification email
4. User clicks link in email → Redirected to app
5. User can now sign in

#### If Email Doesn't Arrive:
- User can click "Resend Verification Email" button
- Check spam folder
- Verify email address was typed correctly

## Troubleshooting

### Email Not Received
1. **Check Supabase Email Logs**:
   - Go to Authentication → Logs
   - Look for email delivery status

2. **Common Issues**:
   - Email confirmations not enabled
   - SMTP credentials incorrect
   - Rate limit exceeded
   - Email in spam folder
   - Redirect URL not whitelisted

### Email Received But Link Doesn't Work
1. **Check redirect URLs** are configured correctly
2. **Verify Site URL** matches your domain
3. **Check browser console** for errors

### Development vs Production

#### Development (localhost):
- Supabase emails work but may go to spam
- Use real email addresses for testing
- Some email providers block localhost redirects

#### Production:
- Configure custom SMTP for better deliverability
- Use proper domain for redirect URLs
- Set up SPF/DKIM records for your domain

## Current Configuration

Based on `src/integrations/supabase/client.ts`:
- **Supabase URL**: `https://vidziydspeewmcexqicg.supabase.co`
- **Project**: ignitex
- **Email redirect**: Configured in code to use `window.location.origin/auth`

## Code Implementation

### Sign Up Function (useAuth.tsx)
```typescript
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth`,
      data: {
        email_confirm: true,
      }
    }
  });
  return { error, data };
};
```

### Resend Verification Function (useAuth.tsx)
```typescript
const resendVerificationEmail = async () => {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: user.email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth`,
    }
  });
  return { error };
};
```

## Security Best Practices

1. ✅ **Email verification enabled** - Prevents fake accounts
2. ✅ **Strong password requirements** - 8+ chars, uppercase, lowercase, numbers
3. ✅ **Rate limiting** - Prevents email spam
4. ✅ **Secure redirects** - Only whitelisted URLs
5. ✅ **Password reset** - Secure token-based reset

## Next Steps

1. Configure email settings in Supabase dashboard
2. Test signup flow with real email
3. Customize email templates with your branding
4. Set up custom SMTP for production
5. Monitor email delivery in Supabase logs

## Support

If emails still don't work after configuration:
1. Check Supabase status page
2. Review Supabase Authentication logs
3. Contact Supabase support
4. Verify SMTP provider status (if using custom)

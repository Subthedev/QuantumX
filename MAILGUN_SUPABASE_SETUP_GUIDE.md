# Complete Mailgun + Supabase Email Setup Guide for IgniteX

**Professional Email**: `contact@ignitexagency.com`
**Domain**: `ignitexagency.com`
**Purpose**: Enable email verification and password reset for IgniteX application

---

## Part 1: Mailgun Account Setup

### Step 1: Create Mailgun Account

1. Go to [https://www.mailgun.com/](https://www.mailgun.com/)
2. Click **"Sign Up"** button (top right)
3. Choose **"Free"** plan (5,000 emails/month for first 3 months, then 1,000/month)
4. Fill in your details:
   - **Email**: Your personal email
   - **Password**: Create a strong password
   - **Company name**: IgniteX Agency
5. Click **"Create Account"**
6. **Verify your email** - Check inbox and click verification link

### Step 2: Add Your Domain to Mailgun

1. After logging in, you'll see the **Dashboard**
2. Click **"Sending"** in the left sidebar
3. Click **"Domains"** (or **"Domain Settings"**)
4. Click **"Add New Domain"** button
5. Enter your domain:
   - **Domain Name**: `mg.ignitexagency.com` (recommended subdomain approach)
   - OR use: `ignitexagency.com` (root domain)

   > ⚠️ **Recommended**: Use `mg.ignitexagency.com` subdomain to avoid conflicts with existing email

6. **Region**: Choose **US** or **EU** based on your location
7. **DKIM Key Length**: Keep default (2048 bits)
8. Click **"Add Domain"**

### Step 3: Get DNS Records from Mailgun

After adding the domain, you'll see a page with **DNS Records** that need to be added:

**Example Records You'll See** (yours will be different):

#### 1. TXT Record (SPF)
```
Type: TXT
Name: mg.ignitexagency.com (or @)
Value: v=spf1 include:mailgun.org ~all
```

#### 2. TXT Record (DKIM)
```
Type: TXT
Name: k1._domainkey.mg.ignitexagency.com
Value: k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC... (long string)
```

#### 3. CNAME Record (Tracking)
```
Type: CNAME
Name: email.mg.ignitexagency.com
Value: mailgun.org
```

#### 4. MX Records (Receiving - Optional)
```
Type: MX
Name: mg.ignitexagency.com
Value: mxa.mailgun.org
Priority: 10

Type: MX
Name: mg.ignitexagency.com
Value: mxb.mailgun.org
Priority: 10
```

> 📋 **Copy these records** - You'll need them in the next step

### Step 4: Add DNS Records to Your Domain Provider

You need to add these records to wherever you manage DNS for `ignitexagency.com` (GoDaddy, Namecheap, Cloudflare, etc.)

#### If Using Cloudflare:

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select **ignitexagency.com** domain
3. Click **"DNS"** in the left sidebar
4. Click **"Add record"** button

**Add SPF Record:**
- **Type**: TXT
- **Name**: `mg` (or `@` if using root domain)
- **Content**: `v=spf1 include:mailgun.org ~all`
- **Proxy status**: DNS only (gray cloud)
- Click **Save**

**Add DKIM Record:**
- **Type**: TXT
- **Name**: `k1._domainkey.mg` (copy exact name from Mailgun)
- **Content**: Paste the long DKIM value from Mailgun
- **Proxy status**: DNS only (gray cloud)
- Click **Save**

**Add CNAME Record:**
- **Type**: CNAME
- **Name**: `email.mg`
- **Target**: `mailgun.org`
- **Proxy status**: DNS only (gray cloud)
- Click **Save**

**Add MX Records (Optional - for receiving):**
- **Type**: MX
- **Name**: `mg`
- **Mail server**: `mxa.mailgun.org`
- **Priority**: 10
- **Proxy status**: DNS only
- Click **Save**

Repeat for `mxb.mailgun.org` with priority 10

#### If Using GoDaddy:

1. Log in to GoDaddy
2. Go to **My Products** → **Domains**
3. Click **DNS** next to ignitexagency.com
4. Scroll to **Records** section
5. Click **Add** button

Follow similar steps as Cloudflare, using the records from Mailgun.

#### If Using Namecheap:

1. Log in to Namecheap
2. Click **Domain List** → Select **ignitexagency.com**
3. Click **Advanced DNS** tab
4. Add records following the same pattern

### Step 5: Verify Domain in Mailgun

1. Return to Mailgun Dashboard → **Sending** → **Domains**
2. Click on **mg.ignitexagency.com**
3. Click **"Verify DNS Settings"** button
4. Wait for verification (can take 24-48 hours for DNS propagation)
5. You should see **green checkmarks** next to each record when verified

> ⏱️ **Note**: DNS changes can take up to 48 hours to propagate, but usually complete within 30 minutes to 2 hours

### Step 6: Create SMTP Credentials

1. In Mailgun Dashboard, go to **Sending** → **Domain Settings**
2. Select your domain: **mg.ignitexagency.com**
3. Click on **"SMTP Credentials"** tab
4. You'll see a default credential like `postmaster@mg.ignitexagency.com`
5. Click **"Reset Password"** button
6. **IMPORTANT**: A popup will show your new password - **COPY IT IMMEDIATELY**
   - This password will NOT be shown again!
   - Save it in a secure password manager

### Step 7: Note Down SMTP Configuration

**Write down these details** (you'll need them for Supabase):

```
SMTP Host: smtp.mailgun.org
SMTP Port: 587 (recommended) or 465 (SSL)
SMTP Username: postmaster@mg.ignitexagency.com
SMTP Password: [The password you just copied]
From Email: contact@ignitexagency.com
From Name: IgniteX
```

---

## Part 2: Supabase SMTP Configuration

### Step 1: Access Supabase Project Settings

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project: **ignitex** (`vidziydspeewmcexqicg`)
3. Click **⚙️ Settings** (bottom left sidebar)
4. Click **"Authentication"** in the settings menu

### Step 2: Scroll to SMTP Settings

1. Scroll down to **"SMTP Settings"** section
2. Click **"Enable Custom SMTP"** toggle to ON

### Step 3: Enter Mailgun SMTP Credentials

Fill in the form with these exact values:

**SMTP sender name:**
```
IgniteX
```

**SMTP sender email:**
```
contact@ignitexagency.com
```

**SMTP host:**
```
smtp.mailgun.org
```

**SMTP port number:**
```
587
```

**SMTP username:**
```
postmaster@mg.ignitexagency.com
```

**SMTP password:**
```
[Paste the password from Mailgun Step 6]
```

**SMTP admin email:**
```
contact@ignitexagency.com
```

> ⚠️ **Common Mistake**: Don't confuse "SMTP admin email" with "SMTP username". They are different!
> - **SMTP username**: `postmaster@mg.ignitexagency.com` (from Mailgun)
> - **SMTP admin email**: `contact@ignitexagency.com` (your professional email)

### Step 4: Save SMTP Configuration

1. Click **"Save"** button at the bottom
2. You should see: ✅ **"Successfully updated settings"**

### Step 5: Test SMTP Connection (Optional but Recommended)

Supabase doesn't have a built-in test button, but you can verify by:
1. Checking Mailgun logs later when you send a test email
2. Proceeding to Part 3 to send actual verification emails

---

## Part 3: Configure Supabase Email Authentication

### Step 1: Enable Email Confirmations

1. Still in **Settings** → **Authentication**
2. Scroll to **"Email Auth"** section
3. **Enable email confirmations**: Toggle ON ✅
4. **Confirm email**: Keep checked ✅
5. **Secure email change**: Keep checked ✅

### Step 2: Configure URL Configuration

Scroll down to **"URL Configuration"** section:

**Site URL:**
```
https://ignitexagency.com
```

**Redirect URLs** (add each one):
```
https://ignitexagency.com/auth
https://ignitexagency.com/reset-password
http://localhost:8080/auth
http://localhost:8080/reset-password
```

Click **"Add URL"** for each one, then **Save**

### Step 3: Configure Rate Limits

In **"Security and Protection"** section:

**Email rate limit:**
- Set to: **3 emails per hour** (prevents abuse)

**SMS rate limit:**
- Leave default

Click **Save**

### Step 4: Customize Email Templates

1. In the Authentication settings, find **"Email Templates"** section
2. Click on **"Confirm signup"** template

**Replace default template with:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <svg width="80" height="50" viewBox="0 0 1024 640" xmlns="http://www.w3.org/2000/svg">
        <path fill="#ff5e00" d="M573.219788,524.404785 C555.828064,530.237183 538.284241,533.993469 520.404175,533.137512 C473.343719,530.884705 433.724609,512.690308 403.453705,475.823273 C398.800903,470.156586 394.274170,464.398651 390.635681,457.984497 C388.851715,454.839600 389.139648,453.300232 393.084900,452.569397 C399.503082,451.380554 405.827118,449.683594 412.138824,447.752258 C403.520081,447.187897 394.939972,447.543640 386.414337,446.378723 C379.255066,445.400482 372.320038,443.937195 366.109436,440.006256 C355.198059,433.100006 352.632385,423.737762 358.097900,412.109955 C363.165466,401.328918 371.653992,393.697937 380.717773,386.533447 C390.700043,378.642944 401.683655,372.362274 413.074646,366.778473 C418.131958,364.299377 419.114777,364.990997 419.197571,370.710358 C419.224121,372.542969 419.039032,374.387360 419.183838,376.207825 C419.537872,380.659821 417.816376,383.716370 413.940704,386.099518 C408.683472,389.332153 404.016357,393.403198 399.848602,397.992218 C398.130341,399.884186 396.475891,401.974731 397.505066,404.684753 C398.582947,407.522980 401.366241,406.813202 403.585724,406.918884 C417.428619,407.577881 430.698944,404.083557 443.835724,400.578308 C473.414673,392.685944 501.330688,380.643188 528.019287,365.643402 C559.185120,348.127289 588.439087,327.874603 616.169006,305.339478 C627.941711,295.772217 639.450623,285.915283 650.673218,275.719788 C656.062744,270.823578 656.010193,270.650604 651.009949,265.591156 C645.621155,260.138550 640.190613,254.727219 634.810547,249.266083 C633.684570,248.123138 632.047180,247.262878 632.188599,245.241150 C633.426270,243.321472 635.410706,243.809647 637.161987,243.807892 C662.661377,243.782364 688.161072,243.854599 713.659912,243.739395 C717.629639,243.721481 719.347046,244.821960 719.326782,249.098740 C719.205017,274.764160 719.297546,300.430573 719.294678,326.096649 C719.294495,327.699188 719.813782,329.769196 717.768616,330.418304 C715.948364,330.996033 714.701721,329.367340 713.555664,328.231628 C707.400574,322.132080 701.236389,316.037964 695.238831,309.785126 C692.816406,307.259644 690.895691,306.799683 688.142761,309.393188 C683.660950,313.615479 678.986267,317.653137 674.183899,321.508270 C670.728699,324.281982 669.897400,327.188019 671.280396,331.518860 C680.387512,360.037384 680.665894,388.914856 673.168335,417.722412 C667.037659,441.278229 655.667603,462.243805 639.368835,480.466949 C621.216187,500.762909 599.455383,515.579773 573.219788,524.404785 M506.152893,479.918854 C505.218719,480.116089 504.052582,479.383606 503.394257,480.558533 C520.532349,484.633087 537.710938,483.542145 554.076843,477.960632 C592.492493,464.859314 616.662292,438.383453 625.728577,398.428925 C628.088928,388.027191 627.698242,377.604889 627.621826,367.135956 C627.607056,365.104919 627.219849,363.004761 625.163635,362.011719 C623.104004,361.017059 621.751099,362.806488 620.304138,363.785034 C617.408936,365.742828 614.835938,368.322083 611.725403,369.784332 C606.200562,372.381622 604.847595,376.352783 605.053772,382.197632 C605.653442,399.201782 601.698669,415.391602 593.212280,430.066772 C574.102112,463.113312 545.199402,479.751190 506.152893,479.918854 z"/>
        <path fill="#ff5e00" d="M589.808228,307.841461 C582.401245,313.072296 575.768311,318.849762 567.883850,322.610992 C565.701111,320.271423 566.074890,317.824738 566.070129,315.573975 C565.997253,281.450623 566.021240,247.327026 565.910645,213.203857 C565.899231,209.669113 566.955017,207.190552 570.085815,205.413071 C583.968628,197.531342 597.768799,189.503830 611.664185,181.644623 C616.150146,179.107376 617.345398,179.781158 617.339783,184.825790 C617.303528,217.451218 617.117859,250.076614 617.140747,282.701904 C617.144348,287.897217 613.762939,290.424683 610.312073,292.993011 C603.638916,297.959473 596.837524,302.753571 589.808228,307.841461 z"/>
        <path fill="#ff5e00" d="M500.642944,340.000671 C500.628754,318.200562 500.700623,296.899780 500.532074,275.600952 C500.504547,272.121124 501.728333,269.892090 504.557556,268.258636 C518.092041,260.444580 531.571533,252.532730 545.189331,244.866730 C550.335571,241.969666 551.183105,242.619308 551.184631,248.422241 C551.191833,275.879028 551.138672,303.335876 551.200928,330.792511 C551.208374,334.090912 550.234375,336.387146 547.347290,338.253113 C534.206909,346.745789 520.888489,354.917542 506.855621,361.869843 C501.411926,364.566864 500.700134,364.102173 500.673828,357.973236 C500.648834,352.149139 500.655914,346.324860 500.642944,340.000671 z"/>
        <path fill="#ff5e00" d="M485.086578,370.525787 C481.831482,374.633698 477.066162,374.931122 472.924835,376.311523 C462.065948,379.931152 451.192780,383.567291 439.827576,385.440887 C435.667694,386.126678 434.646423,384.520905 434.689514,380.639465 C434.846466,366.497162 434.844910,352.350830 434.674500,338.208740 C434.628723,334.408936 435.955750,332.129242 439.288879,330.276825 C452.518890,322.923950 465.567535,315.245148 478.784088,307.867493 C484.364532,304.752380 485.183990,305.423584 485.333649,311.789459 C485.790771,331.236938 486.347717,350.683167 485.086578,370.525787 z"/>
      </svg>
    </div>

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #FF5F6D; margin: 0; font-size: 32px;">Welcome to IgniteX!</h1>
    </div>

    <!-- Content -->
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Thanks for signing up! We're excited to have you on board.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
        Please confirm your email address to activate your account and start using IgniteX.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}"
           style="background: linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%);
                  color: white;
                  text-decoration: none;
                  padding: 14px 40px;
                  border-radius: 6px;
                  font-weight: 600;
                  font-size: 16px;
                  display: inline-block;">
          Confirm Email Address
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
        {{ .ConfirmationURL }}
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0;">
        If you didn't create an account with IgniteX, you can safely ignore this email.
      </p>
      <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 10px 0 0 0;">
        © 2025 IgniteX Agency. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
```

Click **Save**

**Repeat for "Reset Password" template:**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 30px;">
      <svg width="80" height="50" viewBox="0 0 1024 640" xmlns="http://www.w3.org/2000/svg">
        <path fill="#ff5e00" d="M573.219788,524.404785 C555.828064,530.237183 538.284241,533.993469 520.404175,533.137512 C473.343719,530.884705 433.724609,512.690308 403.453705,475.823273 C398.800903,470.156586 394.274170,464.398651 390.635681,457.984497 C388.851715,454.839600 389.139648,453.300232 393.084900,452.569397 C399.503082,451.380554 405.827118,449.683594 412.138824,447.752258 C403.520081,447.187897 394.939972,447.543640 386.414337,446.378723 C379.255066,445.400482 372.320038,443.937195 366.109436,440.006256 C355.198059,433.100006 352.632385,423.737762 358.097900,412.109955 C363.165466,401.328918 371.653992,393.697937 380.717773,386.533447 C390.700043,378.642944 401.683655,372.362274 413.074646,366.778473 C418.131958,364.299377 419.114777,364.990997 419.197571,370.710358 C419.224121,372.542969 419.039032,374.387360 419.183838,376.207825 C419.537872,380.659821 417.816376,383.716370 413.940704,386.099518 C408.683472,389.332153 404.016357,393.403198 399.848602,397.992218 C398.130341,399.884186 396.475891,401.974731 397.505066,404.684753 C398.582947,407.522980 401.366241,406.813202 403.585724,406.918884 C417.428619,407.577881 430.698944,404.083557 443.835724,400.578308 C473.414673,392.685944 501.330688,380.643188 528.019287,365.643402 C559.185120,348.127289 588.439087,327.874603 616.169006,305.339478 C627.941711,295.772217 639.450623,285.915283 650.673218,275.719788 C656.062744,270.823578 656.010193,270.650604 651.009949,265.591156 C645.621155,260.138550 640.190613,254.727219 634.810547,249.266083 C633.684570,248.123138 632.047180,247.262878 632.188599,245.241150 C633.426270,243.321472 635.410706,243.809647 637.161987,243.807892 C662.661377,243.782364 688.161072,243.854599 713.659912,243.739395 C717.629639,243.721481 719.347046,244.821960 719.326782,249.098740 C719.205017,274.764160 719.297546,300.430573 719.294678,326.096649 C719.294495,327.699188 719.813782,329.769196 717.768616,330.418304 C715.948364,330.996033 714.701721,329.367340 713.555664,328.231628 C707.400574,322.132080 701.236389,316.037964 695.238831,309.785126 C692.816406,307.259644 690.895691,306.799683 688.142761,309.393188 C683.660950,313.615479 678.986267,317.653137 674.183899,321.508270 C670.728699,324.281982 669.897400,327.188019 671.280396,331.518860 C680.387512,360.037384 680.665894,388.914856 673.168335,417.722412 C667.037659,441.278229 655.667603,462.243805 639.368835,480.466949 C621.216187,500.762909 599.455383,515.579773 573.219788,524.404785 M506.152893,479.918854 C505.218719,480.116089 504.052582,479.383606 503.394257,480.558533 C520.532349,484.633087 537.710938,483.542145 554.076843,477.960632 C592.492493,464.859314 616.662292,438.383453 625.728577,398.428925 C628.088928,388.027191 627.698242,377.604889 627.621826,367.135956 C627.607056,365.104919 627.219849,363.004761 625.163635,362.011719 C623.104004,361.017059 621.751099,362.806488 620.304138,363.785034 C617.408936,365.742828 614.835938,368.322083 611.725403,369.784332 C606.200562,372.381622 604.847595,376.352783 605.053772,382.197632 C605.653442,399.201782 601.698669,415.391602 593.212280,430.066772 C574.102112,463.113312 545.199402,479.751190 506.152893,479.918854 z"/>
        <path fill="#ff5e00" d="M589.808228,307.841461 C582.401245,313.072296 575.768311,318.849762 567.883850,322.610992 C565.701111,320.271423 566.074890,317.824738 566.070129,315.573975 C565.997253,281.450623 566.021240,247.327026 565.910645,213.203857 C565.899231,209.669113 566.955017,207.190552 570.085815,205.413071 C583.968628,197.531342 597.768799,189.503830 611.664185,181.644623 C616.150146,179.107376 617.345398,179.781158 617.339783,184.825790 C617.303528,217.451218 617.117859,250.076614 617.140747,282.701904 C617.144348,287.897217 613.762939,290.424683 610.312073,292.993011 C603.638916,297.959473 596.837524,302.753571 589.808228,307.841461 z"/>
        <path fill="#ff5e00" d="M500.642944,340.000671 C500.628754,318.200562 500.700623,296.899780 500.532074,275.600952 C500.504547,272.121124 501.728333,269.892090 504.557556,268.258636 C518.092041,260.444580 531.571533,252.532730 545.189331,244.866730 C550.335571,241.969666 551.183105,242.619308 551.184631,248.422241 C551.191833,275.879028 551.138672,303.335876 551.200928,330.792511 C551.208374,334.090912 550.234375,336.387146 547.347290,338.253113 C534.206909,346.745789 520.888489,354.917542 506.855621,361.869843 C501.411926,364.566864 500.700134,364.102173 500.673828,357.973236 C500.648834,352.149139 500.655914,346.324860 500.642944,340.000671 z"/>
        <path fill="#ff5e00" d="M485.086578,370.525787 C481.831482,374.633698 477.066162,374.931122 472.924835,376.311523 C462.065948,379.931152 451.192780,383.567291 439.827576,385.440887 C435.667694,386.126678 434.646423,384.520905 434.689514,380.639465 C434.846466,366.497162 434.844910,352.350830 434.674500,338.208740 C434.628723,334.408936 435.955750,332.129242 439.288879,330.276825 C452.518890,322.923950 465.567535,315.245148 478.784088,307.867493 C484.364532,304.752380 485.183990,305.423584 485.333649,311.789459 C485.790771,331.236938 486.347717,350.683167 485.086578,370.525787 z"/>
      </svg>
    </div>

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 40px;">
      <h1 style="color: #FF5F6D; margin: 0; font-size: 32px;">Reset Your Password</h1>
    </div>

    <!-- Content -->
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 30px;">
      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        We received a request to reset your password for your IgniteX account.
      </p>

      <p style="color: #374151; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
        Click the button below to create a new password:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="{{ .ConfirmationURL }}"
           style="background: linear-gradient(135deg, #FF5F6D 0%, #FFC371 100%);
                  color: white;
                  text-decoration: none;
                  padding: 14px 40px;
                  border-radius: 6px;
                  font-weight: 600;
                  font-size: 16px;
                  display: inline-block;">
          Reset Password
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; line-height: 20px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color: #3b82f6; font-size: 12px; word-break: break-all; margin: 10px 0 0 0;">
        {{ .ConfirmationURL }}
      </p>

      <p style="color: #dc2626; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; font-weight: 600;">
        This link will expire in 60 minutes.
      </p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 40px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 0;">
        If you didn't request a password reset, please ignore this email or contact support if you have concerns.
      </p>
      <p style="color: #9ca3af; font-size: 12px; line-height: 18px; margin: 10px 0 0 0;">
        © 2025 IgniteX Agency. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
```

Click **Save**

---

## Part 4: Testing Email Flow

### Test 1: Sign Up Flow

1. Go to your app: **http://localhost:8080/auth**
2. Click **"Sign Up"** tab
3. Enter:
   - Email: Your personal email (one you can check)
   - Password: Strong password (meets requirements)
4. Click **"Sign Up"**
5. You should see: **"Check Your Email"** screen
6. **Check your email inbox** (and spam folder)
7. You should receive an email from `contact@ignitexagency.com`
8. Click the **"Confirm Email Address"** button
9. Should redirect to `/auth` page
10. Sign in with your credentials ✅

### Test 2: Password Reset Flow

1. Go to **http://localhost:8080/auth**
2. Click **"Forgot password?"** link
3. Enter your email
4. Click **"Send Reset Link"**
5. **Check your email**
6. Click **"Reset Password"** button in email
7. Enter new password
8. Click **"Update Password"**
9. Should redirect to dashboard ✅

### Test 3: Resend Verification Email

1. Sign up with a new email
2. On "Check Your Email" screen, click **"Resend Verification Email"**
3. Should receive another email ✅

---

## Part 5: Monitor and Troubleshoot

### View Mailgun Logs

1. Go to Mailgun Dashboard
2. Click **"Sending"** → **"Logs"**
3. You'll see all emails sent:
   - ✅ **Delivered** - Email sent successfully
   - ⚠️ **Failed** - Email failed (check reason)
   - 📬 **Accepted** - Email queued for delivery

### View Supabase Auth Logs

1. Go to Supabase Dashboard → Your Project
2. Click **"Authentication"** → **"Logs"**
3. You'll see all auth events (sign ups, sign ins, password resets)

### Common Issues and Solutions

#### Issue 1: "SMTP connection failed"
**Solution:**
- Double-check SMTP username and password
- Make sure you're using `postmaster@mg.ignitexagency.com` not `contact@ignitexagency.com`
- Verify port is 587
- Check for extra spaces in credentials

#### Issue 2: Email goes to spam
**Solution:**
- Make sure SPF and DKIM records are properly configured in DNS
- Wait 24-48 hours for DNS propagation
- Add DMARC record (optional but recommended)
- Ask recipients to whitelist `contact@ignitexagency.com`

#### Issue 3: "Domain not verified"
**Solution:**
- Check DNS records are correctly added
- Use DNS checker: [https://mxtoolbox.com/SuperTool.aspx](https://mxtoolbox.com/SuperTool.aspx)
- Wait up to 48 hours for DNS propagation
- Click "Verify DNS Settings" in Mailgun again

#### Issue 4: No email received
**Solution:**
- Check Mailgun logs to see if email was sent
- Check spam/junk folder
- Verify recipient email is correct
- Check Supabase auth logs for errors
- Try with different email provider (Gmail, Outlook)

#### Issue 5: "Rate limit exceeded"
**Solution:**
- You're sending too many emails too quickly
- Wait 1 hour and try again
- Adjust rate limits in Supabase settings

#### Issue 6: Verification link redirects to localhost
**Solution:**
- **This happens in development** - Supabase uses `window.location.origin` which is `http://localhost:8080`
- **For production**: Make sure production URL `https://ignitexagency.com/auth` is in Supabase redirect URLs
- **Quick fix for testing**: Manually edit the URL in email from `localhost:8080` to `ignitexagency.com`
- **Proper fix**: Deploy to production and test there, OR configure Supabase environment

---

## Part 6: Production Checklist

Before going live with production:

- ✅ Domain verified in Mailgun with green checkmarks
- ✅ SPF record added and verified
- ✅ DKIM record added and verified
- ✅ SMTP credentials working in Supabase
- ✅ Email confirmations enabled in Supabase
- ✅ Redirect URLs configured with production domain
- ✅ Email templates customized with branding
- ✅ Test emails sent and received successfully
- ✅ Password reset flow tested
- ✅ Resend verification tested
- ✅ Emails not going to spam
- ✅ Rate limits configured appropriately

---

## Additional Recommendations

### 1. Add DMARC Record (Optional but Recommended)

Add this TXT record to your DNS:

```
Type: TXT
Name: _dmarc.mg.ignitexagency.com
Value: v=DMARC1; p=none; rua=mailto:contact@ignitexagency.com
```

This helps with email deliverability and gives you reports.

### 2. Warm Up Your Domain

When you start sending emails:
- Start with low volume (10-20 emails/day)
- Gradually increase over 2-3 weeks
- This builds domain reputation
- Reduces chance of being marked as spam

### 3. Monitor Email Metrics

In Mailgun Dashboard:
- **Delivery rate**: Should be >95%
- **Open rate**: Track engagement
- **Bounce rate**: Should be <5%
- **Complaint rate**: Should be <0.1%

### 4. Set Up Webhooks (Advanced)

Configure Mailgun webhooks to track:
- Delivery confirmations
- Bounces
- Spam complaints
- Opens and clicks

---

## Quick Reference Card

**Save this for quick access:**

```
═══════════════════════════════════════════
        IGNITEX EMAIL CONFIGURATION
═══════════════════════════════════════════

MAILGUN DOMAIN: mg.ignitexagency.com
SMTP HOST: smtp.mailgun.org
SMTP PORT: 587
SMTP USER: postmaster@mg.ignitexagency.com
FROM EMAIL: contact@ignitexagency.com

SUPABASE PROJECT: ignitex (vidziydspeewmcexqicg)

DASHBOARDS:
• Mailgun: https://app.mailgun.com/
• Supabase: https://supabase.com/dashboard

EMAIL FLOW:
1. User signs up
2. Email sent from contact@ignitexagency.com
3. Powered by Mailgun SMTP
4. User clicks verification link
5. Redirects to /auth
6. User can sign in

═══════════════════════════════════════════
```

---

## Support Resources

- **Mailgun Support**: [https://help.mailgun.com/](https://help.mailgun.com/)
- **Supabase Docs**: [https://supabase.com/docs/guides/auth/auth-smtp](https://supabase.com/docs/guides/auth/auth-smtp)
- **DNS Checker**: [https://mxtoolbox.com/](https://mxtoolbox.com/)
- **Email Tester**: [https://www.mail-tester.com/](https://www.mail-tester.com/)

---

**🎉 You're all set!** Your IgniteX app can now send professional emails from `contact@ignitexagency.com` via Mailgun SMTP.

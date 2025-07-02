# Zoho-Based AI Consultancy Setup Guide

This guide will help you set up the complete Zoho ecosystem for your AI consultancy landing page, replacing third-party services with Zoho alternatives.

## Zoho Services Used

- **Zoho CRM** - Lead management and customer relationship management
- **Zoho Bookings** - Meeting scheduling and calendar management  
- **Zoho Campaigns** - Email marketing automation and sequences
- **ZeptoMail** - Transactional email delivery (already configured)
- **Zoho Analytics** - Advanced analytics and reporting

## Prerequisites

✅ **Already Configured:**
- Zoho Mail account
- ZeptoMail API key (`ZOHO_API_KEY`)

**Need to Configure:**
- Zoho CRM
- Zoho Bookings
- Zoho Campaigns

## Step 1: Zoho CRM Setup

### 1.1 Enable Zoho CRM
1. Go to [https://crm.zoho.com](https://crm.zoho.com)
2. Sign in with your Zoho account
3. Set up your CRM workspace

### 1.2 Create Custom Fields (Optional)
Add these custom fields to the Contacts module:
- `Lead_Score` (Number)
- `Lead_Source` (Text)
- `Campaign_Source` (Text) 
- `Company_Size` (Picklist: Startup, Small, Medium, Large, Enterprise)
- `Budget` (Picklist: Under 25k, 25k-50k, 50k-100k, Over 100k)
- `Timeline` (Picklist: Immediate, 1-3 months, 3-6 months, 6-12 months, Exploring)

### 1.3 Create OAuth Application
1. Go to [https://api-console.zoho.com](https://api-console.zoho.com)
2. Click "Add Client" → "Self Client"
3. Enter client name: "AI Consultancy CRM Integration"
4. Copy the **Client ID** and **Client Secret**

### 1.4 Generate Refresh Token

scope: ZohoCRM.modules.ALL,ZohoCRM.settings.ALL
```bash
# Step 1: Get authorization code (replace CLIENT_ID with your actual ID)
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=1000.Y29FWY9M8MKMB0Z2Y0VNGKLKUZ1G3U&response_type=code&access_type=offline&redirect_uri=https://ianyeo.com

# Step 2: Exchange for refresh token
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://ianyeo.com" \
  -d "code=AUTHORIZATION_CODE"
```
1000.e42b51743cb84bc81d6a7160ae0a3aec.a536966199bf59a2be1e2a6e9a8b07c0
```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=1000.Y29FWY9M8MKMB0Z2Y0VNGKLKUZ1G3U" \
  -d "client_secret=2c49dfe6e3ad7df93a7049648eb1cbcf72cd25d606" \
  -d "code=1000.e42b51743cb84bc81d6a7160ae0a3aec.a536966199bf59a2be1e2a6e9a8b07c0"
```

## Step 2: Meeting Scheduling Setup (Simplified Approach)

Since Zoho Bookings API has scope issues in some regions, we'll use a **simpler, more reliable approach**:

### 2.1 Set Up Zoho Calendar Sharing
1. Go to [https://calendar.zoho.com](https://calendar.zoho.com)
2. Create a calendar for "AI Consultations"
3. Set up availability (e.g., weekdays 9 AM - 5 PM)
4. Generate a **shareable calendar link**

### 2.2 Get Your Zoho Calendar Link
1. In Zoho Calendar, click **"Share"** on your consultation calendar
2. Enable **"Allow people to book time"** 
3. Copy the **public booking link**
4. This will be something like: `https://calendar.zoho.com/embed/abc123def456`

### 2.3 Update Worker Configuration
Replace the placeholder in your code with your actual calendar link:
```javascript
// In worker.js, update this line:
meetingUrl: 'https://calendar.zoho.com/eventreqForm/zz08011230516c6b51ab285211a71babcca3147bd282b08e50f0ba7b70bbde53d6a2c8a3c4338aa2436b27ea1e341674bacec8822d?theme=0&l=en&tz=Europe%2FLondon'
```

**Benefits of This Approach:**
- ✅ No API scope issues
- ✅ Works immediately 
- ✅ Users get instant booking confirmation
- ✅ You get email notifications for all bookings
- ✅ Integrates perfectly with your existing Zoho setup

## Step 3: Zoho Campaigns Setup

### 3.1 Enable Zoho Campaigns
1. Go to [https://campaigns.zoho.com](https://campaigns.zoho.com)
2. Set up your account
3. Verify your domain/sender address

### 3.2 Create Mailing Lists
Create these three lists for lead segmentation:
- **high-value-prospects** (Lead Score ≥ 70)
- **qualified-leads** (Lead Score 50-69)
- **general-leads** (Lead Score < 50)

### 3.3 Set Up Email Sequences
For each list, create automated email sequences:

**High-Value Prospects (5 emails over 2 weeks):**
1. Welcome + Strategy consultation invite
2. Enterprise AI case study
3. ROI calculator and implementation guide
4. Personal video message
5. Follow-up consultation offer

**Qualified Leads (4 emails over 3 weeks):**
1. Welcome + assessment results
2. Getting started guide
3. Success stories
4. Consultation offer

**General Leads (3 emails over 4 weeks):**
1. Welcome + educational content
2. AI basics for construction
3. Free resources and next steps

### 3.4 Get OAuth Refresh Token
1. Go to [https://api-console.zoho.com](https://api-console.zoho.com)
2. Click "Add Client" → "Self Client"
3. Enter client name: "AI Consultancy Campaigns Integration"
4. Copy the **Client ID** and **Client Secret**

### 3.5 Generate Campaigns Refresh Token
```bash
# Step 1: Get authorization code (replace CLIENT_ID with your actual ID)
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCampaigns.contact.ALL,ZohoCampaigns.campaign.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://ianyeo.com

# Step 2: Exchange for refresh token
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://ianyeo.com" \
  -d "code=AUTHORIZATION_CODE"
```

**Note:** You can use the same Client ID/Secret from CRM setup since Zoho allows one Self Client application per account.

## Step 4: Cloudflare Worker Secrets

Set these secrets using `wrangler secret put`:

```bash
# Zoho CRM
wrangler secret put ZOHO_CRM_CLIENT_ID
wrangler secret put ZOHO_CRM_CLIENT_SECRET  
wrangler secret put ZOHO_CRM_REFRESH_TOKEN

# Zoho Campaigns (Optional - for email automation)
wrangler secret put ZOHO_CAMPAIGNS_REFRESH_TOKEN

# Optional: Google Analytics (if keeping)
wrangler secret put GA4_MEASUREMENT_ID
wrangler secret put GA4_API_SECRET
```

## Step 5: Test the Integration

### 5.1 Test Lead Capture
1. Submit the assessment form on your landing page
2. Verify contact appears in Zoho CRM
3. Check that welcome email is sent via ZeptoMail
4. Confirm contact is added to appropriate Campaigns list

### 5.2 Test Booking
1. Try to book a consultation
2. Verify appointment appears in Zoho Bookings
3. Check confirmation email is sent

## Step 6: Zoho Analytics (Optional)

### 6.1 Set Up Dashboards
Create dashboards for:
- Lead generation metrics
- Conversion rates by source
- Assessment completion rates
- Meeting booking rates
- Email engagement metrics

### 6.2 Connect Data Sources
- Import CRM data
- Connect Google Analytics
- Set up custom metrics tracking

## Environment Variables Summary

Your `wrangler.toml` should have these variables:

```toml
ZOHO_CRM_API_URL = "https://www.zohoapis.com/crm/v6"
ZOHO_BOOKINGS_API_URL = "https://www.zohoapis.com/bookings/v1"  
ZOHO_CAMPAIGNS_API_URL = "https://campaigns.zoho.com/api/v1.1"
ZOHO_ANALYTICS_API_URL = "https://analyticsapi.zoho.com/restapi/v2"
ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"
```

## Secrets Summary

Required secrets for `wrangler secret put`:

```bash
ZOHO_API_KEY                    # ZeptoMail (already configured)
TURNSTILE_SECRET_KEY           # Cloudflare Turnstile
ZOHO_CRM_CLIENT_ID             # CRM OAuth
ZOHO_CRM_CLIENT_SECRET         # CRM OAuth  
ZOHO_CRM_REFRESH_TOKEN         # CRM OAuth
ZOHO_CAMPAIGNS_REFRESH_TOKEN   # Campaigns OAuth (optional)
```

## Cost Comparison

**Previous (HubSpot + Calendly + Postmark):**
- HubSpot Starter: $45/month
- Calendly Professional: $12/month
- Postmark: ~$15/month
- **Total: ~$72/month**

**New (Zoho Ecosystem):**
- Zoho CRM Standard: $18/month
- Zoho Bookings: $8/month  
- Zoho Campaigns: $9/month
- ZeptoMail: Pay-per-use (~$5/month)
- **Total: ~$40/month** (44% savings!)

## Support and Documentation

- **Zoho CRM API:** [https://www.zoho.com/crm/developer/docs/](https://www.zoho.com/crm/developer/docs/)
- **Zoho Bookings API:** [https://www.zoho.com/bookings/help/api/](https://www.zoho.com/bookings/help/api/)
- **Zoho Campaigns API:** [https://www.zoho.com/campaigns/help/developers/](https://www.zoho.com/campaigns/help/developers/)
- **ZeptoMail API:** [https://www.zoho.com/zeptomail/help/api/](https://www.zoho.com/zeptomail/help/api/)

## Next Steps

1. Set up the Zoho services in order (CRM → Bookings → Campaigns)
2. Configure OAuth applications and get refresh tokens
3. Set the Cloudflare Worker secrets
4. Test each integration individually
5. Deploy and test the complete flow
6. Set up analytics and monitoring

This Zoho-based system provides better integration, lower costs, and unified data management compared to using multiple third-party services. 
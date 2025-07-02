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

## Step 2: Zoho Bookings Setup (Full API Integration)

The system now includes full Zoho Bookings API integration for automated meeting scheduling.

### 2.1 Enable Zoho Bookings
1. Go to [https://bookings.zoho.com](https://bookings.zoho.com)
2. Sign in with your Zoho account
3. Set up your Bookings workspace
4. Choose your subscription plan (Basic or higher recommended for API access)

### 2.2 Create Your Booking Service
1. In Zoho Bookings, go to **Services** → **Add Service**
2. Create a service with these settings:
   - **Service Name**: "AI Strategy Consultation"
   - **Duration**: 30 minutes
   - **Description**: "Free 30-minute strategy call to discuss AI opportunities for your business"
   - **Category**: "Consultations"
   - **Buffer Time**: 15 minutes before/after (optional)

3. Set your **Availability**:
   - Go to **Availability** settings
   - Set your working hours (e.g., Mon-Fri 9 AM - 5 PM)
   - Configure time slots (e.g., every 30 minutes)
   - Set timezone to your location

4. Configure **Booking Settings**:
   - Enable **"Allow customers to book online"**
   - Set **"Maximum advance booking"** (e.g., 30 days)
   - Set **"Minimum advance booking"** (e.g., 2 hours)
   - Enable **"Send confirmation emails"**
   - Enable **"Send reminder emails"**

### 2.3 Create OAuth Application for Bookings
1. Go to [https://api-console.zoho.com](https://api-console.zoho.com)
2. If you already created a Self Client for CRM, you can reuse it
3. If not, click **"Add Client"** → **"Self Client"**
4. Enter details:
   - **Client Name**: "AI Consultancy Full Integration"
   - **Homepage URL**: `https://ianyeo.com`
   - **Authorized Redirect URIs**: `https://ianyeo.com`

### 2.4 Generate Bookings Refresh Token
You need the `zohobookings.data.CREATE` scope for the booking integration:

**Step 1: Get Authorization Code**
```bash
# Replace YOUR_CLIENT_ID with your actual Client ID
https://accounts.zoho.com/oauth/v2/auth?scope=zohobookings.data.CREATE,ZohoCRM.modules.ALL,ZohoCRM.settings.ALL,ZohoCampaigns.contact.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=https://ianyeo.com
```

**Step 2: Exchange for Refresh Token**
```bash
curl -X POST https://accounts.zoho.com/oauth/v2/token \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=https://ianyeo.com" \
  -d "code=AUTHORIZATION_CODE_FROM_STEP_1"
```

**Response will include:**
```json
{
  "access_token": "1000.xxx",
  "refresh_token": "1000.yyy",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

Save the `refresh_token` - you'll need it for the Worker secrets.

### 2.5 Configure Email Templates (Optional)
1. In Zoho Bookings, go to **Settings** → **Email Templates**
2. Customize the confirmation email template:
   - Add your branding
   - Include meeting preparation instructions
   - Add contact information
   - Include calendar attachment

3. Set up reminder emails:
   - 24 hours before meeting
   - 1 hour before meeting
   - Include meeting join links if using video calls

### 2.6 Test Bookings Setup
1. In Zoho Bookings, go to your service page
2. Try booking a test appointment
3. Verify you receive confirmation emails
4. Check that the appointment appears in your calendar
5. Test the cancellation/rescheduling flow

**Benefits of Full Zoho Bookings Integration:**
- ✅ Real-time availability checking
- ✅ Automatic booking confirmation and calendar invites  
- ✅ Professional email templates and branding
- ✅ Built-in reminder system
- ✅ Customer self-service reschedule/cancel
- ✅ Full integration with CRM and analytics
- ✅ No manual intervention required

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
wrangler secret put ZOHO_CRM_CLIENT_SECRET  
wrangler secret put ZOHO_CRM_REFRESH_TOKEN

# Zoho Bookings (NEW - for automated meeting scheduling)
wrangler secret put ZOHO_BOOKINGS_CLIENT_SECRET
wrangler secret put ZOHO_BOOKINGS_REFRESH_TOKEN

# Zoho Campaigns (Optional - for email automation)
wrangler secret put ZOHO_CAMPAIGNS_REFRESH_TOKEN

# Optional: Google Analytics (if keeping)
wrangler secret put GA4_API_SECRET
```

**Note:** If you used the same OAuth application for all Zoho services, you can use the same `CLIENT_SECRET` for both CRM and Bookings:
```bash
# If using the same OAuth app for all services:
wrangler secret put ZOHO_CRM_CLIENT_SECRET your_shared_client_secret
wrangler secret put ZOHO_BOOKINGS_CLIENT_SECRET your_shared_client_secret
```

## Step 5: Test the Integration

### 5.1 Test Lead Capture
1. Submit the assessment form on your landing page
2. Verify contact appears in Zoho CRM
3. Check that welcome email is sent via ZeptoMail
4. Confirm contact is added to appropriate Campaigns list

### 5.2 Test Zoho Bookings Integration
1. **Test Booking Services API**:
   ```bash
   curl https://ianyeo.com/api/bookings/services
   ```
   Should return your configured services.

2. **Test Availability API**:
   ```bash
   # Replace SERVICE_ID with your actual service ID from step 1
   curl "https://ianyeo.com/api/bookings/availability?service_id=YOUR_SERVICE_ID&date=2024-01-15"
   ```

3. **Test Full Booking Flow**:
   - Visit your landing page at `/ai-construction-consulting`
   - Click "Book Free Strategy Call"
   - Fill out the booking form
   - Select an available time slot
   - Confirm the booking

4. **Verify Integration**:
   - Check appointment appears in Zoho Bookings dashboard
   - Verify confirmation email is sent automatically
   - Confirm calendar invite is generated
   - Check lead is synced to Zoho CRM with high score (95 points)
   - Verify lead is added to appropriate email campaign list

5. **Test Debug Endpoints** (helpful for troubleshooting):
   ```bash
   # Test all integrations at once
   curl https://ianyeo.com/api/debug/test-all
   
   # Test just Zoho services
   curl https://ianyeo.com/api/debug/test-crm
   curl https://ianyeo.com/api/debug/test-email
   ```

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
# Zoho API URLs (already configured in wrangler.toml)
ZOHO_CRM_API_URL = "https://www.zohoapis.com/crm/v6"
ZOHO_BOOKINGS_API_URL = "https://www.zohoapis.com/bookings/v1"  
ZOHO_CAMPAIGNS_API_URL = "https://campaigns.zoho.com/api/v1.1"
ZOHO_ANALYTICS_API_URL = "https://analyticsapi.zoho.com/restapi/v2"
ZOHO_ACCOUNTS_URL = "https://accounts.zoho.com"

# Zoho Client IDs (non-secret, safe to commit)
ZOHO_CRM_CLIENT_ID = "your-zoho-crm-client-id"
ZOHO_BOOKINGS_CLIENT_ID = "your-zoho-bookings-client-id"  # Or same as CRM if using one OAuth app
```

## Secrets Summary

Required secrets for `wrangler secret put`:

```bash
ZOHO_API_KEY                    # ZeptoMail (already configured)
TURNSTILE_SECRET_KEY           # Cloudflare Turnstile
ZOHO_CRM_CLIENT_SECRET         # CRM OAuth  
ZOHO_CRM_REFRESH_TOKEN         # CRM OAuth
ZOHO_BOOKINGS_CLIENT_SECRET    # Bookings OAuth (NEW)
ZOHO_BOOKINGS_REFRESH_TOKEN    # Bookings OAuth (NEW)
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
- Zoho Bookings Basic: $8/month (includes API access)
- Zoho Campaigns: $9/month
- ZeptoMail: Pay-per-use (~$5/month)
- **Total: ~$40/month** (44% savings!)

**Additional Benefits:**
- ✅ Unified data across all platforms
- ✅ Single login for all tools
- ✅ Better integration between services  
- ✅ Comprehensive analytics across the funnel
- ✅ Professional booking experience with automated reminders

## Support and Documentation

- **Zoho CRM API:** [https://www.zoho.com/crm/developer/docs/](https://www.zoho.com/crm/developer/docs/)
- **Zoho Bookings API:** [https://www.zoho.com/bookings/help/api/](https://www.zoho.com/bookings/help/api/)
- **Zoho Campaigns API:** [https://www.zoho.com/campaigns/help/developers/](https://www.zoho.com/campaigns/help/developers/)
- **ZeptoMail API:** [https://www.zoho.com/zeptomail/help/api/](https://www.zoho.com/zeptomail/help/api/)

## Troubleshooting Common Issues

### Zoho Bookings API Issues

**Problem: "No services found" error**
- ✅ Verify you have at least one active service in Zoho Bookings
- ✅ Check that the service is enabled for online booking
- ✅ Ensure your OAuth token has `zohobookings.data.CREATE` scope

**Problem: "Availability not loading"**
- ✅ Check your Zoho Bookings availability settings (working hours set)
- ✅ Verify the service_id is correct (use `/api/bookings/services` to check)
- ✅ Ensure the date format is YYYY-MM-DD
- ✅ Check timezone settings match between Zoho and your system

**Problem: "Booking creation fails"**
- ✅ Verify all required fields are provided (firstName, lastName, email)
- ✅ Check that the appointment_date_time is in valid ISO format
- ✅ Ensure the time slot is actually available
- ✅ Verify the service allows the specified duration

**Problem: "Authentication errors"**
- ✅ Check that ZOHO_BOOKINGS_CLIENT_SECRET is set correctly
- ✅ Verify ZOHO_BOOKINGS_REFRESH_TOKEN is not expired
- ✅ Ensure the OAuth application has correct redirect URI
- ✅ Try regenerating the refresh token if issues persist

### General OAuth Issues

**Problem: "Invalid client" errors**
- ✅ Double-check your Client ID and Client Secret
- ✅ Ensure the OAuth application is active in Zoho API Console
- ✅ Verify the redirect URI exactly matches what you configured

**Problem: Token refresh failures**
- ✅ Check that you requested the correct scopes during authorization
- ✅ Ensure the refresh token hasn't been revoked
- ✅ Try the manual token refresh process to debug

### Debug Commands

```bash
# Test Zoho Bookings connectivity
curl https://ianyeo.com/api/debug/test-all

# Check what services are available
curl https://ianyeo.com/api/bookings/services

# Test a specific date's availability (replace SERVICE_ID)
curl "https://ianyeo.com/api/bookings/availability?service_id=YOUR_SERVICE_ID&date=2024-01-15"

# Check worker logs for detailed error messages
wrangler tail
```

## Next Steps

1. Set up the Zoho services in order (CRM → Bookings → Campaigns)
2. Configure OAuth applications and get refresh tokens
3. Set the Cloudflare Worker secrets
4. Test each integration individually
5. Deploy and test the complete flow
6. Set up analytics and monitoring

This Zoho-based system provides better integration, lower costs, and unified data management compared to using multiple third-party services. 
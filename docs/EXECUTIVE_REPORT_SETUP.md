# Executive Report Gated Access System - Setup Guide

This guide will help you set up a professional gated access system for your executive portfolio document using Cloudflare's infrastructure.

## 🎯 Overview

The system provides:
- **Professional Gateway Page** - Showcases report value with executive summary
- **Secure Access Control** - Time-limited, unique URLs with download limits
- **Automated Email Delivery** - Professional email templates with tracking
- **Analytics & Logging** - Track requests and downloads for insights

## 📋 Prerequisites

1. **Cloudflare Account** with Workers and R2 enabled
2. **Domain** configured with Cloudflare DNS
3. **Email Service** - Zoho Mail account with API access
4. **File Storage** - Cloudflare R2 bucket for secure PDF hosting
5. **Node.js 16+** for local development

## 🚀 Quick Setup

### 1. Install Dependencies

```bash
npm install -g wrangler@latest
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Create KV Namespace

```bash
npm run setup:kv
```

Copy the namespace IDs and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "REPORT_ACCESS"
id = "your-actual-namespace-id"
preview_id = "your-actual-preview-id"
```

### 4. Create R2 Bucket

```bash
wrangler r2 bucket create executive-reports
wrangler r2 bucket create executive-reports-preview  # Optional: for development
```

Update the bucket name in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "EXECUTIVE_REPORTS"
bucket_name = "executive-reports"
preview_bucket_name = "executive-reports-preview"
```

### 5. Set Environment Variables

```bash
# Required: Zoho Mail API key for email sending
wrangler secret put ZOHO_API_KEY

# Optional: Analytics and monitoring
wrangler secret put ADMIN_EMAIL
```

### 6. Upload Your Executive Report

Upload your PDF to Cloudflare R2:

```bash
# Upload the executive report to R2
wrangler r2 object put executive-reports/executive-report.pdf --file your-report.pdf

# Verify the upload
wrangler r2 object list executive-reports
```

### 7. Update Configuration

Edit `wrangler.toml`:

```toml
[vars]
SITE_URL = "https://yourdomain.com"
REPORT_FILE_KEY = "executive-report.pdf"  # File key in R2 bucket
ZOHO_FROM_EMAIL = "ian@yourdomain.com"    # Your verified Zoho sender email
```

### 8. Deploy Worker

```bash
npm run deploy:worker
```

### 9. Deploy Website

```bash
npm run deploy
```

## 🔧 Detailed Configuration

### Email Setup (Zoho Mail API)

1. **Create Zoho Account** at [zoho.com/mail](https://zoho.com/mail)
2. **Verify Domain** in Zoho Mail admin panel
3. **Enable Zoho Mail API**:
   - Go to [developers.zoho.com](https://developers.zoho.com)
   - Create a new application
   - Enable Mail API permissions
4. **Get API Key**:
   - Generate API key in Zoho developer console
   - Note: Use ZeptoMail API for transactional emails
5. **Add to Worker**:
   ```bash
   wrangler secret put ZOHO_API_KEY
   ```

**Alternative: ZeptoMail (Recommended for Transactional Emails)**
- Sign up at [zeptomail.com](https://zeptomail.com) (Zoho's transactional email service)
- Better deliverability for automated emails
- Dedicated IP addresses available
- API endpoint: `https://api.zeptomail.com/v1.1/email`

### File Storage (Cloudflare R2)

Benefits of using Cloudflare R2:
- **Zero Egress Fees** - No charges for downloads
- **Global Distribution** - Files served from edge locations
- **Secure Access** - Direct integration with Workers
- **Cost Effective** - Significantly cheaper than AWS S3

Setup commands:
```bash
# Create bucket
wrangler r2 bucket create executive-reports

# Upload file
wrangler r2 object put executive-reports/executive-report.pdf --file your-report.pdf

# List files
wrangler r2 object list executive-reports

# Download file (for verification)
wrangler r2 object get executive-reports/executive-report.pdf --file downloaded-report.pdf
```

### Security Configuration

The system automatically provides:
- **Secure Token Generation** - Cryptographically secure 256-bit tokens
- **Time-Limited Access** - 7-day expiration with automatic cleanup
- **Download Limits** - Maximum 3 downloads per token
- **Request Logging** - Anonymous analytics for insights
- **Email Validation** - Server-side validation with sanitization
- **R2 Direct Streaming** - Files served directly without public URLs

### Analytics & Monitoring

Access data is stored in Cloudflare KV for 30 days:

```javascript
// Request logs: log:request:timestamp:token
// Download logs: log:download:timestamp:token
```

To view analytics, use the Cloudflare dashboard or create custom reports.

## 🎨 Customization

### Styling

The executive report section uses CSS custom properties for easy theming:

```css
/* Primary brand colors */
--accent-primary: #1e40af;
--gradient-primary: linear-gradient(135deg, #1e40af 0%, #9333ea 100%);

/* Adjust in style.css */
#executive-report {
  /* Your customizations */
}
```

### Email Templates

Customize email templates in `worker.js`:

```javascript
function createEmailTemplate(formData, downloadUrl, expiresAt) {
  // Modify HTML template
}

function createTextEmailTemplate(formData, downloadUrl, expiresAt) {
  // Modify text template
}
```

### Form Fields

Add custom fields by:

1. **HTML**: Add fields to `index.html` modal form
2. **Validation**: Update `validateField()` in `script.js`
3. **Storage**: Modify `accessData` object in `worker.js`

## 📊 Form Fields & Validation

### Required Fields
- `firstName` - First Name (min 2 chars)
- `lastName` - Last Name (min 2 chars)
- `email` - Email Address (valid format)
- `company` - Company/Organisation (min 2 chars)
- `title` - Job Title
- `role` - Role/Interest (dropdown)
- `interest` - Specific Interest (dropdown)
- `consent` - Privacy consent (checkbox)

### Optional Fields
- `phone` - Phone Number (auto-formatted)
- `message` - Additional Details (textarea)

### Dropdown Options

**Role/Interest:**
- Executive Recruiter
- PE/VC Partner
- Board Member
- CEO/Founder
- Hiring Manager
- Strategic Partner
- Other

**Specific Interest:**
- C-Suite Opportunity
- Board Position
- Operating Partner Role
- Strategic Advisory
- Investment Opportunity
- Strategic Partnership
- Other

## 🚀 Deployment Process

### Development

```bash
# Start local development server
npm run dev

# Test worker locally
npm run dev:worker
```

### Production

```bash
# Deploy worker
npm run deploy:worker

# Deploy static site
npm run deploy
```

### Domain Routing

Ensure your Cloudflare DNS routes include:
- `yourdomain.com/api/*` → Worker
- `yourdomain.com/*` → Pages/Static site

## 🔒 Security Features

### Data Protection
- **Encryption in Transit** - All API calls use HTTPS
- **Secure Token Storage** - Tokens stored in Cloudflare KV with TTL
- **Privacy Compliance** - Minimal data collection, automatic cleanup
- **Input Sanitization** - Server-side validation and sanitization

### Access Control
- **Time-Limited URLs** - 7-day expiration with automatic cleanup
- **Download Limits** - Maximum 3 downloads per unique token
- **Email Verification** - Report sent only to validated email addresses
- **Request Rate Limiting** - Cloudflare's built-in DDoS protection

## 📈 Analytics & Insights

### Tracking Capabilities
- **Request Volume** - Number of report requests over time
- **Role Distribution** - Which roles are most interested
- **Interest Analysis** - What opportunities are most sought
- **Download Completion** - Conversion from request to download
- **Geographic Data** - Where requests originate (via Cloudflare)

### Accessing Data

Use Cloudflare's dashboard or create custom analytics:

```bash
# List all request logs
wrangler kv:key list --namespace-id YOUR_NAMESPACE_ID --prefix "log:request"

# Get specific request data
wrangler kv:key get "log:request:timestamp:token" --namespace-id YOUR_NAMESPACE_ID
```

## 🎯 Best Practices

### Content Strategy
1. **Executive Summary** - 2-page public teaser showcasing key achievements
2. **Gated Content** - Comprehensive 10-15 page detailed report
3. **Value Proposition** - Clear benefits for requesting access
4. **Professional Presentation** - High-quality PDF with consistent branding

### Lead Qualification
1. **Role-Based Access** - Tailor messaging based on requester role
2. **Interest Categorization** - Route opportunities appropriately
3. **Follow-up Strategy** - Automated sequences based on interest level
4. **Relationship Building** - Personal outreach for high-value prospects

### Performance Optimization
1. **Fast Loading** - Optimised images and minimal JavaScript
2. **Mobile Responsive** - Works perfectly on all devices
3. **SEO Friendly** - Proper meta tags and structured data
4. **Accessibility** - WCAG compliant form and navigation

## 🛠 Troubleshooting

### Common Issues

**KV Namespace Not Found**
```bash
# Recreate namespace
wrangler kv:namespace create REPORT_ACCESS
# Update wrangler.toml with new ID
```

**R2 Bucket Access Issues**
```bash
# Check bucket exists
wrangler r2 bucket list

# Verify file is uploaded
wrangler r2 object list executive-reports

# Test file access
wrangler r2 object get executive-reports/executive-report.pdf --file test-download.pdf

# Check bucket permissions
wrangler r2 bucket list
```

**Email Not Sending (Zoho/ZeptoMail)**
```bash
# Check API key is set
wrangler secret list

# Verify API key format (should start with 'Zoho-enczapikey ')
# Check sender email is verified in Zoho admin panel
# Test with curl:
curl -X POST "https://api.zeptomail.com/v1.1/email" \
  -H "Authorization: Zoho-enczapikey YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"from":"ian@yourdomain.com","to":[{"address":"test@example.com"}],"subject":"Test","textbody":"Test message"}'
```

**Download Link Invalid**
- Verify R2 bucket binding is correct in `wrangler.toml`
- Check `REPORT_FILE_KEY` matches actual file name in R2
- Ensure token hasn't expired (7 days max)
- Verify download limit not exceeded (3 max)
- Test R2 object exists: `wrangler r2 object head executive-reports/executive-report.pdf`

**Worker Deployment Issues**
```bash
# Check worker status
wrangler whoami
wrangler deployments list

# Verify environment variables
wrangler secret list

# Check R2 binding
wrangler r2 bucket list
```

### Debug Mode

Enable detailed logging by adding to `worker.js`:

```javascript
// Add at top of worker.js
const DEBUG = true;

// Use throughout worker
if (DEBUG) console.log('Debug info:', data);

// For R2 debugging
if (DEBUG) {
  console.log('R2 object key:', env.REPORT_FILE_KEY);
  console.log('R2 bucket binding:', typeof env.EXECUTIVE_REPORTS);
}
```

### Testing the Complete Flow

1. **Test form submission**:
   ```bash
   curl -X POST "https://yourdomain.com/api/request-report" \
     -H "Content-Type: application/json" \
     -d '{"firstName":"Test","lastName":"User","email":"test@example.com","company":"Test Co","title":"CEO","role":"ceo-founder","interest":"c-suite-role","consent":true}'
   ```

2. **Test download link**:
   - Check email for download URL
   - Verify PDF downloads correctly
   - Confirm download counter increments

3. **Test expiration**:
   - Manually set short expiration in worker
   - Verify expired links show error page

### Performance Monitoring

Monitor your system via Cloudflare dashboard:
- **Workers Analytics** - Request volume and errors
- **R2 Analytics** - Storage usage and bandwidth
- **KV Analytics** - Read/write operations
- **Email Delivery** - Via Zoho/ZeptoMail dashboard

## 📞 Support

For technical support with this implementation:
- **Email**: ian@ianyeo.com
- **LinkedIn**: [linkedin.com/in/iankyeo](https://linkedin.com/in/iankyeo)

## 📄 License

This implementation is provided under the MIT License. See LICENSE file for details.

---

## 🎉 You're Ready!

Your professional executive report gated access system is now configured and ready to:

✅ **Capture qualified leads** with professional form
✅ **Deliver secure access** with time-limited downloads  
✅ **Track engagement** with built-in analytics
✅ **Build relationships** with follow-up opportunities
✅ **Demonstrate expertise** with technical sophistication

The system positions your executive report as premium content while building a qualified contact database for your executive search and business development efforts.

## 6. Configure Cloudflare Turnstile (Bot Protection)

Your form now includes Cloudflare Turnstile for bot protection. This helps prevent spam and ensures only legitimate requests.

### Set Up Turnstile

1. **Create Turnstile Site**:
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to "Turnstile" (if not visible, enable it in your account)
   - Click "Add Site"
   - Enter your domain: `ianyeo.com`
   - Choose "Managed" mode for automatic challenge
   - Click "Create"

2. **Get Your Keys**:
   - Copy the **Site Key** (starts with `0x4...`)
   - Copy the **Secret Key** (starts with `0x2...`)

3. **Update Configuration**:
   
   **Update HTML** (`index.html`):
   Replace the test site key with your real one:
   ```html
   <div class="cf-turnstile" 
        data-sitekey="YOUR_ACTUAL_SITE_KEY_HERE"
        ...>
   ```
   
   **Update Worker Environment**:
   ```bash
   # Set the secret key (used for server-side verification)
   wrangler secret put TURNSTILE_SECRET_KEY
   # Enter your secret key when prompted
   
   # Update wrangler.toml with your site key
   # Replace TURNSTILE_SITE_KEY value in the [vars] section
   ```

4. **Test the Integration**:
   - Open your website in a private/incognito browser
   - Try submitting the executive report form
   - You should see the Turnstile challenge appear
   - Verify the form only submits after completing the challenge

### Development Testing

The current configuration uses Cloudflare's test key (`0x4AAAAAAABkPtOo4wr4djKj`) which always passes verification. This is perfect for development but remember to replace it with your production keys before going live.

### Quick Test Page

Use the included `test-turnstile.html` file to quickly test your Turnstile configuration:

```bash
# Serve the test file locally
python3 -m http.server 8080
# Or use any local server of your choice

# Then visit: http://localhost:8080/test-turnstile.html
```

This test page will show you:
- ✅ If Turnstile loads correctly
- ✅ If the verification widget appears
- ✅ If tokens are generated successfully
- ❌ Any configuration errors

## 7. Final Testing

1. **Complete Form Test**:
   - Go to your website
   - Click "Request Full CEO Executive Brief"
   - Fill out the form completely
   - Complete the Turnstile verification
   - Submit the form
   - Check your email for the secure download link

2. **Download Test**:
   - Click the download link in the email
   - Verify the PDF downloads correctly
   - Test the download limits (try downloading 4 times)
   - Test link expiration (if possible)

3. **Analytics Check**:
   - Check Cloudflare Worker logs for successful requests
   - Verify ZeptoMail delivery logs
   - Monitor R2 storage metrics

## 8. Go Live Checklist 
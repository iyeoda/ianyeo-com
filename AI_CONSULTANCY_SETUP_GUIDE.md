# AI Consultancy Landing Page - Implementation Guide

## Overview

This guide walks you through implementing a comprehensive AI consultancy landing page on your existing Cloudflare infrastructure. The solution includes lead capture, AI readiness assessments, analytics tracking, A/B testing, and CRM integration.

> **📋 Important: Zoho Integration** - This system now uses Zoho services (CRM, Bookings, Campaigns) instead of third-party alternatives for better integration and cost savings. See **[ZOHO_SETUP_GUIDE.md](./ZOHO_SETUP_GUIDE.md)** for detailed Zoho configuration steps.

## 🚀 Quick Start

1. **Run Infrastructure Setup**
   ```bash
   chmod +x setup-consultancy-infrastructure.sh
   ./setup-consultancy-infrastructure.sh
   ```

2. **Update Configuration**
   - Update `wrangler.toml` with generated namespace IDs
   - Set required secrets
   - Deploy worker

3. **Test Implementation**
   - Visit `/ai-construction-consulting`
   - Test lead capture and assessment flows

## 📋 Prerequisites

- Cloudflare account with Workers, Pages, KV, and R2 enabled
- Node.js v16+ and npm
- Wrangler CLI installed
- Existing ianyeo.com infrastructure

## 🛠 Step-by-Step Implementation

### Phase 1: Infrastructure Setup (15 minutes)

1. **Create KV Namespaces**
   ```bash
   # Create production namespaces
   wrangler kv:namespace create LEADS_DB
   wrangler kv:namespace create ASSESSMENTS_DB
   wrangler kv:namespace create ANALYTICS_DB
   
   # Create preview namespaces
   wrangler kv:namespace create LEADS_DB --preview
   wrangler kv:namespace create ASSESSMENTS_DB --preview
   wrangler kv:namespace create ANALYTICS_DB --preview
   ```

2. **Create R2 Buckets**
   ```bash
   # Create production bucket
   wrangler r2 bucket create lead-magnets
   
   # Create preview bucket
   wrangler r2 bucket create lead-magnets-preview
   ```

3. **Update wrangler.toml**
   Replace placeholder IDs with actual namespace IDs from step 1:
   ```toml
   [[kv_namespaces]]
   binding = "LEADS_DB"
   id = "your-actual-leads-namespace-id"
   preview_id = "your-actual-leads-preview-id"
   ```

### Phase 2: Environment Variables & Secrets (10 minutes)

1. **Set Required Secrets**
   ```bash
   # Core secrets (already existing)
   wrangler secret put ZOHO_API_KEY
   wrangler secret put TURNSTILE_SECRET_KEY
   
   # New AI consultancy secrets
   wrangler secret put ZOHO_CRM_CLIENT_ID     # Zoho CRM integration
wrangler secret put ZOHO_CRM_CLIENT_SECRET # Zoho CRM integration  
wrangler secret put ZOHO_CRM_REFRESH_TOKEN # Zoho CRM integration
   wrangler secret put ZOHO_BOOKINGS_CLIENT_ID     # Zoho Bookings integration
wrangler secret put ZOHO_BOOKINGS_CLIENT_SECRET # Zoho Bookings integration
wrangler secret put ZOHO_BOOKINGS_REFRESH_TOKEN # Zoho Bookings integration
wrangler secret put ZOHO_CAMPAIGNS_API_KEY      # Zoho Campaigns integration
   wrangler secret put GA4_MEASUREMENT_ID   # Optional: For Google Analytics
   wrangler secret put GA4_API_SECRET       # Optional: For Google Analytics
   ```

2. **Update Environment Variables**
   Edit `wrangler.toml` to add your actual IDs:
   ```toml
   [vars]
   ZOHO_CRM_API_URL = "https://www.zohoapis.com/crm/v6"
ZOHO_BOOKINGS_API_URL = "https://www.zohoapis.com/bookings/v1"
ZOHO_CAMPAIGNS_API_URL = "https://campaigns.zoho.com/api/v1.1"
   ```

### Phase 3: Deploy & Test (5 minutes)

1. **Deploy Worker**
   ```bash
   wrangler deploy
   ```

2. **Test Endpoints**
   ```bash
   # Test lead capture endpoint
   curl -X OPTIONS https://ianyeo.com/api/leads/capture
   
   # Test assessment endpoint
   curl -X OPTIONS https://ianyeo.com/api/assessment/submit
   
   # Test landing page
   curl -s https://ianyeo.com/ai-construction-consulting
   ```

## 🔧 Configuration Details

### KV Namespace Data Structures

```javascript
// LEADS_DB
{
  "lead_uuid": {
    "id": "uuid",
    "timestamp": "ISO string",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "company": "Construction Co",
    "jobTitle": "ceo",
    "leadScore": 85,
    "status": "new",
    "source": "ai-consulting-landing",
    "challenges": ["project-delays", "cost-overruns"],
    "timeline": "immediate",
    "budget": "50k-100k"
  },
  "email:user@example.com": "lead_uuid"
}

// ASSESSMENTS_DB  
{
  "assessment_uuid": {
    "id": "uuid",
    "timestamp": "ISO string",
    "email": "user@example.com",
    "score": 72,
    "category": "AI Emerging",
    "recommendations": ["array of recommendations"],
    "nextSteps": ["array of next steps"]
  },
  "share:token": "assessment_uuid"
}

// ANALYTICS_DB
{
  "event:event_uuid": {
    "event": "lead_captured",
    "timestamp": "ISO string",
    "sessionId": "session_uuid",
    "data": { "leadScore": 85, "source": "landing" }
  }
}
```

### API Endpoints

| Endpoint | Method | Purpose | Request Body |
|----------|--------|---------|--------------|
| `/api/leads/capture` | POST | Capture lead information | Lead form data + Turnstile token |
| `/api/assessment/submit` | POST | Submit AI readiness assessment | Email, company, answers array |
| `/api/assessment/results` | GET | Get assessment results | ?token=share_token |
| `/api/analytics/track` | POST | Track user events | Event name, data, session info |
| `/api/ab-test/{testName}` | GET | Get A/B test variant | Test name in URL |
| `/api/email/subscribe` | POST | Newsletter subscription | Email, interests |
| `/api/leads/score` | POST | Calculate lead score | Lead data |

### Lead Scoring Algorithm

The system automatically scores leads based on:

- **Company Size** (10-80 points): Enterprise gets highest score
- **Job Title** (10-50 points): C-level executives get highest score
- **Budget** (10-70 points): Higher budgets get higher scores
- **Timeline** (10-50 points): Immediate needs get highest score
- **Industry** (10-40 points): Construction-related industries get bonus points

**Score Tiers:**
- 80-100: Hot lead (immediate follow-up)
- 60-79: Warm lead (follow-up within 24h)
- 40-59: Cool lead (nurture sequence)
- 0-39: Cold lead (educational content)

## 📊 Analytics & Tracking

### Events Tracked

- **Page Views**: Landing page visits with referrer data
- **Section Views**: Which sections users scroll to
- **Form Interactions**: Field focus, form starts, completions
- **CTA Clicks**: All call-to-action button clicks with position tracking
- **Assessment Progress**: Question-by-question completion
- **Lead Scoring**: Automatic scoring and tier assignment
- **Conversions**: Lead capture, assessment completion, booking requests

### A/B Tests

Currently configured tests:
- `hero-headline`: Variant A vs B for main headline
- `cta-button`: Different CTA button text and styles
- `pricing-display`: Different ways to present pricing

### Google Analytics 4 Integration

Events automatically sent to GA4:
```javascript
gtag('event', 'conversion', {
  event_category: 'AI Consulting',
  event_label: 'lead_captured',
  value: 100,
  custom_parameter_1: leadScore,
  custom_parameter_2: 'lead_captured'
});
```

## 🔐 Security Features

- **Cloudflare Turnstile**: Bot protection on all forms
- **Rate Limiting**: Built-in Cloudflare protection
- **CORS Headers**: Properly configured for security
- **Data Validation**: Server-side validation of all inputs
- **Secure Tokens**: Cryptographically secure access tokens
- **Expiring Links**: Assessment results expire after 90 days

## 📱 Mobile Optimization

- Responsive design works on all screen sizes
- Touch-friendly form elements
- Optimized for mobile conversion flows
- Progressive enhancement for older browsers

## 🎯 Conversion Optimization

### Lead Magnets
- AI readiness assessment (primary)
- Industry reports and whitepapers
- Implementation checklists
- ROI calculators

### Email Sequences
Different sequences based on lead score:
- High-value leads: Enterprise-focused content
- Standard leads: Educational content with gentle nurturing

### Social Proof Elements
- Client logos and testimonials
- Project statistics and results
- Industry recognition and awards

## 📈 Performance Metrics

### Core KPIs to Track
- **Conversion Rate**: Visitors to leads
- **Assessment Completion**: Start to finish rate
- **Lead Quality Score**: Average lead score
- **Time to Conversion**: How long before users convert
- **Source Attribution**: Which channels drive best leads

### Expected Performance
- **Page Load Speed**: <2 seconds (Cloudflare edge optimization)
- **Assessment Completion**: 60-70% start-to-finish rate
- **Lead Conversion**: 15-25% of visitors (industry benchmark: 5-15%)
- **Lead Quality**: 70%+ qualified leads with proper scoring

## 🔄 Ongoing Maintenance

### Weekly Tasks
- Review lead quality and scoring accuracy
- Monitor conversion rates and form completion
- Check A/B test performance
- Review analytics for insights

### Monthly Tasks
- Update assessment questions based on feedback
- Optimize A/B tests and launch new variants
- Review and update lead nurturing sequences
- Analyze ROI and adjust marketing spend

### Quarterly Tasks
- Comprehensive performance review
- Update industry-specific content
- Expand A/B testing to new elements
- Review and optimize lead scoring algorithm

## 🚨 Troubleshooting

### Common Issues

1. **Forms Not Submitting**
   - Check Turnstile configuration
   - Verify KV namespace bindings
   - Check CORS headers

2. **Assessment Results Not Loading**
   - Verify ASSESSMENTS_DB namespace
   - Check token expiration (90 days)
   - Ensure proper token generation

3. **Analytics Not Tracking**
   - Verify GA4 credentials are set
   - Check ANALYTICS_DB namespace
   - Ensure proper event structure

4. **Lead Scoring Inconsistent**
   - Review scoring algorithm logic
   - Check form field mappings
   - Verify data validation

### Debug Commands

```bash
# Check KV namespace contents
wrangler kv:key list --binding=LEADS_DB

# Test specific lead
wrangler kv:key get "lead_uuid" --binding=LEADS_DB

# Check worker logs
wrangler tail

# Test API endpoints
curl -X POST https://ianyeo.com/api/leads/capture \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## 📞 Support & Resources

- **Documentation**: This guide and inline code comments
- **Monitoring**: Cloudflare Analytics + custom event tracking
- **Logs**: Available via `wrangler tail` for real-time debugging
- **Backup**: All data stored in Cloudflare KV with automatic replication

## 🎉 Success Metrics

### 30 Days Post-Launch
- [ ] 500+ page visits to AI consulting landing page
- [ ] 50+ lead captures with 70%+ qualification rate
- [ ] 100+ assessment completions
- [ ] <2 second page load times
- [ ] 15%+ visitor-to-lead conversion rate

### 90 Days Post-Launch
- [ ] 2000+ total page visits
- [ ] 200+ qualified leads generated
- [ ] 50+ sales meetings booked
- [ ] 5+ closed consultancy deals
- [ ] ROI positive on marketing spend

---

**Ready to Launch?** Run `./setup-consultancy-infrastructure.sh` to begin the automated setup process! 
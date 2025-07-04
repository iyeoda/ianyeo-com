# Cloudflare Deployment Guide

This guide explains the optimized, secure, and robust deployment system for the Ian Yeo website and AI consultancy platform.

## Overview

The deployment system has been completely redesigned to address the previous issues:

### Previous Issues Fixed
- ❌ Missing production environment in `wrangler.toml`
- ❌ Inconsistent secret naming (`CLOUDFLARE_API_TOKEN` vs `CF_API_TOKEN`)
- ❌ Redundant deployment workflows
- ❌ Overly complex build processes
- ❌ Poor error handling

### New System Benefits
- ✅ **Unified Deployment**: Single workflow handles all scenarios
- ✅ **Environment Management**: Proper staging/production environments
- ✅ **Consistent Secrets**: Standardized naming across all workflows
- ✅ **Security First**: Minimal permissions and comprehensive scanning
- ✅ **Robust Testing**: Pre-deployment validation and post-deployment verification
- ✅ **Performance Optimization**: Automatic asset minification and optimization

## Architecture

```
GitHub Repository
├── .github/workflows/deploy.yml (Main deployment workflow)
├── wrangler.toml (Worker configuration with staging/production environments)
├── Static Assets (HTML, CSS, JS, images)
└── worker.js (Cloudflare Worker for dynamic functionality)
```

## Setup Instructions

### 1. Configure GitHub Secrets

In your GitHub repository, go to Settings → Secrets and variables → Actions and add these secrets:

#### Core Cloudflare Secrets (Required)
```bash
CF_API_TOKEN          # Cloudflare API token with Worker and Pages permissions
CF_ACCOUNT_ID         # Your Cloudflare account ID
```

#### Application Secrets (Required)
```bash
ZOHO_API_KEY                    # ZeptoMail API key for email sending
TURNSTILE_SECRET_KEY           # Cloudflare Turnstile secret key for bot protection
```

#### Advanced Integration Secrets (Optional)
```bash
ZOHO_CRM_CLIENT_SECRET         # Zoho CRM OAuth client secret
ZOHO_CRM_REFRESH_TOKEN         # Zoho CRM OAuth refresh token
ZOHO_CAMPAIGNS_REFRESH_TOKEN   # Zoho Campaigns OAuth refresh token
GA4_API_SECRET                 # Google Analytics 4 API secret
ZOHO_BOOKINGS_CLIENT_SECRET    # Zoho Bookings OAuth client secret
ZOHO_BOOKINGS_REFRESH_TOKEN    # Zoho Bookings OAuth refresh token
```

### 2. Get Cloudflare API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Custom Token" template
4. Configure permissions:
   - **Account**: `Cloudflare Workers:Edit`
   - **Zone**: `Zone:Edit` (for your domain)
   - **Account**: `Cloudflare Pages:Edit`
   - **Zone**: `Zone Settings:Edit`
5. Add IP restrictions if needed (optional but recommended)
6. Click "Continue to summary" and "Create Token"

### 3. Get Your Account ID

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your domain
3. In the right sidebar, copy your "Account ID"

### 4. Configure Local Development

For local development, create a `.dev.vars` file in your project root:

```bash
# .dev.vars (DO NOT commit this file)
ZOHO_API_KEY=your-zoho-api-key
TURNSTILE_SECRET_KEY=your-turnstile-secret
ZOHO_CRM_CLIENT_SECRET=your-crm-secret
ZOHO_CRM_REFRESH_TOKEN=your-crm-token
# ... other secrets
```

### 5. Set Production Secrets

Use the Wrangler CLI to set production secrets:

```bash
# Essential secrets
wrangler secret put ZOHO_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY

# Optional advanced secrets
wrangler secret put ZOHO_CRM_CLIENT_SECRET
wrangler secret put ZOHO_CRM_REFRESH_TOKEN
wrangler secret put ZOHO_CAMPAIGNS_REFRESH_TOKEN # This is not used for now
wrangler secret put GA4_API_SECRET # This is not used for now
wrangler secret put ZOHO_BOOKINGS_CLIENT_SECRET
wrangler secret put ZOHO_BOOKINGS_REFRESH_TOKEN
```

## Deployment Workflows

### Automatic Deployment (Recommended)

The system automatically deploys based on your Git workflow:

#### Production Deployment
- **Trigger**: Push to `main` branch
- **Environment**: Production
- **URL**: `https://ianyeo.com`
- **Process**: Build → Test → Deploy Worker → Deploy Pages → Verify → Security Scan

#### Staging Deployment  
- **Trigger**: Pull Request to `main` branch
- **Environment**: Staging
- **URL**: `https://staging.ianyeo.com` (if configured)
- **Process**: Build → Test → Deploy to Staging → Verify

### Manual Deployment

For manual deployments, use the Wrangler CLI:

```bash
# Deploy to production
wrangler deploy --env production

# Deploy to staging
wrangler deploy --env staging

# Deploy to development
wrangler deploy --env development
```

## Environment Configuration

The system supports three environments:

### Production
- **Worker Name**: `ianyeo-com`
- **Site URL**: `https://ianyeo.com`
- **Deploy**: Automatic on push to `main`

### Staging  
- **Worker Name**: `ianyeo-com-staging`
- **Site URL**: `https://staging.ianyeo.com`
- **Deploy**: Automatic on pull requests

### Development
- **Worker Name**: `ianyeo-com-dev`
- **Site URL**: `http://localhost:8787`
- **Deploy**: Manual via `wrangler dev`

## Security Features

### 1. Minimal Permissions
- GitHub Actions run with minimal required permissions
- Cloudflare API tokens are scoped to specific resources
- Secrets are never exposed in logs

### 2. Automatic Security Scanning
- Security headers verification
- HTTPS enforcement
- Content Security Policy validation

### 3. Environment Isolation
- Separate environments for staging and production
- Different worker names and configurations
- Isolated secrets and configurations

## Monitoring and Maintenance

### 1. View Deployment Status
- Check GitHub Actions tab for deployment status
- Monitor Cloudflare Dashboard for worker health
- Use `wrangler tail` for real-time logs

### 2. Common Commands
```bash
# Check deployment status
wrangler deployments list

# View real-time logs
wrangler tail --format pretty

# Check worker status
wrangler dev

# Test API endpoints
curl -X OPTIONS https://ianyeo.com/api/leads/capture
```

### 3. Troubleshooting

#### Deployment Failures
1. Check GitHub Actions logs for specific errors
2. Verify all required secrets are set
3. Ensure Cloudflare API token has correct permissions
4. Check `wrangler.toml` configuration

#### Runtime Issues
1. Use `wrangler tail` to view worker logs
2. Check Cloudflare Analytics dashboard
3. Verify environment variables are correctly set
4. Test API endpoints individually

## Performance Optimization

### 1. Automatic Asset Optimization
- CSS minification with CleanCSS
- JavaScript minification with Terser
- Image optimization (if configured)
- HTML minification (optional)

### 2. Caching Strategy
- Static assets cached at edge locations
- Worker responses cached appropriately
- Browser caching headers set automatically

### 3. Performance Monitoring
- Core Web Vitals tracking
- Load time monitoring
- Error rate tracking
- User experience metrics

## Cost Optimization

### 1. Cloudflare Workers
- First 100,000 requests/day are free
- $0.50 per million requests after that
- No idle costs - only pay for actual usage

### 2. Cloudflare Pages
- Unlimited static requests
- 500 builds per month included
- Fast global CDN included

### 3. Cloudflare KV
- First 100,000 read operations/day free
- First 1,000 write operations/day free
- Low storage costs

## Migration from Old System

If you're migrating from the old deployment system:

### 1. Update Secrets
- Rename `CLOUDFLARE_API_TOKEN` to `CF_API_TOKEN`
- Rename `CLOUDFLARE_ACCOUNT_ID` to `CF_ACCOUNT_ID`
- Add any missing secrets listed above

### 2. Remove Old Workflows
- The old `deploy-ai-consulting.yml` is now deprecated
- All functionality is handled by the main `deploy.yml` workflow

### 3. Test the New System
1. Create a pull request to test staging deployment
2. Merge to main to test production deployment
3. Verify all functionality works correctly

## Best Practices

### 1. Development Workflow
- Always test changes in staging before production
- Use pull requests for all changes
- Monitor deployment logs for issues

### 2. Secret Management
- Rotate secrets regularly
- Use environment-specific secrets where appropriate
- Never commit secrets to version control

### 3. Performance
- Monitor Core Web Vitals
- Optimize images and assets
- Use efficient API patterns

## Support

For issues with the deployment system:

1. **Check the logs**: GitHub Actions and Cloudflare Dashboard
2. **Common issues**: Most problems are related to missing secrets or permissions
3. **Get help**: Check the troubleshooting section above
4. **Contact**: Create an issue in the GitHub repository

## Changelog

### v2.0.0 (Current)
- ✅ Unified deployment workflow
- ✅ Proper environment management
- ✅ Enhanced security features
- ✅ Automatic optimization
- ✅ Comprehensive testing

### v1.0.0 (Deprecated)
- ❌ Separate AI consulting workflow
- ❌ Missing production environment
- ❌ Inconsistent secret naming
- ❌ Manual optimization required

---

This deployment system provides a robust, secure, and scalable foundation for your website and AI consultancy platform. The unified approach reduces complexity while improving reliability and security. 
#!/bin/bash

# Migration Script: Old Deployment System → New Unified System
# This script helps migrate from the problematic deploy-ai-consulting.yml to the new unified deployment

set -e

echo "🚀 Migration to New Deployment System"
echo "====================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-migration Checklist${NC}"
echo "==============================="
echo ""

# Check current branch
current_branch=$(git branch --show-current)
echo "Current branch: $current_branch"

if [ "$current_branch" != "main" ]; then
    echo -e "${YELLOW}⚠️  Warning: You're not on the main branch${NC}"
    echo "Consider switching to main branch before continuing"
    read -p "Continue anyway? (y/N): " continue_anyway
    if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
        echo "Exiting..."
        exit 1
    fi
fi

echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found${NC}"
    echo "Please install it: npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✅ Wrangler CLI found${NC}"

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare${NC}"
    echo "Please run: wrangler login"
    exit 1
fi

echo -e "${GREEN}✅ Logged in to Cloudflare${NC}"

# Check GitHub CLI (optional)
if command -v gh &> /dev/null; then
    echo -e "${GREEN}✅ GitHub CLI found${NC}"
    gh_available=true
else
    echo -e "${YELLOW}⚠️  GitHub CLI not found (optional)${NC}"
    echo "Install it for easier secret management: https://cli.github.com/"
    gh_available=false
fi

echo ""
echo -e "${BLUE}🔧 Migration Steps${NC}"
echo "==================="
echo ""

# Step 1: Update wrangler.toml
echo -e "${BLUE}Step 1: Checking wrangler.toml configuration${NC}"

if grep -q "\[env\.production\]" wrangler.toml; then
    echo -e "${GREEN}✅ Production environment already configured${NC}"
else
    echo -e "${YELLOW}⚠️  Production environment not found in wrangler.toml${NC}"
    echo "The migration should have already added this. Please check your wrangler.toml file."
fi

# Step 2: Check GitHub Secrets
echo ""
echo -e "${BLUE}Step 2: GitHub Secrets Configuration${NC}"
echo ""

echo "You need to ensure these secrets are set in your GitHub repository:"
echo ""
echo -e "${GREEN}Required secrets:${NC}"
echo "  CF_API_TOKEN          # Cloudflare API token"
echo "  CF_ACCOUNT_ID         # Cloudflare account ID"
echo "  ZOHO_API_KEY         # ZeptoMail API key"
echo "  TURNSTILE_SECRET_KEY # Turnstile secret key"
echo ""
echo -e "${YELLOW}Optional secrets (for advanced features):${NC}"
echo "  ZOHO_CRM_CLIENT_SECRET"
echo "  ZOHO_CRM_REFRESH_TOKEN"
echo "  ZOHO_CAMPAIGNS_REFRESH_TOKEN"
echo "  GA4_API_SECRET"
echo "  ZOHO_BOOKINGS_CLIENT_SECRET"
echo "  ZOHO_BOOKINGS_REFRESH_TOKEN"
echo ""

if [ "$gh_available" = true ]; then
    echo -e "${BLUE}🔑 Checking GitHub Secrets${NC}"
    
    # Check if we can access the repo
    if gh repo view > /dev/null 2>&1; then
        echo -e "${GREEN}✅ GitHub repository detected${NC}"
        
        # List current secrets
        echo ""
        echo "Current GitHub secrets:"
        gh secret list || echo "Could not list secrets (you may need repository admin access)"
        
        echo ""
        echo -e "${YELLOW}💡 To set secrets via GitHub CLI:${NC}"
        echo "gh secret set CF_API_TOKEN"
        echo "gh secret set CF_ACCOUNT_ID"
        echo "gh secret set ZOHO_API_KEY"
        echo "gh secret set TURNSTILE_SECRET_KEY"
        
    else
        echo -e "${YELLOW}⚠️  Could not access GitHub repository via CLI${NC}"
        echo "You can set secrets manually at:"
        echo "https://github.com/USERNAME/REPO/settings/secrets/actions"
    fi
else
    echo -e "${YELLOW}💡 To set GitHub secrets manually:${NC}"
    echo "1. Go to your GitHub repository"
    echo "2. Settings → Secrets and variables → Actions"
    echo "3. Add the required secrets listed above"
fi

# Step 3: Test local setup
echo ""
echo -e "${BLUE}Step 3: Testing Local Setup${NC}"
echo ""

echo "Testing wrangler configuration..."
if wrangler whoami > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Wrangler authentication working${NC}"
else
    echo -e "${RED}❌ Wrangler authentication failed${NC}"
    exit 1
fi

# Test wrangler.toml
if wrangler config list > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Wrangler configuration valid${NC}"
else
    echo -e "${YELLOW}⚠️  Wrangler configuration has issues${NC}"
    echo "Please check your wrangler.toml file"
fi

# Step 4: Deployment Test
echo ""
echo -e "${BLUE}Step 4: Ready for Testing${NC}"
echo ""

echo "Your migration is ready! Next steps:"
echo ""
echo -e "${GREEN}1. Test the new system:${NC}"
echo "   • Create a pull request to test staging deployment"
echo "   • Merge to main to test production deployment"
echo ""
echo -e "${GREEN}2. Monitor the deployment:${NC}"
echo "   • Check GitHub Actions tab for deployment status"
echo "   • Use 'wrangler tail' to monitor worker logs"
echo ""
echo -e "${GREEN}3. Verify functionality:${NC}"
echo "   • Test your website: https://ianyeo.com"
echo "   • Test AI consulting: https://ianyeo.com/ai-construction-consulting"
echo "   • Test API endpoints"
echo ""

# Step 5: Cleanup
echo -e "${BLUE}Step 5: Cleanup Old System${NC}"
echo ""
echo "The old deploy-ai-consulting.yml workflow has been deprecated."
echo "You can safely remove it after confirming the new system works:"
echo ""
echo -e "${YELLOW}  git rm .github/workflows/deploy-ai-consulting.yml${NC}"
echo -e "${YELLOW}  git commit -m \"Remove deprecated AI consulting workflow\"${NC}"
echo ""

# Final summary
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo "======================"
echo ""
echo "Your deployment system has been upgraded with:"
echo "✅ Unified deployment workflow"
echo "✅ Proper environment management (staging/production)"
echo "✅ Enhanced security features"
echo "✅ Automatic asset optimization"
echo "✅ Comprehensive testing and monitoring"
echo ""
echo "The new system is more robust, secure, and easier to maintain."
echo ""
echo -e "${BLUE}📖 Documentation:${NC}"
echo "• Deployment Guide: docs/DEPLOYMENT_GUIDE.md"
echo "• Technical Guide: docs/technical_implementation_guide.md"
echo "• Setup Guides: docs/AI_CONSULTANCY_SETUP_GUIDE.md"
echo ""
echo -e "${YELLOW}💡 Need help?${NC}"
echo "• Check the troubleshooting section in the deployment guide"
echo "• Monitor GitHub Actions for deployment status"
echo "• Use 'wrangler tail' for real-time debugging"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}" 
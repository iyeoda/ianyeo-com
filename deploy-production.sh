#!/bin/bash
# Secure Production Deployment Script for Ian Yeo AI Consultancy

set -e  # Exit on any error

echo "🚀 Deploying Ian Yeo AI Consultancy to Production"
echo "=================================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Please install it first:${NC}"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Cloudflare. Please run:${NC}"
    echo "wrangler login"
    exit 1
fi

echo -e "${BLUE}🔐 Setting up production secrets...${NC}"

# Function to securely set a secret
set_secret() {
    local secret_name=$1
    local description=$2
    local example_value=$3
    
    echo -e "${YELLOW}Setting $secret_name${NC}"
    echo "Description: $description"
    if [ ! -z "$example_value" ]; then
        echo "Example format: $example_value"
    fi
    
    # Check if secret already exists
    if wrangler secret list | grep -q "$secret_name"; then
        read -p "Secret $secret_name already exists. Update it? (y/N): " update_secret
        if [[ ! $update_secret =~ ^[Yy]$ ]]; then
            echo "Skipping $secret_name"
            return
        fi
    fi
    
    echo "Enter the value for $secret_name:"
    read -s secret_value
    echo "$secret_value" | wrangler secret put "$secret_name"
    echo -e "${GREEN}✅ $secret_name set successfully${NC}"
    echo
}

# Set all required secrets
echo -e "${BLUE}📧 Email & Communication Secrets${NC}"
set_secret "ZOHO_API_KEY" "ZeptoMail API key for sending emails" "Zoho-enczapikey YOUR_ZEPTO_KEY"

echo -e "${BLUE}🛡️  Security Secrets${NC}"
set_secret "TURNSTILE_SECRET_KEY" "Cloudflare Turnstile secret key for bot protection" "0x4AA..."

echo -e "${BLUE}📊 CRM Integration Secrets${NC}"
set_secret "ZOHO_CRM_CLIENT_SECRET" "Zoho CRM OAuth client secret" "2c49dfe6..."
set_secret "ZOHO_CRM_REFRESH_TOKEN" "Zoho CRM OAuth refresh token" "1000.ff9f..."

echo -e "${BLUE}📈 Marketing & Analytics Secrets${NC}"
set_secret "ZOHO_CAMPAIGNS_REFRESH_TOKEN" "Zoho Campaigns OAuth refresh token (optional)" "1000.abc..."
set_secret "GA4_API_SECRET" "Google Analytics 4 Measurement Protocol secret (optional)" "abc123..."

echo -e "${GREEN}🔐 All secrets configured successfully!${NC}"
echo

# Deploy to production
echo -e "${BLUE}🚀 Deploying to production...${NC}"
wrangler deploy

echo
echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo
echo -e "${BLUE}🌐 Your AI Consultancy is now live at:${NC}"
echo "• Main site: https://ianyeo.com"
echo "• AI Consulting: https://ianyeo.com/ai-construction-consulting"
echo "• API endpoints: https://ianyeo.com/api/*"
echo
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Test the booking system on your live site"
echo "2. Verify email notifications are working"
echo "3. Check Zoho CRM for new contacts"
echo "4. Monitor the console for any errors"
echo
echo -e "${BLUE}🔍 To view logs:${NC}"
echo "wrangler tail"
echo
echo -e "${GREEN}🎉 Happy consulting!${NC}" 
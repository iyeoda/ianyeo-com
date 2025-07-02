#!/bin/bash
# Debug Testing Script for AI Consultancy Integrations

set -e

echo "🔍 AI Consultancy Debug Testing"
echo "================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Get the base URL
if [ "$1" = "production" ] || [ "$1" = "prod" ]; then
    BASE_URL="https://ianyeo.com"
    echo -e "${BLUE}🌐 Testing PRODUCTION environment${NC}"
else
    BASE_URL="http://localhost:8787"
    echo -e "${YELLOW}💻 Testing LOCAL environment${NC}"
    echo -e "${YELLOW}Make sure you're running 'wrangler dev' in another terminal${NC}"
fi

echo ""

# Function to test an endpoint
test_endpoint() {
    local name="$1"
    local endpoint="$2"
    
    echo -e "${BLUE}Testing: $name${NC}"
    echo "URL: $BASE_URL$endpoint"
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$BASE_URL$endpoint" 2>/dev/null || echo "HTTPSTATUS:000")
    
    # Extract status code
    status_code=$(echo "$response" | grep -o "HTTPSTATUS:[0-9]*" | cut -d: -f2)
    body=$(echo "$response" | sed 's/HTTPSTATUS:[0-9]*$//')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ SUCCESS ($status_code)${NC}"
        
        # Pretty print JSON if it's JSON
        if echo "$body" | jq . >/dev/null 2>&1; then
            echo "$body" | jq .
        else
            echo "$body"
        fi
    else
        echo -e "${RED}❌ FAILED ($status_code)${NC}"
        echo "$body"
    fi
    
    echo ""
    echo "----------------------------------------"
    echo ""
}

# Run debug tests
echo -e "${YELLOW}🧪 Running Debug Tests...${NC}"
echo ""

test_endpoint "1. Test Secrets Configuration" "/api/debug/test-secrets"
test_endpoint "2. Test Email Integration" "/api/debug/test-email"
test_endpoint "3. Test CRM Integration" "/api/debug/test-crm"
test_endpoint "4. Full Integration Test" "/api/debug/test-all"

echo -e "${BLUE}🔍 Additional Manual Tests:${NC}"
echo ""
echo "1. Test Landing Page:"
echo "   $BASE_URL/ai-construction-consulting"
echo ""
echo "2. Fill out booking form and check logs:"
if [ "$1" = "production" ] || [ "$1" = "prod" ]; then
    echo "   wrangler tail --format pretty"
else
    echo "   Check your wrangler dev terminal"
fi
echo ""

echo -e "${GREEN}🎯 Debug testing complete!${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "• Check the JSON responses above for specific error details"
echo "• Look for FAIL status in any test steps"
echo "• If secrets are missing, update your .dev.vars (local) or re-run deployment script"
echo "• For production issues, run: wrangler tail --format pretty" 
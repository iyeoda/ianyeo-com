#!/bin/bash

echo "🧪 Testing ZeptoMail API with exact format from working example..."

# Get the API key from Cloudflare Worker secrets
echo "📋 Getting API key from Cloudflare..."
API_KEY=$(wrangler secret get ZOHO_API_KEY 2>/dev/null || echo "MISSING")

if [ "$API_KEY" = "MISSING" ]; then
    echo "❌ ZOHO_API_KEY not found in Cloudflare secrets"
    exit 1
fi

echo "✅ API Key found (length: ${#API_KEY})"
echo "🔑 API Key prefix: ${API_KEY:0:20}..."

echo ""
echo "🧪 Test 1: Using ian@ianyeo.com (the one we've been using)"
echo "📧 Payload:"
cat << EOF
{
  "from": {"address": "ian@ianyeo.com"},
  "to": [{"email_address": {"address": "ian@ianyeo.com","name": "Ian Yeo"}}],
  "subject": "Test Email - ian@ianyeo.com sender",
  "htmlbody": "<div><b>Test email from ian@ianyeo.com - sent at $(date)</b></div>"
}
EOF

echo ""
echo "📡 Making API call..."
curl -s -w "\n📊 HTTP Status: %{http_code}\n" \
  "https://api.zeptomail.com/v1.1/email" \
  -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Zoho-enczapikey ${API_KEY}" \
  -d "{
    \"from\": {\"address\": \"ian@ianyeo.com\"},
    \"to\": [{\"email_address\": {\"address\": \"ian@ianyeo.com\",\"name\": \"Ian Yeo\"}}],
    \"subject\": \"Test Email - ian@ianyeo.com sender - $(date)\",
    \"htmlbody\": \"<div><b>Test email from ian@ianyeo.com - sent at $(date)</b></div>\"
  }"

echo ""
echo "=================================================================="
echo ""
echo "🧪 Test 2: Using noreply@ianyeo.com (from your working example)"
echo "📧 Payload:"
cat << EOF
{
  "from": {"address": "noreply@ianyeo.com"},
  "to": [{"email_address": {"address": "ian@ianyeo.com","name": "Ian Yeo"}}],
  "subject": "Test Email - noreply@ianyeo.com sender",
  "htmlbody": "<div><b>Test email from noreply@ianyeo.com - sent at $(date)</b></div>"
}
EOF

echo ""
echo "📡 Making API call..."
curl -s -w "\n📊 HTTP Status: %{http_code}\n" \
  "https://api.zeptomail.com/v1.1/email" \
  -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "Authorization: Zoho-enczapikey ${API_KEY}" \
  -d "{
    \"from\": {\"address\": \"noreply@ianyeo.com\"},
    \"to\": [{\"email_address\": {\"address\": \"ian@ianyeo.com\",\"name\": \"Ian Yeo\"}}],
    \"subject\": \"Test Email - noreply@ianyeo.com sender - $(date)\",
    \"htmlbody\": \"<div><b>Test email from noreply@ianyeo.com - sent at $(date)</b></div>\"
  }"

echo ""
echo "=================================================================="
echo ""
echo "💡 If noreply@ianyeo.com works but ian@ianyeo.com doesn't:"
echo "   - Update ZOHO_FROM_EMAIL to use noreply@ianyeo.com"
echo "   - Verify noreply@ianyeo.com in ZeptoMail if not already verified"
echo ""
echo "🔍 If both fail with 500 errors:"
echo "   - Check if API key is for ZeptoMail (not Campaigns/CRM)"
echo "   - Verify domain authentication in ZeptoMail console"
echo "   - Check if there are any sender restrictions"

echo ""
echo "2. Testing booking form email..."
curl -X POST https://ianyeo.com/api/calendar/book \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Verification",
    "lastName": "Test",
    "email": "verificationtest@example.com",
    "company": "Test Company",
    "phone": "+1234567890",
    "message": "Testing after email verification",
    "timeSlot": "2025-07-02T17:00:00Z",
    "meetingType": "AI Strategy Call"
  }' | jq '.success'

echo ""
echo "✅ If both show 'PASS' and 'true', emails are working!"
echo "📧 Check ian@ianyeo.com for meeting notifications" 
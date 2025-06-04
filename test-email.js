/**
 * Test script for Zoho Mail API integration
 * Run with: node test-email.js
 * 
 * Make sure to set environment variables:
 * export ZOHO_API_KEY="your-zoho-api-key"
 * export ZOHO_FROM_EMAIL="ian@yourdomain.com"
 * export TEST_TO_EMAIL="test@example.com"
 */

const https = require('https');

const ZOHO_API_KEY = process.env.ZOHO_API_KEY;
const FROM_EMAIL = process.env.ZOHO_FROM_EMAIL || 'ian@ianyeo.com';
const TO_EMAIL = process.env.TEST_TO_EMAIL || 'ian@ianyeo.com';

if (!ZOHO_API_KEY) {
  console.error('❌ ZOHO_API_KEY environment variable is required');
  console.error('Set it with: export ZOHO_API_KEY="your-api-key"');
  process.exit(1);
}

const emailData = {
  from: {
    address: FROM_EMAIL,
    name: 'Ian Yeo'
  },
  to: [{ 
    email_address: {
      address: TO_EMAIL,
      name: 'Test User'
    }
  }],
  subject: '✅ ZeptoMail Integration Test - Executive Report System',
  htmlbody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Email Test</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🧪 Email Integration Test</h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px;">ZeptoMail API Working Successfully</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 32px;">
      <p style="font-size: 18px; margin: 0 0 24px;">Great news!</p>
      
      <p style="margin: 0 0 24px;">Your ZeptoMail API integration for the Executive Report System is working perfectly. This test email confirms that:</p>
      
      <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #0369a1; margin: 0 0 16px; font-size: 20px;">✅ Verified Features:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569;">
          <li><strong>HTML Email Formatting</strong> - Rich content with styling</li>
          <li><strong>Professional Branding</strong> - Your gradient colors and typography</li>
          <li><strong>Email Delivery</strong> - Messages reach recipient inbox</li>
          <li><strong>Responsive Design</strong> - Works on mobile and desktop</li>
          <li><strong>ZeptoMail API</strong> - Proper authentication and format</li>
        </ul>
      </div>
      
      <!-- Configuration Info -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="color: #92400e; margin: 0 0 8px; font-size: 16px;">📊 Configuration Details:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
          <li><strong>From:</strong> ${FROM_EMAIL}</li>
          <li><strong>To:</strong> ${TO_EMAIL}</li>
          <li><strong>API:</strong> ZeptoMail (Zoho Transactional Email)</li>
          <li><strong>Status:</strong> ✅ Working correctly</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0;">Your executive report email system is ready to impress potential employers, PE/VC partners, and board members with professional, secure document delivery.</p>
      
      <p style="margin: 16px 0 0;">Best regards,<br><strong>Ian Yeo</strong><br>Technology Leader & Board Advisor</p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <a href="https://ianyeo.com" style="color: #1e40af; text-decoration: none;">ianyeo.com</a> | 
        <a href="mailto:ian@ianyeo.com" style="color: #1e40af; text-decoration: none;">ian@ianyeo.com</a> | 
        <a href="https://linkedin.com/in/iankyeo" style="color: #1e40af; text-decoration: none;">LinkedIn</a>
      </p>
      <p style="margin: 8px 0 0; font-size: 12px; color: #9ca3af;">
        This is a test email for the Executive Report System setup.
      </p>
    </div>
  </div>
</body>
</html>
  `,
  textbody: `
✅ EMAIL INTEGRATION TEST SUCCESSFUL!

Great news! Your ZeptoMail API integration for the Executive Report System is working perfectly.

VERIFIED FEATURES:
• HTML Email Formatting - Rich content with styling
• Professional Branding - Your gradient colors and typography  
• Email Delivery - Messages reach recipient inbox
• Responsive Design - Works on mobile and desktop
• ZeptoMail API - Proper authentication and format

CONFIGURATION DETAILS:
• From: ${FROM_EMAIL}
• To: ${TO_EMAIL}
• API: ZeptoMail (Zoho Transactional Email)
• Status: ✅ Working correctly

Your executive report email system is ready to impress potential employers, PE/VC partners, and board members with professional, secure document delivery.

Best regards,
Ian Yeo
Technology Leader & Board Advisor

ianyeo.com | ian@ianyeo.com | linkedin.com/in/iankyeo

---
This is a test email for the Executive Report System setup.
  `
};

const postData = JSON.stringify(emailData);

const options = {
  hostname: 'api.zeptomail.com',
  port: 443,
  path: '/v1.1/email',
  method: 'POST',
  headers: {
    'Authorization': ZOHO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing Zoho Mail API integration...');
console.log(`📧 Sending test email from ${FROM_EMAIL} to ${TO_EMAIL}`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      const response = JSON.parse(data);
      console.log('✅ Email sent successfully!');
      console.log('📬 Message ID:', response.data?.[0]?.message_id || 'N/A');
      console.log('📊 Response:', JSON.stringify(response, null, 2));
    } else {
      console.error('❌ Email sending failed');
      console.error('📄 Status Code:', res.statusCode);
      console.error('📄 Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.error('💡 Common issues:');
  console.error('   - Check your ZOHO_API_KEY is correct');
  console.error('   - Verify sender email is verified in Zoho admin panel');
  console.error('   - Ensure ZeptoMail API is enabled for your account');
});

req.write(postData);
req.end(); 
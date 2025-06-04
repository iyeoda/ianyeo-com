/**
 * Zoho Email Setup Script for Executive Report System
 * Run with: node setup-zoho.js
 */

const readline = require('readline');
const https = require('https');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testZohoAPI(apiKey, fromEmail, toEmail) {
  return new Promise((resolve, reject) => {
    const emailData = {
      from: {
        address: fromEmail,
        name: 'Ian Yeo'
      },
      to: [{ 
        email_address: {
          address: toEmail,
          name: 'Test User'
        }
      }],
      subject: '🚀 Executive Report System - Setup Complete',
      htmlbody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Setup Complete</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <div style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">🎉 Setup Complete!</h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px;">Executive Report System Ready</p>
    </div>
    
    <div style="padding: 32px;">
      <p style="font-size: 18px; margin: 0 0 24px;">Congratulations!</p>
      
      <p style="margin: 0 0 24px;">Your Executive Report System with ZeptoMail integration is now fully configured and ready to capture high-quality leads.</p>
      
      <div style="background: #dcfce7; border: 1px solid #16a34a; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #15803d; margin: 0 0 16px; font-size: 20px;">🎯 System Ready For:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #166534;">
          <li>Executive recruiters and headhunters</li>
          <li>PE/VC partners seeking operating partners</li>
          <li>Board member recruitment</li>
          <li>C-suite opportunities</li>
          <li>Strategic partnerships</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0;">Your professional executive report gateway will help you build a qualified pipeline of opportunities while demonstrating your technical sophistication.</p>
      
      <p style="margin: 16px 0 0;">Best regards,<br><strong>Ian Yeo</strong><br>Technology Leader & Board Advisor</p>
    </div>
    
    <div style="background: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <a href="https://ianyeo.com" style="color: #1e40af; text-decoration: none;">ianyeo.com</a> | 
        <a href="mailto:ian@ianyeo.com" style="color: #1e40af; text-decoration: none;">ian@ianyeo.com</a> | 
        <a href="https://linkedin.com/in/iankyeo" style="color: #1e40af; text-decoration: none;">LinkedIn</a>
      </p>
    </div>
  </div>
</body>
</html>
      `,
      textbody: `🎉 SETUP COMPLETE!

Congratulations! Your Executive Report System with ZeptoMail integration is now fully configured and ready to capture high-quality leads.

SYSTEM READY FOR:
• Executive recruiters and headhunters  
• PE/VC partners seeking operating partners
• Board member recruitment
• C-suite opportunities
• Strategic partnerships

Your professional executive report gateway will help you build a qualified pipeline of opportunities while demonstrating your technical sophistication.

Best regards,
Ian Yeo
Technology Leader & Board Advisor

ianyeo.com | ian@ianyeo.com | linkedin.com/in/iankyeo`
    };

    const postData = JSON.stringify(emailData);

    const options = {
      hostname: 'api.zeptomail.com',
      port: 443,
      path: '/v1.1/email',
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('🚀 Zoho Email Setup for Executive Report System\n');
  
  console.log('📋 Prerequisites:');
  console.log('1. ZeptoMail account created at zeptomail.com');
  console.log('2. Domain verified in ZeptoMail dashboard');
  console.log('3. API key generated in ZeptoMail\n');

  const setupChoice = await ask('Have you completed the prerequisites? (y/n): ');
  
  if (setupChoice.toLowerCase() !== 'y') {
    console.log('\n📖 Setup Instructions:');
    console.log('1. Go to https://zeptomail.com');
    console.log('2. Sign up for a free account');
    console.log('3. Add your domain (ianyeo.com)');
    console.log('4. Verify domain with DNS records');
    console.log('5. Generate API key in API section');
    console.log('\nRun this script again after completing setup.');
    rl.close();
    return;
  }

  console.log('\n🔑 API Key Configuration');
  const apiKey = await ask('Enter your ZeptoMail API key: ');
  
  if (!apiKey.startsWith('Zoho-enczapikey')) {
    console.log('⚠️  Warning: API key should start with "Zoho-enczapikey"');
    const confirm = await ask('Continue anyway? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      rl.close();
      return;
    }
  }

  const fromEmail = await ask('Enter your verified sender email (ian@ianyeo.com): ') || 'ian@ianyeo.com';
  const testEmail = await ask('Enter test recipient email: ');

  console.log('\n🧪 Testing API integration...');

  try {
    const result = await testZohoAPI(apiKey, fromEmail, testEmail);
    console.log('✅ Test email sent successfully!');
    console.log(`📬 Message ID: ${result.data?.[0]?.message_id || 'N/A'}`);
    
    console.log('\n💾 Saving to Cloudflare Worker...');
    
    try {
      execSync(`echo "${apiKey}" | wrangler secret put ZOHO_API_KEY`, { stdio: 'inherit' });
      console.log('✅ API key saved to Cloudflare Worker');
    } catch (error) {
      console.log('⚠️  Could not save to Cloudflare Worker automatically.');
      console.log('Run manually: wrangler secret put ZOHO_API_KEY');
    }

    console.log('\n🎉 Setup Complete!');
    console.log('\nNext steps:');
    console.log('1. Update wrangler.toml with your domain and email');
    console.log('2. Deploy your worker: npm run deploy:worker');
    console.log('3. Test the full system on your website');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n💡 Common issues:');
    console.error('• API key is incorrect');
    console.error('• Sender email not verified in ZeptoMail');
    console.error('• Domain not properly configured');
    console.error('• API rate limits exceeded');
    
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check ZeptoMail dashboard for domain status');
    console.log('2. Verify DNS records are properly set');
    console.log('3. Ensure API key has correct permissions');
  }

  rl.close();
}

main().catch(console.error); 
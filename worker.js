/**
 * Cloudflare Worker for Executive Report Requests
 * Handles form submissions, generates secure access links, and sends emails
 */

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Route API requests
    if (url.pathname.startsWith('/api/')) {
      return handleApiRequest(request, env, url);
    }
    
    // For non-API requests, return 404
    return new Response('Not Found', { status: 404 });
  }
};

async function handleApiRequest(request, env, url) {
  try {
    switch (url.pathname) {
      case '/api/request-report':
        if (request.method === 'POST') {
          return await handleReportRequest(request, env);
        }
        break;
        
      case '/api/download-report':
        if (request.method === 'GET') {
          return await handleReportDownload(request, env, url);
        }
        break;
        
      default:
        return jsonResponse({ error: 'Endpoint not found' }, 404);
    }
    
    return jsonResponse({ error: 'Method not allowed' }, 405);
    
  } catch (error) {
    console.error('API Error:', error);
    return jsonResponse({ 
      error: 'Internal server error',
      message: error.message 
    }, 500);
  }
}

async function handleReportRequest(request, env) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'company', 'title', 'role', 'interest'];
    const missingFields = requiredFields.filter(field => !data[field]);
    
    if (missingFields.length > 0) {
      return jsonResponse({
        error: 'Missing required fields',
        missing: missingFields
      }, 400);
    }
    
    // Validate email format
    if (!isValidEmail(data.email)) {
      return jsonResponse({ error: 'Invalid email address' }, 400);
    }
    
    // Check consent
    if (!data.consent) {
      return jsonResponse({ error: 'Consent is required' }, 400);
    }
    
    // Generate secure access token
    const accessToken = await generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store access data in KV
    const accessData = {
      token: accessToken,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      title: data.title,
      role: data.role,
      interest: data.interest,
      message: data.message || '',
      phone: data.phone || '',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      downloadCount: 0,
      maxDownloads: 3,
      userAgent: data.userAgent || '',
      referrer: data.referrer || ''
    };
    
    await env.REPORT_ACCESS.put(accessToken, JSON.stringify(accessData), {
      expirationTtl: 7 * 24 * 60 * 60 // 7 days in seconds
    });
    
    // Generate secure download URL
    const downloadUrl = `${env.SITE_URL}/api/download-report?token=${accessToken}`;
    
    // Send email with download link
    const emailSent = await sendReportEmail(env, data, downloadUrl, expiresAt);
    
    if (!emailSent) {
      // If email fails, still return success but log the issue
      console.error('Failed to send email for token:', accessToken);
    }
    
    // Log the request for analytics
    await logReportRequest(env, data, accessToken);
    
    return jsonResponse({
      success: true,
      message: 'Report request submitted successfully',
      emailSent: emailSent
    });
    
  } catch (error) {
    console.error('Error handling report request:', error);
    return jsonResponse({
      error: 'Failed to process request',
      message: error.message
    }, 500);
  }
}

async function handleReportDownload(request, env, url) {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return new Response('Missing access token', { 
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Get access data from KV
    const accessDataStr = await env.REPORT_ACCESS.get(token);
    
    if (!accessDataStr) {
      return createErrorPage('Invalid or expired download link');
    }
    
    const accessData = JSON.parse(accessDataStr);
    
    // Check if link has expired
    if (new Date() > new Date(accessData.expiresAt)) {
      await env.REPORT_ACCESS.delete(token);
      return createErrorPage('Download link has expired');
    }
    
    // Check download limit
    if (accessData.downloadCount >= accessData.maxDownloads) {
      return createErrorPage('Download limit exceeded');
    }
    
    // Increment download count
    accessData.downloadCount++;
    accessData.lastDownloadAt = new Date().toISOString();
    
    await env.REPORT_ACCESS.put(token, JSON.stringify(accessData), {
      expirationTtl: Math.floor((new Date(accessData.expiresAt) - new Date()) / 1000)
    });
    
    // Log the download
    await logReportDownload(env, accessData, token);
    
    // Get file from Cloudflare R2
    try {
      const object = await env.EXECUTIVE_REPORTS.get(env.REPORT_FILE_KEY || 'executive-report.pdf');
      
      if (!object) {
        console.error('Report file not found in R2 storage');
        return createErrorPage('Report file temporarily unavailable');
      }
      
      // Stream the file content with appropriate headers
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Content-Disposition', `attachment; filename="Ian_Yeo_Executive_Leadership_Report.pdf"`);
      headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      headers.set('Pragma', 'no-cache');
      headers.set('Expires', '0');
      
      // Add content length if available
      if (object.size) {
        headers.set('Content-Length', object.size.toString());
      }
      
      return new Response(object.body, {
        status: 200,
        headers
      });
      
    } catch (r2Error) {
      console.error('R2 storage error:', r2Error);
      return createErrorPage('An error occurred while retrieving the report');
    }
    
  } catch (error) {
    console.error('Error handling report download:', error);
    return createErrorPage('An error occurred while processing your request');
  }
}

async function sendReportEmail(env, formData, downloadUrl, expiresAt) {
  try {
    const emailData = {
      from: {
        address: env.ZOHO_FROM_EMAIL || 'ian@ianyeo.com',
        name: 'Ian Yeo'
      },
      to: [{ 
        email_address: {
          address: formData.email,
          name: formData.firstName || ''
        }
      }],
      subject: 'Your Executive Leadership Report - Secure Access',
      htmlbody: createEmailTemplate(formData, downloadUrl, expiresAt),
      textbody: createTextEmailTemplate(formData, downloadUrl, expiresAt)
    };
    
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': env.ZOHO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Zoho Email API error:', response.status, errorData);
      return false;
    }
    
    const result = await response.json();
    console.log('Email sent successfully:', result.data?.[0]?.message_id || 'N/A');
    return true;
    
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

function createEmailTemplate(formData, downloadUrl, expiresAt) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Executive Leadership Report Access</title>
</head>
<body style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Executive Leadership Report</h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px;">Secure Access Granted</p>
    </div>
    
    <!-- Body -->
    <div style="padding: 32px;">
      <p style="font-size: 18px; margin: 0 0 24px;">Dear ${formData.firstName},</p>
      
      <p style="margin: 0 0 24px;">Thank you for your interest in my Executive Leadership Portfolio. Your request has been approved, and you now have secure access to the comprehensive report.</p>
      
      <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 24px 0;">
        <h3 style="color: #1e40af; margin: 0 0 16px; font-size: 20px;">Report Contents Include:</h3>
        <ul style="margin: 0; padding-left: 20px; color: #475569;">
          <li>Financial Performance & Growth Metrics</li>
          <li>AI & Technology Innovation Strategy</li>
          <li>M&A Process & Successful Exit Analysis</li>
          <li>Team Leadership & Organizational Scaling</li>
          <li>Market Positioning & Competitive Analysis</li>
          <li>Strategic Vision for Future Opportunities</li>
        </ul>
      </div>
      
      <!-- Download Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${downloadUrl}" style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          Download Executive Report
        </a>
      </div>
      
      <!-- Access Details -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
        <h4 style="color: #92400e; margin: 0 0 8px; font-size: 16px;">Access Details:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
          <li>Link expires: ${expiresAt.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</li>
          <li>Maximum downloads: 3</li>
          <li>Your information remains strictly confidential</li>
        </ul>
      </div>
      
      <p style="margin: 24px 0 0;">I look forward to discussing potential opportunities with you. Please feel free to reach out directly if you have any questions.</p>
      
      <p style="margin: 16px 0 0;">Best regards,<br><strong>Ian Yeo</strong><br>Technology Leader & Board Advisor</p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8fafc; padding: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #64748b;">
        <a href="https://ianyeo.com" style="color: #1e40af; text-decoration: none;">ianyeo.com</a> | 
        <a href="mailto:ian@ianyeo.com" style="color: #1e40af; text-decoration: none;">ian@ianyeo.com</a> | 
        <a href="https://linkedin.com/in/iankyeo" style="color: #1e40af; text-decoration: none;">LinkedIn</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function createTextEmailTemplate(formData, downloadUrl, expiresAt) {
  return `Dear ${formData.firstName},

Thank you for your interest in my Executive Leadership Portfolio. Your request has been approved, and you now have secure access to the comprehensive report.

DOWNLOAD YOUR REPORT:
${downloadUrl}

REPORT CONTENTS INCLUDE:
• Financial Performance & Growth Metrics
• AI & Technology Innovation Strategy  
• M&A Process & Successful Exit Analysis
• Team Leadership & Organizational Scaling
• Market Positioning & Competitive Analysis
• Strategic Vision for Future Opportunities

ACCESS DETAILS:
• Link expires: ${expiresAt.toLocaleDateString('en-GB')}
• Maximum downloads: 3
• Your information remains strictly confidential

I look forward to discussing potential opportunities with you. Please feel free to reach out directly if you have any questions.

Best regards,
Ian Yeo
Technology Leader & Board Advisor

ianyeo.com | ian@ianyeo.com | linkedin.com/in/iankyeo`;
}

function createErrorPage(message) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Download Error - Ian Yeo</title>
  <style>
    body { font-family: Inter, sans-serif; max-width: 600px; margin: 80px auto; padding: 32px; text-align: center; color: #334155; }
    .error-icon { font-size: 64px; margin-bottom: 24px; }
    h1 { color: #dc2626; margin-bottom: 16px; }
    p { margin-bottom: 32px; line-height: 1.6; }
    .btn { background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; }
  </style>
</head>
<body>
  <div class="error-icon">⚠️</div>
  <h1>Access Error</h1>
  <p>${message}</p>
  <p>If you believe this is an error, please contact <a href="mailto:ian@ianyeo.com">ian@ianyeo.com</a> for assistance.</p>
  <a href="https://ianyeo.com" class="btn">Return to ianyeo.com</a>
</body>
</html>`;

  return new Response(html, {
    status: 400,
    headers: { 'Content-Type': 'text/html' }
  });
}

async function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function logReportRequest(env, data, token) {
  try {
    // Log to KV for analytics (optional)
    const logKey = `log:request:${Date.now()}:${token.substring(0, 8)}`;
    const logData = {
      timestamp: new Date().toISOString(),
      email: data.email,
      company: data.company,
      role: data.role,
      interest: data.interest,
      userAgent: data.userAgent,
      referrer: data.referrer
    };
    
    await env.REPORT_ACCESS.put(logKey, JSON.stringify(logData), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Error logging request:', error);
  }
}

async function logReportDownload(env, accessData, token) {
  try {
    const logKey = `log:download:${Date.now()}:${token.substring(0, 8)}`;
    const logData = {
      timestamp: new Date().toISOString(),
      email: accessData.email,
      company: accessData.company,
      downloadCount: accessData.downloadCount,
      token: token.substring(0, 8) // Only store first 8 chars for privacy
    };
    
    await env.REPORT_ACCESS.put(logKey, JSON.stringify(logData), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Error logging download:', error);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
} 
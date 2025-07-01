/**
 * Enhanced Cloudflare Worker for ianyeo.com
 * Handles executive report requests AND AI consultancy landing page functionality
 */

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Utility functions
const generateId = () => crypto.randomUUID();
const getCurrentTimestamp = () => new Date().toISOString();

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
    
    // Route to AI consultancy landing page
    if (url.pathname === '/ai-construction-consulting' || url.pathname === '/ai-construction-consulting.html') {
      return await handleConsultancyLandingPage(request, env);
    }
    
    // Route static files (for local development)
    if (url.pathname === '/' || url.pathname === '/index.html') {
      return await handleHomepage(request, env);
    }
    
    if (url.pathname === '/style.css') {
      return await handleStaticFile(request, 'style.css', 'text/css');
    }
    
    if (url.pathname === '/ai-consultancy.css') {
      return await handleStaticFile(request, 'ai-consultancy.css', 'text/css');
    }
    
    if (url.pathname === '/ai-consultancy.js') {
      return await handleStaticFile(request, 'ai-consultancy.js', 'application/javascript');
    }
    
    // For non-API requests, return 404
    return new Response('Not Found', { status: 404 });
  }
};

async function handleApiRequest(request, env, url) {
  try {
    switch (url.pathname) {
      // Existing executive report endpoints
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

      // New AI Consultancy endpoints
      case '/api/leads/capture':
        if (request.method === 'POST') {
          return await handleLeadCapture(request, env);
        }
        break;

      case '/api/assessment/submit':
        if (request.method === 'POST') {
          return await handleAssessmentSubmission(request, env);
        }
        break;

      case '/api/assessment/results':
        if (request.method === 'GET') {
          return await handleAssessmentResults(request, env, url);
        }
        break;

      case '/api/calendar/book':
        if (request.method === 'POST') {
          return await handleCalendarBooking(request, env);
        }
        break;

      case '/api/analytics/track':
        if (request.method === 'POST') {
          return await handleAnalytics(request, env);
        }
        break;

      case '/api/email/subscribe':
        if (request.method === 'POST') {
          return await handleEmailSubscription(request, env);
        }
        break;

      case '/api/leads/score':
        if (request.method === 'POST') {
          return await handleLeadScoring(request, env);
        }
        break;

      case '/api/crm/sync':
        if (request.method === 'POST') {
          return await handleCRMSync(request, env);
        }
        break;
        
      default:
        // Check for dynamic routes
        if (url.pathname.startsWith('/api/ab-test/')) {
          const testName = url.pathname.split('/')[3];
          if (testName && request.method === 'GET') {
            return await handleABTest(request, env, testName);
          }
        }
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

// ===============================
// EXISTING EXECUTIVE REPORT FUNCTIONALITY
// ===============================

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
    
    // Verify Turnstile token
    const turnstileToken = data['cf-turnstile-response'];
    if (!turnstileToken) {
      return jsonResponse({ error: 'Security verification is required' }, 400);
    }
    
    const turnstileValid = await verifyTurnstile(turnstileToken, env);
    if (!turnstileValid) {
      return jsonResponse({ error: 'Security verification failed' }, 400);
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

// ===============================
// NEW AI CONSULTANCY FUNCTIONALITY
// ===============================

/**
 * Lead Capture Handler
 */
async function handleLeadCapture(request, env) {
  try {
    const data = await request.json();
    
    // Validate Turnstile token
    const turnstileValid = await verifyTurnstile(data.turnstileToken, env);
    if (!turnstileValid) {
      return jsonResponse({ error: 'Invalid captcha' }, 400);
    }

    // Generate lead ID and timestamp
    const leadId = generateId();
    const timestamp = getCurrentTimestamp();
    
    // Calculate lead score
    const leadScore = calculateLeadScore(data);
    
    // Prepare lead data
    const leadData = {
      id: leadId,
      timestamp,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      company: data.company,
      jobTitle: data.jobTitle,
      phone: data.phone,
      companySize: data.companySize,
      industry: data.industry,
      challenges: data.challenges,
      timeline: data.timeline,
      budget: data.budget,
      source: data.source || 'ai-consulting-landing',
      campaign: data.campaign || 'ai-consulting',
      leadScore,
      status: 'new',
      ipAddress: request.headers.get('CF-Connecting-IP'),
      userAgent: request.headers.get('User-Agent'),
      country: request.cf?.country,
    };

    // Store in KV
    await env.LEADS_DB.put(leadId, JSON.stringify(leadData));
    
    // Store email mapping for quick lookup
    await env.LEADS_DB.put(`email:${data.email}`, leadId);

    // Send to CRM (HubSpot)
    await syncToCRM(leadData, env);

    // Trigger email sequence
    await triggerEmailSequence(leadData, env);

    // Send lead magnet if requested
    if (data.leadMagnet) {
      await sendLeadMagnet(leadData, data.leadMagnet, env);
    }

    // Track analytics
    await trackEvent('lead_captured', leadData, env);

    return jsonResponse({ 
      success: true, 
      leadId,
      message: 'Thank you! Check your email for next steps.' 
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
}

/**
 * AI Readiness Assessment Handler
 */
async function handleAssessmentSubmission(request, env) {
  try {
    const data = await request.json();
    
    // Validate and score assessment
    const assessmentResults = calculateAssessmentScore(data.answers);
    const assessmentId = generateId();
    const timestamp = getCurrentTimestamp();

    const assessmentData = {
      id: assessmentId,
      timestamp,
      email: data.email,
      company: data.company,
      answers: data.answers,
      score: assessmentResults.score,
      recommendations: assessmentResults.recommendations,
      category: assessmentResults.category,
      nextSteps: assessmentResults.nextSteps,
    };

    // Store assessment
    await env.ASSESSMENTS_DB.put(assessmentId, JSON.stringify(assessmentData));
    
    // Generate shareable link
    const shareToken = await generateSecureToken();
    await env.ASSESSMENTS_DB.put(`share:${shareToken}`, assessmentId, { expirationTtl: 7776000 }); // 90 days

    // Send results email
    await sendAssessmentResults(assessmentData, shareToken, env);

    // Update lead score if lead exists
    await updateLeadScore(data.email, assessmentResults.score, env);

    // Track assessment completion
    await trackEvent('assessment_completed', { 
      assessmentId, 
      score: assessmentResults.score,
      category: assessmentResults.category 
    }, env);

    return jsonResponse({
      success: true,
      assessmentId,
      shareToken,
      results: assessmentResults
    });

  } catch (error) {
    console.error('Assessment error:', error);
    return jsonResponse({ error: 'Assessment processing failed' }, 500);
  }
}

/**
 * Assessment Results Handler
 */
async function handleAssessmentResults(request, env, url) {
  try {
    const token = url.searchParams.get('token');
    
    if (!token) {
      return jsonResponse({ error: 'Missing token' }, 400);
    }

    // Get assessment ID from share token
    const assessmentId = await env.ASSESSMENTS_DB.get(`share:${token}`);
    
    if (!assessmentId) {
      return jsonResponse({ error: 'Invalid or expired link' }, 404);
    }

    // Get assessment data
    const assessmentDataStr = await env.ASSESSMENTS_DB.get(assessmentId);
    
    if (!assessmentDataStr) {
      return jsonResponse({ error: 'Assessment not found' }, 404);
    }

    const assessmentData = JSON.parse(assessmentDataStr);

    return jsonResponse({
      success: true,
      assessment: assessmentData
    });

  } catch (error) {
    console.error('Assessment results error:', error);
    return jsonResponse({ error: 'Failed to retrieve results' }, 500);
  }
}

/**
 * Calendar Booking Handler
 */
async function handleCalendarBooking(request, env) {
  try {
    const data = await request.json();
    
    // Validate booking data
    if (!data.email || !data.timeSlot || !data.meetingType) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Create meeting request
    const bookingResult = await createZohoMeeting(data, env);
    
    if (bookingResult.success) {
      // Sync contact to CRM 
      const leadData = {
        email: data.email,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        company: data.company || '',
        phone: data.phone || '',
        jobTitle: 'Unknown',
        leadScore: 85, // High score for meeting bookers
        status: 'meeting-booked',
        source: 'ai-consultancy-booking',
        campaign: 'AI Strategy Call',
        industry: 'Construction',
        timeline: 'Immediate',
        message: data.message || ''
      };
      
      await syncToCRM(leadData, env);
      
      // Add to email campaigns
      await triggerEmailSequence(leadData, env);
      
      // Update lead status
      await updateLeadStatus(data.email, 'meeting-booked', env);
      
      // Send confirmation email
      await sendMeetingConfirmation(data, bookingResult.meeting, env);
      
      // Track booking
      await trackEvent('meeting_booked', { 
        email: data.email, 
        meetingType: data.meetingType,
        meetingId: bookingResult.meeting.id 
      }, env);

      return jsonResponse({
        success: true,
        meeting: bookingResult.meeting,
        message: 'Meeting booked successfully!'
      });
    } else {
      throw new Error('Booking failed');
    }

  } catch (error) {
    console.error('Booking error:', error);
    return jsonResponse({ error: 'Booking failed' }, 500);
  }
}

/**
 * Analytics Handler
 */
async function handleAnalytics(request, env) {
  try {
    const data = await request.json();
    
    const analyticsData = {
      event: data.event,
      timestamp: getCurrentTimestamp(),
      data: data.data,
      session: data.sessionId || generateId(),
      url: data.url,
      referrer: data.referrer
    };

    // Store in KV for internal analytics
    const eventId = generateId();
    await env.ANALYTICS_DB.put(`event:${eventId}`, JSON.stringify(analyticsData));

    // Send to Google Analytics 4 if configured
    if (env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET) {
      await sendToGA4(data.event, data.data, env);
    }

    return jsonResponse({ success: true });

  } catch (error) {
    console.error('Analytics error:', error);
    return jsonResponse({ error: 'Analytics tracking failed' }, 500);
  }
}

/**
 * Email Subscription Handler
 */
async function handleEmailSubscription(request, env) {
  try {
    const data = await request.json();
    
    if (!data.email) {
      return jsonResponse({ error: 'Email is required' }, 400);
    }

    // Store subscription
    const subscriptionData = {
      email: data.email,
      timestamp: getCurrentTimestamp(),
      source: data.source || 'ai-consulting',
      interests: data.interests || [],
      status: 'active'
    };

    await env.LEADS_DB.put(`subscription:${data.email}`, JSON.stringify(subscriptionData));

    // Send to CRM
    await syncToCRM(subscriptionData, env);

    // Send welcome email
    await sendWelcomeEmail(subscriptionData, env);

    return jsonResponse({ 
      success: true, 
      message: 'Successfully subscribed!' 
    });

  } catch (error) {
    console.error('Subscription error:', error);
    return jsonResponse({ error: 'Subscription failed' }, 500);
  }
}

/**
 * Lead Scoring Handler
 */
async function handleLeadScoring(request, env) {
  try {
    const data = await request.json();
    const score = calculateLeadScore(data);
    
    return jsonResponse({ 
      success: true, 
      score,
      tier: getLeadTier(score)
    });

  } catch (error) {
    console.error('Lead scoring error:', error);
    return jsonResponse({ error: 'Lead scoring failed' }, 500);
  }
}

/**
 * CRM Sync Handler
 */
async function handleCRMSync(request, env) {
  try {
    const data = await request.json();
    const result = await syncToCRM(data, env);
    
    return jsonResponse({ 
      success: true, 
      crmId: result?.id 
    });

  } catch (error) {
    console.error('CRM sync error:', error);
    return jsonResponse({ error: 'CRM sync failed' }, 500);
  }
}

/**
 * A/B Testing Handler
 */
async function handleABTest(request, env, testName) {
  try {
    const userId = request.headers.get('CF-Connecting-IP') + request.headers.get('User-Agent');
    const userHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
    const hashArray = Array.from(new Uint8Array(userHash));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    const variant = parseInt(hashHex.slice(0, 2), 16) % 2 === 0 ? 'A' : 'B';

    // Track the assignment
    await trackEvent('ab_test_assignment', { testName, variant }, env);

    return jsonResponse({ variant });

  } catch (error) {
    console.error('A/B test error:', error);
    return jsonResponse({ variant: 'A' }); // Default to variant A
  }
}

/**
 * AI Consultancy Landing Page Handler
 */
async function handleHomepage(request, env) {
  // For local development, return a simple message directing to the AI consultancy page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ian Yeo - Local Development</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .dev-note { background: #f0f8ff; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px; }
      </style>
    </head>
    <body>
      <div class="dev-note">
        <h1>Local Development - Ian Yeo</h1>
        <p>This is the local development server. The production homepage is served by Cloudflare Pages.</p>
        <p>To test the AI Consultancy landing page:</p>
        <a href="/ai-construction-consulting" class="btn">View AI Consultancy Page</a>
        <p><strong>Note:</strong> In production, this will be your regular homepage at ianyeo.com</p>
      </div>
    </body>
    </html>
  `;
  
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache'
    }
  });
}

async function handleStaticFile(request, filename, contentType) {
  // In local development, return a basic response
  // In production, these files are served by Cloudflare Pages
  return new Response(`/* ${filename} - served by Cloudflare Pages in production */`, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    }
  });
}

async function handleConsultancyLandingPage(request, env) {
  // Return the landing page HTML
  return new Response(getConsultancyLandingPageHTML(env), {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

// ===============================
// UTILITY FUNCTIONS
// ===============================

/**
 * Lead Scoring Algorithm
 */
function calculateLeadScore(leadData) {
  let score = 0;

  // Company size scoring
  const companySizeScores = {
    'startup': 10,
    'small': 20,
    'medium': 40,
    'large': 60,
    'enterprise': 80
  };
  score += companySizeScores[leadData.companySize] || 0;

  // Job title scoring
  const titleScores = {
    'ceo': 50,
    'cto': 45,
    'director': 40,
    'manager': 30,
    'engineer': 20,
    'other': 10
  };
  score += titleScores[leadData.jobTitle?.toLowerCase()] || 0;

  // Budget scoring
  const budgetScores = {
    'under-25k': 10,
    '25k-50k': 30,
    '50k-100k': 50,
    'over-100k': 70
  };
  score += budgetScores[leadData.budget] || 0;

  // Timeline scoring
  const timelineScores = {
    'immediate': 50,
    '1-3-months': 40,
    '3-6-months': 30,
    '6-12-months': 20,
    'exploring': 10
  };
  score += timelineScores[leadData.timeline] || 0;

  // Industry scoring (construction-related higher)
  const industryScores = {
    'construction': 40,
    'real-estate': 35,
    'architecture': 30,
    'engineering': 30,
    'technology': 25,
    'other': 10
  };
  score += industryScores[leadData.industry] || 0;

  return Math.min(score, 100); // Cap at 100
}

/**
 * Assessment Scoring Algorithm
 */
function calculateAssessmentScore(answers) {
  let totalScore = 0;
  const maxScore = answers.length * 10;

  answers.forEach(answer => {
    totalScore += parseInt(answer.score) || 0;
  });

  const percentageScore = Math.round((totalScore / maxScore) * 100);
  
  let category, recommendations, nextSteps;

  if (percentageScore >= 80) {
    category = 'AI Ready';
    recommendations = [
      'Your organisation shows strong AI readiness',
      'Focus on advanced AI implementations',
      'Consider enterprise AI transformation programme'
    ];
    nextSteps = [
      'Book a strategy consultation',
      'Explore enterprise AI solutions',
      'Plan 6-month transformation roadmap'
    ];
  } else if (percentageScore >= 60) {
    category = 'AI Emerging';
    recommendations = [
      'Good foundation for AI implementation',
      'Address data quality and team training',
      'Start with pilot AI projects'
    ];
    nextSteps = [
      'Download implementation checklist',
      'Book 90-day programme consultation',
      'Focus on team capability building'
    ];
  } else if (percentageScore >= 40) {
    category = 'AI Developing';
    recommendations = [
      'Significant preparation needed',
      'Focus on foundational capabilities',
      'Invest in team training and infrastructure'
    ];
    nextSteps = [
      'Start with readiness assessment',
      'Book consultation to discuss preparation',
      'Focus on quick wins and foundation building'
    ];
  } else {
    category = 'AI Exploring';
    recommendations = [
      'Early stage of AI journey',
      'Focus on education and strategy',
      'Build internal AI awareness'
    ];
    nextSteps = [
      'Download AI education resources',
      'Attend industry webinars',
      'Book education consultation'
    ];
  }

  return {
    score: percentageScore,
    category,
    recommendations,
    nextSteps
  };
}

function getLeadTier(score) {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'cool';
  return 'cold';
}

/**
 * CRM Integration (Zoho CRM)
 */
async function syncToCRM(leadData, env) {
  try {
    // Mock CRM sync in local development
    const isLocalDev = globalThis.navigator?.userAgent?.includes('Wrangler') || 
                       globalThis.location?.hostname === 'localhost' ||
                       !env.ZOHO_CRM_CLIENT_ID ||
                       env.ZOHO_CRM_CLIENT_ID === '1000.Y29FWY9M8MKMB0Z2Y0VNGKLKUZ1G3U';
    
    if (isLocalDev) {
      console.log('🎯 === MOCK CRM SYNC (Local Development) ===');
      console.log('👤 Contact:', `${leadData.firstName} ${leadData.lastName}`);
      console.log('🏢 Company:', leadData.company);
      console.log('📧 Email:', leadData.email);
      console.log('⭐ Lead Score:', leadData.leadScore);
      console.log('📋 Status:', leadData.status);
      console.log('✅ Contact would be synced to Zoho CRM');
      console.log('=======================================');
      return { success: true, id: 'mock-' + Date.now() };
    }

    if (!env.ZOHO_CRM_CLIENT_ID) return null;

    // Get access token using refresh token
    const accessToken = await getZohoAccessToken('crm', env);
    if (!accessToken) return null;

    const zohoCrmUrl = `${env.ZOHO_CRM_API_URL}/Contacts`;
    
    const contactData = {
      data: [{
        Email: leadData.email,
        First_Name: leadData.firstName,
        Last_Name: leadData.lastName,
        Account_Name: leadData.company,
        Title: leadData.jobTitle,
        Phone: leadData.phone,
        Lead_Status: leadData.status,
        Lead_Score: leadData.leadScore,
        Lead_Source: leadData.source,
        Campaign_Source: leadData.campaign,
        Industry: leadData.industry,
        Company_Size: leadData.companySize,
        Budget: leadData.budget,
        Timeline: leadData.timeline
      }]
    };

    const response = await fetch(zohoCrmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      throw new Error(`Zoho CRM API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Zoho CRM sync error:', error);
    return null;
  }
}

/**
 * Email Automation (Zoho Campaigns + ZeptoMail)
 */
async function triggerEmailSequence(leadData, env) {
  try {
    // Add contact to Zoho Campaigns list for automated sequence
    await addToZohoCampaigns(leadData, env);
    
    // Send immediate welcome email via ZeptoMail
    await sendTransactionalEmail({
      to: leadData.email,
      subject: getWelcomeEmailSubject(leadData.leadScore),
      templateData: {
        firstName: leadData.firstName,
        company: leadData.company,
        leadScore: leadData.leadScore,
        leadTier: getLeadTier(leadData.leadScore)
      }
    }, env);

    console.log(`Lead ${leadData.email} added to email automation sequence`);
    
  } catch (error) {
    console.error('Email sequence error:', error);
  }
}

function getWelcomeEmailSubject(leadScore) {
  if (leadScore >= 70) {
    return 'Welcome! Your AI Strategy Consultation Awaits';
  } else if (leadScore >= 50) {
    return 'Welcome! Let\'s Explore AI Opportunities';
  } else {
    return 'Welcome to AI in Construction';
  }
}

async function addToZohoCampaigns(leadData, env) {
  try {
    // Mock Campaigns sync in local development  
    const isLocalDev = globalThis.navigator?.userAgent?.includes('Wrangler') || 
                       globalThis.location?.hostname === 'localhost' ||
                       !env.ZOHO_CAMPAIGNS_REFRESH_TOKEN ||
                       env.ZOHO_CAMPAIGNS_REFRESH_TOKEN === 'your-zoho-campaigns-refresh-token';
    
    if (isLocalDev) {
      console.log('🎯 === MOCK CAMPAIGNS SYNC (Local Development) ===');
      console.log('📧 Email:', leadData.email);
      console.log('📝 Campaign List:', getZohoCampaignsList(leadData.leadScore));
      console.log('✅ Contact would be added to email campaigns');
      console.log('=======================================');
      return true;
    }

    if (!env.ZOHO_CAMPAIGNS_REFRESH_TOKEN) return false;

    // Get access token for Zoho Campaigns
    const accessToken = await getZohoAccessToken('campaigns', env);
    if (!accessToken) return false;

    const listId = getZohoCampaignsList(leadData.leadScore);
    
    const contactData = {
      contactinfo: [{
        Email: leadData.email,
        First_Name: leadData.firstName,
        Last_Name: leadData.lastName,
        Company: leadData.company,
        Title: leadData.jobTitle,
        Phone: leadData.phone,
        Lead_Score: leadData.leadScore,
        Lead_Source: leadData.source,
        Industry: leadData.industry
      }]
    };

    const response = await fetch(`${env.ZOHO_CAMPAIGNS_API_URL}/json/listsubscribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        listkey: listId,
        ...contactData
      })
    });

    return response.ok;
  } catch (error) {
    console.error('Zoho Campaigns error:', error);
    return false;
  }
}

function getZohoCampaignsList(leadScore) {
  // Return different campaign lists based on lead score
  if (leadScore >= 70) {
    return 'high-value-prospects'; // Configure in Zoho Campaigns
  } else if (leadScore >= 50) {
    return 'qualified-leads';
  } else {
    return 'general-leads';
  }
}

async function sendTransactionalEmail(emailData, env) {
  try {
    // Mock emails in local development (Wrangler dev environment)
    const isLocalDev = globalThis.navigator?.userAgent?.includes('Wrangler') || 
                       globalThis.location?.hostname === 'localhost' ||
                       !env.ZOHO_API_KEY || 
                       env.ZOHO_API_KEY === 'Zoho-enczapikey wSsVR61+8kWmCax/zmCsI...';
    
    if (isLocalDev) {
      console.log('🎯 === MOCK EMAIL (Local Development) ===');
      console.log('📧 To:', emailData.to);
      console.log('📝 Subject:', emailData.subject);
      console.log('📄 Content Preview:', (emailData.templateData?.htmlContent || 'Standard template').substring(0, 100) + '...');
      console.log('=======================================');
      return true; // Success in local dev
    }

    // Use existing ZeptoMail integration (already configured)
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-enczapikey ${env.ZOHO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        from: {
          address: env.ZOHO_FROM_EMAIL,
          name: 'Ian Yeo - AI Consulting'
        },
        to: [{ 
          email_address: {
            address: emailData.to,
            name: emailData.templateData?.firstName || ''
          }
        }],
        subject: emailData.subject,
        htmlbody: createEmailTemplate(emailData.templateData),
        textbody: createTextTemplate(emailData.templateData)
      })
    });

    if (!response.ok) {
      console.error('ZeptoMail error:', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

function createEmailTemplate(data) {
  // If htmlContent is provided, use it directly
  if (data?.htmlContent) {
    return data.htmlContent;
  }
  
  // Otherwise, use the standard welcome template
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c3e50;">Welcome to AI in Construction, ${data?.firstName || ''}!</h2>
      <p>Thank you for your interest in transforming your construction business with AI.</p>
      <p><strong>Your Lead Score:</strong> ${data?.leadScore || 'N/A'}/100 (${data?.leadTier || 'Standard'})</p>
      <p>Based on your assessment, we'll be sending you personalized content to help you get started with AI implementation.</p>
      <p>Best regards,<br><strong>Ian Yeo</strong><br>AI & Construction Technology Consultant</p>
    </div>
  `;
}

function createTextTemplate(data) {
  return `Welcome to AI in Construction, ${data?.firstName || ''}!

Thank you for your interest in transforming your construction business with AI.

Your Lead Score: ${data?.leadScore || 'N/A'}/100 (${data?.leadTier || 'Standard'})

Based on your assessment, we'll be sending you personalized content to help you get started with AI implementation.

Best regards,
Ian Yeo
AI & Construction Technology Consultant`;
}

async function sendAssessmentResults(assessmentData, shareToken, env) {
  const emailHtml = `
    <h2>Your AI Readiness Assessment Results</h2>
    <p>Hello,</p>
    <p>Your AI readiness score: <strong>${assessmentData.score}%</strong></p>
    <p>Category: <strong>${assessmentData.category}</strong></p>
    <p><a href="${env.SITE_URL}/api/assessment/results?token=${shareToken}">View Full Results</a></p>
  `;

  return await sendTransactionalEmail({
    to: assessmentData.email,
    subject: `Your AI Readiness Assessment Results - ${assessmentData.score}%`,
    html: emailHtml
  }, env);
}

async function sendLeadMagnet(leadData, magnetType, env) {
  // Implementation for sending lead magnets
  console.log('Sending lead magnet:', magnetType, 'to:', leadData.email);
}

async function sendMeetingConfirmation(bookingData, meeting, env) {
  // Implementation for meeting confirmation emails
  console.log('Sending meeting confirmation to:', bookingData.email);
}

async function sendWelcomeEmail(subscriptionData, env) {
  // Implementation for welcome emails
  console.log('Sending welcome email to:', subscriptionData.email);
}

async function createZohoMeeting(data, env) {
  try {
    // For now, use a simple approach - direct users to your Zoho meeting link
    // This avoids the Bookings API scope issues
    
    // Store the meeting request in KV for manual follow-up
    const meetingRequest = {
      id: generateId(),
      timestamp: getCurrentTimestamp(),
      email: data.email,
      firstName: data.firstName || '',
      lastName: data.lastName || '',
      company: data.company || '',
      phone: data.phone || '',
      requestedTime: data.timeSlot,
      meetingType: data.meetingType,
      message: data.message || '',
      status: 'pending'
    };

    // Store in KV for your reference
    await env.ANALYTICS_DB.put(`meeting:${meetingRequest.id}`, JSON.stringify(meetingRequest));

    // Send notification email to you
    await sendMeetingRequestNotification(meetingRequest, env);

    // Send confirmation to user with your calendar link
    await sendMeetingInstructions(meetingRequest, env);

    return {
      success: true,
      meeting: {
        id: meetingRequest.id,
        startTime: data.timeSlot,
        type: data.meetingType,
                 meetingUrl: 'https://calendar.zoho.com/eventreqForm/zz08011230516c6b51ab285211a71babcca3147bd282b08e50f0ba7b70bbde53d6a2c8a3c4338aa2436b27ea1e341674bacec8822d?theme=0&l=en&tz=Europe%2FLondon', // Use your actual Schedule Appointment link
        instructions: 'Check your email for booking instructions'
      }
    };

  } catch (error) {
    console.error('Meeting request error:', error);
    
    // Fallback: return success with manual contact notice
    return {
      success: true,
      meeting: {
        id: generateId(),
        startTime: data.timeSlot,
        type: data.meetingType,
        requiresManualContact: true,
        contactEmail: 'ian@ianyeo.com'
      }
    };
  }
}

async function sendMeetingRequestNotification(meetingRequest, env) {
  // Send email to you about the meeting request
  const emailHtml = `
    <h2>New Meeting Request</h2>
    <p><strong>Contact:</strong> ${meetingRequest.firstName} ${meetingRequest.lastName}</p>
    <p><strong>Email:</strong> ${meetingRequest.email}</p>
    <p><strong>Company:</strong> ${meetingRequest.company}</p>
    <p><strong>Phone:</strong> ${meetingRequest.phone}</p>
    <p><strong>Requested Time:</strong> ${meetingRequest.requestedTime}</p>
    <p><strong>Type:</strong> ${meetingRequest.meetingType}</p>
    <p><strong>Message:</strong> ${meetingRequest.message}</p>
    <p><strong>Request ID:</strong> ${meetingRequest.id}</p>
  `;

  return await sendTransactionalEmail({
    to: 'ian@ianyeo.com',
    subject: `New Meeting Request: ${meetingRequest.company}`,
    templateData: {
      htmlContent: emailHtml
    }
  }, env);
}

async function sendMeetingInstructions(meetingRequest, env) {
  // Send instructions to the user
  const emailHtml = `
    <h2>Meeting Request Received</h2>
    <p>Hello ${meetingRequest.firstName},</p>
    <p>Thank you for requesting a consultation. I'll be in touch within 24 hours to confirm your preferred time.</p>
    <p><strong>Requested Time:</strong> ${meetingRequest.requestedTime}</p>
    <p>In the meantime, you can also book directly using my calendar:</p>
    <p><a href="https://calendar.zoho.com/embed/your-calendar-link">Book Time Directly</a></p>
    <p>Best regards,<br>Ian Yeo</p>
  `;

  return await sendTransactionalEmail({
    to: meetingRequest.email,
    subject: 'Meeting Request Confirmation - Ian Yeo',
    templateData: {
      htmlContent: emailHtml
    }
  }, env);
}

async function updateLeadScore(email, score, env) {
  try {
    const leadId = await env.LEADS_DB.get(`email:${email}`);
    if (leadId) {
      const leadDataStr = await env.LEADS_DB.get(leadId);
      if (leadDataStr) {
        const leadData = JSON.parse(leadDataStr);
        leadData.leadScore = Math.max(leadData.leadScore || 0, score);
        leadData.lastActivity = getCurrentTimestamp();
        await env.LEADS_DB.put(leadId, JSON.stringify(leadData));
      }
    }
  } catch (error) {
    console.error('Update lead score error:', error);
  }
}

async function updateLeadStatus(email, status, env) {
  try {
    const leadId = await env.LEADS_DB.get(`email:${email}`);
    if (leadId) {
      const leadDataStr = await env.LEADS_DB.get(leadId);
      if (leadDataStr) {
        const leadData = JSON.parse(leadDataStr);
        leadData.status = status;
        leadData.lastActivity = getCurrentTimestamp();
        await env.LEADS_DB.put(leadId, JSON.stringify(leadData));
      }
    }
  } catch (error) {
    console.error('Update lead status error:', error);
  }
}

/**
 * Analytics Tracking
 */
async function trackEvent(eventName, eventData, env) {
  const analyticsData = {
    event: eventName,
    timestamp: getCurrentTimestamp(),
    data: eventData,
    session: eventData.sessionId || generateId()
  };

  // Store in KV for internal analytics
  const eventId = generateId();
  await env.ANALYTICS_DB.put(`event:${eventId}`, JSON.stringify(analyticsData));
}

async function sendToGA4(eventName, eventData, env) {
  try {
    if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return;

    const response = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${env.GA4_MEASUREMENT_ID}&api_secret=${env.GA4_API_SECRET}`, {
      method: 'POST',
      body: JSON.stringify({
        client_id: generateId(),
        events: [{
          name: eventName,
          params: eventData
        }]
      })
    });

    return response.ok;
  } catch (error) {
    console.error('GA4 tracking error:', error);
    return false;
  }
}

// ===============================
// EXISTING UTILITY FUNCTIONS (PRESERVED)
// ===============================

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
      subject: 'Your CEO Executive Brief for Ian Yeo - Secure Access',
              htmlbody: createReportEmailTemplate(formData, downloadUrl, expiresAt),
      textbody: createTextEmailTemplate(formData, downloadUrl, expiresAt)
    };

    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-enczapikey ${env.ZOHO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zoho API Error:', response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return true;

  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

function createReportEmailTemplate(formData, downloadUrl, expiresAt) {
  const expiryDate = expiresAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your CEO Executive Brief - Ian Yeo</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">Thank you for your interest</h1>
        <p style="color: #7f8c8d; font-size: 16px;">Your secure executive brief is ready for download</p>
      </div>

      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Hello ${formData.firstName},</h2>
        <p>Thank you for requesting my CEO Executive Brief. This confidential document contains detailed insights into my leadership experience, strategic achievements, and approach to executive challenges in the PropTech and construction technology sectors.</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${downloadUrl}" style="display: inline-block; background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Download Executive Brief</a>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #856404; margin-top: 0;">Important Security Information:</h3>
        <ul style="color: #856404; margin: 0;">
          <li>This link is unique to you and expires on ${expiryDate}</li>
          <li>Maximum of 3 downloads allowed for security</li>
          <li>Please do not share this link with others</li>
        </ul>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p><strong>What's Next?</strong></p>
        <p>After reviewing the brief, I'd welcome the opportunity to discuss how my experience might align with your executive leadership needs. Feel free to reach out directly at ian@ianyeo.com.</p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d; font-size: 14px;">
        <p>Best regards,<br><strong>Ian Yeo</strong><br>CEO & Executive Leader<br>PropTech & Construction Technology</p>
        <p><a href="https://ianyeo.com" style="color: #3498db;">ianyeo.com</a></p>
      </div>
    </body>
    </html>
  `;
}

function createTextEmailTemplate(formData, downloadUrl, expiresAt) {
  const expiryDate = expiresAt.toLocaleDateString('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `Hello ${formData.firstName},

Thank you for requesting my CEO Executive Brief. This confidential document contains detailed insights into my leadership experience, strategic achievements, and approach to executive challenges in the PropTech and construction technology sectors.

Download your executive brief: ${downloadUrl}

IMPORTANT SECURITY INFORMATION:
- This link is unique to you and expires on ${expiryDate}
- Maximum of 3 downloads allowed for security
- Please do not share this link with others

What's Next?
After reviewing the brief, I'd welcome the opportunity to discuss how my experience might align with your executive leadership needs. Feel free to reach out directly at ian@ianyeo.com.

Best regards,
Ian Yeo
CEO & Executive Leader
PropTech & Construction Technology
https://ianyeo.com`;
}

function createErrorPage(message) {
  return new Response(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Access Error - Ian Yeo</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
        .error-container { background: #f8f9fa; padding: 30px; border-radius: 8px; border-left: 4px solid #e74c3c; }
        h1 { color: #e74c3c; margin-bottom: 20px; }
        p { color: #555; line-height: 1.6; margin-bottom: 20px; }
        .btn { display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Access Error</h1>
        <p>${message}</p>
        <p>If you believe this is an error, please contact ian@ianyeo.com for assistance.</p>
        <a href="https://ianyeo.com" class="btn">Return to Website</a>
      </div>
    </body>
    </html>
  `, {
    status: 400,
    headers: { 'Content-Type': 'text/html' }
  });
}

async function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Zoho OAuth Token Management
 */
async function getZohoAccessToken(service, env) {
  try {
    // Use same client credentials for all services (only one Self Client allowed)
    const clientId = env.ZOHO_CRM_CLIENT_ID;
    const clientSecret = env.ZOHO_CRM_CLIENT_SECRET;
    const refreshToken = env[`ZOHO_${service.toUpperCase()}_REFRESH_TOKEN`];

    if (!clientId || !clientSecret || !refreshToken) {
      console.log(`Missing Zoho ${service} credentials`);
      return null;
    }

    const response = await fetch(`${env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      console.error(`Zoho ${service} token refresh failed:`, response.status);
      return null;
    }

    const tokenData = await response.json();
    return tokenData.access_token;

  } catch (error) {
    console.error(`Zoho ${service} token error:`, error);
    return null;
  }
}

async function verifyTurnstile(token, env) {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${env.TURNSTILE_SECRET_KEY}&response=${token}`
    });

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

async function logReportRequest(env, data, token) {
  try {
    const logData = {
      type: 'report_request',
      timestamp: new Date().toISOString(),
      email: data.email,
      company: data.company,
      token: token,
      userAgent: data.userAgent,
      referrer: data.referrer
    };
    
    const logKey = `log:${Date.now()}-${token}`;
    await env.REPORT_ACCESS.put(logKey, JSON.stringify(logData), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Error logging report request:', error);
  }
}

async function logReportDownload(env, accessData, token) {
  try {
    const logData = {
      type: 'report_download',
      timestamp: new Date().toISOString(),
      email: accessData.email,
      company: accessData.company,
      token: token,
      downloadCount: accessData.downloadCount
    };
    
    const logKey = `log:${Date.now()}-download-${token}`;
    await env.REPORT_ACCESS.put(logKey, JSON.stringify(logData), {
      expirationTtl: 30 * 24 * 60 * 60 // 30 days
    });
  } catch (error) {
    console.error('Error logging report download:', error);
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

function getConsultancyLandingPageHTML(env) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI in Construction Consulting - Transform Your Business | Ian Yeo</title>
    <meta name="description" content="Transform your construction business with AI. Expert consulting from Ian Yeo, PropTech executive with proven track record scaling construction technology companies.">
    <meta name="keywords" content="AI construction, construction technology, PropTech, digital transformation, Ian Yeo, construction AI consultant">
    
    <link rel="canonical" href="https://ianyeo.com/ai-construction-consulting">
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="/ai-consultancy.css">
    
    <script>
        window.TURNSTILE_SITE_KEY = '${env.TURNSTILE_SITE_KEY}';
    </script>
    
    <style>
        /* Inline basic styles for local development */
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; line-height: 1.6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
        .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 100px 0; text-align: center; }
        .hero-title { font-size: 3rem; margin-bottom: 1rem; font-weight: bold; }
        .hero-subtitle { font-size: 1.2rem; margin-bottom: 2rem; opacity: 0.9; }
        .btn-primary { background: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; font-weight: bold; }
        .btn-secondary { background: transparent; color: white; border: 2px solid white; padding: 13px 28px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px; }
        .section { padding: 80px 0; }
        .section-title { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: #2c3e50; }
        .assessment { background: #f8f9fa; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 5px; font-size: 16px; }
        .assessment-form { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .question { margin-bottom: 30px; }
        .question h4 { margin-bottom: 15px; color: #2c3e50; }
        .options { display: grid; gap: 10px; }
        .option { padding: 15px; border: 2px solid #e0e0e0; border-radius: 8px; cursor: pointer; transition: all 0.3s; }
        .option:hover { border-color: #3498db; background: #f0f8ff; }
        .option input[type="radio"] { margin-right: 10px; }
        .turnstile-container { margin: 20px 0; text-align: center; }
        #assessment-results { display: none; margin-top: 30px; }
        .results-card { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); text-align: center; }
        .score-circle { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; width: 120px; height: 120px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .score-number { font-size: 2rem; font-weight: bold; }
        .score-label { font-size: 0.9rem; }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <h1 class="hero-title">Transform Your Construction Business with AI</h1>
            <p class="hero-subtitle">
                Join 500+ construction leaders who've unlocked competitive advantage through artificial intelligence. 
                Expert consulting from Ian Yeo, former CEO with proven track record scaling PropTech companies.
            </p>
            <div class="hero-cta">
                <a href="#assessment" class="btn-primary">Take Free AI Readiness Assessment</a>
                <a href="#contact" class="btn-secondary">Book Strategy Call</a>
            </div>
        </div>
    </section>

    <!-- Assessment Section -->
    <section id="assessment" class="section assessment">
        <div class="container">
            <h2 class="section-title">Free AI Readiness Assessment</h2>
            <p style="text-align: center; font-size: 1.1rem; margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                Discover how ready your construction business is for AI transformation. 
                Get personalized recommendations and next steps in just 2 minutes.
            </p>
            
            <form id="assessment-form" class="assessment-form">
                <div class="question">
                    <h4>1. How would you describe your current data management?</h4>
                    <div class="options">
                        <label class="option">
                            <input type="radio" name="question1" value="excel" data-score="2">
                            Mostly Excel spreadsheets and manual processes
                        </label>
                        <label class="option">
                            <input type="radio" name="question1" value="basic-software" data-score="5">
                            Basic project management software
                        </label>
                        <label class="option">
                            <input type="radio" name="question1" value="integrated" data-score="8">
                            Integrated systems with good data flow
                        </label>
                        <label class="option">
                            <input type="radio" name="question1" value="advanced" data-score="10">
                            Advanced analytics and real-time dashboards
                        </label>
                    </div>
                </div>

                <div class="question">
                    <h4>2. What's your biggest operational challenge?</h4>
                    <div class="options">
                        <label class="option">
                            <input type="radio" name="question2" value="delays" data-score="7">
                            Project delays and cost overruns
                        </label>
                        <label class="option">
                            <input type="radio" name="question2" value="quality" data-score="8">
                            Quality control and compliance
                        </label>
                        <label class="option">
                            <input type="radio" name="question2" value="safety" data-score="9">
                            Safety management and risk prevention
                        </label>
                        <label class="option">
                            <input type="radio" name="question2" value="efficiency" data-score="6">
                            Manual processes and inefficiency
                        </label>
                    </div>
                </div>

                <div class="question">
                    <h4>3. How familiar is your team with AI/technology?</h4>
                    <div class="options">
                        <label class="option">
                            <input type="radio" name="question3" value="limited" data-score="3">
                            Limited - mostly traditional methods
                        </label>
                        <label class="option">
                            <input type="radio" name="question3" value="basic" data-score="5">
                            Basic - some software adoption
                        </label>
                        <label class="option">
                            <input type="radio" name="question3" value="good" data-score="8">
                            Good - embrace new technology
                        </label>
                        <label class="option">
                            <input type="radio" name="question3" value="advanced" data-score="10">
                            Advanced - early adopters and innovators
                        </label>
                    </div>
                </div>

                <div class="question">
                    <h4>4. What's your project volume and complexity?</h4>
                    <div class="options">
                        <label class="option">
                            <input type="radio" name="question4" value="small" data-score="4">
                            Small projects, simple workflows
                        </label>
                        <label class="option">
                            <input type="radio" name="question4" value="medium" data-score="7">
                            Medium projects, some complexity
                        </label>
                        <label class="option">
                            <input type="radio" name="question4" value="large" data-score="9">
                            Large projects, high complexity
                        </label>
                        <label class="option">
                            <input type="radio" name="question4" value="enterprise" data-score="10">
                            Enterprise scale, multiple stakeholders
                        </label>
                    </div>
                </div>

                <div class="question">
                    <h4>5. What's your timeline for implementing AI solutions?</h4>
                    <div class="options">
                        <label class="option">
                            <input type="radio" name="question5" value="immediate" data-score="10">
                            Immediate - ready to start now
                        </label>
                        <label class="option">
                            <input type="radio" name="question5" value="3-months" data-score="8">
                            Next 3 months
                        </label>
                        <label class="option">
                            <input type="radio" name="question5" value="6-months" data-score="6">
                            3-6 months
                        </label>
                        <label class="option">
                            <input type="radio" name="question5" value="exploring" data-score="3">
                            Just exploring options
                        </label>
                    </div>
                </div>

                <div class="form-group">
                    <label for="email">Email Address *</label>
                    <input type="email" id="email" name="email" required>
                </div>

                <div class="form-group">
                    <label for="company">Company Name *</label>
                    <input type="text" id="company" name="company" required>
                </div>

                <div class="turnstile-container">
                    <!-- Turnstile widget will be inserted here -->
                </div>

                <button type="submit" class="btn-primary" style="width: 100%; margin: 20px 0;">
                    Get My AI Readiness Results
                </button>
            </form>

            <div id="assessment-results">
                <!-- Results will be displayed here -->
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="section">
        <div class="container">
            <h2 class="section-title">Ready to Transform Your Business?</h2>
            <div style="text-align: center;">
                <p style="font-size: 1.2rem; margin-bottom: 2rem;">
                    Book a free 30-minute strategy call to discuss your AI opportunities
                </p>
                                 <button onclick="openBookingModal()" class="btn-primary" style="font-size: 1.1rem; padding: 20px 40px;">
                      Book Free Strategy Call
                  </button>
            </div>
        </div>
    </section>

    <!-- Beautiful Booking Modal -->
    <div id="bookingModal" class="booking-modal">
        <div class="booking-modal-content">
            <div class="booking-modal-header">
                <h3>Book Your Free Strategy Call</h3>
                <span class="close-modal" onclick="closeBookingModal()">&times;</span>
            </div>
            
            <div class="booking-modal-body">
                <div class="booking-step" id="step1">
                    <h4>Tell me about your project</h4>
                    <form id="bookingForm">
                        <div class="form-group">
                            <label for="bookingFirstName">First Name *</label>
                            <input type="text" id="bookingFirstName" name="firstName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bookingLastName">Last Name *</label>
                            <input type="text" id="bookingLastName" name="lastName" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bookingEmail">Email Address *</label>
                            <input type="email" id="bookingEmail" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bookingCompany">Company Name *</label>
                            <input type="text" id="bookingCompany" name="company" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="bookingPhone">Phone Number</label>
                            <input type="tel" id="bookingPhone" name="phone">
                        </div>
                        
                        <div class="form-group">
                            <label for="bookingMessage">What's your biggest AI challenge? *</label>
                            <textarea id="bookingMessage" name="message" rows="4" required placeholder="Tell me about your current situation and what you'd like to achieve with AI..."></textarea>
                        </div>
                        
                        <button type="button" onclick="showTimeSlots()" class="btn-primary full-width">
                            Continue to Time Selection
                        </button>
                    </form>
                </div>
                
                <div class="booking-step hidden" id="step2">
                    <h4>Choose your preferred time</h4>
                    <div class="time-slots-container">
                        <div class="timezone-info">
                            <span>🌍 Times shown in: London (GMT)</span>
                        </div>
                        
                        <div class="available-slots">
                            <h5>This Week</h5>
                            <div class="slot-group" id="thisWeekSlots"></div>
                            
                            <h5>Next Week</h5>
                            <div class="slot-group" id="nextWeekSlots"></div>
                        </div>
                        
                        <div class="selected-time hidden" id="selectedTimeDisplay">
                            <div class="selected-time-card">
                                <span class="selected-time-icon">📅</span>
                                <div class="selected-time-details">
                                    <strong id="selectedTimeText"></strong>
                                    <span id="selectedDateText"></span>
                                </div>
                            </div>
                        </div>
                        
                        <div class="booking-actions">
                            <button type="button" onclick="showContactForm()" class="btn-secondary">
                                ← Back to Details
                            </button>
                            <button type="button" onclick="confirmBooking()" class="btn-primary" id="confirmBookingBtn" disabled>
                                Confirm Booking
                            </button>
                        </div>
                    </div>
                </div>
                
                <div class="booking-step hidden" id="step3">
                    <div class="booking-success">
                        <div class="success-icon">✅</div>
                        <h4>Booking Request Sent!</h4>
                        <p>Thanks! I'll be in touch within 24 hours to confirm your preferred time.</p>
                        <p class="booking-details">
                            <strong>Requested Time:</strong><br>
                            <span id="finalTimeDisplay"></span>
                        </p>
                        <p><small>Check your email for confirmation details.</small></p>
                        <button onclick="closeBookingModal()" class="btn-primary">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <style>
        /* Beautiful Booking Modal Styles */
        .booking-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            overflow: auto;
            background-color: rgba(0,0,0,0.5);
            backdrop-filter: blur(5px);
        }

        .booking-modal-content {
            background-color: #fefefe;
            margin: 2% auto;
            padding: 0;
            border: none;
            border-radius: 15px;
            width: 90%;
            max-width: 600px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            position: relative;
            max-height: 90vh;
            overflow-y: auto;
        }

        .booking-modal-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px 30px;
            border-radius: 15px 15px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .booking-modal-header h3 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .close-modal {
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background-color 0.3s;
        }

        .close-modal:hover {
            background-color: rgba(255,255,255,0.2);
        }

        .booking-modal-body {
            padding: 30px;
        }

        .booking-step {
            animation: fadeIn 0.3s ease-in;
        }

        .booking-step.hidden {
            display: none;
        }

        .booking-step h4 {
            color: #2c3e50;
            margin-bottom: 25px;
            font-size: 1.3rem;
        }

        .form-group {
            margin-bottom: 20px;
        }

        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #2c3e50;
        }

        .form-group input, .form-group textarea {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
            box-sizing: border-box;
        }

        .form-group input:focus, .form-group textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .full-width {
            width: 100%;
            margin-top: 10px;
        }

        .time-slots-container {
            max-height: 400px;
            overflow-y: auto;
        }

        .timezone-info {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            text-align: center;
            font-size: 14px;
            color: #6c757d;
        }

        .available-slots h5 {
            color: #2c3e50;
            margin: 20px 0 15px 0;
            font-size: 1.1rem;
        }

        .slot-group {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
            margin-bottom: 20px;
        }

        .time-slot {
            padding: 12px 15px;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            background: white;
            cursor: pointer;
            text-align: center;
            transition: all 0.3s;
            font-size: 14px;
            font-weight: 500;
        }

        .time-slot:hover {
            border-color: #667eea;
            background: #f0f4ff;
        }

        .time-slot.selected {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }

        .selected-time {
            margin: 20px 0;
            padding: 15px;
            background: #f0f4ff;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }

        .selected-time-card {
            display: flex;
            align-items: center;
            gap: 15px;
        }

        .selected-time-icon {
            font-size: 24px;
        }

        .selected-time-details strong {
            display: block;
            color: #2c3e50;
            font-size: 1.1rem;
        }

        .selected-time-details span {
            color: #6c757d;
            font-size: 0.9rem;
        }

        .booking-actions {
            display: flex;
            gap: 15px;
            margin-top: 30px;
        }

        .booking-actions button {
            flex: 1;
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
        }

        .btn-primary {
            background: #667eea;
            color: white;
            border: none !important;
        }

        .btn-primary:hover {
            background: #5a6fd8;
            transform: translateY(-1px);
        }

        .btn-primary:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
        }

        .btn-secondary {
            background: transparent;
            color: #667eea;
            border: 2px solid #667eea !important;
        }

        .btn-secondary:hover {
            background: #667eea;
            color: white;
        }

        .booking-success {
            text-align: center;
            padding: 20px;
        }

        .success-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }

        .booking-success h4 {
            color: #28a745;
            margin-bottom: 15px;
        }

        .booking-details {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 768px) {
            .booking-modal-content {
                width: 95%;
                margin: 5% auto;
            }
            
            .booking-modal-body {
                padding: 20px;
            }
            
            .slot-group {
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            }
            
            .booking-actions {
                flex-direction: column;
            }
        }
    </style>

    <script>
        // Booking Modal Functions
        let selectedTimeSlot = null;
        let bookingFormData = {};

        function openBookingModal() {
            document.getElementById('bookingModal').style.display = 'block';
            document.body.style.overflow = 'hidden';
            showContactForm(); // Start with step 1
        }

        function closeBookingModal() {
            document.getElementById('bookingModal').style.display = 'none';
            document.body.style.overflow = 'auto';
            resetBookingForm();
        }

        function showContactForm() {
            document.getElementById('step1').classList.remove('hidden');
            document.getElementById('step2').classList.add('hidden');
            document.getElementById('step3').classList.add('hidden');
        }

        function showTimeSlots() {
            // Collect form data
            bookingFormData = {
                firstName: document.getElementById('bookingFirstName').value,
                lastName: document.getElementById('bookingLastName').value,
                email: document.getElementById('bookingEmail').value,
                company: document.getElementById('bookingCompany').value,
                phone: document.getElementById('bookingPhone').value,
                message: document.getElementById('bookingMessage').value
            };

            // Validate required fields
            if (!bookingFormData.firstName || !bookingFormData.lastName || 
                !bookingFormData.email || !bookingFormData.company || !bookingFormData.message) {
                alert('Please fill in all required fields');
                return;
            }

            // Generate available time slots
            generateTimeSlots();
            
            document.getElementById('step1').classList.add('hidden');
            document.getElementById('step2').classList.remove('hidden');
        }

        function generateTimeSlots() {
            const thisWeekSlots = document.getElementById('thisWeekSlots');
            const nextWeekSlots = document.getElementById('nextWeekSlots');
            
            thisWeekSlots.innerHTML = '';
            nextWeekSlots.innerHTML = '';

            const now = new Date();
            const timeSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
            
            // This week slots
            for (let i = 1; i <= 5; i++) {
                const date = new Date(now);
                date.setDate(now.getDate() + i);
                
                if (date.getDay() >= 1 && date.getDay() <= 5) { // Weekdays only
                    timeSlots.forEach(time => {
                        const slot = createTimeSlot(date, time);
                        thisWeekSlots.appendChild(slot);
                    });
                }
            }

            // Next week slots
            const nextWeek = new Date(now);
            nextWeek.setDate(now.getDate() + 7);
            
            for (let i = 1; i <= 5; i++) {
                const date = new Date(nextWeek);
                date.setDate(nextWeek.getDate() + i);
                
                if (date.getDay() >= 1 && date.getDay() <= 5) { // Weekdays only
                    timeSlots.forEach(time => {
                        const slot = createTimeSlot(date, time);
                        nextWeekSlots.appendChild(slot);
                    });
                }
            }
        }

        function createTimeSlot(date, time) {
            const slot = document.createElement('div');
            slot.className = 'time-slot';
            
            const dateStr = date.toLocaleDateString('en-GB', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
            });
            
            slot.innerHTML = \`
                <div>\${time}</div>
                <div style="font-size: 12px; color: #666;">\${dateStr}</div>
            \`;
            
            const datetime = \`\${date.toISOString().split('T')[0]} \${time}\`;
            slot.setAttribute('data-datetime', datetime);
            
            slot.onclick = () => selectTimeSlot(slot, datetime, \`\${time} on \${dateStr}\`);
            
            return slot;
        }

        function selectTimeSlot(element, datetime, displayText) {
            // Remove previous selection
            document.querySelectorAll('.time-slot').forEach(slot => {
                slot.classList.remove('selected');
            });
            
            // Select new slot
            element.classList.add('selected');
            selectedTimeSlot = datetime;
            
            // Show selected time
            document.getElementById('selectedTimeText').textContent = displayText;
            document.getElementById('selectedDateText').textContent = '30 minutes • Strategy Call';
            document.getElementById('selectedTimeDisplay').classList.remove('hidden');
            document.getElementById('confirmBookingBtn').disabled = false;
        }

        async function confirmBooking() {
            if (!selectedTimeSlot) {
                alert('Please select a time slot');
                return;
            }

            try {
                const bookingData = {
                    ...bookingFormData,
                    timeSlot: selectedTimeSlot,
                    meetingType: 'AI Strategy Consultation'
                };

                                 const response = await fetch('/api/calendar/book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bookingData)
                });

                const result = await response.json();

                if (result.success) {
                    document.getElementById('finalTimeDisplay').textContent = 
                        document.getElementById('selectedTimeText').textContent;
                    
                    document.getElementById('step2').classList.add('hidden');
                    document.getElementById('step3').classList.remove('hidden');
                } else {
                    alert('Booking failed. Please try again or contact me directly.');
                }
            } catch (error) {
                console.error('Booking error:', error);
                alert('Booking failed. Please try again or contact me directly.');
            }
        }

        function resetBookingForm() {
            document.getElementById('bookingForm').reset();
            selectedTimeSlot = null;
            bookingFormData = {};
            document.getElementById('selectedTimeDisplay').classList.add('hidden');
            document.getElementById('confirmBookingBtn').disabled = true;
            showContactForm();
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('bookingModal');
            if (event.target === modal) {
                closeBookingModal();
            }
        }
    </script>

    <script src="/ai-consultancy.js"></script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</body>
</html>`;
} 
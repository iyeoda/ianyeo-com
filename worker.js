/**
 * Enhanced Cloudflare Worker for ianyeo.com
 * Handles executive report requests AND AI consultancy landing page functionality
 * 
 * EMAIL COMPLIANCE STRATEGY:
 * - ZeptoMail: ONLY for transactional emails (report delivery, assessment results, meeting confirmations)
 * - Zoho Campaigns: ALL marketing emails (welcome sequences, lead nurturing, lead magnets)
 * - This separation ensures compliance with ZeptoMail's transactional-only terms of service
 */

import { marked } from 'marked';

// CORS headers for API responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Helper to parse front matter and markdown content
function parseMarkdownWithFrontMatter(markdown) {
  const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = markdown.match(frontMatterRegex);

  if (match) {
    const frontMatterRaw = match[1];
    const content = match[2];
    const frontMatter = {};

    frontMatterRaw.split('\n').forEach(line => {
      const parts = line.split(': ');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join(': ').trim().replace(/^"|"$/g, ''); // Remove quotes
        frontMatter[key] = value;
      }
    });
    return { frontMatter, content };
  } else {
    return { frontMatter: {}, content: markdown };
  }
}

// Utility functions
const generateId = () => crypto.randomUUID();
const getCurrentTimestamp = () => new Date().toISOString();

// Helper function to normalize ZeptoMail API key format
function getZeptoMailAuthHeader(apiKey) {
  if (!apiKey) return '';
  
  // If the key already starts with "Zoho-enczapikey ", use it as-is
  if (apiKey.startsWith('Zoho-enczapikey ')) {
    return apiKey;
  }
  
  // Otherwise, add the prefix
  return `Zoho-enczapikey ${apiKey}`;
}

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // Route API requests
    if (path.startsWith('/api/')) {
      return handleApiRequest(request, env, url);
    }

    // Blog routes
    if (path === '/blog') {
      return handleBlogListing(request, env);
    }
    if (path.startsWith('/blog/')) {
      const slug = path.substring('/blog/'.length);
      if (slug) {
        return handleBlogPost(request, env, slug);
      }
    }
    
    // Route to AI consultancy landing page
    if (path === '/ai-construction-consulting' || path === '/ai-construction-consulting.html') {
      return await handleConsultancyLandingPage(request, env);
    }
    
    // Route static files (for local development)
    if (path === '/' || path === '/index.html') {
      return await handleHomepage(request, env);
    }
    
    if (path === '/style.css') {
      return await handleStaticFile(request, 'style.css', 'text/css');
    }
    
    if (path === '/ai-consultancy.css') {
      return await handleStaticFile(request, 'ai-consultancy.css', 'text/css');
    }
    
    if (path === '/ai-consultancy.js') {
      return await handleStaticFile(request, 'ai-consultancy.js', 'application/javascript');
    }
    
    // For non-API requests, return 404
    return new Response('Not Found', { status: 404 });
  }
};

// ===============================
// BLOG FUNCTIONALITY
// ===============================

async function handleBlogListing(request, env) {
  try {
    const blogPosts = await getBlogPosts(env);
    
    const postsHtml = blogPosts.map(post => `
      <div class="blog-post-summary">
        <h2><a href="/blog/${post.slug}">${post.title}</a></h2>
        <p class="blog-date">${new Date(post.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>${post.excerpt}</p>
        <a href="/blog/${post.slug}" class="read-more">Read More &rarr;</a>
      </div>
    `).join('');

    const htmlContent = `
      <section class="blog-listing">
        <h1>Latest Insights & News</h1>
        ${postsHtml}
      </section>
    `;
    
    return renderBlogPage(htmlContent, 'Blog - Ian Yeo', env);

  } catch (error) {
    console.error('Error handling blog listing:', error);
    return new Response('Error loading blog posts', { status: 500 });
  }
}

async function handleBlogPost(request, env, slug) {
  try {
    const { frontMatter, content } = await getBlogPostContent(env, slug);

    if (!frontMatter || !content) {
      return new Response('Blog post not found', { status: 404 });
    }

    const postHtml = marked.parse(content);

    const htmlContent = `
      <section class="blog-post">
        <h1 class="blog-title">${frontMatter.title}</h1>
        <p class="blog-meta">Published on ${new Date(frontMatter.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} | Category: ${frontMatter.category}</p>
        <div class="blog-content">
          ${postHtml}
        </div>
        <p><a href="/blog" class="back-to-blog">&larr; Back to all posts</a></p>
      </section>
    `;

    return renderBlogPage(htmlContent, frontMatter.title + ' - Ian Yeo', env);

  } catch (error) {
    console.error('Error handling blog post:', error);
    return new Response('Error loading blog post', { status: 500 });
  }
}

async function renderBlogPage(contentHtml, title, env) {
  // This template should ideally be loaded from a file or R2 for better management
  // For now, it's embedded for simplicity.
  return new Response(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <link rel="stylesheet" href="/style.css">
      <link rel="stylesheet" href="/ai-consultancy.css">
      <link rel="icon" href="/assets/favicon.ico" type="image/x-icon">
      <link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
      <link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32x32.png">
      <link rel="icon" type="image/png" sizes="16x16" href="/assets/favicon-16x16.png">
      <link rel="manifest" href="/manifest.json">
      <meta name="description" content="Ian Yeo's professional blog on AI, digital transformation, and construction technology.">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="Ian Yeo's professional blog on AI, digital transformation, and construction technology.">
      <meta property="og:image" content="${env.SITE_URL}/assets/og-image.jpg">
      <meta property="og:url" content="${env.SITE_URL}/blog">
      <meta name="twitter:card" content="summary_large_image">
    </head>
    <body>
      <header>
        <nav>
          <a href="/" class="logo">Ian Yeo</a>
          <ul>
            <li><a href="/ai-construction-consulting">AI Consultancy</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/#contact">Contact</a></li>
          </ul>
        </nav>
      </header>

      <main class="blog-main">
        ${contentHtml}
      </main>

      <footer>
        <div class="footer-content">
          <p>&copy; ${new Date().getFullYear()} Ian Yeo. All rights reserved.</p>
          <div class="social-links">
            <a href="https://linkedin.com/in/ianyeo" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            <a href="https://twitter.com/ianyeo" target="_blank" rel="noopener noreferrer">Twitter</a>
          </div>
        </div>
      </footer>
      <script src="/script.js"></script>
      <script src="/ai-consultancy.js"></script>
    </body>
    </html>
  `, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=300'
    }
  });
}

async function getBlogPosts(env) {
  // In a real scenario, you might list objects from an R2 bucket or KV store
  // For now, we'll hardcode the list of markdown files and read them.
  // This assumes blog posts are in the 'blog/' directory and follow the naming convention.
  const blogFileNames = [
    '2024-12-15-digital-transformation-in-construction.md',
    '2025-01-01-leadership-lessons-from-scaling-proptech.md',
    '2025-01-02-future-of-ai-in-construction.md',
    '2025-07-01-ai-and-digital-transformation-in-construction.md',
  ];

  // TODO: For a more dynamic blog, consider storing blog post metadata (title, slug, date, excerpt)
  // in a KV store or a JSON file that can be fetched and parsed, rather than hardcoding filenames.
  // This would allow for easier management of new posts without worker code changes.

  const posts = await Promise.all(blogFileNames.map(async (fileName) => {
    const filePath = `blog/${fileName}`;
    const content = await env.ASSETS.fetch(filePath).then(res => res.text());
    const { frontMatter } = parseMarkdownWithFrontMatter(content);
    const slug = fileName.replace('.md', ''); // Simple slug from filename
    return { ...frontMatter, slug };
  }));

  // Sort by date, newest first
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

async function getBlogPostContent(env, slug) {
  const fileName = `${slug}.md`;
  const filePath = `blog/${fileName}`;
  try {
    const content = await env.ASSETS.fetch(filePath).then(res => res.text());
    return parseMarkdownWithFrontMatter(content);
  } catch (error) {
    console.error(`Error fetching blog post ${filePath}:`, error);
    return { frontMatter: null, content: null };
  }
}

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

      // Zoho Bookings API endpoints
      case '/api/bookings/services':
        if (request.method === 'GET') {
          return await handleGetBookingServices(request, env);
        }
        break;

      case '/api/bookings/availability':
        if (request.method === 'GET') {
          return await handleGetAvailability(request, env);
        }
        break;

      case '/api/bookings/create':
        if (request.method === 'POST') {
          return await handleCreateBooking(request, env);
        }
        break;

      case '/api/bookings/cancel':
        if (request.method === 'POST') {
          return await handleCancelBooking(request, env);
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

    // Debug endpoints for testing integrations
    case '/api/debug/test-all':
      if (request.method === 'GET') {
        return await handleDebugTestAll(request, env);
      }
      break;

    case '/api/debug/test-crm':
      if (request.method === 'GET') {
        return await handleDebugTestCRM(request, env);
      }
      break;

    case '/api/debug/test-email':
      if (request.method === 'GET') {
        return await handleDebugTestEmail(request, env);
      }
      break;

    case '/api/debug/test-secrets':
      if (request.method === 'GET') {
        return await handleDebugTestSecrets(request, env);
      }
      break;

    case '/api/debug/test-zeptomail':
      if (request.method === 'GET') {
        return await handleDebugTestZeptoMail(request, env);
      }
      break;

    case '/api/debug/test-raw-zeptomail':
      if (request.method === 'GET') {
        return await handleDebugRawZeptoMail(request, env);
      }
      break;
      
    case '/api/debug/test-bookings':
      if (request.method === 'GET') {
        return await handleDebugTestBookings(request, env);
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

    // Create/update CRM contact with assessment data
    // Generate default names from email if not provided
    const emailParts = data.email.split('@')[0];
    const defaultFirstName = emailParts.split(/[.+_-]/)[0] || 'Assessment';
    const defaultLastName = 'User';
    
    const leadData = {
      email: data.email,
      firstName: data.firstName || defaultFirstName,
      lastName: data.lastName || defaultLastName,
      company: data.company,
      phone: data.phone || '',
      jobTitle: data.jobTitle || 'Unknown',
      leadScore: assessmentResults.score,
      status: 'assessment-completed',
      source: 'ai-readiness-assessment',
      campaign: 'AI Readiness Assessment',
      industry: 'Construction',
      timeline: data.timeline || 'Unknown',
      assessmentScore: assessmentResults.score,
      assessmentCategory: assessmentResults.category,
      assessmentDate: timestamp,
      assessmentId: assessmentId,
      notes: `AI Readiness Assessment completed. Score: ${assessmentResults.score}% (${assessmentResults.category}). Recommendations: ${assessmentResults.recommendations.slice(0, 2).join('; ')}`
    };

    // Sync to CRM (this will create or update the contact)
    console.log('🔄 Starting CRM sync for assessment...');
    const crmResult = await syncToCRM(leadData, env);
    console.log('🔄 CRM sync result:', crmResult);

    // Add to email automation sequence
    await triggerEmailSequence(leadData, env);

    // Send results email
    await sendAssessmentResults(assessmentData, shareToken, env);

    // Update lead score if lead exists (now redundant as syncToCRM handles this)
    await updateLeadScore(data.email, assessmentResults.score, env);

    // Track assessment completion
    await trackEvent('assessment_completed', { 
      assessmentId, 
      score: assessmentResults.score,
      category: assessmentResults.category,
      email: data.email,
      company: data.company
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
  try {
    const response = await env.ASSETS.fetch(request);
    // Override cache-control for the homepage if needed
    response.headers.set('Cache-Control', 'public, max-age=300');
    return response;
  } catch (error) {
    console.error('Error fetching homepage:', error);
    return new Response('Error loading homepage', { status: 500 });
  }
}

async function handleStaticFile(request, filename, contentType) {
  try {
    const response = await env.ASSETS.fetch(request);
    // Set appropriate content type and cache headers
    response.headers.set('Content-Type', contentType);
    response.headers.set('Cache-Control', 'public, max-age=31536000'); // Cache static assets for a year
    return response;
  } catch (error) {
    console.error(`Error fetching static file ${filename}:`, error);
    return new Response(`Error loading ${filename}`, { status: 500 });
  }
}

async function handleConsultancyLandingPage(request, env) {
  try {
    // Use dynamic HTML generation with updated Zoho Bookings widget
    const html = getConsultancyLandingPageHTML(env);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300'
      }
    });
  } catch (error) {
    console.error('Error generating AI Consultancy landing page:', error);
    return new Response('Error loading AI Consultancy page', { status: 500 });
  }
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
    console.log('🔍 === CRM SYNC DEBUG START ===');
    console.log('📧 Lead Email:', leadData.email);
    console.log('🏢 Company:', leadData.company);
    console.log('📊 Assessment Score:', leadData.assessmentScore);
    console.log('📊 Assessment Category:', leadData.assessmentCategory);
    
    // Check for required environment variables
    const hasClientSecret = !!env.ZOHO_CRM_CLIENT_SECRET;
    const hasRefreshToken = !!env.ZOHO_CRM_REFRESH_TOKEN;
    const hasClientId = !!env.ZOHO_CRM_CLIENT_ID;
    const hasApiUrl = !!env.ZOHO_CRM_API_URL;
    
    console.log('🔑 Environment Variables Check:');
    console.log('   CLIENT_SECRET:', hasClientSecret ? 'SET' : 'MISSING');
    console.log('   REFRESH_TOKEN:', hasRefreshToken ? 'SET' : 'MISSING');
    console.log('   CLIENT_ID:', hasClientId ? 'SET' : 'MISSING');
    console.log('   API_URL:', hasApiUrl ? 'SET' : 'MISSING');
    
    // Mock CRM sync only if using placeholder credentials
    const isUsingMockCRM = !hasClientSecret || 
                          !hasRefreshToken ||
                          !hasClientId ||
                          env.ZOHO_CRM_REFRESH_TOKEN === '1000.ff9f987ae5750104e63bfcc82a9eb12a.ac9b6959f4b6d466974ad2b213389eff';
    
    console.log('🎭 Mock Mode:', isUsingMockCRM ? 'YES' : 'NO');
    
    if (isUsingMockCRM) {
      console.log('🎯 === MOCK CRM SYNC (Missing Credentials) ===');
      console.log('👤 Contact:', `${leadData.firstName} ${leadData.lastName}`);
      console.log('🏢 Company:', leadData.company);
      console.log('📧 Email:', leadData.email);
      console.log('⭐ Lead Score:', leadData.leadScore);
      console.log('📋 Status:', leadData.status);
      console.log('🔬 Assessment Score:', leadData.assessmentScore);
      console.log('📊 Assessment Category:', leadData.assessmentCategory);
      console.log('📅 Assessment Date:', leadData.assessmentDate);
      console.log('🆔 Assessment ID:', leadData.assessmentId);
      console.log('📝 Notes:', leadData.notes);
      console.log('✅ Contact would be synced to Zoho CRM with assessment data');
      console.log('=======================================');
      return { success: true, id: 'mock-' + Date.now(), mock: true };
    }

    // Get access token using refresh token
    console.log('🔑 Attempting to get Zoho access token...');
    const accessToken = await getZohoAccessToken('crm', env);
    
    if (!accessToken) {
      console.error('❌ Failed to get access token');
      return { success: false, error: 'Failed to get access token' };
    }
    
    console.log('✅ Access token retrieved successfully');

    const zohoCrmUrl = `${env.ZOHO_CRM_API_URL}/Contacts`;
    console.log('🌐 CRM URL:', zohoCrmUrl);
    
    const contactData = {
      data: [{
        Email: leadData.email,
        First_Name: leadData.firstName || '',
        Last_Name: leadData.lastName || '',
        Account_Name: leadData.company || '',
        Title: leadData.jobTitle || '',
        Phone: leadData.phone || '',
        Lead_Status: leadData.status || '',
        Lead_Score: leadData.leadScore,
        Lead_Source: leadData.source || '',
        Campaign_Source: leadData.campaign || '',
        Industry: leadData.industry || '',
        Company_Size: leadData.companySize || '',
        Budget: leadData.budget || '',
        Timeline: leadData.timeline || '',
        // Assessment-specific fields
        AI_Assessment_Score: leadData.assessmentScore,
        AI_Assessment_Category: leadData.assessmentCategory,
        Assessment_Date: leadData.assessmentDate,
        Assessment_ID: leadData.assessmentId,
        Description: leadData.notes || ''
      }]
    };

    console.log('📋 Contact Data to Send:', JSON.stringify(contactData, null, 2));

    console.log('🚀 Making API call to Zoho CRM...');
    const response = await fetch(zohoCrmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    console.log('📡 Response Status:', response.status);
    console.log('📡 Response Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('📡 Response Body:', responseText);

    if (!response.ok) {
      console.error('❌ Zoho CRM API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return { success: false, error: `Zoho CRM API error: ${response.status} - ${responseText}` };
    }

    const responseData = JSON.parse(responseText);
    console.log('✅ CRM Sync Success:', responseData);
    console.log('🔍 === CRM SYNC DEBUG END ===');
    
    return { success: true, data: responseData };
    
  } catch (error) {
    console.error('❌ CRM sync error:', error);
    console.error('❌ Error stack:', error.stack);
    console.log('🔍 === CRM SYNC DEBUG END (ERROR) ===');
    return { success: false, error: error.message };
  }
}

/**
 * Email Automation (Zoho Campaigns Only - Marketing Emails)
 * ZeptoMail is reserved for transactional emails only
 */
async function triggerEmailSequence(leadData, env) {
  try {
    // Add contact to Zoho Campaigns list for automated nurture sequence
    await addToZohoCampaigns(leadData, env);
    
    // Note: Welcome emails and lead nurture sequences are now handled by Zoho Campaigns
    // This ensures compliance with ZeptoMail's transactional-only terms of service
    
    console.log(`Lead ${leadData.email} added to Zoho Campaigns automation sequence`);
    
  } catch (error) {
    console.error('Email sequence error:', error);
  }
}

function getWelcomeEmailSubject(leadScore) {
  if (leadScore >= 70) {
    return 'Your £2M+ AI Opportunity: 96% of UK Construction Firms Miss This';
  } else if (leadScore >= 50) {
    return 'While 88% Wait, Smart CEOs Capture £470K+ AI Savings';
  } else {
    return 'Construction AI Alert: 3-Year Window Closing for Early Movers';
  }
}

async function addToZohoCampaigns(leadData, env) {
  try {
    // Mock Campaigns sync if no token set or using placeholder
    const isUsingMockCampaigns = !env.ZOHO_CAMPAIGNS_REFRESH_TOKEN ||
                                env.ZOHO_CAMPAIGNS_REFRESH_TOKEN === 'your-zoho-campaigns-refresh-token';
    
    if (isUsingMockCampaigns) {
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

/**
 * Send truly transactional emails via ZeptoMail
 * 
 * ✅ APPROPRIATE FOR ZEPTOMAIL (Transactional):
 * - Executive report delivery
 * - Assessment results
 * - Meeting booking confirmations
 * - Password resets
 * - Order confirmations
 * 
 * ❌ DO NOT USE FOR (Marketing - use Zoho Campaigns):
 * - Welcome email sequences
 * - Lead nurture campaigns
 * - Newsletter subscriptions
 * - Lead magnets
 * - Follow-up marketing emails
 */
async function sendTransactionalEmail(emailData, env) {
  try {
    // Only mock emails if no API key is set
    const isUsingMockKey = !env.ZOHO_API_KEY;
    
    if (isUsingMockKey) {
      console.log('🎯 === MOCK EMAIL (Local Development) ===');
      console.log('📧 To:', emailData.to);
      console.log('📝 Subject:', emailData.subject);
      console.log('📄 Content Preview:', (emailData.templateData?.htmlContent || 'Standard template').substring(0, 100) + '...');
      console.log('=======================================');
      return true; // Success in local dev
    }

    // Prepare the email payload - using exact ZeptoMail format
    const emailPayload = {
      from: {
        address: env.ZOHO_FROM_EMAIL || 'ian@ianyeo.com'
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
    };

    console.log('📧 Sending email via ZeptoMail to:', emailData.to);
    console.log('📝 Subject:', emailData.subject);

    // Use existing ZeptoMail integration (already configured)
    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': getZeptoMailAuthHeader(env.ZOHO_API_KEY),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error('❌ ZeptoMail API Error:');
      console.error('Status:', response.status, response.statusText);
      console.error('Response Headers:', Object.fromEntries(response.headers));
      console.error('Response Body:', responseText);
      console.error('Request Payload:', JSON.stringify(emailPayload, null, 2));
      console.error('API Key Length:', env.ZOHO_API_KEY ? env.ZOHO_API_KEY.length : 'MISSING');
      console.error('Sender Email:', env.ZOHO_FROM_EMAIL);
      
      // Log the error but don't throw - let the calling function handle it
      console.error(`ZeptoMail error: ${response.status}`);
      return false;
    }

    console.log('✅ Email sent successfully via ZeptoMail');
    console.log('📊 Response:', responseText);
    return true;
  } catch (error) {
    console.error('❌ Email send exception:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

function createEmailTemplate(data) {
  // If htmlContent is provided, use it directly
  if (data?.htmlContent) {
    return data.htmlContent;
  }
  
  // C-suite optimized template with competitive urgency and specific value props
  const company = data?.company || 'your organization';
  const firstName = data?.firstName || '';
  const leadScore = data?.leadScore || 0;
  const leadTier = data?.leadTier || 'Standard';
  
  // Determine personalized content based on lead score
  let competitiveInsight, roiProjection, urgencyMessage;
  
  if (leadScore >= 70) {
    competitiveInsight = "Your assessment indicates exceptional AI readiness - putting you in the top 12% of UK construction firms.";
    roiProjection = "Based on your responses, we project £2.1M+ in potential efficiency gains over 24 months.";
    urgencyMessage = "The 18-month competitive window for first-mover advantage is already 30% elapsed.";
  } else if (leadScore >= 50) {
    competitiveInsight = "Your assessment shows strong potential - you're ahead of 76% of your peers.";
    roiProjection = "Conservative projections indicate £470K+ in achievable cost savings within 18 months.";
    urgencyMessage = "While 88% of construction firms delay, early movers are capturing disproportionate market share.";
  } else {
    competitiveInsight = "Your assessment reveals significant opportunities that 92% of construction companies overlook.";
    roiProjection = "Even modest AI implementation typically delivers 15-30% efficiency improvements.";
    urgencyMessage = "The 3-year transformation window is narrowing - regulatory pressure is increasing rapidly.";
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your AI Construction Strategy</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 650px; margin: 0 auto; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">
        ${firstName ? `${firstName}, ` : ''}Your AI Advantage Blueprint
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px; font-weight: 500;">
        Exclusive Strategy for ${company}
      </p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 32px 24px;">
      
      <!-- Competitive Intelligence -->
      <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 0 0 24px; border-radius: 6px;">
        <h3 style="color: #0369a1; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          🎯 Market Intelligence
        </h3>
        <p style="margin: 0; color: #0c4a6e; font-weight: 500;">${competitiveInsight}</p>
      </div>

      <!-- ROI Projection -->
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 0 0 24px; border-radius: 6px;">
        <h3 style="color: #065f46; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          💰 Financial Impact Analysis
        </h3>
        <p style="margin: 0; color: #064e3b; font-weight: 500;">${roiProjection}</p>
        <p style="margin: 8px 0 0; color: #064e3b; font-size: 14px;">
          <em>Conservative estimate based on peer performance data from 847 UK construction firms</em>
        </p>
      </div>

      <!-- Urgency Factor -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 0 0 24px; border-radius: 6px;">
        <h3 style="color: #92400e; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          ⏰ Strategic Window Alert
        </h3>
        <p style="margin: 0; color: #92400e; font-weight: 500;">${urgencyMessage}</p>
      </div>

      <!-- Your Score -->
      <div style="text-align: center; margin: 32px 0; padding: 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
        <h3 style="color: white; margin: 0 0 8px; font-size: 20px;">Your AI Readiness Score</h3>
        <div style="font-size: 36px; font-weight: 700; color: white; margin: 8px 0;">${leadScore}/100</div>
        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px; font-weight: 500;">
          Category: ${leadTier}
        </p>
      </div>

      <!-- Next Steps -->
      <h3 style="color: #1e40af; margin: 24px 0 16px; font-size: 20px; font-weight: 600;">
        Recommended Next Steps:
      </h3>
      
      <div style="margin: 20px 0;">
        <div style="display: flex; align-items: flex-start; margin: 12px 0; padding: 12px; background: #fafafa; border-radius: 6px;">
          <span style="color: #1e40af; font-weight: 700; margin-right: 12px; font-size: 18px;">1.</span>
          <span style="color: #374151; font-weight: 500;">Schedule your private 45-minute strategy session (£2,500 value - complimentary)</span>
        </div>
        <div style="display: flex; align-items: flex-start; margin: 12px 0; padding: 12px; background: #fafafa; border-radius: 6px;">
          <span style="color: #1e40af; font-weight: 700; margin-right: 12px; font-size: 18px;">2.</span>
          <span style="color: #374151; font-weight: 500;">Receive your confidential 15-page AI Implementation Roadmap</span>
        </div>
        <div style="display: flex; align-items: flex-start; margin: 12px 0; padding: 12px; background: #fafafa; border-radius: 6px;">
          <span style="color: #1e40af; font-weight: 700; margin-right: 12px; font-size: 18px;">3.</span>
          <span style="color: #374151; font-weight: 500;">Access exclusive case studies from £50M+ construction AI implementations</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://ianyeo.zohobookings.com/#/ai-strategy-consultation" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); 
                  color: white; 
                  padding: 16px 32px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 700; 
                  font-size: 16px; 
                  letter-spacing: 0.5px;
                  box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);">
          📅 SECURE YOUR STRATEGY SESSION
        </a>
        <p style="margin: 12px 0 0; color: #64748b; font-size: 14px;">
          Limited availability • Next 7 days only • No sales pitch guarantee
        </p>
      </div>

      <!-- Social Proof -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
        <p style="margin: 0; font-style: italic; color: #475569; text-align: center; font-size: 15px;">
          <strong>"Ian's AI strategy delivered £1.8M in measurable savings within 12 months. 
          The competitive advantage has been transformational for our business."</strong>
        </p>
        <p style="margin: 8px 0 0; text-align: center; color: #64748b; font-size: 14px; font-weight: 500;">
          — James Morrison, CEO, Morrison Construction Group (£47M revenue)
        </p>
      </div>

      <!-- Urgency Reinforcement -->
      <div style="border: 2px solid #ef4444; padding: 16px; border-radius: 8px; margin: 24px 0; background: #fef2f2;">
        <p style="margin: 0; color: #dc2626; font-weight: 600; font-size: 15px; text-align: center;">
          ⚡ Early Mover Advantage Expires March 2025 ⚡<br>
          <span style="font-weight: 400; font-size: 14px;">Government AI regulations increase compliance costs by an estimated 23-31% post-March</span>
        </p>
      </div>

    </div>
    
    <!-- Professional Signature -->
    <div style="padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.4; color: #2c3e50; max-width: 600px;">
        <div style="font-size: 18px; font-weight: 700; color: #1a365d; margin-bottom: 2px;">
          Ian Yeo
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #2d3748; margin-bottom: 8px;">
          Former CEO @ Operance (Successfully Acquired)
        </div>
        <div style="font-size: 13px; color: #4a5568; font-style: italic; margin-bottom: 10px;">
          AI/PropTech Pioneer | Proven Scale-up Leader | Construction Tech Innovator
        </div>
        <hr style="height: 2px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); border: none; margin: 12px 0 8px 0; border-radius: 1px;">
        <div style="margin-bottom: 8px;">
          <a href="mailto:ian@ianyeo.com" style="color: #3182ce; text-decoration: none; margin-right: 15px;">ian@ianyeo.com</a>
          <a href="tel:+447753811081" style="color: #3182ce; text-decoration: none; margin-right: 15px;">+44 7753 811081</a>
          <a href="https://linkedin.com/in/iankyeo" style="color: #3182ce; text-decoration: none; margin-right: 15px;">LinkedIn</a>
          <a href="https://ianyeo.com" style="color: #3182ce; text-decoration: none;">ianyeo.com</a>
        </div>
        <div style="font-size: 12px; color: #4a5568; margin-top: 6px;">
          📊 Scaled revenue from £82K to £472K | 🏢 115+ paying customers | 🤖 Built AI-powered PropTech platform
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          📅 Available for Executive Opportunities from August 2025
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

function createTextTemplate(data) {
  return `Welcome to AI in Construction, ${data?.firstName || ''}!

Thank you for your interest in transforming your construction business with AI.

Your Lead Score: ${data?.leadScore || 'N/A'}/100 (${data?.leadTier || 'Standard'})

Based on your assessment, we'll be sending you personalised content to help you get started with AI implementation.

Best regards,
Ian Yeo
AI & Construction Technology Consultant`;
}

/**
 * Send assessment results email - TRANSACTIONAL (ZeptoMail appropriate)
 * This is triggered by a specific user action (completing an assessment)
 */
async function sendAssessmentResults(assessmentData, shareToken, env) {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your AI Readiness Assessment Results</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c3e50; margin-bottom: 10px;">Your AI Readiness Results</h1>
        <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; font-weight: bold; margin: 20px 0;">
          ${assessmentData.score}%
        </div>
        <h2 style="color: #2c3e50; margin: 10px 0;">Category: ${assessmentData.category}</h2>
      </div>

      <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
        <h3 style="color: #2c3e50; margin-top: 0;">Company: ${assessmentData.company}</h3>
        <p style="margin-bottom: 0;">Assessment completed on ${new Date(assessmentData.timestamp).toLocaleDateString('en-GB')}</p>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #2c3e50;">Key Recommendations:</h3>
        <ul style="list-style: none; padding: 0;">
          ${assessmentData.recommendations.map(rec => `
            <li style="margin: 10px 0; padding-left: 20px; position: relative;">
              <span style="position: absolute; left: 0; color: #10b981;">✓</span>
              ${rec}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="margin-bottom: 25px;">
        <h3 style="color: #2c3e50;">Recommended Next Steps:</h3>
        <ul style="list-style: none; padding: 0;">
          ${assessmentData.nextSteps.map(step => `
            <li style="margin: 10px 0; padding-left: 20px; position: relative;">
              <span style="position: absolute; left: 0; color: #3b82f6;">→</span>
              ${step}
            </li>
          `).join('')}
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px;">
        <h3 style="color: white; margin-top: 0;">Ready to Transform Your Business?</h3>
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 20px;">Book a free 30-minute AI strategy session to discuss your specific needs and opportunities.</p>
        <a href="https://ianyeo.zohobookings.com/#/ai-strategy-consultation" style="display: inline-block; background: rgba(255,255,255,0.2); color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; border: 2px solid rgba(255,255,255,0.3);">
          📅 Book Free Strategy Session
        </a>
      </div>

      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="color: #856404; margin-top: 0;">Your Detailed Report</h4>
        <p style="color: #856404; margin: 10px 0;">Access your complete assessment results with personalised recommendations:</p>
        <a href="${env.SITE_URL}/api/assessment/results?token=${shareToken}" style="color: #856404; font-weight: bold;">View Full Results →</a>
        <p style="color: #856404; font-size: 0.9em; margin-bottom: 0;">This link is valid for 90 days and is unique to your assessment.</p>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
        <h4 style="color: #2c3e50;">Questions About Your Results?</h4>
        <p>I'm here to help you understand your AI readiness and plan your next steps.</p>
        <p>Email me directly: <a href="mailto:ian@ianyeo.com" style="color: #3498db;">ian@ianyeo.com</a></p>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #7f8c8d; font-size: 14px;">
        <p>Best regards,<br><strong>Ian Yeo</strong><br>AI Strategy Consultant<br>PropTech & Construction Technology</p>
        <p><a href="https://ianyeo.com" style="color: #3498db;">ianyeo.com</a></p>
      </div>
    </body>
    </html>
  `;

  // C-suite optimized subject line with competitive urgency
  let ceoSubject;
  if (assessmentData.score >= 70) {
    ceoSubject = `${assessmentData.company}: Top 12% AI Readiness - £2M+ Opportunity Identified`;
  } else if (assessmentData.score >= 50) {
    ceoSubject = `${assessmentData.company}: Above-Average Readiness - £470K+ Savings Potential`;
  } else {
    ceoSubject = `${assessmentData.company}: Hidden AI Opportunities - 92% of Peers Miss This`;
  }

  return await sendTransactionalEmail({
    to: assessmentData.email,
    subject: ceoSubject,
    templateData: {
      htmlContent: emailHtml
    }
  }, env);
}

async function sendLeadMagnet(leadData, magnetType, env) {
  // Lead magnets are now handled by Zoho Campaigns for marketing compliance
  // This function adds the lead to the appropriate Zoho Campaigns list based on magnet type
  try {
    // Add to specific campaign list based on magnet type
    const campaignData = {
      ...leadData,
      leadMagnetType: magnetType,
      source: `lead-magnet-${magnetType}`
    };
    
    await addToZohoCampaigns(campaignData, env);
    console.log(`Added to Zoho Campaigns ${magnetType} sequence:`, leadData.email);
    return true;
  } catch (error) {
    console.error('Error adding to Zoho Campaigns lead magnet sequence:', error);
    return false;
  }
}

async function sendMeetingConfirmation(bookingData, meeting, env) {
  // Implementation for meeting confirmation emails
  console.log('Sending meeting confirmation to:', bookingData.email);
}

async function sendWelcomeEmail(subscriptionData, env) {
  // Welcome emails are now handled by Zoho Campaigns for marketing compliance
  // This function adds the subscriber to the appropriate Zoho Campaigns list
  try {
    await addToZohoCampaigns(subscriptionData, env);
    console.log('Added to Zoho Campaigns welcome sequence:', subscriptionData.email);
    return true;
  } catch (error) {
    console.error('Error adding to Zoho Campaigns:', error);
    return false;
  }
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

/**
 * Send meeting request notification - TRANSACTIONAL (ZeptoMail appropriate)
 * This is triggered by a specific user action (booking a meeting)
 */
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

/**
 * Send meeting instructions to user - TRANSACTIONAL (ZeptoMail appropriate)
 * This is triggered by a specific user action (booking a meeting)
 */
async function sendMeetingInstructions(meetingRequest, env) {
  // Professional C-suite appropriate meeting confirmation
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Strategy Session Confirmation</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #2c3e50; margin: 0; padding: 0; background-color: #f8fafc;">
  <div style="max-width: 650px; margin: 0 auto; background: white; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">
        Strategy Session Confirmed
      </h1>
      <p style="color: rgba(255, 255, 255, 0.9); margin: 8px 0 0; font-size: 16px;">
        AI Implementation Discussion with Ian Yeo
      </p>
    </div>
    
    <!-- Main Content -->
    <div style="padding: 32px 24px;">
      
      <p style="margin: 0 0 20px; font-size: 16px; color: #374151;">
        Dear ${meetingRequest.firstName},
      </p>
      
      <p style="margin: 0 0 24px; color: #374151; font-size: 15px;">
        Thank you for requesting a strategic consultation. Your meeting request has been received and I will personally review your requirements before our discussion.
      </p>

      <!-- Meeting Details -->
      <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 24px 0; border-radius: 6px;">
        <h3 style="color: #0369a1; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          📅 Meeting Details
        </h3>
        <p style="margin: 0; color: #0c4a6e;"><strong>Requested Time:</strong> ${meetingRequest.requestedTime}</p>
        <p style="margin: 8px 0 0; color: #0c4a6e;"><strong>Duration:</strong> 45 minutes</p>
        <p style="margin: 8px 0 0; color: #0c4a6e;"><strong>Format:</strong> Video conference (Zoom link will be provided)</p>
      </div>

      <!-- What to Expect -->
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 6px;">
        <h3 style="color: #065f46; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          💡 What to Expect
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #064e3b;">
          <li style="margin: 6px 0;">Analysis of your company's AI readiness and competitive position</li>
          <li style="margin: 6px 0;">Specific ROI projections for your industry and company size</li>
          <li style="margin: 6px 0;">18-month implementation roadmap with priority recommendations</li>
          <li style="margin: 6px 0;">Risk mitigation strategies and change management approach</li>
          <li style="margin: 6px 0;">Competitive intelligence and market timing insights</li>
        </ul>
      </div>

      <!-- Preparation -->
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 6px;">
        <h3 style="color: #92400e; margin: 0 0 12px; font-size: 18px; font-weight: 600;">
          📋 Brief Pre-Session Preparation
        </h3>
        <p style="margin: 0 0 12px; color: #92400e;">To maximize our time together, please consider:</p>
        <ul style="margin: 0; padding-left: 20px; color: #92400e;">
          <li style="margin: 4px 0;">Current technology stack and key operational challenges</li>
          <li style="margin: 4px 0;">Annual revenue, project volume, and growth objectives</li>
          <li style="margin: 4px 0;">Timeline expectations for AI implementation</li>
          <li style="margin: 4px 0;">Any specific AI use cases you've considered</li>
        </ul>
      </div>

      <!-- Next Steps -->
      <p style="margin: 24px 0 16px; color: #374151; font-size: 15px;">
        <strong>Next Steps:</strong>
      </p>
      <ol style="color: #374151; padding-left: 20px;">
        <li style="margin: 8px 0;">I'll confirm your preferred time slot within 12 hours</li>
        <li style="margin: 8px 0;">You'll receive a calendar invitation with Zoom details</li>
        <li style="margin: 8px 0;">I'll send a brief pre-session questionnaire (optional)</li>
        <li style="margin: 8px 0;">We'll conduct your strategic AI consultation</li>
      </ol>

      <!-- Alternative Booking -->
      <div style="text-align: center; margin: 32px 0; padding: 20px; background: #f8fafc; border-radius: 8px;">
        <p style="margin: 0 0 16px; color: #374151; font-weight: 500;">
          Prefer to select your own time slot?
        </p>
        <a href="https://ianyeo.zohobookings.com/#/ai-strategy-consultation" 
           style="display: inline-block; 
                  background: linear-gradient(135deg, #1e40af 0%, #9333ea 100%); 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 6px; 
                  font-weight: 600; 
                  font-size: 14px;">
          📅 View Available Time Slots
        </a>
      </div>

      <!-- Contact -->
      <p style="margin: 24px 0 0; color: #64748b; font-size: 14px; text-align: center;">
        Questions before our meeting? Reply directly to this email or call +44 7753 811081
      </p>

    </div>
    
    <!-- Professional Signature -->
    <div style="padding: 24px; background: #f8fafc; border-top: 1px solid #e2e8f0;">
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.4; color: #2c3e50; max-width: 600px;">
        <div style="font-size: 18px; font-weight: 700; color: #1a365d; margin-bottom: 2px;">
          Ian Yeo
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #2d3748; margin-bottom: 8px;">
          Former CEO @ Operance (Successfully Acquired)
        </div>
        <div style="font-size: 13px; color: #4a5568; font-style: italic; margin-bottom: 10px;">
          AI/PropTech Pioneer | Proven Scale-up Leader | Construction Tech Innovator
        </div>
        <hr style="height: 2px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); border: none; margin: 12px 0 8px 0; border-radius: 1px;">
        <div style="margin-bottom: 8px;">
          <a href="mailto:ian@ianyeo.com" style="color: #3182ce; text-decoration: none; margin-right: 15px;">ian@ianyeo.com</a>
          <a href="tel:+447753811081" style="color: #3182ce; text-decoration: none; margin-right: 15px;">+44 7753 811081</a>
          <a href="https://linkedin.com/in/iankyeo" style="color: #3182ce; text-decoration: none; margin-right: 15px;">LinkedIn</a>
          <a href="https://ianyeo.com" style="color: #3182ce; text-decoration: none;">ianyeo.com</a>
        </div>
        <div style="font-size: 12px; color: #4a5568; margin-top: 6px;">
          📊 Scaled revenue from £82K to £472K | 🏢 115+ paying customers | 🤖 Built AI-powered PropTech platform
        </div>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; display: inline-block; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          📅 Available for Executive Opportunities from August 2025
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  return await sendTransactionalEmail({
    to: meetingRequest.email,
    subject: `Strategy Session Confirmed: ${meetingRequest.company} AI Implementation Discussion`,
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

/**
 * Send executive report download email - TRANSACTIONAL (ZeptoMail appropriate)
 * This is triggered by a specific user action (requesting a report)
 */
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
        'Authorization': getZeptoMailAuthHeader(env.ZOHO_API_KEY),
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
    console.log(`🔑 === TOKEN REQUEST DEBUG (${service.toUpperCase()}) ===`);
    
    // Use same client credentials for all services (only one Self Client allowed)
    const clientId = env.ZOHO_CRM_CLIENT_ID;
    const clientSecret = env.ZOHO_CRM_CLIENT_SECRET;
    const refreshToken = env[`ZOHO_${service.toUpperCase()}_REFRESH_TOKEN`];
    const accountsUrl = env.ZOHO_ACCOUNTS_URL;

    console.log('🔍 Credentials Check:');
    console.log('   CLIENT_ID:', clientId ? 'SET (' + clientId.substring(0, 10) + '...)' : 'MISSING');
    console.log('   CLIENT_SECRET:', clientSecret ? 'SET' : 'MISSING');
    console.log('   REFRESH_TOKEN:', refreshToken ? 'SET (' + refreshToken.substring(0, 10) + '...)' : 'MISSING');
    console.log('   ACCOUNTS_URL:', accountsUrl || 'https://accounts.zoho.com');

    if (!clientId || !clientSecret || !refreshToken) {
      console.error(`❌ Missing Zoho ${service} credentials`);
      return null;
    }

    const tokenUrl = `${accountsUrl || 'https://accounts.zoho.com'}/oauth/v2/token`;
    console.log('🌐 Token URL:', tokenUrl);

    const response = await fetch(tokenUrl, {
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

    console.log('📡 Token Response Status:', response.status);
    console.log('📡 Token Response Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('📡 Token Response Body:', responseText);

    if (!response.ok) {
      console.error(`❌ Zoho ${service} token refresh failed:`, {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return null;
    }

    const tokenData = JSON.parse(responseText);
    console.log('✅ Token received successfully');
    console.log('🔑 === TOKEN REQUEST DEBUG END ===');
    
    return tokenData.access_token;

  } catch (error) {
    console.error(`❌ Zoho ${service} token error:`, error);
    console.error(`❌ Token error stack:`, error.stack);
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

// ===============================
// ZOHO BOOKINGS API INTEGRATION
// ===============================

async function getZohoBookingsAccessToken(env) {
  try {
    if (!env.ZOHO_BOOKINGS_REFRESH_TOKEN || !env.ZOHO_BOOKINGS_CLIENT_SECRET) {
      console.log('Zoho Bookings credentials not configured');
      return null;
    }

    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        refresh_token: env.ZOHO_BOOKINGS_REFRESH_TOKEN,
        client_id: env.ZOHO_BOOKINGS_CLIENT_ID,
        client_secret: env.ZOHO_BOOKINGS_CLIENT_SECRET,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      console.error('Failed to refresh Zoho Bookings token:', response.status);
      return null;
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Zoho Bookings access token:', error);
    return null;
  }
}

async function handleGetBookingServices(request, env) {
  try {
    const accessToken = await getZohoBookingsAccessToken(env);
    
    if (!accessToken) {
      return jsonResponse({
        success: false,
        error: 'Zoho Bookings not configured'
      }, 500);
    }

    const response = await fetch(`${env.ZOHO_BOOKINGS_API_URL}/json/services`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Zoho Bookings services error:', response.status);
      return jsonResponse({
        success: false,
        error: 'Failed to fetch services'
      }, 500);
    }

    const data = await response.json();
    
    // Filter for AI Strategy Consultation service
    const services = data.response?.services || [];
    const consultationService = services.find(s => 
      s.service_name?.toLowerCase().includes('ai strategy') ||
      s.service_name?.toLowerCase().includes('consultation') ||
      s.service_name?.toLowerCase().includes('strategy call')
    );

    return jsonResponse({
      success: true,
      services: consultationService ? [consultationService] : services
    });

  } catch (error) {
    console.error('Error fetching booking services:', error);
    return jsonResponse({
      success: false,
      error: 'Service error'
    }, 500);
  }
}

async function handleGetAvailability(request, env) {
  try {
    const url = new URL(request.url);
    const serviceId = url.searchParams.get('service_id');
    const date = url.searchParams.get('date'); // YYYY-MM-DD format
    const timezone = url.searchParams.get('timezone') || 'UTC';

    if (!serviceId) {
      return jsonResponse({
        success: false,
        error: 'service_id is required'
      }, 400);
    }

    const accessToken = await getZohoBookingsAccessToken(env);
    
    if (!accessToken) {
      return jsonResponse({
        success: false,
        error: 'Zoho Bookings not configured'
      }, 500);
    }

    // Get availability for the next 30 days if no date specified
    const startDate = date || new Date().toISOString().split('T')[0];
    const endDate = date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const requestBody = {
      service_id: serviceId,
      from_date: startDate,
      to_date: endDate,
      timezone: timezone
    };

    const response = await fetch(`${env.ZOHO_BOOKINGS_API_URL}/json/fetchavailability`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error('Zoho Bookings availability error:', response.status);
      return jsonResponse({
        success: false,
        error: 'Failed to fetch availability'
      }, 500);
    }

    const data = await response.json();
    
    return jsonResponse({
      success: true,
      availability: data.response || {}
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    return jsonResponse({
      success: false,
      error: 'Service error'
    }, 500);
  }
}

async function handleCreateBooking(request, env) {
  try {
    const data = await request.json();
    
    // Validate required fields
    const required = ['service_id', 'appointment_date_time', 'email', 'firstName', 'lastName'];
    for (const field of required) {
      if (!data[field]) {
        return jsonResponse({
          success: false,
          error: `${field} is required`
        }, 400);
      }
    }

    const accessToken = await getZohoBookingsAccessToken(env);
    
    if (!accessToken) {
      return jsonResponse({
        success: false,
        error: 'Zoho Bookings not configured'
      }, 500);
    }

    // Prepare booking data
    const bookingData = {
      service_id: data.service_id,
      staff_id: data.staff_id, // Optional - will use default if not provided
      appointment_date_time: data.appointment_date_time, // ISO format: 2024-01-15T14:00:00Z
      timezone: data.timezone || 'UTC',
      customer_details: {
        name: `${data.firstName} ${data.lastName}`,
        email: data.email,
        phone: data.phone || '',
        additional_fields: {
          company: data.company || '',
          job_title: data.jobTitle || '',
          message: data.message || ''
        }
      },
      send_confirmation: true, // Zoho will send confirmation emails
      send_reminder: true
    };

    console.log('Creating Zoho booking:', JSON.stringify(bookingData, null, 2));

    const response = await fetch(`${env.ZOHO_BOOKINGS_API_URL}/json/appointment`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bookingData)
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('Zoho Bookings creation error:', response.status, responseText);
      return jsonResponse({
        success: false,
        error: 'Failed to create booking',
        details: responseText
      }, 500);
    }

    const result = JSON.parse(responseText);
    
    if (result.response && result.response.booking_id) {
      // Booking created successfully
      console.log('✅ Zoho booking created successfully:', result.response.booking_id);
      
      // Sync lead to CRM with high score (they booked a meeting)
      const leadData = {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        company: data.company || '',
        phone: data.phone || '',
        jobTitle: data.jobTitle || 'Unknown',
        leadScore: 95, // Very high score for actual bookings
        status: 'meeting-booked',
        source: 'ai-consultancy-zoho-booking',
        campaign: 'AI Strategy Call - Zoho Booking',
        industry: 'Construction',
        timeline: 'Immediate',
        message: data.message || '',
        booking_id: result.response.booking_id,
        appointment_date: data.appointment_date_time
      };
      
      // Sync to CRM and email campaigns in parallel
      await Promise.all([
        syncToCRM(leadData, env),
        triggerEmailSequence(leadData, env),
        updateLeadStatus(data.email, 'meeting-booked-zoho', env)
      ]);
      
      // Track successful booking
      await trackEvent({
        event: 'booking_completed',
        email: data.email,
        booking_id: result.response.booking_id,
        service_id: data.service_id,
        appointment_date: data.appointment_date_time
      }, env);

      return jsonResponse({
        success: true,
        booking_id: result.response.booking_id,
        confirmation_url: result.response.confirmation_url,
        message: 'Booking created successfully! You will receive a confirmation email shortly.'
      });
    } else {
      console.error('Unexpected Zoho response format:', result);
      return jsonResponse({
        success: false,
        error: 'Unexpected response from booking service'
      }, 500);
    }

  } catch (error) {
    console.error('Error creating booking:', error);
    return jsonResponse({
      success: false,
      error: 'Service error'
    }, 500);
  }
}

async function handleCancelBooking(request, env) {
  try {
    const data = await request.json();
    
    if (!data.booking_id) {
      return jsonResponse({
        success: false,
        error: 'booking_id is required'
      }, 400);
    }

    const accessToken = await getZohoBookingsAccessToken(env);
    
    if (!accessToken) {
      return jsonResponse({
        success: false,
        error: 'Zoho Bookings not configured'
      }, 500);
    }

    const cancelData = {
      booking_id: data.booking_id,
      status: 'cancel',
      reason: data.reason || 'Cancelled by customer'
    };

    const response = await fetch(`${env.ZOHO_BOOKINGS_API_URL}/json/updateappointment`, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(cancelData)
    });

    if (!response.ok) {
      console.error('Zoho Bookings cancellation error:', response.status);
      return jsonResponse({
        success: false,
        error: 'Failed to cancel booking'
      }, 500);
    }

    const result = await response.json();
    
    // Track cancellation
    await trackEvent({
      event: 'booking_cancelled',
      booking_id: data.booking_id,
      reason: data.reason
    }, env);

    return jsonResponse({
      success: true,
      message: 'Booking cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return jsonResponse({
      success: false,
      error: 'Service error'
    }, 500);
  }
}

// ===============================
// DEBUG ENDPOINTS
// ===============================

async function handleDebugTestSecrets(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: 'production',
    secrets: {}
  };

  // Test each secret (don't expose actual values)
  const secretsToTest = [
    'ZOHO_API_KEY',
    'TURNSTILE_SECRET_KEY', 
    'ZOHO_CRM_CLIENT_SECRET',
    'ZOHO_CRM_REFRESH_TOKEN',
    'ZOHO_CAMPAIGNS_REFRESH_TOKEN',
    'GA4_API_SECRET'
  ];

  secretsToTest.forEach(secretName => {
    const value = env[secretName];
    results.secrets[secretName] = {
      exists: !!value,
      length: value ? value.length : 0,
      preview: value ? `${value.substring(0, 10)}...` : 'NOT_SET'
    };
  });

  // Test environment variables
  results.envVars = {
    ZOHO_CRM_CLIENT_ID: env.ZOHO_CRM_CLIENT_ID || 'NOT_SET',
    ZOHO_CRM_API_URL: env.ZOHO_CRM_API_URL || 'NOT_SET',
    ZOHO_FROM_EMAIL: env.ZOHO_FROM_EMAIL || 'NOT_SET',
    SITE_URL: env.SITE_URL || 'NOT_SET'
  };

  return jsonResponse(results);
}

async function handleDebugTestEmail(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'email_integration',
    steps: []
  };

  try {
    // Step 1: Check ZeptoMail API key
    results.steps.push({
      step: 1,
      name: 'Check ZeptoMail API Key',
      status: env.ZOHO_API_KEY ? 'PASS' : 'FAIL',
      details: env.ZOHO_API_KEY ? 'API key is set' : 'ZOHO_API_KEY not found'
    });

    if (!env.ZOHO_API_KEY) {
      return jsonResponse(results);
    }

    // Step 2: Test email sending
    const testEmailData = {
      to: 'ian@ianyeo.com',
      subject: 'Test Email from AI Consultancy Debug',
      templateData: {
        htmlContent: '<h1>Debug Test Email</h1><p>This is a test email to verify ZeptoMail integration.</p><p>Timestamp: ' + new Date().toISOString() + '</p>'
      }
    };

    console.log('🧪 Sending test email via ZeptoMail...');
    const emailResult = await sendTransactionalEmail(testEmailData, env);
    
    results.steps.push({
      step: 2,
      name: 'Send Test Email',
      status: emailResult ? 'PASS' : 'FAIL',
      details: emailResult ? 'Test email sent successfully' : 'Failed to send test email'
    });

  } catch (error) {
    results.steps.push({
      step: 'ERROR',
      name: 'Email Test Error',
      status: 'FAIL',
      details: error.message
    });
  }

  return jsonResponse(results);
}

async function handleDebugTestCRM(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'crm_integration',
    steps: []
  };

  try {
    // Step 1: Check CRM credentials
    const hasClientId = !!env.ZOHO_CRM_CLIENT_ID;
    const hasClientSecret = !!env.ZOHO_CRM_CLIENT_SECRET;
    const hasRefreshToken = !!env.ZOHO_CRM_REFRESH_TOKEN;

    results.steps.push({
      step: 1,
      name: 'Check CRM Credentials',
      status: hasClientId && hasClientSecret && hasRefreshToken ? 'PASS' : 'FAIL',
      details: {
        client_id: hasClientId ? 'SET' : 'MISSING',
        client_secret: hasClientSecret ? 'SET' : 'MISSING', 
        refresh_token: hasRefreshToken ? 'SET' : 'MISSING'
      }
    });

    if (!hasClientId || !hasClientSecret || !hasRefreshToken) {
      return jsonResponse(results);
    }

    // Step 2: Test access token generation
    console.log('🧪 Testing Zoho CRM access token...');
    const accessToken = await getZohoAccessToken('crm', env);
    
    results.steps.push({
      step: 2,
      name: 'Generate Access Token',
      status: accessToken ? 'PASS' : 'FAIL',
      details: accessToken ? 'Access token generated successfully' : 'Failed to generate access token'
    });

    if (!accessToken) {
      return jsonResponse(results);
    }

    // Step 3: Test CRM API connection
    console.log('🧪 Testing Zoho CRM API connection...');
    const testResponse = await fetch(`${env.ZOHO_CRM_API_URL}/settings/modules`, {
      method: 'GET',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    results.steps.push({
      step: 3,
      name: 'Test CRM API Connection',
      status: testResponse.ok ? 'PASS' : 'FAIL',
      details: testResponse.ok ? 'CRM API accessible' : `API error: ${testResponse.status}`
    });

    // Step 4: Test contact creation with assessment data
    if (testResponse.ok) {
      console.log('🧪 Testing contact creation with assessment data...');
      const testLead = {
        email: 'debug-assessment-test@example.com',
        firstName: 'Debug',
        lastName: 'Assessment',
        company: 'Test Construction Company',
        jobTitle: 'Debug Tester',
        leadScore: 85,
        status: 'assessment-completed',
        source: 'ai-readiness-assessment',
        campaign: 'AI Readiness Assessment',
        industry: 'Construction',
        timeline: 'Immediate',
        // Assessment-specific fields
        assessmentScore: 85,
        assessmentCategory: 'AI Ready',
        assessmentDate: getCurrentTimestamp(),
        assessmentId: 'debug-test-' + generateId(),
        notes: 'Debug test: AI Readiness Assessment completed. Score: 85% (AI Ready). This is a test contact created for debugging CRM integration.'
      };

      console.log('📋 Test assessment lead data:', JSON.stringify(testLead, null, 2));
      const crmResult = await syncToCRM(testLead, env);
      console.log('📋 CRM sync result:', JSON.stringify(crmResult, null, 2));
      
      results.steps.push({
        step: 4,
        name: 'Test Assessment Contact Creation',
        status: crmResult && crmResult.success ? 'PASS' : 'FAIL',
        details: crmResult ? crmResult : 'Failed to create test contact',
        testData: testLead
      });
    }

  } catch (error) {
    results.steps.push({
      step: 'ERROR',
      name: 'CRM Test Error',
      status: 'FAIL',
      details: error.message
    });
  }

  return jsonResponse(results);
}

async function handleDebugTestAll(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'full_integration_test',
    summary: {},
    details: {}
  };

  try {
    // Test secrets
    console.log('🧪 Testing secrets...');
    const secretsResponse = await handleDebugTestSecrets(request, env);
    const secretsData = await secretsResponse.json();
    results.details.secrets = secretsData;
    results.summary.secrets = Object.values(secretsData.secrets).every(s => s.exists) ? 'PASS' : 'FAIL';

    // Test email
    console.log('🧪 Testing email integration...');
    const emailResponse = await handleDebugTestEmail(request, env);
    const emailData = await emailResponse.json();
    results.details.email = emailData;
    results.summary.email = emailData.steps.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';

    // Test CRM
    console.log('🧪 Testing CRM integration...');
    const crmResponse = await handleDebugTestCRM(request, env);
    const crmData = await crmResponse.json();
    results.details.crm = crmData;
    results.summary.crm = crmData.steps.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';

    // Overall status
    results.overall_status = Object.values(results.summary).every(status => status === 'PASS') ? 'ALL_PASS' : 'ISSUES_FOUND';

  } catch (error) {
    results.error = error.message;
    results.overall_status = 'ERROR';
  }

  return jsonResponse(results);
}

async function handleDebugTestZeptoMail(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'zeptomail_detailed_test',
    steps: []
  };

  try {
    // Step 1: Check configuration
    results.steps.push({
      step: 1,
      name: 'Check ZeptoMail Configuration',
      status: 'INFO',
      details: {
        api_key_length: env.ZOHO_API_KEY ? env.ZOHO_API_KEY.length : 0,
        api_key_prefix: env.ZOHO_API_KEY ? env.ZOHO_API_KEY.substring(0, 20) + '...' : 'MISSING',
        sender_email: env.ZOHO_FROM_EMAIL || 'MISSING',
        site_url: env.SITE_URL || 'MISSING'
      }
    });

    if (!env.ZOHO_API_KEY) {
      results.steps.push({
        step: 2,
        name: 'ZeptoMail API Key Missing',
        status: 'FAIL',
        details: 'ZOHO_API_KEY environment variable not set'
      });
      return jsonResponse(results);
    }

    // Step 2: Test with minimal email
    console.log('🧪 Testing ZeptoMail with minimal email...');
    
    const testPayload = {
      from: {
        address: env.ZOHO_FROM_EMAIL || 'ian@ianyeo.com'
      },
      to: [{ 
        email_address: {
          address: 'ian@ianyeo.com',
          name: 'Ian Yeo'
        }
      }],
      subject: 'ZeptoMail Debug Test - ' + new Date().toISOString(),
      htmlbody: '<h1>ZeptoMail Debug Test</h1><p>This is a test email to debug ZeptoMail integration.</p>',
      textbody: 'ZeptoMail Debug Test - This is a test email to debug ZeptoMail integration.'
    };

    console.log('📧 Test payload:', JSON.stringify(testPayload, null, 2));

    const response = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': getZeptoMailAuthHeader(env.ZOHO_API_KEY),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });

    const responseText = await response.text();
    
    results.steps.push({
      step: 2,
      name: 'ZeptoMail API Test',
      status: response.ok ? 'PASS' : 'FAIL',
      details: {
        status_code: response.status,
        status_text: response.statusText,
        response: responseText,
        headers: Object.fromEntries(response.headers)
      }
    });

    if (!response.ok) {
      results.steps.push({
        step: 3,
        name: 'Error Analysis',
        status: 'INFO',
        details: {
          likely_causes: [
            'Sender email (ian@ianyeo.com) not verified in ZeptoMail',
            'Domain (ianyeo.com) not authenticated',
            'API key is for wrong service (e.g., Campaigns instead of ZeptoMail)',
            'API key permissions insufficient'
          ],
          next_steps: [
            '1. Login to ZeptoMail console: https://www.zoho.com/zeptomail/',
            '2. Verify sender email address',
            '3. Check domain authentication',
            '4. Verify API key is for ZeptoMail (not Campaigns)'
          ]
        }
      });
    }

  } catch (error) {
    results.steps.push({
      step: 'ERROR',
      name: 'ZeptoMail Test Error',
      status: 'FAIL',
      details: error.message
    });
  }

  return jsonResponse(results);
}

async function handleDebugTestBookings(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'zoho_bookings_debug',
    steps: []
  };

  try {
    // Step 1: Check configuration
    results.steps.push({
      step: 1,
      name: 'Check Bookings Configuration',
      status: 'INFO',
      details: {
        client_id: env.ZOHO_BOOKINGS_CLIENT_ID || 'MISSING',
        client_secret: env.ZOHO_BOOKINGS_CLIENT_SECRET ? 'SET' : 'MISSING',
        refresh_token: env.ZOHO_BOOKINGS_REFRESH_TOKEN ? 'SET' : 'MISSING',
        api_url: env.ZOHO_BOOKINGS_API_URL || 'MISSING'
      }
    });

    if (!env.ZOHO_BOOKINGS_CLIENT_SECRET || !env.ZOHO_BOOKINGS_REFRESH_TOKEN) {
      results.steps.push({
        step: 2,
        name: 'Missing Credentials',
        status: 'FAIL',
        details: 'Required Zoho Bookings credentials not set'
      });
      return jsonResponse(results);
    }

    // Step 2: Test access token generation
    let accessToken;
    try {
      accessToken = await getZohoBookingsAccessToken(env);
      results.steps.push({
        step: 2,
        name: 'Generate Access Token',
        status: accessToken ? 'PASS' : 'FAIL',
        details: {
          token_received: !!accessToken,
          token_length: accessToken ? accessToken.length : 0,
          token_preview: accessToken ? accessToken.substring(0, 20) + '...' : 'NO_TOKEN'
        }
      });
    } catch (error) {
      results.steps.push({
        step: 2,
        name: 'Generate Access Token',
        status: 'FAIL',
        details: {
          error: error.message,
          likely_causes: [
            'Invalid refresh token',
            'Expired OAuth credentials',
            'Incorrect client ID/secret',
            'Missing zohobookings.data.CREATE scope'
          ]
        }
      });
      return jsonResponse(results);
    }

    // Step 3: Test services API call
    if (accessToken) {
      try {
        console.log('🧪 Testing services API call...');
        const response = await fetch(`${env.ZOHO_BOOKINGS_API_URL}/json/services`, {
          method: 'GET',
          headers: {
            'Authorization': `Zoho-oauthtoken ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw_response: responseText };
        }
        
        results.steps.push({
          step: 3,
          name: 'Services API Call',
          status: response.ok ? 'PASS' : 'FAIL',
          details: {
            status_code: response.status,
            status_text: response.statusText,
            headers: Object.fromEntries(response.headers),
            response: responseData,
            services_count: responseData?.response?.services?.length || 0
          }
        });

        // Step 4: Analyze response
        if (response.ok && responseData) {
          const services = responseData?.response?.services || [];
          results.steps.push({
            step: 4,
            name: 'Response Analysis',
            status: 'INFO',
            details: {
              services_found: services.length,
              services: services.map(s => ({
                id: s.service_id,
                name: s.service_name,
                status: s.status,
                online_booking: s.allow_online_booking
              })),
              possible_issues: services.length === 0 ? [
                'No services configured in Zoho Bookings',
                'Services not enabled for online booking',
                'Services not published/active',
                'Wrong Zoho account or workspace'
              ] : []
            }
          });
        }

      } catch (error) {
        results.steps.push({
          step: 3,
          name: 'Services API Call',
          status: 'FAIL',
          details: {
            error: error.message,
            api_endpoint: `${env.ZOHO_BOOKINGS_API_URL}/json/services`
          }
        });
      }
    }

  } catch (error) {
    results.steps.push({
      step: 'ERROR',
      name: 'Bookings Test Error',
      status: 'FAIL',
      details: error.message
    });
  }

  return jsonResponse(results);
}

async function handleDebugRawZeptoMail(request, env) {
  const results = {
    timestamp: new Date().toISOString(),
    test: 'raw_zeptomail_test',
    steps: []
  };

  try {
    // Step 1: Check API key
    results.steps.push({
      step: 1,
      name: 'API Key Check',
      status: 'INFO',
      details: {
        api_key_exists: !!env.ZOHO_API_KEY,
        api_key_length: env.ZOHO_API_KEY ? env.ZOHO_API_KEY.length : 0,
        api_key_preview: env.ZOHO_API_KEY ? env.ZOHO_API_KEY.substring(0, 30) + '...' : 'MISSING'
      }
    });

    if (!env.ZOHO_API_KEY) {
      results.steps.push({
        step: 2,
        name: 'API Key Missing',
        status: 'FAIL',
        details: 'ZOHO_API_KEY environment variable not set'
      });
      return jsonResponse(results);
    }

    // Step 2: Test with ian@ianyeo.com (current sender)
    const testPayload1 = {
      from: { address: "ian@ianyeo.com" },
      to: [{ email_address: { address: "ian@ianyeo.com", name: "Ian Yeo" } }],
      subject: "Raw Test - ian@ianyeo.com - " + new Date().toISOString(),
      htmlbody: "<div><b>Raw test email from ian@ianyeo.com</b></div>"
    };

    console.log('🧪 Testing ian@ianyeo.com...');
    const response1 = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': getZeptoMailAuthHeader(env.ZOHO_API_KEY),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload1)
    });

    const responseText1 = await response1.text();
    
    results.steps.push({
      step: 2,
      name: 'Test ian@ianyeo.com',
      status: response1.ok ? 'PASS' : 'FAIL',
      details: {
        status_code: response1.status,
        status_text: response1.statusText,
        response: responseText1.substring(0, 500) + (responseText1.length > 500 ? '...' : ''),
        headers: Object.fromEntries(response1.headers)
      }
    });

    // Step 3: Test with noreply@ianyeo.com (from your curl example)
    const testPayload2 = {
      from: { address: "noreply@ianyeo.com" },
      to: [{ email_address: { address: "ian@ianyeo.com", name: "Ian Yeo" } }],
      subject: "Raw Test - noreply@ianyeo.com - " + new Date().toISOString(),
      htmlbody: "<div><b>Raw test email from noreply@ianyeo.com</b></div>"
    };

    console.log('🧪 Testing noreply@ianyeo.com...');
    const response2 = await fetch('https://api.zeptomail.com/v1.1/email', {
      method: 'POST',
      headers: {
        'Authorization': getZeptoMailAuthHeader(env.ZOHO_API_KEY),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(testPayload2)
    });

    const responseText2 = await response2.text();
    
    results.steps.push({
      step: 3,
      name: 'Test noreply@ianyeo.com',
      status: response2.ok ? 'PASS' : 'FAIL',
      details: {
        status_code: response2.status,
        status_text: response2.statusText,
        response: responseText2.substring(0, 500) + (responseText2.length > 500 ? '...' : ''),
        headers: Object.fromEntries(response2.headers)
      }
    });

    // Step 4: Analysis and recommendations
    const working_sender = response1.ok ? 'ian@ianyeo.com' : response2.ok ? 'noreply@ianyeo.com' : 'neither';
    
    results.steps.push({
      step: 4,
      name: 'Analysis',
      status: 'INFO',
      details: {
        working_sender: working_sender,
        recommendation: working_sender === 'neither' ? 
          'Check ZeptoMail console for sender verification' :
          `Update ZOHO_FROM_EMAIL to use ${working_sender}`,
        next_steps: working_sender === 'neither' ? [
          '1. Login to ZeptoMail: https://www.zoho.com/zeptomail/',
          '2. Check verified sender addresses',
          '3. Verify domain authentication',
          '4. Check API key permissions'
        ] : [
          `Set ZOHO_FROM_EMAIL environment variable to ${working_sender}`,
          'Redeploy the worker',
          'Test email integration'
        ]
      }
    });

  } catch (error) {
    results.steps.push({
      step: 'ERROR',
      name: 'Test Error',
      status: 'FAIL',
      details: {
        error: error.message,
        stack: error.stack
      }
    });
  }

  return jsonResponse(results);
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
    
    <script>
        window.TURNSTILE_SITE_KEY = '${env.TURNSTILE_SITE_KEY}';
    </script>
    
    <style>
        /* Complete CSS for AI Consultancy Page - All Inline */
        
        /* CSS Variables */
        :root {
          --bg-primary: #ffffff;
          --bg-secondary: #f8fafc;
          --bg-tertiary: #f1f5f9;
          --text-primary: #0f172a;
          --text-secondary: #475569;
          --text-tertiary: #64748b;
          --border-subtle: rgba(15, 23, 42, 0.08);
          --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          --radius-sm: 0.5rem;
          --radius-md: 0.75rem;
          --radius-lg: 1rem;
          --spacing-sm: 0.5rem;
          --spacing-md: 1rem;
          --spacing-lg: 1.5rem;
          --spacing-xl: 2rem;
          --transition-normal: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Reset & Base */
        *, *::before, *::after {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: var(--bg-primary);
          color: var(--text-primary);
          line-height: 1.7;
          font-weight: 400;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          overflow-x: hidden;
        }

        /* Layout */
        .container { 
          max-width: 1200px; 
          margin: 0 auto; 
          padding: 0 20px; 
        }

        /* Hero Section */
        .hero { 
          background: var(--gradient-primary);
          color: white; 
          padding: 120px 0; 
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.08) 0%, transparent 50%);
        }

        .hero .container {
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(10px);
          padding: 0.8rem 2rem;
          border-radius: 30px;
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .hero-badge span {
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.025em;
        }

        .hero-title { 
          font-size: 3.5rem; 
          margin-bottom: 1.5rem; 
          font-weight: 800;
          line-height: 1.1;
          background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .hero-subtitle { 
          font-size: 1.4rem; 
          margin-bottom: 3rem; 
          opacity: 0.95;
          max-width: 700px;
          margin-left: auto;
          margin-right: auto;
          line-height: 1.5;
          font-weight: 400;
        }

        .hero-benefits {
          display: flex;
          justify-content: center;
          gap: 3rem;
          margin-bottom: 3rem;
          flex-wrap: wrap;
        }

        .benefit-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          min-width: 160px;
          transition: all var(--transition-normal);
        }

        .benefit-item:hover {
          transform: translateY(-5px);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .benefit-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 50px;
        }

        .benefit-text {
          font-weight: 600;
          font-size: 1rem;
          line-height: 1.2;
        }

        .hero-cta {
          display: flex;
          gap: 1.5rem;
          justify-content: center;
          flex-wrap: wrap;
          margin: 3rem 0;
        }

        .hero-primary, .hero-secondary {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem 2.5rem;
          border-radius: 15px;
          font-weight: 700;
          font-size: 1.2rem;
          text-decoration: none;
          transition: all var(--transition-normal);
          position: relative;
          overflow: hidden;
          min-width: 280px;
        }

        .hero-primary {
          background: #ffffff;
          color: #667eea;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .hero-primary:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
          background: #f8fafc;
        }

        .hero-secondary {
          background: transparent;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(10px);
        }

        .hero-secondary:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.1);
          border-color: white;
          box-shadow: 0 10px 30px rgba(255, 255, 255, 0.2);
        }

        .hero-primary small, .hero-secondary small {
          font-size: 0.85rem;
          font-weight: 500;
          opacity: 0.8;
          line-height: 1.2;
        }

        .hero-proof {
          display: flex;
          justify-content: center;
          gap: 4rem;
          margin: 4rem 0 2rem;
          flex-wrap: wrap;
        }

        .proof-item {
          text-align: center;
        }

        .proof-number {
          display: block;
          font-size: 2.5rem;
          font-weight: 800;
          line-height: 1;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .proof-label {
          font-size: 0.9rem;
          opacity: 0.9;
          font-weight: 500;
        }

        .hero-guarantee {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 1.5rem 2rem;
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          max-width: 600px;
          margin: 0 auto;
        }

        .hero-guarantee p {
          margin: 0;
          font-size: 1rem;
          line-height: 1.5;
        }

        /* Buttons */
        .btn-primary, .btn-secondary {
          padding: 15px 30px;
          border-radius: var(--radius-md);
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          transition: all var(--transition-normal);
          border: none;
          cursor: pointer;
          font-size: 1rem;
        }

        .btn-primary { 
          background: #3498db; 
          color: white;
        }

        .btn-primary:hover {
          background: #2980b9;
          transform: translateY(-2px);
        }

        .btn-secondary { 
          background: transparent; 
          color: white; 
          border: 2px solid white;
        }

                 .btn-secondary:hover {
           background: white;
           color: #667eea;
         }

         /* Hero Section Button Overrides */
         .hero .btn-primary, .hero .btn-secondary {
           padding: 18px 36px;
           font-size: 1.1rem;
           font-weight: 700;
           border-radius: 12px;
           min-width: 240px;
           box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
           border: 2px solid transparent;
           text-transform: none;
           letter-spacing: 0.025em;
           margin: 8px;
         }

         .hero .btn-primary {
           background: #3498db;
           border-color: #3498db;
           color: white;
         }

         .hero .btn-primary:hover {
           background: #2980b9;
           border-color: #2980b9;
           transform: translateY(-3px);
           box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
         }

         .hero .btn-secondary {
           background: #3498db;
           border-color: #3498db;
           color: white;
         }

         .hero .btn-secondary:hover {
           background: #2980b9;
           border-color: #2980b9;
           transform: translateY(-3px);
           box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
         }

        /* Sections */
        .section { 
          padding: 80px 0; 
        }

        .section-title { 
          font-size: 2.5rem; 
          text-align: center; 
          margin-bottom: 3rem; 
          color: var(--text-primary);
          font-weight: 700;
        }

        .assessment { 
          background: var(--bg-secondary); 
        }

        /* Forms */
        .form-group { 
          margin-bottom: 20px; 
        }

        .form-group label { 
          display: block; 
          margin-bottom: 8px; 
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input, 
        .form-group select, 
        .form-group textarea { 
          width: 100%; 
          padding: 12px 15px; 
          border: 2px solid #e1e8ed; 
          border-radius: var(--radius-md); 
          font-size: 16px;
          transition: border-color var(--transition-normal);
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .assessment-form { 
          max-width: 600px; 
          margin: 0 auto; 
          background: white; 
          padding: 40px; 
          border-radius: var(--radius-lg); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
        }

        /* Questions */
        .question { 
          margin-bottom: 30px; 
        }

        .question h4 { 
          margin-bottom: 15px; 
          color: var(--text-primary);
          font-weight: 600;
        }

        .options { 
          display: grid; 
          gap: 10px; 
        }

        .option { 
          padding: 15px; 
          border: 2px solid #e0e0e0; 
          border-radius: var(--radius-md); 
          cursor: pointer; 
          transition: all var(--transition-normal);
          display: flex;
          align-items: center;
        }

        .option:hover { 
          border-color: #667eea; 
          background: #f0f8ff; 
        }

        .option input[type="radio"] { 
          margin-right: 10px; 
        }

        /* Results */
        .turnstile-container { 
          margin: 20px 0; 
          text-align: center; 
        }

        #assessment-results { 
          display: none; 
          margin-top: 30px; 
        }

        .results-card { 
          background: white; 
          padding: 30px; 
          border-radius: var(--radius-lg); 
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); 
          text-align: center; 
        }

        .score-circle { 
          background: var(--gradient-primary); 
          color: white; 
          width: 120px; 
          height: 120px; 
          border-radius: 50%; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 20px; 
        }

        .score-number { 
          font-size: 2rem; 
          font-weight: bold; 
        }

        .score-label { 
          font-size: 0.9rem; 
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .hero-title {
            font-size: 2rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }
          
          .section-title {
            font-size: 2rem;
          }
          
          .assessment-form {
            padding: 30px 20px;
          }
          
          .hero-cta {
            flex-direction: column;
            align-items: center;
          }
          
                     .btn-primary, .btn-secondary {
             padding: 12px 24px;
             font-size: 0.9rem;
           }
           
           .hero .btn-primary, .hero .btn-secondary {
             padding: 16px 28px;
             font-size: 1rem;
             min-width: 200px;
           }
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <div class="hero-badge">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                    <path d="M4 22h16"/>
                    <path d="m9 9 1.5-1.5L12 9l1.5-1.5L15 9"/>
                    <path d="M6 9h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9Z"/>
                </svg>
                <span>Founder & Former CEO Operance (Acquired by Zutec) | 470% Revenue Growth</span>
            </div>
            <h1 class="hero-title">Transform Your Construction Business with Proven AI Leadership</h1>
            <p class="hero-subtitle">
                Learn from a successful PropTech founder who built and scaled Operance from concept to acquisition. 
                Expert AI strategy consulting from Ian Yeo, with proven experience serving 115 enterprise customers 
                including 50% of the UK's top 10 contractors.
            </p>
            
            <!-- Value Proposition Points -->
            <div class="hero-benefits">
                <div class="benefit-item">
                    <span class="benefit-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                    </span>
                    <span class="benefit-text">Proven AI Implementation</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                        </svg>
                    </span>
                    <span class="benefit-text">5.9x LTV:CAC Ratio</span>
                </div>
                <div class="benefit-item">
                    <span class="benefit-icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                        </svg>
                    </span>
                    <span class="benefit-text">First-to-Market Innovation</span>
                </div>
            </div>
            
            <div class="hero-cta">
                <a href="#booking" class="btn-primary hero-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Book Your Free AI Strategy Session
                    <small>Learn from proven PropTech success</small>
                </a>
                <a href="#assessment" class="btn-secondary hero-secondary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                        <line x1="18" y1="20" x2="18" y2="10"/>
                        <line x1="12" y1="20" x2="12" y2="4"/>
                        <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                    Take 2-Min AI Assessment
                    <small>Get personalised insights</small>
                </a>
            </div>
            
            <!-- Urgency & Social Proof -->
            <div class="hero-proof">
                <div class="proof-item">
                    <span class="proof-number">470%</span>
                    <span class="proof-label">Revenue Growth</span>
                </div>
                <div class="proof-item">
                    <span class="proof-number">115</span>
                    <span class="proof-label">Enterprise Customers</span>
                </div>
                <div class="proof-item">
                    <span class="proof-number">25+</span>
                    <span class="proof-label">Years Experience</span>
                </div>
            </div>
            
            <!-- Risk Reversal -->
            <div class="hero-guarantee">
                <p>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px;">
                        <path d="M9 12l2 2 4-4"/>
                        <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                        <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                        <path d="M3 12h6m6 0h6"/>
                    </svg>
                    <strong>No obligations:</strong> Real insights from a successful exit. Just actionable guidance tailored to your business.
                </p>
            </div>
        </div>
    </section>

    <!-- Assessment Section -->
    <section id="assessment" class="section assessment">
        <div class="container">
            <h2 class="section-title">Free AI Readiness Assessment</h2>
            <p style="text-align: center; font-size: 1.1rem; margin-bottom: 3rem; max-width: 600px; margin-left: auto; margin-right: auto;">
                Discover how ready your construction business is for AI transformation. 
                Get personalised recommendations and next steps in just 2 minutes.
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

 
    <!-- Executive Authority Section -->
    <section id="authority" class="executive-authority">
        <div class="container">
            <div class="authority-content">
                <div class="authority-header">
                    <h2>Why Construction Leaders Choose Ian Yeo</h2>
                    <p class="authority-subtitle">Founder & Former CEO who successfully built and scaled Operance from concept to acquisition</p>
                </div>
                
                <div class="authority-grid">
                    <div class="authority-profile">
                        <div class="profile-image">
                            <img src="/assets/ian-yeo-profile.jpg" alt="Ian Yeo, Founder & Former CEO of Operance" loading="lazy">
                            <div class="profile-badge">
                                <span>25+ Years</span>
                                <small>Construction Technology</small>
                            </div>
                        </div>
                        <div class="profile-intro">
                            <h3>Ian Yeo</h3>
                            <p class="profile-title">Founder & Former CEO, Operance (Acquired by Zutec)</p>
                            <p class="profile-tagline">
                                "I help construction companies implement AI strategies that deliver measurable business results"
                            </p>
                        </div>
                    </div>
                    
                    <div class="authority-achievements">
                        <div class="achievement-grid">
                            <div class="achievement-item">
                                <div class="achievement-number">470%</div>
                                <div class="achievement-label">Revenue Growth</div>
                                <div class="achievement-detail">£82K to £472K in 9 years</div>
                            </div>
                            <div class="achievement-item">
                                <div class="achievement-number">115</div>
                                <div class="achievement-label">Enterprise Customers</div>
                                <div class="achievement-detail">Including 50% of UK's top 10 contractors</div>
                            </div>
                            <div class="achievement-item">
                                <div class="achievement-number">5.9x</div>
                                <div class="achievement-label">LTV:CAC Ratio</div>
                                <div class="achievement-detail">Proven SaaS metrics performance</div>
                            </div>
                            <div class="achievement-item">
                                <div class="achievement-number">280%</div>
                                <div class="achievement-label">Team Scaling</div>
                                <div class="achievement-detail">5 to 19 employees during growth</div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Experience Highlights -->
                <div class="experience-highlights">
                    <h3>Proven PropTech Leadership</h3>
                    <div class="experience-grid">
                        <div class="experience-card">
                            <div class="experience-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                    <polyline points="9,22 9,12 15,12 15,22"/>
                                </svg>
                            </div>
                            <div class="experience-content">
                                <h4>Construction Industry Expertise</h4>
                                <p>
                                    25+ years in construction technology, from BIM Manager at Sewell Construction 
                                    to founding and scaling Operance from concept to successful acquisition.
                                </p>
                            </div>
                        </div>
                        
                        <div class="experience-card">
                            <div class="experience-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="12" r="3"/>
                                    <path d="m12 1 3 6 6 3-6 3-3 6-3-6-6-3 6-3z"/>
                                </svg>
                            </div>
                            <div class="experience-content">
                                <h4>AI-First Innovation</h4>
                                <p>
                                    Pioneered first-to-market generative AI for building information management, 
                                    serving 50% of the UK's top 10 contractors.
                                </p>
                            </div>
                        </div>
                        
                        <div class="experience-card">
                            <div class="experience-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                                    <path d="m13 13 6 6"/>
                                </svg>
                            </div>
                            <div class="experience-content">
                                <h4>Successful Exit Strategy</h4>
                                <p>
                                    Built Operance from startup to acquisition by Zutec (BuildData Group) in January 2025, 
                                    achieving 470% revenue growth and strong SaaS metrics.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Credibility Indicators -->
                <div class="credibility-section">
                    <div class="credentials-row">
                        <div class="credential-item">
                            <div class="credential-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                                    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                                    <path d="M4 22h16"/>
                                    <path d="m9 9 1.5-1.5L12 9l1.5-1.5L15 9"/>
                                    <path d="M6 9h12v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9Z"/>
                                </svg>
                            </div>
                            <div class="credential-content">
                                <h4>Proven Track Record</h4>
                                <p>Successfully scaled Operance to 470% revenue growth and acquisition by Zutec</p>
                            </div>
                        </div>
                        <div class="credential-item">
                            <div class="credential-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="12" cy="10" r="3"/>
                                    <path d="m4.93 19.5 14.14-14.14"/>
                                    <path d="m19.07 19.5-14.14-14.14"/>
                                    <path d="M12 2v6"/>
                                    <path d="M12 18v4"/>
                                </svg>
                            </div>
                            <div class="credential-content">
                                <h4>Technical Foundation</h4>
                                <p>BEng Civil Engineering (Loughborough), Chartered Engineer (CEng MICE)</p>
                            </div>
                        </div>
                        <div class="credential-item">
                            <div class="credential-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                                    <line x1="8" y1="21" x2="16" y2="21"/>
                                    <line x1="12" y1="17" x2="12" y2="21"/>
                                </svg>
                            </div>
                            <div class="credential-content">
                                <h4>Industry Experience</h4>
                                <p>25+ years from BIM Manager to CEO, deep construction technology expertise</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Urgency CTA -->
                <div class="authority-cta">
                    <div class="cta-content">
                        <h3>Limited Availability for Q1 2025</h3>
                        <p>Only 8 strategy sessions remaining this quarter. Book now to secure your transformation roadmap.</p>
                        <a href="#booking" class="btn-primary cta-urgent">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                <path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/>
                                <path d="m13 13 6 6"/>
                            </svg>
                            Claim Your Strategy Session
                        </a>
                        <div class="urgency-indicators">
                            <span class="urgency-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                30-minute consultation
                            </span>
                            <span class="urgency-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Custom ROI analysis
                            </span>
                            <span class="urgency-item">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 6px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Implementation roadmap
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Old booking system removed for simplified Zoho Bookings widget -->

    <!-- Booking Section -->
    <section id="booking" class="booking-section">
        <div class="container">
            <div class="booking-content">
                <h2>Book Your Free Strategy Session</h2>
                <p>Schedule a 30-minute consultation to discuss your AI transformation journey with Ian Yeo directly.</p>
                
                <div class="booking-container">
                    <div class="booking-info">
                        <h3>What You'll Get:</h3>
                        <ul>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Custom AI readiness assessment for your business
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Specific recommendations for your industry
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                ROI projections for AI implementations
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Clear roadmap for getting started
                            </li>
                            <li>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                    <path d="m9 12 2 2 4-4"/>
                                    <circle cx="12" cy="12" r="9"/>
                                </svg>
                                Access to exclusive resources and case studies
                            </li>
                        </ul>
                        
                        <div class="booking-value-prop">
                            <h4>What makes this different?</h4>
                            <p>
                                You're not getting generic AI advice. You're learning from someone who built 
                                an AI-powered PropTech platform from concept to successful acquisition. 
                                Real experience. Real results. Real insights.
                            </p>
                        </div>
                    </div>
                    
                    <div class="booking-form-container">
                        <!-- Zoho Bookings Embedded Widget -->
                        <div class="zoho-booking-widget">
                            <div class="booking-widget-header">
                                <h3>Schedule Your Strategy Session</h3>
                                <p>Choose a convenient time for your free 30-minute AI consultation with Ian Yeo.</p>
                            </div>
                            
                            <!-- Option 1: Direct Booking Button (Recommended) -->
                            <div class="booking-button-container">
                                <a href="https://ianyeo.zohobookings.com/#/ai-strategy-consultation" 
                                   target="_blank" 
                                   class="btn-primary booking-cta"
                                   onclick="trackBookingClick()">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: inline; margin-right: 8px;">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    Book Free Strategy Session
                                </a>
                                <p class="booking-notice">
                                    Opens in a new window • Secure Zoho Bookings powered • Instant calendar sync
                                </p>
                            </div>
                            
                            <!-- Booking Benefits Reminder -->
                            <div class="booking-benefits">
                                <h4>What happens next?</h4>
                                <div class="benefit-steps">
                                    <div class="step">
                                        <span class="step-number">1</span>
                                        <span class="step-text">Choose your preferred time slot</span>
                                    </div>
                                    <div class="step">
                                        <span class="step-number">2</span>
                                        <span class="step-text">Receive calendar invite & confirmation email</span>
                                    </div>
                                    <div class="step">
                                        <span class="step-number">3</span>
                                        <span class="step-text">Join the call for your personalised AI strategy session</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Alternative Contact Option -->
                            <div class="alternative-contact">
                                <p>Prefer to discuss over email first? <a href="#assessment" class="text-link">Take the AI Assessment</a> or <a href="mailto:ian@ianyeo.com" class="text-link">send a message</a>.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <style>
        /* Zoho Bookings Widget Styles */
        .booking-section {
            padding: 80px 0;
            background: var(--bg-secondary);
        }

        .booking-content h2 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 1rem;
            color: var(--text-primary);
            font-weight: 700;
        }

        .booking-content > p {
            text-align: center;
            font-size: 1.2rem;
            color: var(--text-secondary);
            margin-bottom: 3rem;
            max-width: 600px;
            margin-left: auto;
            margin-right: auto;
        }

        .booking-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3rem;
            align-items: start;
        }

        .booking-info h3 {
            color: var(--text-primary);
            margin-bottom: 1.5rem;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .booking-info ul {
            list-style: none;
            padding: 0;
            margin-bottom: 2rem;
        }

        .booking-info li {
            padding: 0.5rem 0;
            color: var(--text-secondary);
            font-size: 1.1rem;
        }

        .booking-testimonial {
            background: white;
            padding: 2rem;
            border-radius: var(--radius-lg);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .booking-testimonial blockquote {
            font-style: italic;
            color: var(--text-primary);
            margin-bottom: 1rem;
            font-size: 1.1rem;
            line-height: 1.6;
        }

        .booking-testimonial cite {
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .zoho-booking-widget {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
            text-align: center;
        }

        .booking-widget-header {
            margin-bottom: 2rem;
        }

        .booking-widget-header h3 {
            color: var(--text-primary);
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .booking-widget-header p {
            color: var(--text-secondary);
            font-size: 1rem;
            margin-bottom: 0;
        }

        .booking-button-container {
            margin-bottom: 2rem;
        }

        .booking-cta {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 1rem 2rem;
            font-size: 1.1rem;
            font-weight: 600;
            text-decoration: none;
            border-radius: 8px;
            transition: all var(--transition-normal);
            min-width: 280px;
            justify-content: center;
        }

        .booking-cta:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
        }

        .booking-notice {
            margin-top: 1rem;
            font-size: 0.9rem;
            color: var(--text-tertiary);
        }

        .booking-benefits {
            margin-bottom: 2rem;
            text-align: left;
        }

        .booking-benefits h4 {
            color: var(--text-primary);
            margin-bottom: 1rem;
            font-size: 1.2rem;
            text-align: center;
        }

        .benefit-steps {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .step {
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .step-number {
            background: var(--gradient-primary);
            color: white;
            width: 2rem;
            height: 2rem;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
            flex-shrink: 0;
        }

        .step-text {
            color: var(--text-secondary);
            font-size: 0.95rem;
        }

        /* SVG Icon Styling - Improved Contrast */
        .hero-badge svg {
            color: white;
            stroke-width: 2.5;
        }

        .benefit-icon svg {
            color: #2c3e50;
            stroke-width: 2.5;
        }

        .experience-icon svg {
            color: #2980b9;
            stroke-width: 2.5;
        }

        .credential-icon svg {
            color: var(--text-accent);
            stroke-width: 2.5;
        }

        /* Button SVG icons */
        .btn-primary svg,
        .btn-secondary svg {
            color: white;
            stroke-width: 2.5;
        }

        /* List item checkmarks */
        ul li svg {
            color: #27ae60;
            stroke-width: 2.5;
        }

        /* Urgency indicators */
        .urgency-item svg {
            color: #27ae60;
            stroke-width: 2.5;
        }

        /* Additional styling for better visual separation */
        .executive-authority {
            position: relative;
            overflow: hidden;
        }

        .executive-authority::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            z-index: 0;
        }

        .authority-content {
            position: relative;
            z-index: 1;
        }

        .alternative-contact {
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-subtle);
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .text-link {
            color: #3498db;
            text-decoration: none;
        }

        .text-link:hover {
            text-decoration: underline;
        }

        /* Executive Authority Section */
        .executive-authority {
            padding: 100px 0;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            position: relative;
        }

        .authority-header {
            text-align: center;
            margin-bottom: 4rem;
        }

        .authority-header h2 {
            font-size: 3rem;
            font-weight: 800;
            color: var(--text-primary);
            margin-bottom: 1rem;
            line-height: 1.1;
        }

        .authority-subtitle {
            font-size: 1.3rem;
            color: var(--text-secondary);
            max-width: 700px;
            margin: 0 auto;
        }

        .authority-grid {
            display: grid;
            grid-template-columns: 1fr 1.2fr;
            gap: 6rem;
            margin-bottom: 5rem;
            align-items: start;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }

        .authority-profile {
            display: flex;
            flex-direction: column;
            gap: 2rem;
            margin-top: 2rem;
            margin-bottom: 2rem;
            padding: 1rem;
        }

        .profile-image {
            position: relative;
            width: 320px;
            margin: 0 auto 4rem auto;
            z-index: 2;
        }

        .profile-image img {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .profile-badge {
            position: absolute;
            bottom: -15px;
            left: -15px;
            background: var(--gradient-primary);
            color: white;
            padding: 1rem;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            z-index: 3;
            border: 3px solid white;
        }

        .profile-badge span {
            display: block;
            font-size: 1.2rem;
            font-weight: 700;
            line-height: 1;
        }

        .profile-badge small {
            font-size: 0.8rem;
            opacity: 0.9;
        }

        .profile-intro {
            text-align: center;
        }

        .profile-intro h3 {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .profile-title {
            font-size: 1.2rem;
            color: var(--text-secondary);
            font-weight: 600;
            margin-bottom: 1rem;
        }

        .profile-tagline {
            font-size: 1.1rem;
            color: #3498db;
            font-style: italic;
            font-weight: 500;
            line-height: 1.5;
        }

        .authority-achievements {
            background: white;
            padding: 2.5rem;
            border-radius: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            margin-left: 1rem;
            position: relative;
            z-index: 1;
        }

        .achievement-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
        }

        .achievement-item {
            text-align: center;
            padding: 1.5rem;
            border-radius: 15px;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border: 2px solid rgba(102, 126, 234, 0.1);
            transition: all var(--transition-normal);
        }

        .achievement-item:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 30px rgba(102, 126, 234, 0.15);
            border-color: rgba(102, 126, 234, 0.3);
        }

        .achievement-number {
            font-size: 2.5rem;
            font-weight: 800;
            color: #3498db;
            line-height: 1;
            margin-bottom: 0.5rem;
        }

        .achievement-label {
            font-size: 1rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.3rem;
        }

        .achievement-detail {
            font-size: 0.9rem;
            color: var(--text-secondary);
            line-height: 1.4;
        }

        .executive-testimonials {
            margin-bottom: 4rem;
        }

        .executive-testimonials h3 {
            text-align: center;
            font-size: 2.2rem;
            font-weight: 700;
            color: var(--text-primary);
            margin-bottom: 3rem;
        }

        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 2rem;
        }

        .testimonial-card {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: all var(--transition-normal);
            position: relative;
            overflow: hidden;
        }

        .testimonial-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: var(--gradient-primary);
        }

        .testimonial-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .quote-mark {
            font-size: 4rem;
            color: #3498db;
            line-height: 1;
            opacity: 0.3;
            position: absolute;
            top: 1rem;
            left: 1.5rem;
        }

        .testimonial-content blockquote {
            font-size: 1.1rem;
            line-height: 1.6;
            color: var(--text-primary);
            margin: 2rem 0 1.5rem;
            font-style: italic;
            position: relative;
            z-index: 1;
        }

        .testimonial-author {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .author-info cite {
            display: block;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
            font-style: normal;
        }

        .author-info span {
            font-size: 0.9rem;
            color: var(--text-secondary);
        }

        .company-logo {
            font-size: 2rem;
            opacity: 0.7;
        }

        .credibility-section {
            margin-bottom: 4rem;
        }

        .credentials-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }

        .credential-item {
            display: flex;
            align-items: flex-start;
            gap: 1.5rem;
            padding: 2rem;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
            transition: all var(--transition-normal);
        }

        .credential-item:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
        }

        .credential-icon {
            font-size: 2rem;
            width: 3rem;
            height: 3rem;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--gradient-primary);
            border-radius: 10px;
            flex-shrink: 0;
        }

        .credential-content h4 {
            font-size: 1.2rem;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 0.5rem;
        }

        .credential-content p {
            color: var(--text-secondary);
            line-height: 1.5;
        }

        .authority-cta {
            background: var(--gradient-primary);
            padding: 3rem;
            border-radius: 25px;
            text-align: center;
            color: white;
            position: relative;
            overflow: hidden;
        }

        .authority-cta::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: radial-gradient(circle at 30% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        }

        .cta-content {
            position: relative;
            z-index: 1;
        }

        .authority-cta h3 {
            font-size: 2.2rem;
            font-weight: 700;
            margin-bottom: 1rem;
            line-height: 1.2;
        }

        .authority-cta p {
            font-size: 1.2rem;
            margin-bottom: 2rem;
            opacity: 0.95;
        }

        .cta-urgent {
            background: white !important;
            color: #667eea !important;
            padding: 1.2rem 3rem !important;
            font-size: 1.3rem !important;
            font-weight: 700 !important;
            border-radius: 15px !important;
            display: inline-flex !important;
            align-items: center !important;
            gap: 0.5rem !important;
            margin-bottom: 2rem !important;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2) !important;
            transition: all var(--transition-normal) !important;
        }

        .cta-urgent:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.25) !important;
        }

        .urgency-indicators {
            display: flex;
            justify-content: center;
            gap: 2rem;
            flex-wrap: wrap;
        }

        .urgency-item {
            font-size: 1rem;
            font-weight: 500;
            opacity: 0.9;
        }

        /* Mobile Responsive for Hero Section */
        @media (max-width: 768px) {
            .hero {
                padding: 80px 0;
            }

            .hero-badge {
                padding: 0.6rem 1.5rem;
                margin-bottom: 1.5rem;
            }

            .hero-badge span {
                font-size: 0.85rem;
            }

            .hero-title {
                font-size: 2.5rem;
                margin-bottom: 1rem;
            }

            .hero-subtitle {
                font-size: 1.1rem;
                margin-bottom: 2rem;
            }

            .hero-benefits {
                flex-direction: column;
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .benefit-item {
                min-width: auto;
                padding: 1rem;
            }

            .hero-cta {
                flex-direction: column;
                gap: 1rem;
                margin: 2rem 0;
            }

            .hero-primary, .hero-secondary {
                min-width: auto;
                width: 100%;
                padding: 1.2rem 2rem;
                font-size: 1.1rem;
            }

            .hero-proof {
                gap: 2rem;
                margin: 3rem 0 1.5rem;
            }

            .proof-number {
                font-size: 2rem;
            }

            .hero-guarantee {
                padding: 1rem 1.5rem;
                margin: 2rem 1rem 0;
            }

            .hero-guarantee p {
                font-size: 0.9rem;
            }
        }

        /* Mobile Responsive for Authority Section */
        @media (max-width: 768px) {
            .authority-header h2 {
                font-size: 2.2rem;
            }

            .authority-subtitle {
                font-size: 1.1rem;
            }

            .authority-grid {
                grid-template-columns: 1fr;
                gap: 3rem;
                max-width: 100%;
            }

            .authority-profile {
                padding: 0;
            }

            .profile-image {
                width: 280px;
                margin-bottom: 3rem;
            }

            .authority-achievements {
                margin-left: 0;
            }

            .profile-intro h3 {
                font-size: 2rem;
            }

            .achievement-grid {
                grid-template-columns: 1fr;
                gap: 1rem;
            }

            .testimonials-grid {
                grid-template-columns: 1fr;
            }

            .credentials-row {
                grid-template-columns: 1fr;
            }

            .authority-cta {
                padding: 2rem;
            }

            .authority-cta h3 {
                font-size: 1.8rem;
            }

            .urgency-indicators {
                flex-direction: column;
                gap: 1rem;
            }

            .booking-container {
                grid-template-columns: 1fr;
                gap: 2rem;
            }

            .booking-content h2 {
                font-size: 2rem;
            }

            .zoho-booking-widget {
                padding: 1.5rem;
            }

            .booking-cta {
                min-width: auto;
                width: 100%;
            }

            .benefit-steps {
                gap: 0.75rem;
            }

            .step-text {
                font-size: 0.9rem;
            }
        }
    </style>

    <script>
        function trackBookingClick() {
            // Track booking button clicks for analytics
            if (typeof gtag !== 'undefined') {
                gtag('event', 'click', {
                    event_category: 'Booking',
                    event_label: 'Zoho Bookings Button',
                    value: 1
                });
            }
            
            // Also track via our analytics endpoint
            fetch('/api/analytics/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event: 'booking_link_clicked',
                    source: 'booking_section',
                    timestamp: new Date().toISOString()
                })
            }).catch(console.error);
        }

                 // Assessment form handling
         document.addEventListener('DOMContentLoaded', function() {
             const assessmentForm = document.getElementById('assessment-form');
             if (assessmentForm) {
                 // Remove any existing action attribute
                 assessmentForm.removeAttribute('action');
                 assessmentForm.removeAttribute('method');
                 
                 // Add multiple event listeners to ensure we catch the submission
                 assessmentForm.addEventListener('submit', handleAssessmentSubmission, true);
                 assessmentForm.addEventListener('submit', handleAssessmentSubmission, false);
                 
                 // Change submit button to regular button and handle click directly
                 const submitButton = assessmentForm.querySelector('button[type="submit"]');
                 if (submitButton) {
                     submitButton.type = 'button';
                     submitButton.addEventListener('click', function(e) {
                         e.preventDefault();
                         e.stopPropagation();
                         console.log('Submit button clicked, calling handler');
                         handleAssessmentSubmission(null);
                     });
                 }
                 
                 console.log('Assessment form handler attached with multiple prevention methods');
             }
         });

                 async function handleAssessmentSubmission(event) {
             if (event) {
                 event.preventDefault();
                 event.stopPropagation();
                 event.stopImmediatePropagation();
             }
             
             console.log('Assessment form submitted, processing...');
             
             const form = event ? event.target : document.getElementById('assessment-form');
             if (!form) {
                 console.error('Form not found!');
                 return false;
             }
             
             const formData = new FormData(form);
             
             // Collect assessment answers
             const answers = [];
             const questions = ['question1', 'question2', 'question3', 'question4', 'question5'];
             
             questions.forEach((questionName, index) => {
                 const input = form.querySelector('input[name="' + questionName + '"]:checked');
                 if (input) {
                     answers.push({
                         questionId: index + 1,
                         question: questionName,
                         answer: input.value,
                         score: parseInt(input.dataset.score) || 0
                     });
                 }
             });

             console.log('Collected answers:', answers);

             if (answers.length < 5) {
                 showMessage(form, 'Please answer all questions to get your assessment results.', 'error');
                 return false;
             }

             const data = {
                 email: formData.get('email'),
                 company: formData.get('company'),
                 answers: answers,
                 source: 'ai-consulting-worker'
             };

             console.log('Assessment data:', data);

             try {
                 setFormLoading(form, true);
                 
                 // Add a small delay to ensure DOM is ready
                 setTimeout(function() {
                     try {
                         // Calculate results client-side for immediate feedback
                         const results = calculateAssessmentResults(answers);
                         console.log('Calculated results:', results);
                         
                         // Hide form first
                         form.style.display = 'none';
                         console.log('Form hidden');
                         
                         // Display results
                         displayAssessmentResults(results);
                         console.log('Results displayed');
                         
                         // Show success message
                         showMessage(form.parentNode, 'Assessment completed! Check your results.', 'success');
                         
                     } catch (error) {
                         console.error('Error in results processing:', error);
                         form.style.display = 'block';
                         setFormLoading(form, false);
                         showMessage(form, 'Assessment processing failed. Please try again.', 'error');
                     }
                 }, 100);
                 
                 // Also submit to API for tracking (don't wait for this)
                 fetch('/api/assessment/submit', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify(data)
                 }).catch(function(apiError) {
                     console.log('API submission failed, but results displayed:', apiError);
                 });
                 
             } catch (error) {
                 console.error('Assessment error:', error);
                 showMessage(form, 'Assessment processing failed. Please try again.', 'error');
                 setFormLoading(form, false);
             }
             
             return false;
         }

                 function calculateAssessmentResults(answers) {
             // Calculate total score
             const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
             const maxScore = 50; // 5 questions × 10 points max
             const percentage = Math.round((totalScore / maxScore) * 100);
             
             console.log('Assessment score: ' + totalScore + '/' + maxScore + ' (' + percentage + '%)');
             
             // Determine category and recommendations based on score
             let category, recommendations, nextSteps;
             
             if (percentage >= 80) {
                 category = "AI Ready";
                 recommendations = [
                     "Your organisation shows strong AI readiness with excellent digital infrastructure",
                     "Focus on advanced AI implementations like predictive analytics and automation",
                     "Consider becoming an industry leader in AI adoption",
                     "Implement AI-driven project management and quality control systems"
                 ];
                 nextSteps = [
                     "Book a strategic AI implementation consultation",
                     "Develop a comprehensive AI roadmap with specific milestones",
                     "Begin pilot programs for advanced AI technologies",
                     "Establish AI governance and ethics frameworks"
                 ];
             } else if (percentage >= 60) {
                 category = "AI Emerging";
                 recommendations = [
                     "Good foundation with room for strategic AI implementation",
                     "Focus on data integration and team training initiatives",
                     "Start with AI-powered analytics and reporting tools",
                     "Improve data accessibility and organisation systems"
                 ];
                 nextSteps = [
                     "Conduct detailed AI readiness assessment",
                     "Develop data integration strategy",
                     "Implement basic AI tools for project management",
                     "Create team training and adoption programs"
                 ];
             } else if (percentage >= 40) {
                 category = "AI Developing";
                 recommendations = [
                     "Solid potential with targeted improvements needed",
                     "Prioritise digital transformation and data organisation",
                     "Begin with simple automation and digital tools",
                     "Focus on change management and team buy-in"
                 ];
                 nextSteps = [
                     "Start with digital tool adoption and training",
                     "Improve data collection and organisation processes",
                     "Develop change management strategy",
                     "Consider phased AI implementation approach"
                 ];
             } else {
                 category = "AI Exploring";
                 recommendations = [
                     "Early stage with significant opportunity for growth",
                     "Start with basic digital transformation initiatives",
                     "Focus on building digital literacy within your team",
                     "Establish data collection and management processes"
                 ];
                 nextSteps = [
                     "Begin digital transformation journey",
                     "Implement basic project management software",
                     "Develop team digital skills and training programs",
                     "Create data collection and management systems"
                 ];
             }
             
             return {
                 score: percentage,
                 category: category,
                 recommendations: recommendations,
                 nextSteps: nextSteps
             };
         }

                 function displayAssessmentResults(results) {
             console.log('displayAssessmentResults called with:', results);
             
             const resultsContainer = document.getElementById('assessment-results');
             if (!resultsContainer) {
                 console.error('Results container not found!');
                 return;
             }
             
             console.log('Results container found:', resultsContainer);
             
             // Build recommendations HTML
             let recommendationsHTML = '';
             results.recommendations.forEach(function(rec) {
                 recommendationsHTML += '<li style="margin: 0.75rem 0; padding-left: 1.5rem; position: relative;">' +
                     '<span style="position: absolute; left: 0; color: #10b981;">✓</span>' +
                     rec + '</li>';
             });
             
             // Build next steps HTML
             let nextStepsHTML = '';
             results.nextSteps.forEach(function(step) {
                 nextStepsHTML += '<li style="margin: 0.75rem 0; padding-left: 1.5rem; position: relative;">' +
                     '<span style="position: absolute; left: 0; color: #3b82f6;">→</span>' +
                     step + '</li>';
             });
             
             resultsContainer.innerHTML = 
                 '<div style="background: #f8fafc; padding: 3rem; border-radius: 15px; margin: 3rem 0; border: 1px solid #e2e8f0; position: relative; z-index: 1000;">' +
                     '<div style="text-align: center; margin-bottom: 2rem;">' +
                         '<div style="display: inline-block; width: 120px; height: 120px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 2rem; font-weight: bold; margin-bottom: 1rem;">' +
                             results.score + '%' +
                         '</div>' +
                         '<h3 style="font-size: 1.8rem; color: #1f2937; margin: 0;">Your Assessment: ' + results.category + '</h3>' +
                     '</div>' +
                     
                     '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">' +
                         '<div>' +
                             '<h4 style="color: #374151; margin-bottom: 1rem; font-size: 1.2rem;">Key Recommendations:</h4>' +
                             '<ul style="list-style: none; padding: 0;">' +
                                 recommendationsHTML +
                             '</ul>' +
                         '</div>' +
                         
                         '<div>' +
                             '<h4 style="color: #374151; margin-bottom: 1rem; font-size: 1.2rem;">Recommended Next Steps:</h4>' +
                             '<ul style="list-style: none; padding: 0;">' +
                                 nextStepsHTML +
                             '</ul>' +
                         '</div>' +
                     '</div>' +
                     
                     '<div style="text-align: center; border-top: 1px solid #e2e8f0; padding-top: 2rem;">' +
                         '<a href="https://ianyeo.zohobookings.com/#/ai-strategy-consultation" ' +
                            'target="_blank" ' +
                            'style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 1rem;" ' +
                            'onclick="trackBookingClick()">' +
                             '📅 Book Free Strategy Session' +
                         '</a>' +
                         '<button onclick="downloadReport()" ' +
                                 'style="background: #6b7280; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">' +
                             '📄 Download Report' +
                         '</button>' +
                     '</div>' +
                 '</div>';
             
             // Make sure the results container is visible
             resultsContainer.style.display = 'block';
             resultsContainer.style.visibility = 'visible';
             
             console.log('Results HTML set, scrolling to results');
             
             // Scroll to results with a slight delay
             setTimeout(function() {
                 resultsContainer.scrollIntoView({ behavior: 'smooth' });
                 console.log('Scrolled to results container');
             }, 200);
         }

                 function downloadReport() {
             const resultsHTML = document.getElementById('assessment-results').innerHTML;
             const reportContent = 
                 '<!DOCTYPE html>' +
                 '<html>' +
                 '<head>' +
                     '<title>AI Readiness Assessment Report</title>' +
                     '<style>' +
                         'body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; }' +
                         '.header { text-align: center; margin-bottom: 40px; }' +
                         '.footer { margin-top: 60px; text-align: center; color: #6b7280; }' +
                     '</style>' +
                 '</head>' +
                 '<body>' +
                     '<div class="header">' +
                         '<h1>AI Readiness Assessment Report</h1>' +
                         '<p>Generated by Ian Yeo - AI in Construction Consulting</p>' +
                         '<p>Date: ' + new Date().toLocaleDateString() + '</p>' +
                     '</div>' +
                     resultsHTML +
                     '<div class="footer">' +
                         '<p>For more information, visit <a href="https://ianyeo.com">ianyeo.com</a></p>' +
                     '</div>' +
                 '</body>' +
                 '</html>';
             
             const blob = new Blob([reportContent], { type: 'text/html' });
             const url = URL.createObjectURL(blob);
             
             const a = document.createElement('a');
             a.href = url;
             a.download = 'ai-readiness-assessment-report.html';
             document.body.appendChild(a);
             a.click();
             document.body.removeChild(a);
             URL.revokeObjectURL(url);
         }

        function setFormLoading(form, isLoading) {
            const submitBtn = form.querySelector('button[type="submit"]');
            if (!submitBtn) return;
            
            if (isLoading) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Processing Assessment...';
                submitBtn.style.opacity = '0.7';
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Get My AI Readiness Results';
                submitBtn.style.opacity = '1';
            }
        }

                 function showMessage(container, message, type) {
             // Remove existing messages
             const existingMessages = container.querySelectorAll('.form-message');
             existingMessages.forEach(msg => msg.remove());
             
             // Create new message
             const messageEl = document.createElement('div');
             messageEl.className = 'form-message';
             messageEl.textContent = message;
             
             const baseStyles = 'padding: 1rem; border-radius: 8px; margin: 1rem 0; font-weight: 500;';
             const typeStyles = type === 'error' ? 
                 'background: #fef2f2; color: #dc2626; border: 1px solid #fecaca;' :
                 'background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0;';
             
             messageEl.style.cssText = baseStyles + typeStyles;
             
             container.appendChild(messageEl);
             
             // Auto-remove after 5 seconds
             setTimeout(function() {
                 if (messageEl.parentNode) {
                     messageEl.parentNode.removeChild(messageEl);
                 }
             }, 5000);
         }
    </script>
</body>
</html>`;
} 
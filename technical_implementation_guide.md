# AI Consultancy Landing Page - Technical Implementation Guide

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare     │    │   Cloudflare    │
│     Pages       │◄──►│    Workers       │◄──►│      KV         │
│  (Static Site)  │    │  (API Endpoints) │    │  (Database)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare     │    │   External      │
│      R2         │    │    Turnstile     │    │   Services      │
│  (File Storage) │    │  (Bot Protection)│    │ (CRM/Email/Cal) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Infrastructure Setup

### 1. Enhanced Cloudflare Worker Configuration

**File: `wrangler.toml` (Updated)**
```toml
name = "ianyeo-com"
main = "worker.js"
compatibility_date = "2024-01-01"

# KV Namespaces
[[kv_namespaces]]
binding = "REPORT_ACCESS"
id = "your-report-access-namespace-id"

[[kv_namespaces]]
binding = "LEADS_DB"
id = "your-leads-namespace-id"

[[kv_namespaces]]
binding = "ASSESSMENTS_DB"
id = "your-assessments-namespace-id"

[[kv_namespaces]]
binding = "ANALYTICS_DB"
id = "your-analytics-namespace-id"

# R2 Buckets
[[r2_buckets]]
binding = "EXECUTIVE_REPORTS"
bucket_name = "executive-reports"

[[r2_buckets]]
binding = "LEAD_MAGNETS"
bucket_name = "lead-magnets"

# Environment Variables
[env.production.vars]
SITE_URL = "https://ianyeo.com"
ZOHO_FROM_EMAIL = "ian@ianyeo.com"
TURNSTILE_SITE_KEY = "your-turnstile-site-key"
HUBSPOT_PORTAL_ID = "your-hubspot-portal-id"
CALENDLY_API_URL = "https://api.calendly.com/v2"
POSTMARK_API_URL = "https://api.postmarkapp.com"

# Routes
[[routes]]
pattern = "ianyeo.com/api/*"
zone_id = "your-zone-id"

[[routes]]
pattern = "ianyeo.com/ai-construction-consulting"
zone_id = "your-zone-id"
```

### 2. Enhanced Worker Script

**File: `worker.js` (Extended)**
```javascript
// Enhanced Cloudflare Worker for AI Consultancy Landing Page

import { Router } from 'itty-router';

const router = Router();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Utility functions
const generateId = () => crypto.randomUUID();
const getCurrentTimestamp = () => new Date().toISOString();

// Existing executive report endpoint (keeping current functionality)
router.post('/api/request-report', handleReportRequest);
router.get('/api/download-report/:token', handleReportDownload);

// New AI Consultancy endpoints
router.post('/api/leads/capture', handleLeadCapture);
router.post('/api/assessment/submit', handleAssessmentSubmission);
router.get('/api/assessment/results/:token', handleAssessmentResults);
router.post('/api/calendar/book', handleCalendarBooking);
router.get('/api/analytics/track', handleAnalytics);
router.post('/api/email/subscribe', handleEmailSubscription);

// A/B Testing endpoint
router.get('/api/ab-test/:testName', handleABTest);

// Lead scoring and qualification
router.post('/api/leads/score', handleLeadScoring);

// CRM Integration endpoints
router.post('/api/crm/sync', handleCRMSync);

/**
 * Lead Capture Handler
 */
async function handleLeadCapture(request, env) {
  try {
    const data = await request.json();
    
    // Validate Turnstile token
    const turnstileValid = await validateTurnstile(data.turnstileToken, env);
    if (!turnstileValid) {
      return new Response(JSON.stringify({ error: 'Invalid captcha' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
      source: data.source || 'landing-page',
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

    return new Response(JSON.stringify({ 
      success: true, 
      leadId,
      message: 'Thank you! Check your email for next steps.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Lead capture error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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

    return new Response(JSON.stringify({
      success: true,
      assessmentId,
      shareToken,
      results: assessmentResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Assessment error:', error);
    return new Response(JSON.stringify({ error: 'Assessment processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
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
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Calendly booking
    const bookingResult = await createCalendlyBooking(data, env);
    
    if (bookingResult.success) {
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

      return new Response(JSON.stringify({
        success: true,
        meeting: bookingResult.meeting,
        message: 'Meeting booked successfully!'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } else {
      throw new Error('Booking failed');
    }

  } catch (error) {
    console.error('Booking error:', error);
    return new Response(JSON.stringify({ error: 'Booking failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

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

/**
 * CRM Integration (HubSpot)
 */
async function syncToCRM(leadData, env) {
  try {
    const hubspotUrl = `https://api.hubapi.com/crm/v3/objects/contacts`;
    
    const contactData = {
      properties: {
        email: leadData.email,
        firstname: leadData.firstName,
        lastname: leadData.lastName,
        company: leadData.company,
        jobtitle: leadData.jobTitle,
        phone: leadData.phone,
        hs_lead_status: leadData.status,
        lead_score: leadData.leadScore,
        source: leadData.source,
        campaign: leadData.campaign
      }
    };

    const response = await fetch(hubspotUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contactData)
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('CRM sync error:', error);
    // Don't throw - log and continue
  }
}

/**
 * Email Automation
 */
async function triggerEmailSequence(leadData, env) {
  const emailSequence = getEmailSequence(leadData.leadScore);
  
  // Schedule first email immediately
  await sendTransactionalEmail({
    to: leadData.email,
    subject: emailSequence[0].subject,
    templateId: emailSequence[0].templateId,
    variables: {
      firstName: leadData.firstName,
      company: leadData.company,
      leadScore: leadData.leadScore
    }
  }, env);

  // Schedule subsequent emails (would use Cloudflare Durable Objects or external service)
  for (let i = 1; i < emailSequence.length; i++) {
    await scheduleEmail(leadData, emailSequence[i], i, env);
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

  // Send to Google Analytics 4 (Measurement Protocol)
  if (env.GA4_MEASUREMENT_ID && env.GA4_API_SECRET) {
    await sendToGA4(eventName, eventData, env);
  }
}

/**
 * A/B Testing Handler
 */
async function handleABTest(request, env) {
  const testName = request.params.testName;
  const userId = request.headers.get('CF-Connecting-IP') + request.headers.get('User-Agent');
  const userHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  const hashArray = Array.from(new Uint8Array(userHash));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const variant = parseInt(hashHex.slice(0, 2), 16) % 2 === 0 ? 'A' : 'B';

  // Track the assignment
  await trackEvent('ab_test_assignment', { testName, variant }, env);

  return new Response(JSON.stringify({ variant }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Handle preflight requests
router.options('*', () => new Response(null, { headers: corsHeaders }));

// Main request handler
export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx).catch(err => {
      console.error('Worker error:', err);
      return new Response('Internal Server Error', { status: 500 });
    });
  }
};
```

### 3. Frontend Integration

**File: `ai-consulting.js` (New JavaScript for landing page)**
```javascript
// AI Consultancy Landing Page JavaScript

class AIConsultingPage {
  constructor() {
    this.apiBase = '/api';
    this.turnstileSiteKey = window.TURNSTILE_SITE_KEY;
    this.currentTest = {};
    this.sessionId = this.generateSessionId();
    
    this.init();
  }

  async init() {
    // Load A/B tests
    await this.loadABTests();
    
    // Initialize forms
    this.initializeForms();
    
    // Initialize assessment
    this.initializeAssessment();
    
    // Initialize analytics
    this.initializeAnalytics();
    
    // Initialize scroll tracking
    this.initializeScrollTracking();
  }

  async loadABTests() {
    try {
      const tests = ['hero-headline', 'cta-button', 'pricing-display'];
      
      for (const test of tests) {
        const response = await fetch(`${this.apiBase}/ab-test/${test}`);
        const result = await response.json();
        this.currentTest[test] = result.variant;
        this.applyTestVariant(test, result.variant);
      }
    } catch (error) {
      console.error('A/B test loading failed:', error);
    }
  }

  applyTestVariant(testName, variant) {
    const element = document.querySelector(`[data-ab-test="${testName}"]`);
    if (element) {
      element.classList.add(`variant-${variant.toLowerCase()}`);
      element.setAttribute('data-variant', variant);
    }
  }

  initializeForms() {
    // Lead capture form
    const leadForm = document.getElementById('lead-capture-form');
    if (leadForm) {
      leadForm.addEventListener('submit', this.handleLeadCapture.bind(this));
    }

    // Quick assessment form
    const assessmentForm = document.getElementById('assessment-form');
    if (assessmentForm) {
      assessmentForm.addEventListener('submit', this.handleAssessmentSubmission.bind(this));
    }

    // Calendar booking form
    const bookingForm = document.getElementById('booking-form');
    if (bookingForm) {
      bookingForm.addEventListener('submit', this.handleBookingSubmission.bind(this));
    }
  }

  async handleLeadCapture(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Add session and test data
    data.sessionId = this.sessionId;
    data.abTests = this.currentTest;
    data.source = 'ai-consulting-landing';
    
    // Get Turnstile token
    const turnstileToken = await this.getTurnstileToken();
    data.turnstileToken = turnstileToken;

    try {
      this.setFormLoading(form, true);
      
      const response = await fetch(`${this.apiBase}/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess(form, result.message);
        this.trackConversion('lead_captured', data);
        
        // Redirect to thank you page or show next steps
        setTimeout(() => {
          window.location.href = '/thank-you?type=lead';
        }, 2000);
      } else {
        throw new Error(result.error || 'Submission failed');
      }
    } catch (error) {
      console.error('Lead capture error:', error);
      this.showError(form, 'Something went wrong. Please try again.');
    } finally {
      this.setFormLoading(form, false);
    }
  }

  async handleAssessmentSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Collect assessment answers
    const answers = [];
    const questions = form.querySelectorAll('.assessment-question');
    
    questions.forEach((question, index) => {
      const input = question.querySelector('input:checked, select');
      if (input) {
        answers.push({
          questionId: index + 1,
          question: question.querySelector('.question-text').textContent,
          answer: input.value,
          score: input.dataset.score || 0
        });
      }
    });

    const data = {
      email: formData.get('email'),
      company: formData.get('company'),
      answers,
      sessionId: this.sessionId
    };

    try {
      this.setFormLoading(form, true);
      
      const response = await fetch(`${this.apiBase}/assessment/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        this.displayAssessmentResults(result.results);
        this.trackConversion('assessment_completed', { score: result.results.score });
      } else {
        throw new Error(result.error || 'Assessment failed');
      }
    } catch (error) {
      console.error('Assessment error:', error);
      this.showError(form, 'Assessment processing failed. Please try again.');
    } finally {
      this.setFormLoading(form, false);
    }
  }

  displayAssessmentResults(results) {
    const resultsContainer = document.getElementById('assessment-results');
    
    resultsContainer.innerHTML = `
      <div class="results-card">
        <div class="score-circle">
          <span class="score-number">${results.score}</span>
          <span class="score-label">AI Readiness Score</span>
        </div>
        
        <div class="results-content">
          <h3>Your Assessment: ${results.category}</h3>
          
          <div class="recommendations">
            <h4>Key Recommendations:</h4>
            <ul>
              ${results.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
          
          <div class="next-steps">
            <h4>Recommended Next Steps:</h4>
            <ul>
              ${results.nextSteps.map(step => `<li>${step}</li>`).join('')}
            </ul>
          </div>
          
          <div class="cta-buttons">
            <button onclick="window.open('/book-consultation', '_blank')" class="btn-primary">
              Book Strategy Call
            </button>
            <button onclick="aiConsulting.downloadReport()" class="btn-secondary">
              Download Detailed Report
            </button>
          </div>
        </div>
      </div>
    `;
    
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth' });
  }

  initializeAnalytics() {
    // Track page view
    this.trackEvent('page_view', {
      page: 'ai-consulting-landing',
      tests: this.currentTest
    });

    // Track engagement events
    this.trackTimeOnPage();
    this.trackCTAClicks();
    this.trackVideoEngagement();
  }

  trackTimeOnPage() {
    let startTime = Date.now();
    let engagementLevel = 0;

    // Track every 30 seconds
    setInterval(() => {
      engagementLevel++;
      this.trackEvent('engagement', {
        timeOnPage: Date.now() - startTime,
        engagementLevel
      });
    }, 30000);
  }

  trackCTAClicks() {
    document.querySelectorAll('.cta-primary, .cta-secondary').forEach(cta => {
      cta.addEventListener('click', (e) => {
        this.trackEvent('cta_click', {
          ctaText: e.target.textContent.trim(),
          ctaPosition: e.target.dataset.position || 'unknown',
          variant: this.currentTest['cta-button'] || 'A'
        });
      });
    });
  }

  initializeScrollTracking() {
    const sections = document.querySelectorAll('section[id]');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.trackEvent('section_view', {
            section: entry.target.id,
            timestamp: Date.now()
          });
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(section => observer.observe(section));
  }

  async trackEvent(eventName, eventData) {
    try {
      await fetch(`${this.apiBase}/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: eventName,
          data: { ...eventData, sessionId: this.sessionId },
          timestamp: Date.now(),
          url: window.location.href,
          referrer: document.referrer
        })
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  trackConversion(conversionType, data) {
    // Track in internal analytics
    this.trackEvent('conversion', {
      type: conversionType,
      ...data
    });

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        event_category: 'AI Consulting',
        event_label: conversionType,
        value: this.getConversionValue(conversionType)
      });
    }

    // Track in Facebook Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Lead', {
        content_category: 'AI Consulting',
        content_name: conversionType
      });
    }
  }

  getConversionValue(conversionType) {
    const values = {
      'lead_captured': 100,
      'assessment_completed': 250,
      'meeting_booked': 500,
      'proposal_requested': 1000
    };
    return values[conversionType] || 0;
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getTurnstileToken() {
    return new Promise((resolve) => {
      window.turnstile.render('.turnstile-container', {
        sitekey: this.turnstileSiteKey,
        callback: resolve,
        'error-callback': () => resolve(null)
      });
    });
  }

  setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    if (isLoading) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      submitBtn.classList.add('loading');
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.classList.remove('loading');
    }
  }

  showSuccess(form, message) {
    const messageEl = this.createMessage(message, 'success');
    form.parentNode.insertBefore(messageEl, form.nextSibling);
  }

  showError(form, message) {
    const messageEl = this.createMessage(message, 'error');
    form.parentNode.insertBefore(messageEl, form.nextSibling);
  }

  createMessage(text, type) {
    const div = document.createElement('div');
    div.className = `form-message ${type}`;
    div.textContent = text;
    return div;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.aiConsulting = new AIConsultingPage();
});

// Export for module use
export default AIConsultingPage;
```

### 4. Database Schema (Cloudflare KV)

**KV Namespace Structures:**

```javascript
// LEADS_DB structure
{
  "lead_id": {
    "id": "uuid",
    "timestamp": "ISO string",
    "email": "string",
    "firstName": "string",
    "lastName": "string",
    "company": "string",
    "jobTitle": "string",
    "phone": "string",
    "companySize": "enum",
    "industry": "string",
    "challenges": "array",
    "timeline": "enum",
    "budget": "enum",
    "source": "string",
    "campaign": "string",
    "leadScore": "number",
    "status": "enum",
    "ipAddress": "string",
    "userAgent": "string",
    "country": "string",
    "abTests": "object",
    "touchpoints": "array",
    "lastActivity": "ISO string"
  },
  "email:user@example.com": "lead_id"
}

// ASSESSMENTS_DB structure
{
  "assessment_id": {
    "id": "uuid",
    "timestamp": "ISO string",
    "email": "string",
    "company": "string",
    "answers": "array",
    "score": "number",
    "category": "string",
    "recommendations": "array",
    "nextSteps": "array",
    "shareToken": "string"
  },
  "share:token": "assessment_id"
}

// ANALYTICS_DB structure
{
  "event:event_id": {
    "event": "string",
    "timestamp": "ISO string",
    "sessionId": "string",
    "data": "object",
    "userId": "string",
    "page": "string",
    "referrer": "string"
  }
}
```

### 5. Enhanced Security Measures

**Security Configuration:**
```javascript
// Additional security headers
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': `
    default-src 'self';
    script-src 'self' 'unsafe-inline' challenges.cloudflare.com;
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self' https://api.calendly.com https://api.hubspot.com;
    frame-src challenges.cloudflare.com;
  `.replace(/\s+/g, ' ').trim()
};

// Rate limiting
const rateLimiter = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  skipSuccessfulRequests: false
};
```

### 6. Performance Optimizations

**Caching Strategy:**
```javascript
// Cache headers for static assets
const cacheHeaders = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'ETag': 'generate-etag-here'
};

// Service Worker for offline capability
const serviceWorkerConfig = {
  cacheFirst: ['/assets/', '/images/'],
  networkFirst: ['/api/'],
  staleWhileRevalidate: ['/']
};
```

## Deployment & CI/CD

### GitHub Actions Workflow

**File: `.github/workflows/deploy-consulting.yml`**
```yaml
name: Deploy AI Consulting Landing Page

on:
  push:
    branches: [main]
    paths:
      - 'ai-consulting/**'
      - 'worker.js'
      - 'wrangler.toml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build assets
        run: npm run build:consulting
        
      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: production
          
      - name: Deploy Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: ianyeo-com
          directory: dist
```

## Monitoring & Analytics

### Real-time Dashboard

```javascript
// Analytics dashboard data aggregation
async function generateAnalyticsDashboard(env) {
  const last30Days = Date.now() - (30 * 24 * 60 * 60 * 1000);
  
  const metrics = {
    totalLeads: await countLeads(last30Days, env),
    conversionRates: await calculateConversionRates(env),
    leadScoreDistribution: await getLeadScoreDistribution(env),
    assessmentResults: await getAssessmentStats(env),
    abTestResults: await getABTestResults(env),
    topSources: await getTopTrafficSources(env)
  };
  
  return metrics;
}
```

This implementation provides a comprehensive, modern serverless architecture that integrates seamlessly with your existing Cloudflare infrastructure while adding sophisticated lead capture, assessment tools, and analytics capabilities for your AI consultancy offering.
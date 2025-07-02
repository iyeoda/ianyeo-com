// AI Consultancy Landing Page JavaScript

class AIConsultingPage {
  constructor() {
    this.apiBase = '/api';
    this.turnstileSiteKey = window.TURNSTILE_SITE_KEY;
    this.currentTest = {};
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.engagementLevel = 0;
    
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
    
    // Initialize interaction tracking
    this.initializeInteractionTracking();
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

  initializeAssessment() {
    // Add progress tracking to assessment questions
    const questions = document.querySelectorAll('.assessment-question input[type="radio"]');
    questions.forEach(input => {
      input.addEventListener('change', () => {
        this.updateAssessmentProgress();
        this.trackEvent('assessment_question_answered', {
          question: input.name,
          answer: input.value,
          score: input.dataset.score
        });
      });
    });
  }

  updateAssessmentProgress() {
    const totalQuestions = 5;
    const answeredQuestions = document.querySelectorAll('.assessment-question input[type="radio"]:checked').length;
    const progress = (answeredQuestions / totalQuestions) * 100;
    
    // Create or update progress bar
    let progressBar = document.querySelector('.assessment-progress');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.className = 'assessment-progress';
      progressBar.innerHTML = `
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${progress}%"></div>
        </div>
        <p class="progress-text">${answeredQuestions}/${totalQuestions} questions completed</p>
      `;
      
      const form = document.getElementById('assessment-form');
      form.insertBefore(progressBar, form.querySelector('.assessment-questions'));
    } else {
      progressBar.querySelector('.progress-fill').style.width = `${progress}%`;
      progressBar.querySelector('.progress-text').textContent = `${answeredQuestions}/${totalQuestions} questions completed`;
    }
  }

  async handleLeadCapture(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Collect checkbox values
    const challenges = Array.from(form.querySelectorAll('input[name="challenges"]:checked'))
      .map(cb => cb.value);
    data.challenges = challenges;
    
    // Add session and test data
    data.sessionId = this.sessionId;
    data.abTests = this.currentTest;
    data.source = 'ai-consulting-landing';
    data.timeOnPage = Date.now() - this.startTime;
    data.engagementLevel = this.engagementLevel;
    
    // Get Turnstile token
    const turnstileToken = await this.getTurnstileToken();
    if (!turnstileToken) {
      this.showError(form, 'Please complete the security verification.');
      return;
    }
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
        
        // Hide form and show thank you message
        setTimeout(() => {
          form.style.display = 'none';
          this.showThankYouMessage(form.parentNode, 'lead');
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
      const input = question.querySelector('input:checked');
      if (input) {
        answers.push({
          questionId: index + 1,
          question: question.querySelector('.question-text').textContent,
          answer: input.value,
          score: parseInt(input.dataset.score) || 0
        });
      }
    });

    if (answers.length < 5) {
      this.showError(form, 'Please answer all questions to get your assessment results.');
      return;
    }

    const data = {
      email: formData.get('email'),
      company: formData.get('company'),
      answers,
      sessionId: this.sessionId,
      timeOnPage: Date.now() - this.startTime,
      source: 'ai-consulting-landing'
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
        this.trackConversion('assessment_completed', { 
          score: result.results.score,
          category: result.results.category 
        });
        
        // Hide form
        form.style.display = 'none';
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
            <a href="#lead-capture" class="btn-primary cta-primary" data-position="assessment-results">
              Get Free Consultation
            </a>
            <button onclick="aiConsulting.downloadReport()" class="btn-secondary">
              Download Detailed Report
            </button>
          </div>
        </div>
      </div>
    `;
    
    resultsContainer.style.display = 'block';
    resultsContainer.scrollIntoView({ behavior: 'smooth' });

    // Add click handlers for new CTAs
    resultsContainer.querySelector('.cta-primary').addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelector('#lead-capture').scrollIntoView({ behavior: 'smooth' });
      this.trackEvent('cta_click', {
        ctaText: 'Get Free Consultation',
        ctaPosition: 'assessment-results',
        fromAssessment: true,
        assessmentScore: results.score
      });
    });
  }

  downloadReport() {
    this.trackEvent('report_download_requested', {
      source: 'assessment-results'
    });
    
    // Create a simple report download
    const reportContent = this.generateAssessmentReport();
    const blob = new Blob([reportContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-readiness-report.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateAssessmentReport() {
    const resultsCard = document.querySelector('.results-card');
    const score = resultsCard?.querySelector('.score-number')?.textContent || 'N/A';
    const category = resultsCard?.querySelector('h3')?.textContent || 'Assessment Results';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AI Readiness Assessment Report</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          .header { text-align: center; margin-bottom: 40px; }
          .score { font-size: 48px; color: #2563eb; font-weight: bold; }
          .category { font-size: 24px; color: #1f2937; margin: 20px 0; }
          .section { margin: 30px 0; }
          .section h3 { color: #1f2937; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
          ul { padding-left: 20px; }
          li { margin: 10px 0; }
          .footer { margin-top: 60px; text-align: center; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>AI Readiness Assessment Report</h1>
          <div class="score">${score}%</div>
          <div class="category">${category}</div>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="section">
          <h3>About This Assessment</h3>
          <p>This AI readiness assessment evaluates your organization's current state and readiness for artificial intelligence implementation in construction and related industries.</p>
        </div>
        
        <div class="section">
          <h3>Next Steps</h3>
          <p>Based on your results, we recommend scheduling a consultation to discuss a customized AI implementation strategy for your organization.</p>
          <p><strong>Contact:</strong> ian@ianyeo.com</p>
          <p><strong>Website:</strong> ianyeo.com</p>
        </div>
        
        <div class="footer">
          <p>Report generated by Ian Yeo AI Consulting</p>
          <p>For more information, visit <a href="https://ianyeo.com/ai-construction-consulting">ianyeo.com/ai-construction-consulting</a></p>
        </div>
      </body>
      </html>
    `;
  }

  async handleBookingSubmission(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);
    
    // Add session and tracking data
    data.sessionId = this.sessionId;
    data.source = 'ai-consultancy-booking-form';
    data.timeOnPage = Date.now() - this.startTime;
    
    try {
      this.setFormLoading(form, true);
      
      // Try Zoho Bookings first, fallback to calendar booking
      let response;
      try {
        // Get available services
        const servicesResponse = await fetch(`${this.apiBase}/bookings/services`);
        const servicesResult = await servicesResponse.json();
        
        if (servicesResult.success && servicesResult.services?.length > 0) {
          // Use Zoho Bookings API
          const bookingData = {
            service_id: servicesResult.services[0].service_id,
            appointment_date_time: data.preferredTime || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Default to 2 days from now
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            company: data.company,
            phone: data.phone,
            message: data.message
          };
          
          response = await fetch(`${this.apiBase}/bookings/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
          });
        } else {
          throw new Error('No Zoho Bookings services available');
        }
      } catch (zohoError) {
        console.warn('Zoho Bookings not available, using calendar booking:', zohoError.message);
        
        // Fallback to calendar booking
        response = await fetch(`${this.apiBase}/calendar/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...data,
            meetingType: 'AI Strategy Consultation',
            timeSlot: data.preferredTime || 'To be scheduled'
          })
        });
      }

      const result = await response.json();
      
      if (result.success) {
        this.showSuccess(form, result.message || 'Booking request submitted successfully!');
        this.trackConversion('booking_requested', data);
        
        // Hide form and show thank you message
        setTimeout(() => {
          form.style.display = 'none';
          this.showThankYouMessage(form.parentNode, 'booking');
        }, 2000);
      } else {
        throw new Error(result.error || 'Booking failed');
      }
    } catch (error) {
      console.error('Booking submission error:', error);
      this.showError(form, 'Booking failed. Please try again or contact me directly.');
    } finally {
      this.setFormLoading(form, false);
    }
  }

  showThankYouMessage(container, type) {
    const thankYouHtml = `
      <div class="thank-you-message">
        <div class="thank-you-icon">✓</div>
        <h3>Thank You!</h3>
        <p>${type === 'lead' ? 
          'Your consultation request has been submitted. We\'ll be in touch within 24 hours.' : 
          type === 'booking' ?
          'Your booking request has been submitted. You\'ll receive confirmation shortly.' :
          'Your assessment has been completed successfully.'
        }</p>
        <div class="next-steps">
          <h4>What happens next?</h4>
          <ul>
            ${type === 'booking' ? `
              <li>You'll receive an email confirmation with meeting details</li>
              <li>A calendar invite will be sent to your email</li>
              <li>If using Zoho Bookings, your meeting is automatically scheduled</li>
              <li>Prepare any questions about AI implementation for your business</li>
            ` : `
              <li>Check your email for confirmation and next steps</li>
              <li>We'll review your information and prepare a customized approach</li>
              <li>Expect a call or email within 24 hours to schedule your consultation</li>
            `}
          </ul>
        </div>
      </div>
    `;
    
    container.innerHTML = thankYouHtml;
  }

  initializeAnalytics() {
    // Track page view
    this.trackEvent('page_view', {
      page: 'ai-consulting-landing',
      tests: this.currentTest,
      referrer: document.referrer,
      userAgent: navigator.userAgent
    });

    // Track engagement events
    this.trackTimeOnPage();
    this.trackCTAClicks();
    this.trackVideoEngagement();
    this.trackFormFocus();
  }

  trackTimeOnPage() {
    // Track every 30 seconds
    setInterval(() => {
      this.engagementLevel++;
      this.trackEvent('engagement', {
        timeOnPage: Date.now() - this.startTime,
        engagementLevel: this.engagementLevel
      });
    }, 30000);

    // Track when user leaves page
    window.addEventListener('beforeunload', () => {
      this.trackEvent('page_exit', {
        timeOnPage: Date.now() - this.startTime,
        finalEngagementLevel: this.engagementLevel
      });
    });
  }

  trackCTAClicks() {
    document.querySelectorAll('.cta-primary, .cta-secondary').forEach(cta => {
      cta.addEventListener('click', (e) => {
        this.trackEvent('cta_click', {
          ctaText: e.target.textContent.trim(),
          ctaPosition: e.target.dataset.position || 'unknown',
          variant: this.currentTest['cta-button'] || 'A',
          href: e.target.href || e.target.getAttribute('href')
        });
      });
    });
  }

  trackVideoEngagement() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
      video.addEventListener('play', () => {
        this.trackEvent('video_play', { videoId: video.id || 'unknown' });
      });
      
      video.addEventListener('pause', () => {
        this.trackEvent('video_pause', { 
          videoId: video.id || 'unknown',
          currentTime: video.currentTime,
          duration: video.duration
        });
      });
      
      video.addEventListener('ended', () => {
        this.trackEvent('video_complete', { videoId: video.id || 'unknown' });
      });
    });
  }

  trackFormFocus() {
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          this.trackEvent('form_field_focus', {
            formId: form.id,
            fieldName: input.name,
            fieldType: input.type
          });
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
            timestamp: Date.now(),
            timeFromStart: Date.now() - this.startTime
          });
        }
      });
    }, { threshold: 0.5 });

    sections.forEach(section => observer.observe(section));

    // Track scroll depth
    let maxScrollDepth = 0;
    window.addEventListener('scroll', () => {
      const scrolled = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
      if (scrolled > maxScrollDepth) {
        maxScrollDepth = scrolled;
        if (maxScrollDepth % 25 === 0) { // Track at 25%, 50%, 75%, 100%
          this.trackEvent('scroll_depth', {
            depth: maxScrollDepth,
            timeFromStart: Date.now() - this.startTime
          });
        }
      }
    });
  }

  initializeInteractionTracking() {
    // Track clicks on key elements
    document.addEventListener('click', (e) => {
      const target = e.target;
      
      // Track link clicks
      if (target.tagName === 'A') {
        this.trackEvent('link_click', {
          href: target.href,
          text: target.textContent.trim(),
          external: target.hostname !== window.location.hostname
        });
      }
      
      // Track button clicks
      if (target.tagName === 'BUTTON') {
        this.trackEvent('button_click', {
          buttonText: target.textContent.trim(),
          buttonType: target.type,
          formId: target.closest('form')?.id
        });
      }
    });

    // Track mouse movement patterns
    let mouseMovements = 0;
    document.addEventListener('mousemove', () => {
      mouseMovements++;
      if (mouseMovements % 100 === 0) { // Track every 100 movements
        this.trackEvent('mouse_activity', {
          movements: mouseMovements,
          timeFromStart: Date.now() - this.startTime
        });
      }
    });
  }

  async trackEvent(eventName, eventData) {
    try {
      const fullEventData = {
        event: eventName,
        data: { 
          ...eventData, 
          sessionId: this.sessionId,
          timestamp: Date.now(),
          url: window.location.href,
          tests: this.currentTest
        },
        sessionId: this.sessionId,
        url: window.location.href,
        referrer: document.referrer
      };

      await fetch(`${this.apiBase}/analytics/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEventData)
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }
  }

  trackConversion(conversionType, data) {
    // Track in internal analytics
    this.trackEvent('conversion', {
      type: conversionType,
      value: this.getConversionValue(conversionType),
      ...data
    });

    // Track in Google Analytics
    if (typeof gtag !== 'undefined') {
      gtag('event', 'conversion', {
        event_category: 'AI Consulting',
        event_label: conversionType,
        value: this.getConversionValue(conversionType),
        custom_map: {
          custom_parameter_1: data.leadScore || 0,
          custom_parameter_2: conversionType
        }
      });
    }

    // Track in Facebook Pixel
    if (typeof fbq !== 'undefined') {
      fbq('track', 'Lead', {
        content_category: 'AI Consulting',
        content_name: conversionType,
        value: this.getConversionValue(conversionType),
        currency: 'GBP'
      });
    }

    // Track in LinkedIn Insight Tag
    if (typeof lintrk !== 'undefined') {
      lintrk('track', { conversion_id: 'ai_consulting_' + conversionType });
    }
  }

  getConversionValue(conversionType) {
    const values = {
      'lead_captured': 100,
      'assessment_completed': 250,
      'meeting_booked': 500,
      'proposal_requested': 1000,
      'report_downloaded': 50
    };
    return values[conversionType] || 0;
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async getTurnstileToken() {
    return new Promise((resolve) => {
      const container = document.querySelector('.turnstile-container');
      if (!container || !window.turnstile) {
        resolve(null);
        return;
      }

      window.turnstile.render(container, {
        sitekey: this.turnstileSiteKey,
        callback: resolve,
        'error-callback': () => resolve(null),
        theme: 'light',
        size: 'normal'
      });
    });
  }

  setFormLoading(form, isLoading) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) return;
    
    const originalText = submitBtn.dataset.originalText || submitBtn.textContent;
    
    if (isLoading) {
      submitBtn.dataset.originalText = originalText;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';
      submitBtn.classList.add('loading');
      
      // Add loading spinner
      if (!submitBtn.querySelector('.spinner')) {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        spinner.innerHTML = '⚡';
        submitBtn.prepend(spinner);
      }
    } else {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      submitBtn.classList.remove('loading');
      
      // Remove loading spinner
      const spinner = submitBtn.querySelector('.spinner');
      if (spinner) {
        spinner.remove();
      }
    }
  }

  showSuccess(form, message) {
    this.clearMessages(form);
    const messageEl = this.createMessage(message, 'success');
    form.parentNode.insertBefore(messageEl, form.nextSibling);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 5000);
  }

  showError(form, message) {
    this.clearMessages(form);
    const messageEl = this.createMessage(message, 'error');
    form.parentNode.insertBefore(messageEl, form.nextSibling);
    
    // Auto-remove after 8 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, 8000);
  }

  clearMessages(form) {
    const existingMessages = form.parentNode.querySelectorAll('.form-message');
    existingMessages.forEach(msg => {
      if (msg.parentNode) {
        msg.parentNode.removeChild(msg);
      }
    });
  }

  createMessage(text, type) {
    const div = document.createElement('div');
    div.className = `form-message ${type}`;
    div.textContent = text;
    return div;
  }

  // Utility method for smooth scrolling to elements
  scrollToElement(selector, offset = 0) {
    const element = document.querySelector(selector);
    if (element) {
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  // Method to check if user is on mobile
  isMobile() {
    return window.innerWidth <= 768;
  }

  // Method to check if user prefers reduced motion
  prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.aiConsulting = new AIConsultingPage();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AIConsultingPage;
} 
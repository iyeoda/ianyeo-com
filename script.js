// ─────────────────────────────────────────────────────────────
// 1. Enhanced Canvas Animation
// ─────────────────────────────────────────────────────────────
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (!prefersReduced) {
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let animationId;
  
  // Responsive canvas setup
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  // Particle system
  class Particle {
    constructor() {
      this.reset();
      this.y = Math.random() * canvas.height; // Start at random position initially
    }
    
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = -10;
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = Math.random() * 0.5 + 0.2;
      this.radius = Math.random() * 3 + 1;
      this.opacity = Math.random() * 0.5 + 0.3;
      this.life = 1;
      this.decay = Math.random() * 0.01 + 0.005;
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life -= this.decay;
      
      // Reset particle when it goes off screen or fades out
      if (this.y > canvas.height + 10 || this.life <= 0) {
        this.reset();
      }
      
      // Wrap around horizontally
      if (this.x < -10) this.x = canvas.width + 10;
      if (this.x > canvas.width + 10) this.x = -10;
    }
    
    draw() {
      ctx.save();
      ctx.globalAlpha = this.opacity * this.life;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.8)');
      gradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.4)');
      gradient.addColorStop(1, 'rgba(217, 70, 239, 0.1)');
      
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.restore();
    }
  }
  
  // Create particles
  const particles = Array.from({ length: 80 }, () => new Particle());
  
  // Animation loop
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(particle => {
      particle.update();
      particle.draw();
    });
    
    // Draw connections between nearby particles
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150) {
          ctx.save();
          ctx.globalAlpha = (150 - distance) / 150 * 0.2;
          ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    
    animationId = requestAnimationFrame(animate);
  }
  
  animate();
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 2. Intersection Observer for Animations
// ─────────────────────────────────────────────────────────────
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

// Timeline animation
const timelineObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate');
      timelineObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll('.timeline-item').forEach(item => {
  timelineObserver.observe(item);
});

// ─────────────────────────────────────────────────────────────
// 3. Enhanced Metric Counters
// ─────────────────────────────────────────────────────────────
const metricObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateMetric(entry.target);
      metricObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

function animateMetric(element) {
  const target = parseFloat(element.dataset.value);
  const prefix = element.dataset.prefix || '';
  const suffix = element.dataset.suffix || '';
  const valueElement = element.querySelector('.metric-value');
  
  let current = 0;
  const increment = target / 60; // 60 frames for smooth animation
  const duration = 2000; // 2 seconds
  const startTime = performance.now();
  
  function updateValue(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    current = target * easeOutQuart;
    
    // Format the value
    let displayValue = current.toFixed(1).replace(/\.0$/, '');
    valueElement.textContent = prefix + displayValue + suffix;
    
    if (progress < 1) {
      requestAnimationFrame(updateValue);
    } else {
      // Ensure we end with the exact target value
      let finalValue = target.toFixed(1).replace(/\.0$/, '');
      valueElement.textContent = prefix + finalValue + suffix;
    }
  }
  
  requestAnimationFrame(updateValue);
}

document.querySelectorAll('.metric-card').forEach(metric => {
  metricObserver.observe(metric);
});

// ─────────────────────────────────────────────────────────────
// 4. Smooth Scroll Enhancement
// ─────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 5. Dynamic Theme Based on Time
// ─────────────────────────────────────────────────────────────
function setDynamicTheme() {
  const hour = new Date().getHours();
  const isDark = hour < 7 || hour > 19;
  
  if (isDark && !window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.style.setProperty('--bg-primary', '#0a0a0f');
    document.documentElement.style.setProperty('--bg-secondary', '#111118');
  }
}

setDynamicTheme();

// ─────────────────────────────────────────────────────────────
// 6. Performance Monitoring
// ─────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  // Add loaded class for any CSS transitions that depend on page load
  document.body.classList.add('loaded');
  
  // Log performance metrics (for development)
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark('page-interactive');
    
    // Measure from navigation start to interactive
    if (performance.measure) {
      performance.measure('total-load-time', 'navigationStart', 'page-interactive');
    }
  }
});

// ─────────────────────────────────────────────────────────────
// 7. Enhanced Accessibility
// ─────────────────────────────────────────────────────────────

// Add keyboard navigation for card elements
document.querySelectorAll('.metric-card, .contact-card, .skill-tag').forEach(element => {
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      element.click();
    }
  });
});

// Add visual feedback for focus
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    document.body.classList.add('keyboard-navigation');
  }
});

document.addEventListener('mousedown', () => {
  document.body.classList.remove('keyboard-navigation');
});

// ─────────────────────────────────────────────────────────────
// 8. Blog Posts Loading
// ─────────────────────────────────────────────────────────────

// Configuration for blog posts
const BLOG_CONFIG = {
  owner: 'iyeoda',  // Your GitHub username
  repo: 'ianyeo-com',  // Your repository name
  path: 'blog',        // Folder where blog posts are stored
  maxPosts: 3         // Number of posts to show initially
};

async function loadBlogPosts() {
  const blogContainer = document.getElementById('blog-posts');
  
  try {
    // Fetch blog post files from GitHub API
    const response = await fetch(`https://api.github.com/repos/${BLOG_CONFIG.owner}/${BLOG_CONFIG.repo}/contents/${BLOG_CONFIG.path}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    
    const files = await response.json();
    
    // Filter for markdown files and sort by name (assuming date-based naming)
    const markdownFiles = files
      .filter(file => file.name.endsWith('.md') && file.name.toLowerCase() !== 'readme.md')
      .sort((a, b) => b.name.localeCompare(a.name)) // Reverse chronological order
      .slice(0, BLOG_CONFIG.maxPosts);
    
    if (markdownFiles.length === 0) {
      showNoPosts(blogContainer);
      return;
    }
    
    // Fetch content for each post
    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const contentResponse = await fetch(file.download_url);
        const content = await contentResponse.text();
        return parseMarkdownPost(content, file.name);
      })
    );
    
    displayBlogPosts(blogContainer, posts);
    
  } catch (error) {
    console.error('Error loading blog posts:', error);
    showError(blogContainer);
  }
}

function parseMarkdownPost(content, filename) {
  const lines = content.split('\n');
  let frontmatter = {};
  let contentStart = 0;
  
  // Parse frontmatter if it exists
  if (lines[0] === '---') {
    const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line === '---');
    if (frontmatterEnd > 0) {
      const frontmatterLines = lines.slice(1, frontmatterEnd);
      frontmatterLines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
        }
      });
      contentStart = frontmatterEnd + 1;
    }
  }
  
  // Extract content
  const bodyContent = lines.slice(contentStart).join('\n');
  
  // Extract date from filename or frontmatter
  const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
  const date = frontmatter.date || (dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0]);
  
  // Create excerpt from first paragraph
  const excerpt = frontmatter.excerpt || bodyContent
    .replace(/^#+\s+.*/gm, '') // Remove headings
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic
    .split('\n\n')[0]
    .substring(0, 150) + '...';
  
  return {
    title: frontmatter.title || filename.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, ''),
    date: date,
    category: frontmatter.category || 'Insights',
    excerpt: excerpt,
    slug: filename.replace(/\.md$/, ''),
    content: bodyContent
  };
}

function displayBlogPosts(container, posts) {
  container.innerHTML = posts.map(post => `
    <article class="blog-post" data-slug="${post.slug}">
      <div class="blog-meta">
        <div class="blog-date">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect width="18" height="18" x="3" y="4" rx="2" ry="2"/>
            <line x1="16" x2="16" y1="2" y2="6"/>
            <line x1="8" x2="8" y1="2" y2="6"/>
            <line x1="3" x2="21" y1="10" y2="10"/>
          </svg>
          ${formatDate(post.date)}
        </div>
        <span class="blog-category">${post.category}</span>
      </div>
      <h3 class="blog-title">${post.title}</h3>
      <p class="blog-excerpt">${post.excerpt}</p>
      <div class="blog-read-more">
        Read More
        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 8h10m-4-4 4 4-4 4"/>
        </svg>
      </div>
    </article>
  `).join('');
  
  // Store posts data for modal access
  container.posts = posts;
  
  // Add click handlers for blog posts
  container.querySelectorAll('.blog-post').forEach(post => {
    post.addEventListener('click', () => {
      const slug = post.dataset.slug;
      const postData = posts.find(p => p.slug === slug);
      if (postData) {
        openBlogModal(postData);
      }
    });
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Modal functionality
function openBlogModal(post) {
  const modal = document.getElementById('blog-modal');
  const modalCategory = document.getElementById('modal-category');
  const modalDate = document.getElementById('modal-date');
  const modalContent = document.getElementById('modal-content');
  
  modalCategory.textContent = post.category;
  modalDate.textContent = formatDate(post.date);
  modalContent.innerHTML = parseMarkdownToHTML(post.content);
  
  // SEO Enhancement: Update page title and meta description for blog posts
  const originalTitle = document.title;
  const originalDescription = document.querySelector('meta[name="description"]').content;
  
  // Update title for better SEO
  document.title = `${post.title} | Ian Yeo - PropTech CEO`;
  
  // Update meta description
  const metaDescription = document.querySelector('meta[name="description"]');
  metaDescription.content = post.excerpt;
  
  // Update Open Graph tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogTitle) ogTitle.content = post.title;
  if (ogDescription) ogDescription.content = post.excerpt;
  
  // Update Twitter Card tags
  const twitterTitle = document.querySelector('meta[name="twitter:title"]');
  const twitterDescription = document.querySelector('meta[name="twitter:description"]');
  if (twitterTitle) twitterTitle.content = post.title;
  if (twitterDescription) twitterDescription.content = post.excerpt;
  
  // Store original values for restoration
  modal.dataset.originalTitle = originalTitle;
  modal.dataset.originalDescription = originalDescription;
  
  // Track blog post view for SEO analytics
  if (typeof gtag !== 'undefined') {
    gtag('event', 'blog_post_view', {
      event_category: 'content',
      event_label: post.title,
      content_group1: 'Blog',
      content_group2: post.category,
      value: 1
    });
  }
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
  const modal = document.getElementById('blog-modal');
  
  // SEO Enhancement: Restore original meta tags
  if (modal.dataset.originalTitle) {
    document.title = modal.dataset.originalTitle;
  }
  
  if (modal.dataset.originalDescription) {
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription.content = modal.dataset.originalDescription;
    
    // Restore Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogTitle) ogTitle.content = "Ian Yeo – Founder & Former CEO of Operance (Acquired)";
    if (ogDescription) ogDescription.content = modal.dataset.originalDescription;
    
    // Restore Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterTitle) twitterTitle.content = "Ian Yeo – Founder & Former CEO of Operance (Acquired)";
    if (twitterDescription) twitterDescription.content = modal.dataset.originalDescription;
  }
  
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// Modal event listeners
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('blog-modal');
  const closeBtn = document.getElementById('modal-close');
  
  closeBtn.addEventListener('click', closeBlogModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBlogModal();
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeBlogModal();
    }
  });
});

// Simple markdown to HTML parser
function parseMarkdownToHTML(markdown) {
  let html = markdown;
  
  // Remove frontmatter
  html = html.replace(/^---[\s\S]*?---\n/, '');
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
  
  // Bold and italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  
  // Code blocks
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    const code = match.replace(/```\w*\n?/g, '').replace(/```/g, '');
    return `<pre><code>${code}</code></pre>`;
  });
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
  html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
  
  // Paragraphs
  html = html.split('\n\n').map(paragraph => {
    paragraph = paragraph.trim();
    if (!paragraph) return '';
    if (paragraph.startsWith('<h') || paragraph.startsWith('<ul') || 
        paragraph.startsWith('<ol') || paragraph.startsWith('<pre') ||
        paragraph.startsWith('<hr')) {
      return paragraph;
    }
    return `<p>${paragraph}</p>`;
  }).join('\n');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  return html;
}

function showError(container) {
  container.innerHTML = `
    <div class="blog-error">
      <h3>Unable to load posts</h3>
      <p>Please check back later or view posts directly on <a href="https://github.com/${BLOG_CONFIG.owner}/${BLOG_CONFIG.repo}/tree/main/${BLOG_CONFIG.path}" target="_blank" rel="noopener">GitHub</a>.</p>
    </div>
  `;
}

function showNoPosts(container) {
  container.innerHTML = `
    <div class="blog-error">
      <h3>No posts yet</h3>
      <p>Check back soon for insights on technology leadership and industry trends.</p>
    </div>
  `;
}

// Load blog posts when the page loads
document.addEventListener('DOMContentLoaded', loadBlogPosts);

// Initialize all functionality when page loads
document.addEventListener('DOMContentLoaded', () => {
  loadBlogPosts();
  
  // Setup blog modal functionality
  const modal = document.getElementById('blog-modal');
  const closeBtn = document.getElementById('modal-close');
  
  closeBtn.addEventListener('click', closeBlogModal);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeBlogModal();
    }
  });
  
  // Setup all posts modal functionality
  const allPostsBtn = document.getElementById('view-all-posts');
  const allPostsModal = document.getElementById('all-posts-modal');
  const allPostsClose = document.getElementById('all-posts-close');
  
  allPostsBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loadAllPosts();
  });
  
  allPostsClose.addEventListener('click', closeAllPostsModal);
  
  allPostsModal.addEventListener('click', (e) => {
    if (e.target === allPostsModal) {
      closeAllPostsModal();
    }
  });
  
  // Global keyboard event listener for both modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modal.classList.contains('active')) {
        closeBlogModal();
      } else if (allPostsModal.classList.contains('active')) {
        closeAllPostsModal();
      }
    }
  });
});

// All Posts Modal functionality
async function loadAllPosts() {
  const allPostsGrid = document.getElementById('all-posts-grid');
  
  // Show loading state
  allPostsGrid.innerHTML = `
    <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl); color: var(--text-secondary);">
      <div class="loading-spinner" style="margin: 0 auto var(--spacing-md);"></div>
      <p>Loading all posts...</p>
    </div>
  `;
  
  openAllPostsModal();
  
  try {
    // Fetch all blog post files from GitHub API
    const response = await fetch(`https://api.github.com/repos/${BLOG_CONFIG.owner}/${BLOG_CONFIG.repo}/contents/${BLOG_CONFIG.path}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    
    const files = await response.json();
    
    // Filter for markdown files and sort by name (reverse chronological order)
    const markdownFiles = files
      .filter(file => file.name.endsWith('.md') && file.name !== 'README.md')
      .sort((a, b) => b.name.localeCompare(a.name));
    
    if (markdownFiles.length === 0) {
      allPostsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl); color: var(--text-secondary);">
          <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">No posts yet</h3>
          <p>Check back soon for insights on technology leadership and industry trends.</p>
        </div>
      `;
      return;
    }
    
    // Fetch content for each post
    const posts = await Promise.all(
      markdownFiles.map(async (file) => {
        const contentResponse = await fetch(file.download_url);
        const content = await contentResponse.text();
        return parseMarkdownPost(content, file.name);
      })
    );
    
    displayAllPosts(allPostsGrid, posts);
    
  } catch (error) {
    console.error('Error loading all posts:', error);
    allPostsGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-2xl); color: var(--text-secondary);">
        <h3 style="color: var(--text-primary); margin-bottom: var(--spacing-md);">Unable to load posts</h3>
        <p>Please check back later.</p>
      </div>
    `;
  }
}

function displayAllPosts(container, posts) {
  container.innerHTML = posts.map(post => `
    <article class="all-posts-item" data-slug="${post.slug}">
      <div class="all-posts-item-meta">
        <span class="all-posts-item-date">${formatDate(post.date)}</span>
        <span class="all-posts-item-category">${post.category}</span>
      </div>
      <h3 class="all-posts-item-title">${post.title}</h3>
      <p class="all-posts-item-excerpt">${post.excerpt}</p>
      <div class="all-posts-item-read-more">
        Read More
        <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M3 6h6m-2-2 2 2-2 2"/>
        </svg>
      </div>
    </article>
  `).join('');
  
  // Add click handlers for all posts
  container.querySelectorAll('.all-posts-item').forEach(post => {
    post.addEventListener('click', () => {
      const slug = post.dataset.slug;
      const postData = posts.find(p => p.slug === slug);
      if (postData) {
        closeAllPostsModal();
        // Small delay to allow the all posts modal to close before opening the blog modal
        setTimeout(() => openBlogModal(postData), 150);
      }
    });
  });
}

function openAllPostsModal() {
  const modal = document.getElementById('all-posts-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAllPostsModal() {
  const modal = document.getElementById('all-posts-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

// ───────────────────────────────
// Executive Report Modal & Form Handling
// ───────────────────────────────

// Global Turnstile state
let turnstileToken = null;
let turnstileWidgetId = null;

// Turnstile Callbacks (must be global for Cloudflare to call)
window.onTurnstileSuccess = function(token) {
  turnstileToken = token;
  clearTurnstileError();
  console.log('Turnstile verification successful');
};

window.onTurnstileError = function(errorCode) {
  turnstileToken = null;
  showTurnstileError('Verification failed. Please try again.');
  console.error('Turnstile error:', errorCode);
};

window.onTurnstileExpired = function() {
  turnstileToken = null;
  showTurnstileError('Verification expired. Please complete the check again.');
  console.warn('Turnstile token expired');
};

function showTurnstileError(message) {
  // Remove existing error
  const existingError = document.querySelector('.turnstile-error');
  if (existingError) {
    existingError.remove();
  }
  
  // Add new error message
  const turnstileContainer = document.querySelector('.cf-turnstile').parentNode;
  const errorDiv = document.createElement('div');
  errorDiv.className = 'turnstile-error';
  errorDiv.textContent = message;
  turnstileContainer.appendChild(errorDiv);
}

function clearTurnstileError() {
  const existingError = document.querySelector('.turnstile-error');
  if (existingError) {
    existingError.remove();
  }
}

function initializeExecutiveReport() {
  const requestBtn = document.getElementById('request-report-btn');
  const modal = document.getElementById('report-modal');
  const closeBtn = document.getElementById('report-modal-close');
  const cancelBtn = document.getElementById('form-cancel');
  const successCloseBtn = document.getElementById('success-close');
  const form = document.getElementById('report-form');
  
  if (!requestBtn || !modal || !form) return;
  
  // Open modal
  requestBtn.addEventListener('click', () => {
    openReportModal();
  });
  
  // Close modal handlers
  [closeBtn, cancelBtn, successCloseBtn].forEach(btn => {
    if (btn) {
      btn.addEventListener('click', () => {
        closeReportModal();
      });
    }
  });
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeReportModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeReportModal();
    }
  });
  
  // Form submission
  form.addEventListener('submit', handleReportFormSubmission);
  
  // Real-time form validation
  initializeFormValidation();
}

function openReportModal() {
  const modal = document.getElementById('report-modal');
  const formContainer = document.getElementById('report-form');
  const successContainer = document.getElementById('report-success');
  
  // Reset modal state
  formContainer.style.display = 'block';
  successContainer.style.display = 'none';
  
  // Reset form
  document.getElementById('report-form').reset();
  clearFormErrors();
  
  // Reset Turnstile state
  turnstileToken = null;
  clearTurnstileError();
  
  // Reset Turnstile widget if it exists
  if (typeof window.turnstile !== 'undefined') {
    const turnstileElements = document.querySelectorAll('.cf-turnstile');
    turnstileElements.forEach(element => {
      window.turnstile.reset(element);
    });
  }
  
  // Open modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Focus first input
  setTimeout(() => {
    const firstInput = modal.querySelector('input[type="text"], input[type="email"]');
    if (firstInput) firstInput.focus();
  }, 150);
}

function closeReportModal() {
  const modal = document.getElementById('report-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function initializeFormValidation() {
  const form = document.getElementById('report-form');
  const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  
  inputs.forEach(input => {
    // Validate on blur
    input.addEventListener('blur', () => validateField(input));
    
    // Clear errors on input
    input.addEventListener('input', () => clearFieldError(input));
  });
  
  // Email specific validation
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('blur', () => validateEmail(emailInput));
  }
  
  // Phone formatting (optional)
  const phoneInput = document.getElementById('phone');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => formatPhoneNumber(e.target));
  }
}

function validateField(field) {
  const value = field.value.trim();
  const fieldName = field.name;
  
  // Clear previous errors
  clearFieldError(field);
  
  // Required field validation
  if (field.hasAttribute('required') && !value) {
    showFieldError(field, `${getFieldLabel(fieldName)} is required`);
    return false;
  }
  
  // Specific validations
  if (fieldName === 'email' && value) {
    return validateEmail(field);
  }
  
  if (fieldName === 'firstName' || fieldName === 'lastName') {
    if (value && value.length < 2) {
      showFieldError(field, 'Name must be at least 2 characters');
      return false;
    }
  }
  
  if (fieldName === 'company' && value && value.length < 2) {
    showFieldError(field, 'Company name must be at least 2 characters');
    return false;
  }
  
  return true;
}

function validateEmail(emailField) {
  const email = emailField.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (email && !emailRegex.test(email)) {
    showFieldError(emailField, 'Please enter a valid email address');
    return false;
  }
  
  return true;
}

function formatPhoneNumber(phoneField) {
  let value = phoneField.value.replace(/\D/g, '');
  
  // Format based on length (basic international support)
  if (value.length >= 10) {
    // UK format: +44 7XXX XXX XXX
    if (value.startsWith('44') && value.length <= 13) {
      value = value.replace(/(\d{2})(\d{4})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
    }
    // US format: (XXX) XXX-XXXX
    else if (value.length === 10) {
      value = value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
    }
    // International format: +X XXX XXX XXXX
    else if (value.length > 10) {
      value = '+' + value;
    }
  }
  
  phoneField.value = value;
}

function showFieldError(field, message) {
  clearFieldError(field);
  
  field.classList.add('error');
  field.style.borderColor = '#ef4444';
  
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.style.cssText = `
    color: #ef4444;
    font-size: 0.75rem;
    margin-top: 4px;
    font-weight: 500;
  `;
  errorDiv.textContent = message;
  
  field.parentNode.appendChild(errorDiv);
}

function clearFieldError(field) {
  field.classList.remove('error');
  field.style.borderColor = '';
  
  const existingError = field.parentNode.querySelector('.field-error');
  if (existingError) {
    existingError.remove();
  }
}

function clearFormErrors() {
  const form = document.getElementById('report-form');
  const errors = form.querySelectorAll('.field-error');
  const errorFields = form.querySelectorAll('.error');
  
  errors.forEach(error => error.remove());
  errorFields.forEach(field => {
    field.classList.remove('error');
    field.style.borderColor = '';
  });
}

function getFieldLabel(fieldName) {
  const labels = {
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    phone: 'Phone Number',
    company: 'Company/Organization',
    title: 'Job Title',
    role: 'Role/Interest',
    interest: 'Specific Interest',
    message: 'Additional Details',
    consent: 'Consent'
  };
  
  return labels[fieldName] || fieldName;
}

async function handleReportFormSubmission(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = document.getElementById('form-submit');
  const submitText = submitBtn.querySelector('.submit-text');
  const submitLoading = submitBtn.querySelector('.submit-loading');
  
  // Validate all fields
  const isValid = validateForm(form);
  if (!isValid) {
    // Scroll to first error
    const firstError = form.querySelector('.error');
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstError.focus();
    }
    return;
  }
  
  // Show loading state
  submitBtn.disabled = true;
  submitText.style.display = 'none';
  submitLoading.style.display = 'flex';
  
  try {
    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Add timestamp and additional metadata
    data.timestamp = new Date().toISOString();
    data.userAgent = navigator.userAgent;
    data.referrer = document.referrer;
    
    // Add Turnstile token for server-side verification
    data['cf-turnstile-response'] = turnstileToken;
    
    // Determine API URL based on environment
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isLocalhost ? 'http://localhost:8787/api/request-report' : '/api/request-report';
    
    // Submit to Cloudflare Worker
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccessMessage();
      
      // Track successful submission (if analytics available)
      if (typeof gtag !== 'undefined') {
        gtag('event', 'executive_report_request', {
          event_category: 'engagement',
          event_label: data.role,
          value: 1
        });
      }
    } else {
      throw new Error(result.error || 'Submission failed');
    }
    
  } catch (error) {
    console.error('Form submission error:', error);
    showSubmissionError(error.message);
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitText.style.display = 'inline';
    submitLoading.style.display = 'none';
  }
}

function validateForm(form) {
  const requiredFields = form.querySelectorAll('input[required], select[required], textarea[required]');
  let isValid = true;
  
  requiredFields.forEach(field => {
    if (!validateField(field)) {
      isValid = false;
    }
  });
  
  // Special validation for consent checkbox
  const consentField = document.getElementById('consent');
  if (consentField && !consentField.checked) {
    showFieldError(consentField, 'You must agree to the terms to continue');
    isValid = false;
  }
  
  // Validate Turnstile completion
  if (!turnstileToken) {
    showTurnstileError('Please complete the security verification to continue.');
    isValid = false;
  }
  
  return isValid;
}

function showSuccessMessage() {
  const formContainer = document.getElementById('report-form');
  const successContainer = document.getElementById('report-success');
  
  formContainer.style.display = 'none';
  successContainer.style.display = 'block';
  
  // Scroll to top of modal
  const modalContent = document.querySelector('.report-modal-content');
  modalContent.scrollTop = 0;
}

function showSubmissionError(message) {
  // Create or update error message
  let errorDiv = document.querySelector('.form-submission-error');
  
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'form-submission-error';
    errorDiv.style.cssText = `
      background: #fef2f2;
      border: 1px solid #fca5a5;
      color: #dc2626;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      line-height: 1.5;
    `;
    
    const formActions = document.querySelector('.form-actions');
    formActions.parentNode.insertBefore(errorDiv, formActions);
  }
  
  errorDiv.innerHTML = `
    <strong>Submission Error:</strong> ${message}
    <br><small>Please try again, or contact ian@ianyeo.com directly if the problem persists.</small>
  `;
  
  // Scroll error into view
  errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeExecutiveReport();
});
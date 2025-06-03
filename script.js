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
  
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeBlogModal() {
  const modal = document.getElementById('blog-modal');
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
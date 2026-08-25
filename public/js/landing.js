/**
 * PHOENIX — Premium Landing Page Animation & Interaction Controller
 * Features: Responsive Snappy Scrolling, Dark/Light Theme Switching, GSAP, Video Modal
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. Ultra-Smooth Synchronized Scrolling (Lenis + GSAP Ticker)
  // --------------------------------------------------------------------------
  let lenis = null;
  if (typeof window.Lenis !== 'undefined') {
    try {
      lenis = new window.Lenis({
        duration: 1.1,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease out
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.05,
        touchMultiplier: 1.8,
        infinite: false
      });

      // Synchronize Lenis with GSAP ScrollTrigger ticker for buttery 60fps
      if (typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined') {
        lenis.on('scroll', window.ScrollTrigger.update);

        window.gsap.ticker.add((time) => {
          lenis.raf(time * 1000);
        });

        window.gsap.ticker.lagSmoothing(0);
      } else {
        function raf(time) {
          lenis.raf(time);
          requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);
      }
    } catch (e) {
      console.warn('[PHOENIX] Lenis initialization note:', e);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Dark / Light Mode Theme Toggle
  // --------------------------------------------------------------------------
  const themeToggleBtn = document.getElementById('phThemeToggle');

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'dark';
  }

  function setTheme(newTheme) {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('phoenix_theme', newTheme);
    // Dispatch custom event for 3D globe / canvas re-theming
    window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: newTheme } }));
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = getCurrentTheme();
      const nextTheme = current === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  // --------------------------------------------------------------------------
  // 3. Navbar Glassmorphism on Scroll
  // --------------------------------------------------------------------------
  const navbar = document.getElementById('phNavbar');
  const handleNavScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 30) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // --------------------------------------------------------------------------
  // 4. Mobile Navigation Drawer Toggle
  // --------------------------------------------------------------------------
  const mobileToggle = document.getElementById('phMobileToggle');
  const mobileDrawer = document.getElementById('phMobileDrawer');

  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileToggle.setAttribute('aria-expanded', isOpen);
    });

    mobileDrawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // --------------------------------------------------------------------------
  // 5. Smooth Anchor Scrolling for Internal Links
  // --------------------------------------------------------------------------
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const offsetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - 75;
        if (lenis) {
          lenis.scrollTo(offsetTop, { duration: 0.8 });
        } else {
          window.scrollTo({ top: offsetTop, behavior: 'smooth' });
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // 6. GSAP Hero Entrance Sequence
  // --------------------------------------------------------------------------
  if (typeof window.gsap !== 'undefined') {
    const gsap = window.gsap;
    const heroTl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });

    heroTl
      .from('.ph-navbar', { y: -30, opacity: 0, duration: 0.6 })
      .from('[data-hero-el="badge"]', { opacity: 0, y: 15 }, '-=0.3')
      .from('[data-hero-el="heading"] .ph-word', {
        opacity: 0,
        y: 30,
        stagger: 0.06,
        duration: 0.8
      }, '-=0.4')
      .from('[data-hero-el="tagline"]', { opacity: 0, y: 15 }, '-=0.5')
      .from('[data-hero-el="desc"]', { opacity: 0, y: 15 }, '-=0.5')
      .from('[data-hero-el="cta"]', { opacity: 0, y: 15 }, '-=0.4')
      .from('[data-hero-el="trust"]', { opacity: 0, y: 15 }, '-=0.4')
      .from('.ph-floating-node', { opacity: 0, scale: 0.6, stagger: 0.1, duration: 0.6 }, '-=0.5');
  }

  // --------------------------------------------------------------------------
  // 7. Timeline Scroll Progress & Active Step Highlighting
  // --------------------------------------------------------------------------
  const timelineContainer = document.getElementById('phTimelineContainer');
  const timelineBar = document.getElementById('phTimelineBar');
  const timelineItems = document.querySelectorAll('.ph-timeline-item');

  if (timelineContainer && timelineBar && timelineItems.length > 0) {
    const updateTimelineProgress = () => {
      const rect = timelineContainer.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const start = rect.top;
      const totalHeight = rect.height;

      if (start < windowHeight * 0.75) {
        const progress = Math.min(1, Math.max(0, (windowHeight * 0.75 - start) / totalHeight));
        timelineBar.style.height = `${progress * 100}%`;
      }

      timelineItems.forEach((item) => {
        const itemRect = item.getBoundingClientRect();
        if (itemRect.top < windowHeight * 0.7) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    };

    window.addEventListener('scroll', updateTimelineProgress, { passive: true });
    updateTimelineProgress();
  }

  // --------------------------------------------------------------------------
  // 8. Video Showcase Modal Controller
  // --------------------------------------------------------------------------
  const playBtn = document.getElementById('phPlayBtn');
  const posterWrap = document.getElementById('phVideoPosterWrap');
  const videoModal = document.getElementById('phVideoModal');
  const modalClose = document.getElementById('phModalClose');
  const modalBackdrop = document.getElementById('phModalBackdrop');
  const mainVideo = document.getElementById('phMainVideo');

  function openVideoModal() {
    if (!videoModal) return;
    videoModal.classList.add('active');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (mainVideo) {
      mainVideo.play().catch(() => {});
    }
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('active');
    videoModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (mainVideo) {
      mainVideo.pause();
      mainVideo.currentTime = 0;
    }
  }

  if (playBtn) playBtn.addEventListener('click', openVideoModal);
  if (posterWrap) posterWrap.addEventListener('click', (e) => {
    if (e.target !== playBtn && !playBtn.contains(e.target)) {
      openVideoModal();
    }
  });

  if (modalClose) modalClose.addEventListener('click', closeVideoModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeVideoModal);

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoModal && videoModal.classList.contains('active')) {
      closeVideoModal();
    }
  });

  // --------------------------------------------------------------------------
  // 9. How It Works Steps Progress Line
  // --------------------------------------------------------------------------
  const stepsWrapper = document.getElementById('phStepsWrapper');
  const stepsFill = document.getElementById('phStepsFill');

  if (stepsWrapper && stepsFill) {
    const updateStepsProgress = () => {
      const rect = stepsWrapper.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      if (rect.top < windowHeight * 0.8) {
        const progress = Math.min(1, Math.max(0, (windowHeight * 0.8 - rect.top) / rect.height));
        stepsFill.style.width = `${progress * 100}%`;
      }
    };
    window.addEventListener('scroll', updateStepsProgress, { passive: true });
    updateStepsProgress();
  }

  // --------------------------------------------------------------------------
  // 10. Community Statistics Number Counter Animation
  // --------------------------------------------------------------------------
  const counters = document.querySelectorAll('.ph-counter');
  let countersAnimated = false;

  const animateCounters = () => {
    if (countersAnimated) return;
    counters.forEach((counter) => {
      const target = parseInt(counter.getAttribute('data-target'), 10) || 0;
      const duration = 1600;
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(1, elapsed / duration);
        const easeVal = 1 - (1 - progress) * (1 - progress);
        const currentCount = Math.floor(easeVal * target);

        counter.textContent = currentCount.toLocaleString();

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          counter.textContent = target.toLocaleString();
        }
      };

      requestAnimationFrame(updateCount);
    });
    countersAnimated = true;
  };

  const communitySection = document.getElementById('community');
  if (communitySection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounters();
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(communitySection);
  } else {
    animateCounters();
  }

  // --------------------------------------------------------------------------
  // 11. Live Network Activity Feed
  // --------------------------------------------------------------------------
  const feedBody = document.getElementById('phLiveFeedBody');
  const sampleEvents = [
    { badge: 'badge-web', domain: 'WEB DEV', text: '<strong>Vikram R.</strong> submitted milestone deliverable for <em>MBM Hostel Automation</em>' },
    { badge: 'badge-ai', domain: 'AI / ML', text: '<strong>New Project:</strong> <em>Smart Attendance Face Recognition</em> posted' },
    { badge: 'badge-ui', domain: 'UI / UX', text: '<strong>Neha S.</strong> updated portfolio with <em>FinTech Dashboard Design</em>' },
    { badge: 'badge-app', domain: 'APP DEV', text: '<strong>Karan T.</strong> accepted project for <em>MBM Library Booking App</em>' },
    { badge: 'badge-video', domain: 'VIDEO', text: '<strong>Club Sprint:</strong> <em>Phoenix Orientation Reel 2026</em> in review' }
  ];

  if (feedBody) {
    let eventIndex = 0;
    setInterval(() => {
      const ev = sampleEvents[eventIndex % sampleEvents.length];
      eventIndex++;

      const item = document.createElement('div');
      item.className = 'ph-feed-item ph-feed-new';
      item.innerHTML = `
        <span class="ph-feed-time">JUST NOW</span>
        <span class="ph-feed-badge ${ev.badge}">${ev.domain}</span>
        <span class="ph-feed-text">${ev.text}</span>
      `;

      feedBody.insertBefore(item, feedBody.firstChild);

      while (feedBody.children.length > 5) {
        feedBody.removeChild(feedBody.lastChild);
      }
    }, 5000);
  }

  // --------------------------------------------------------------------------
  // 12. Final CTA Particle Canvas
  // --------------------------------------------------------------------------
  const ctaCanvas = document.getElementById('phCtaCanvas');
  if (ctaCanvas) {
    const ctx = ctaCanvas.getContext('2d');
    let width = ctaCanvas.width = ctaCanvas.offsetWidth;
    let height = ctaCanvas.height = ctaCanvas.offsetHeight;

    const particles = [];
    const count = window.innerWidth < 768 ? 30 : 60;

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 1.8 + 0.6
      });
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, width, height);

      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      const lineColor = isLight ? 'rgba(2, 132, 199, ' : 'rgba(56, 189, 248, ';
      const dotColor = isLight ? 'rgba(2, 132, 199, 0.6)' : 'rgba(56, 189, 248, 0.5)';

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.strokeStyle = `${lineColor}${0.18 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.fillStyle = dotColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(drawParticles);
    };

    window.addEventListener('resize', () => {
      if (!ctaCanvas) return;
      width = ctaCanvas.width = ctaCanvas.offsetWidth;
      height = ctaCanvas.height = ctaCanvas.offsetHeight;
    });

    drawParticles();
  }
});

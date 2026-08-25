/**
 * PHOENIX - Client-Side JavaScript
 * MBM University Student Freelancing Platform & Club
 */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  if (navToggle && navMenu) {
    navToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (event) => {
      if (!navToggle.contains(event.target) && !navMenu.contains(event.target)) {
        navMenu.classList.remove('open');
      }
    });

    // Close menu on link click
    navMenu.querySelectorAll('.nav-link, .btn').forEach((link) => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
      });
    });
  }

  // Admin Mobile Sidebar Toggle
  const sidebarToggle = document.getElementById('sidebarToggle');
  const adminSidebar = document.getElementById('adminSidebar');

  if (sidebarToggle && adminSidebar) {
    sidebarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      adminSidebar.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
      if (!sidebarToggle.contains(event.target) && !adminSidebar.contains(event.target)) {
        adminSidebar.classList.remove('open');
      }
    });
  }

  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      alert.style.opacity = '0';
      alert.style.transform = 'translateY(-10px)';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  });
});

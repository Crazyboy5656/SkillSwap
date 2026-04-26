/**
 * Shared navigation: highlight the active bottom-nav item
 * and wire up logout buttons.
 *
 * Active state is driven by per-page <style id="nav-active-style"> blocks
 * injected into each page's <head>, targeting [data-nav-id="..."] directly.
 * nav.js additionally toggles .nav-active as a CSS class for any JS-driven needs.
 */
import { store } from './state.js?v=2';
import { signOut } from './auth.js?v=2';

// Map page filename → nav tab id
const PAGE_NAV = {
  'home.html':          'nav-home',
  'search.html':        'nav-search',
  'listings.html':      'nav-search',
  'create.html':        'nav-create',
  'request.html':       'nav-create',
  'chat.html':          'nav-messages',
  'profile.html':       'nav-profile',
  'notifications.html': 'nav-notif',
};

function activateNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const activeId = PAGE_NAV[page];
  if (!activeId) return;

  document.querySelectorAll('[data-nav-id]').forEach(el => {
    const isActive = el.dataset.navId === activeId;
    el.classList.toggle('nav-active', isActive);
  });
}

// Wire logout links
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-action="logout"]')) {
    e.preventDefault();
    signOut();
  }
});

// Update bell badge from store
store.subscribe(({ unread }) => {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.textContent = unread > 99 ? '99+' : unread;
  badge.hidden = unread === 0;
});

activateNav();

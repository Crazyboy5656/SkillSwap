// ─── HTML escape ─────────────────────────────────────────────────────────────
export function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Toast notifications ──────────────────────────────────────────────────────
let toastContainer = null;
function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

function showToast(message, type = 'info') {
  const colors = {
    info: 'bg-white border-primary text-on-surface',
    success: 'bg-white border-green-500 text-green-700',
    error: 'bg-white border-red-500 text-red-700',
    warning: 'bg-white border-yellow-500 text-yellow-700',
  };
  const icons = { info: 'info', success: 'check_circle', error: 'error', warning: 'warning' };
  const container = getToastContainer();

  const el = document.createElement('div');
  el.className = `flex items-center gap-3 px-4 py-3 rounded-2xl border-l-4 shadow-lg font-body-sm backdrop-blur-md transition-all duration-300 ${colors[type]}`;
  el.innerHTML = `
    <span class="material-symbols-outlined text-[20px]">${icons[type]}</span>
    <span class="flex-1">${esc(message)}</span>
    <button class="material-symbols-outlined text-[16px] opacity-50 hover:opacity-100" onclick="this.closest('.flex').remove()">close</button>
  `;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

export const toast = {
  info: (msg) => showToast(msg, 'info'),
  success: (msg) => showToast(msg, 'success'),
  error: (msg) => showToast(msg, 'error'),
  warning: (msg) => showToast(msg, 'warning'),
};

// ─── Loading spinner ──────────────────────────────────────────────────────────
export function setLoading(btn, loading) {
  if (!btn) return;
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function createModal(contentHtml, opts = {}) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4';
  modal.innerHTML = `
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" id="modal-backdrop"></div>
    <div class="relative bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl z-10 transform transition-all">
      ${contentHtml}
    </div>
  `;
  document.body.appendChild(modal);
  modal.querySelector('#modal-backdrop').addEventListener('click', () => modal.remove());
  if (opts.onClose) {
    modal.dataset.onClose = 'true';
  }
  return {
    el: modal,
    close: () => modal.remove(),
  };
}

// ─── Star rating renderer ─────────────────────────────────────────────────────
export function renderStars(rating, max = 5) {
  return Array.from({ length: max }, (_, i) => {
    const filled = i < Math.round(rating);
    return `<span class="material-symbols-outlined text-[14px] ${filled ? 'text-yellow-500' : 'text-slate-300'}" style="font-variation-settings:'FILL' ${filled ? 1 : 0}">star</span>`;
  }).join('');
}

// ─── Relative time ─────────────────────────────────────────────────────────────
export function relativeTime(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'Şimdi';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} g`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

// ─── Format date ──────────────────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('tr-TR', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  });
}

// ─── Avatar fallback ──────────────────────────────────────────────────────────
export function avatarUrl(profile) {
  if (profile?.avatar_url) return esc(profile.avatar_url);
  const name = esc(profile?.display_name || profile?.handle || '?');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=128`;
}

// ─── Empty state HTML helper ──────────────────────────────────────────────────
export function emptyStateHTML(icon, title, subtitle, actionHref, actionLabel) {
  return `
    <div class="flex flex-col items-center justify-center text-center py-12 gap-3 fade-in">
      <span class="material-symbols-outlined text-6xl text-outline opacity-50">${esc(icon)}</span>
      <h3 class="font-headline-md text-on-surface">${esc(title)}</h3>
      <p class="font-body-sm text-on-surface-variant max-w-xs">${esc(subtitle)}</p>
      ${actionHref ? `<a href="${esc(actionHref)}" class="mt-2 px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl shadow">${esc(actionLabel || 'Başla')}</a>` : ''}
    </div>`;
}

// ─── Skeleton row helper ──────────────────────────────────────────────────────
export function skeletonRows(count = 3, height = 'h-24') {
  return Array.from({ length: count }, () => `<div class="skeleton ${height} rounded-3xl"></div>`).join('');
}

// ─── Category color map ───────────────────────────────────────────────────────
export const CAT_COLORS = {
  muzik: 'bg-tertiary-container',
  yazilim: 'bg-primary-container',
  tasarim: 'bg-secondary-container',
  spor: 'bg-green-500',
  dil: 'bg-orange-400',
  sanat: 'bg-pink-500',
  matematik: 'bg-indigo-600',
  diger: 'bg-surface-container-highest text-on-surface-variant',
};

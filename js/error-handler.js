/**
 * Global error handler — catches unhandled Promise rejections and JS errors
 * and shows a non-intrusive toast instead of silently failing.
 */
import { toast } from './ui.js';

window.addEventListener('unhandledrejection', (event) => {
  const err = event.reason;
  if (err?.message === 'unauthenticated') return; // handled by auth-guard
  if (err?.message?.includes('Failed to fetch')) {
    toast.error('Bağlantı hatası. İnternet bağlantını kontrol et.');
  } else if (err?.message) {
    console.error('[SkillSwap] Unhandled error:', err);
  }
  event.preventDefault();
});

window.addEventListener('error', (event) => {
  if (event.error?.message === 'unauthenticated') return;
  console.error('[SkillSwap] JS Error:', event.error);
});

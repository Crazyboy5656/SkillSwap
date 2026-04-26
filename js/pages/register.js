// register.js — completely self-contained, no top-level await that could block listener registration

import { supabase } from '/js/supabase-client.js?v=2';

// ─── Grab elements ────────────────────────────────────────────────────────────
const form       = document.getElementById('register-form');
const nameInput  = document.getElementById('input-name');
const emailInput = document.getElementById('input-email');
const pwInput    = document.getElementById('input-password');
const pw2Input   = document.getElementById('input-confirm');
const submitBtn  = document.getElementById('btn-register-submit');

// ─── Toast (inline, no external deps that could fail) ────────────────────────
function showMsg(msg, isError = false) {
  // Try the shared toast system first
  try {
    const container = document.getElementById('_toast') || (() => {
      const el = document.createElement('div');
      el.id = '_toast';
      el.style.cssText = 'position:fixed;top:16px;right:16px;z-index:9999;display:flex;flex-direction:column;gap:8px;max-width:320px;';
      document.body.appendChild(el);
      return el;
    })();
    const t = document.createElement('div');
    t.style.cssText = `padding:12px 16px;border-radius:16px;font-size:14px;font-weight:600;box-shadow:0 4px 20px rgba(0,0,0,.12);color:#fff;background:${isError ? '#dc2626' : '#16a34a'};display:flex;align-items:center;gap:8px;`;
    t.innerHTML = `<span>${isError ? '⚠️' : '✅'}</span><span>${msg}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4500);
  } catch (e) {
    alert(msg);
  }
}

// ─── Toggle password visibility ───────────────────────────────────────────────
function makeToggle(btnId, inputEl) {
  document.getElementById(btnId)?.addEventListener('click', () => {
    inputEl.type = inputEl.type === 'password' ? 'text' : 'password';
    const icon = document.querySelector(`#${btnId} .material-symbols-outlined`);
    if (icon) icon.textContent = inputEl.type === 'password' ? 'visibility' : 'visibility_off';
  });
}
makeToggle('toggle-pw1', pwInput);
makeToggle('toggle-pw2', pw2Input);

// ─── Redirect if already logged in ───────────────────────────────────────────
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) location.replace('/home');
});

// ─── Form submit ──────────────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const displayName = nameInput?.value?.trim() || '';
  const email       = emailInput?.value?.trim() || '';
  const password    = pwInput?.value || '';
  const confirm     = pw2Input?.value || '';

  // Validation
  if (!displayName) return showMsg('Kullanıcı adı gerekli.', true);
  if (!email)       return showMsg('E-posta gerekli.', true);
  if (!password)    return showMsg('Şifre gerekli.', true);
  if (password.length < 6) return showMsg('Şifre en az 6 karakter olmalı.', true);
  if (password !== confirm) return showMsg('Şifreler eşleşmiyor.', true);

  // Disable button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Kaydediliyor…';

  const handle = displayName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 20)
               + Math.floor(Math.random() * 9000 + 1000);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName, handle } },
  });

  submitBtn.disabled = false;
  submitBtn.innerHTML = 'Kaydol <span class="material-symbols-outlined text-[20px]">rocket_launch</span>';

  if (error) {
    console.error('signUp error:', error);
    showMsg('Kayıt başarısız: ' + error.message, true);
    return;
  }

  // Supabase may or may not require email confirmation
  if (data?.user?.identities?.length === 0) {
    showMsg('Bu e-posta zaten kayıtlı. Giriş yap!', true);
    setTimeout(() => location.href = '/login', 2000);
    return;
  }

  showMsg('Kayıt başarılı! E-postanı doğrula veya giriş yap.');
  setTimeout(() => location.href = '/login', 2200);
});

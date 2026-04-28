import { supabase } from '/js/supabase-client.js?v=3';

// Redirect if already logged in — .then() keeps this non-blocking so the
// submit listener below is always attached synchronously.
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) location.replace('/home');
});

// ─── Elements ─────────────────────────────────────────────────────────────────
const form       = document.getElementById('login-form');
const emailInput = document.getElementById('input-email-login');
const pwInput    = document.getElementById('input-pw-login');
const submitBtn  = form?.querySelector('button[type="submit"]');

// ─── Inline toast ─────────────────────────────────────────────────────────────
function showMsg(msg, isError = false) {
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
  setTimeout(() => t.remove(), 5000);
}

// ─── Toggle password visibility ───────────────────────────────────────────────
document.getElementById('toggle-pw-login')?.addEventListener('click', () => {
  if (!pwInput) return;
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
  const icon = document.querySelector('#toggle-pw-login .material-symbols-outlined');
  if (icon) icon.textContent = pwInput.type === 'password' ? 'visibility' : 'visibility_off';
});

// ─── Form submit ──────────────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = emailInput?.value?.trim() || '';
  const password = pwInput?.value || '';

  if (!email || !password) {
    showMsg('E-posta ve şifre gereklidir.', true);
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Giriş yapılıyor…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  submitBtn.disabled = false;
  submitBtn.innerHTML = '<span>Giriş yap</span><span class="material-symbols-outlined text-[20px]">arrow_forward</span>';

  if (error) {
    let detail = error.message;
    if (detail === 'Failed to fetch' || /failed to fetch/i.test(detail)) {
      detail =
        'Ağ hatası (Supabase’e ulaşılamadı). Vercel’de Environment Variables: SUPABASE_URL ve SUPABASE_ANON_KEY tanımlı mı? Deploy’u yenile. Veya js/config.js gerçek URL ve anon key içeriyor mu? (Tarayıcı geliştirici araçları → Ağ: engellenen istek / CORS yok).';
    }
    showMsg('Giriş başarısız: ' + detail, true);
  } else {
    showMsg('Giriş başarılı! Yönlendiriliyorsunuz…');
    // Check onboarding status before redirecting
    setTimeout(async () => {
      try {
        const uid = data.user?.id;
        const r = await fetch(
          `${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=onboarded&limit=1`,
          { headers: { apikey: window.SUPABASE_ANON_KEY, Authorization: `Bearer ${data.session.access_token}`, Accept: 'application/json' } }
        );
        const rows = await r.json().catch(() => []);
        const onboarded = rows?.[0]?.onboarded;
        location.replace(onboarded ? '/home' : '/onboarding');
      } catch {
        location.replace('/home');
      }
    }, 800);
  }
});

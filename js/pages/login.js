import { supabase, isSupabaseConfigured } from '/js/supabase-client.js?v=5';
import { getProfile } from '/js/api.js?v=4';

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

  if (!isSupabaseConfigured()) {
    showMsg(
      'Supabase ayarlı değil. .env.local + `node scripts/inject-config.js` (yukarıdaki gerekirse Vercel env).',
      true,
    );
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
    setTimeout(async () => {
      try {
        const uid = data.user?.id;
        if (!uid) {
          location.replace('/onboarding');
          return;
        }
        const { data: prof, error } = await getProfile(uid);
        if (error || !prof) {
          location.replace('/onboarding');
          return;
        }
        location.replace(prof.onboarded ? '/home' : '/onboarding');
      } catch (e) {
        console.warn('post-login redirect:', e);
        location.replace('/onboarding');
      }
    }, 500);
  }
});

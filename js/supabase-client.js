// supabase-js is loaded as a UMD bundle via <script> in each HTML page.
// window.supabase is set by that bundle; we just wrap it here.
const { createClient } = window.supabase;

const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR-REF.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

/** Gerçek Supabase URL + anon JWT yoksa auth/API çağrıları “Failed to fetch” verir. */
export function isSupabaseConfigured() {
  const url = String(window.SUPABASE_URL || '').trim();
  const key = String(window.SUPABASE_ANON_KEY || '').trim();
  if (!url.startsWith('https://') || !key) return false;
  if (/YOUR-REF|YOUR_PROJECT|placeholder|x\.supabase\.co/i.test(url)) return false;
  if (key === 'YOUR_ANON_KEY' || key === 'k' || key.length < 80) return false;
  if (!key.startsWith('eyJ')) return false;
  return true;
}

if (typeof window !== 'undefined' && !isSupabaseConfigured()) {
  console.error(
    '[SkillSwap] Supabase ayarı eksik veya hatalı. Yerelde: projede `SUPABASE_URL` ve `SUPABASE_ANON_KEY` ile `node scripts/inject-config.js` çalıştır (js/config.js üretir). Vercel: Environment Variables + Redeploy. Sayfa file:// ile açıksa http://localhost kullan.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

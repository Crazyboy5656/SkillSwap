// supabase-js is loaded as a UMD bundle via <script> in each HTML page.
// window.supabase is set by that bundle; we just wrap it here.
const { createClient } = window.supabase;

const SUPABASE_URL = window.SUPABASE_URL || 'https://YOUR-REF.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

if (typeof window !== 'undefined' && (SUPABASE_URL.includes('YOUR-REF') || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY' || !window.SUPABASE_URL)) {
  console.error(
    '[SkillSwap] Supabase ayarı eksik. Yerelde: js/config.js kopyala. Vercel: Project → Settings → Environment Variables → SUPABASE_URL ve SUPABASE_ANON_KEY, sonra Redeploy.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

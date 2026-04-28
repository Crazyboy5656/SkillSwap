import { supabase } from '/js/supabase-client.js?v=3';
import { sendPasswordReset } from '/js/auth.js?v=2';
import { toast, setLoading } from '/js/ui.js?v=2';

// Wire form immediately — no auth check needed before attaching listener
const form = document.querySelector('form');
const submitBtn = form?.querySelector('button[type="submit"]');

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = form.querySelector('input[type="email"]')?.value?.trim();
  if (!email) return toast.error('E-posta adresi gereklidir.');

  setLoading(submitBtn, true);
  const { error } = await sendPasswordReset(email);
  setLoading(submitBtn, false);

  if (error) {
    toast.error('Hata: ' + error.message);
  } else {
    toast.success('Şifre sıfırlama bağlantısı gönderildi!');
    setTimeout(() => location.replace('/login'), 3000);
  }
});

// Non-blocking redirect if already logged in
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) location.replace('/home');
});

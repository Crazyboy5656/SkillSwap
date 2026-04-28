import { supabase } from '/js/supabase-client.js?v=3';
import { updatePassword } from '/js/auth.js?v=2';
import { toast, setLoading } from '/js/ui.js?v=2';

supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    wireForm();
  }
});

// Also try immediately in case the session was already recovered
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) wireForm();
});

function wireForm() {
  const form = document.querySelector('form');
  const submitBtn = form?.querySelector('button[type="submit"]') || form?.querySelector('button');

  document.querySelectorAll('[data-action="toggle-password"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.closest('.relative')?.querySelector('input');
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = input.type === 'password' ? 'visibility' : 'visibility_off';
    });
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const passwords = form.querySelectorAll('input[type="password"]');
    const newPass   = passwords[0]?.value || '';
    const confirm   = passwords[1]?.value || '';

    if (newPass.length < 8) return toast.error('Şifre en az 8 karakter olmalı.');
    if (newPass !== confirm) return toast.error('Şifreler eşleşmiyor.');

    setLoading(submitBtn, true);
    const { error } = await updatePassword(newPass);
    setLoading(submitBtn, false);

    if (error) {
      toast.error('Hata: ' + error.message);
    } else {
      toast.success('Şifren güncellendi!');
      setTimeout(() => location.replace('/home'), 2000);
    }
  });
}

import { supabase } from '/js/supabase-client.js?v=4';
import { getListing, sendMatchRequest, reportUser, blockUser } from '/js/api.js?v=4';
import { initNotifications } from '/js/realtime.js?v=2';
import { toast, setLoading, esc, avatarUrl, renderStars } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  const userId = session.user.id;
  initNotifications(userId).catch(e => console.warn("Notifications:", e));

  const params = new URLSearchParams(location.search);
  const listingId = params.get('id');

  const { data: listing, error } = await getListing(listingId);
  if (error || !listing) {
    toast.error('İlan bulunamadı.');
    setTimeout(() => location.replace('/listings'), 1500);
    return;
  }

  const p = listing.profile;

  const titleEl       = document.getElementById('listing-title');
  const tutorNameEl   = document.getElementById('listing-tutor-name');
  const descEl        = document.getElementById('listing-description');
  const tutorAvatarEl = document.getElementById('tutor-avatar');
  const tutorNameEl2  = document.getElementById('tutor-name');
  const tutorRatingEl = document.getElementById('tutor-rating');
  const btnProfile    = document.getElementById('btn-view-profile');
  const joinBtn       = document.getElementById('btn-join');

  const displayName = p?.display_name || p?.handle || '—';
  const modeLabel   = listing.mode === 'online' ? '🌐 Online' : listing.mode === 'in_person' ? '📍 Yüz yüze' : '✨ Her ikisi';

  // Hero card
  if (titleEl)      titleEl.textContent = listing.title || listing.skill?.name || '—';
  if (tutorNameEl)  tutorNameEl.textContent = displayName + ' tarafından';
  if (tutorAvatarEl) tutorAvatarEl.src = avatarUrl(p);

  const heroCat  = document.getElementById('hero-category');
  const heroMode = document.getElementById('hero-mode');
  if (heroCat)  heroCat.textContent  = listing.skill?.category?.name || '—';
  if (heroMode) heroMode.textContent = modeLabel;

  // Description
  if (descEl) descEl.textContent = listing.description || 'Açıklama eklenmemiş.';

  // Tutor card below
  if (tutorNameEl2)  tutorNameEl2.textContent = displayName;
  if (tutorRatingEl) tutorRatingEl.innerHTML = `${renderStars(p?.tutor_rating || 0)} (${p?.tutor_reviews_count || 0} Yorum)`;

  // Bento grid — dates, times, frequency, mode
  const fmtDate = s => s ? new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
  const datesEl = document.getElementById('listing-dates');
  const timesEl = document.getElementById('listing-times');
  const freqEl  = document.getElementById('listing-freq');
  const modeEl  = document.getElementById('listing-mode');

  if (datesEl) {
    const from = fmtDate(listing.available_from);
    const to   = fmtDate(listing.available_to);
    datesEl.textContent = from && to ? `${from} → ${to}` : 'Belirtilmemiş';
  }
  if (timesEl) {
    const ts = listing.available_time_start?.slice(0, 5);
    const te = listing.available_time_end?.slice(0, 5);
    timesEl.textContent = ts && te ? `${ts} – ${te}` : 'Belirtilmemiş';
  }
  if (freqEl) freqEl.textContent = listing.weekly_sessions ? `Haftada ${listing.weekly_sessions} kez` : 'Belirtilmemiş';
  if (modeEl) modeEl.textContent = modeLabel;

  btnProfile?.addEventListener('click', () => {
    if (p?.handle) location.href = `/profile?u=${encodeURIComponent(p.handle)}`;
  });

  const reportBtn = document.getElementById('btn-report');
  reportBtn?.addEventListener('click', async () => {
    if (listing.profile?.id === userId) return;
    const reason = prompt('Şikayet nedeninizi kısaca belirtin:');
    if (!reason?.trim()) return;
    const { error: repErr } = await reportUser(listing.profile.id, reason.trim());
    if (repErr) toast.error(repErr.message);
    else toast.success('Şikayetiniz alındı.');
  });

  if (listing.profile?.id === userId) {
    if (joinBtn) { joinBtn.textContent = 'Kendi İlanın'; joinBtn.disabled = true; joinBtn.classList.add('opacity-50'); }
  }

  joinBtn?.addEventListener('click', async () => {
    if (listing.profile?.id === userId) return;

    setLoading(joinBtn, true);
    const { error: reqError } = await sendMatchRequest(listing.profile.id, listingId);
    setLoading(joinBtn, false);

    if (reqError) {
      if (reqError.code === '23505') toast.info('Bu ilana zaten başvurdun.');
      else toast.error('Hata: ' + reqError.message);
    } else {
      toast.success('Başvurun iletildi! İlan sahibi yanıtladığında haberdar edileceksin. 🎉');
      joinBtn.textContent = 'Başvuru Gönderildi ✓';
      joinBtn.disabled = true;
    }
  });
}

init().catch(err => console.error('listing init error:', err));

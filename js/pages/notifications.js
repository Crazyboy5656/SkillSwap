import { supabase } from '/js/supabase-client.js?v=4';
import { getNotifications, markNotificationRead, markAllNotificationsRead,
         getIncomingRequests, respondMatchRequest, getMySessions,
         createReview } from '/js/api.js?v=4';
import { initNotifications } from '/js/realtime.js?v=2';
import { store } from '/js/state.js?v=2';
import { toast, esc, relativeTime, avatarUrl, createModal } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

let myId = null;

const notifList      = document.getElementById('notif-list');
const requestsList   = document.getElementById('requests-list');
const requestSection = document.getElementById('requests-section');
const markAllBtn     = document.getElementById('btn-mark-all');

markAllBtn?.addEventListener('click', async () => {
  await markAllNotificationsRead();
  store.set({ unread: 0 });
  document.querySelectorAll('.notif-unread').forEach(el => el.classList.remove('notif-unread', 'bg-indigo-50/40'));
  toast.success('Tüm bildirimler okundu.');
});

const NOTIF_ICONS = {
  match_request:    { icon: 'group_add',       color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  match_accepted:   { icon: 'handshake',        color: 'text-green-600',   bg: 'bg-green-50' },
  match_rejected:   { icon: 'person_remove',    color: 'text-red-500',     bg: 'bg-red-50' },
  new_message:      { icon: 'chat',             color: 'text-purple-600',  bg: 'bg-purple-50' },
  session_proposed: { icon: 'event',            color: 'text-blue-600',    bg: 'bg-blue-50' },
  session_confirmed:{ icon: 'event_available',  color: 'text-green-600',   bg: 'bg-green-50' },
  review_received:  { icon: 'star',             color: 'text-yellow-500',  bg: 'bg-yellow-50' },
};
const NOTIF_LABELS = {
  match_request:    'İlanına yeni bir başvuru var',
  match_accepted:   'Başvurun kabul edildi! Mesajlaşmaya başlayabilirsiniz.',
  match_rejected:   'Başvurun reddedildi.',
  new_message:      'Yeni mesajın var',
  session_proposed: 'Seans önerisi aldın',
  session_confirmed:'Seansin onaylandı!',
  review_received:  'Yeni bir değerlendirme aldın',
};

async function loadMatchRequests() {
  const { data: requests } = await getIncomingRequests();
  if (!requests?.length) return;
  if (requestSection) requestSection.classList.remove('hidden');
  if (!requestsList) return;
  requestsList.innerHTML = '';
  requests.forEach(req => {
    const p = req.from_profile;
    const listingName = req.listing?.skill?.name || req.listing?.title || '—';
    const el = document.createElement('div');
    el.className = 'glass-card p-4 rounded-2xl border border-indigo-100 shadow-sm space-y-3';
    el.innerHTML = `
      <div class="flex items-center gap-3">
        <img src="${avatarUrl(p)}" class="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 cursor-pointer active:scale-95 transition-transform"
             alt="${esc(p?.display_name)}" onclick="location.href='/profile?u=${esc(p?.handle)}'"/>
        <div class="flex-grow min-w-0 cursor-pointer" onclick="location.href='/profile?u=${esc(p?.handle)}'">
          <h3 class="font-label-md text-on-surface hover:text-primary transition-colors">${esc(p?.display_name || p?.handle)}</h3>
          <p class="font-body-sm text-outline text-[12px]">
            İlanınıza başvurdu: <strong>${esc(listingName)}</strong>
          </p>
        </div>
      </div>
      <div class="flex gap-2">
        <button class="flex-1 h-10 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl btn-accept">✓ Kabul Et</button>
        <button class="flex-1 h-10 border-2 border-red-200 text-red-500 font-label-md rounded-xl btn-reject">✗ Reddet</button>
      </div>`;
    el.querySelector('.btn-accept').addEventListener('click', async () => {
      const { data, error } = await supabase.rpc('accept_match_request', { p_request_id: req.id });
      if (error) return toast.error(error.message);
      toast.success('Başvuru kabul edildi! 🎉');
      el.remove();
      if (data) setTimeout(() => location.href = `/chat?match=${data}`, 800);
    });
    el.querySelector('.btn-reject').addEventListener('click', async () => {
      const { error } = await respondMatchRequest(req.id, 'rejected');
      if (error) return toast.error(error.message);
      toast.info('İstek reddedildi.');
      el.remove();
    });
    requestsList.appendChild(el);
  });
}

async function loadNotifications() {
  const { data: notifs } = await getNotifications(50);
  if (!notifList) return;
  if (!notifs?.length) {
    notifList.innerHTML = `
      <div class="text-center py-12 space-y-2">
        <span class="material-symbols-outlined text-5xl text-outline">notifications_none</span>
        <p class="text-on-surface-variant">Henüz bildirim yok.</p>
      </div>`;
    return;
  }
  notifList.innerHTML = '';
  notifs.forEach(n => {
    const meta = NOTIF_ICONS[n.type] || { icon: 'info', color: 'text-outline', bg: 'bg-surface-container' };
    const label = NOTIF_LABELS[n.type] || n.type;
    const el = document.createElement('div');
    el.className = `flex items-start gap-3 p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer transition-all hover:-translate-y-0.5 ${n.read ? 'bg-white' : 'bg-indigo-50/40 notif-unread'}`;
    el.dataset.notifId = n.id;
    el.innerHTML = `
      <div class="w-10 h-10 flex-shrink-0 rounded-full ${meta.bg} flex items-center justify-center">
        <span class="material-symbols-outlined text-[20px] ${meta.color}" style="font-variation-settings:'FILL' 1;">${meta.icon}</span>
      </div>
      <div class="flex-grow min-w-0">
        <p class="font-label-md text-on-surface">${esc(label)}</p>
        <p class="font-body-sm text-outline text-[12px] mt-0.5">${relativeTime(n.created_at)}</p>
      </div>
      ${!n.read ? '<span class="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></span>' : ''}
    `;
    el.addEventListener('click', async () => {
      if (!n.read) {
        await markNotificationRead(n.id);
        el.classList.remove('bg-indigo-50/40', 'notif-unread');
        el.querySelector('.bg-primary.rounded-full')?.remove();
        store.set({ unread: Math.max(0, store.get().unread - 1) });
      }
      const payload = n.payload || {};
      if (n.type === 'match_accepted' && payload.match_id) location.href = `/chat?match=${payload.match_id}`;
      else if (n.type === 'new_message' && payload.match_id) location.href = `/chat?match=${payload.match_id}`;
      else if ((n.type === 'session_proposed' || n.type === 'session_confirmed') && payload.match_id) location.href = `/chat?match=${payload.match_id}`;
      else if (n.type === 'review_received') location.href = '/profile';
    });
    notifList.appendChild(el);
  });
}

async function checkCompletedSessions() {
  const { data: sessions } = await getMySessions();
  const completed = (sessions || []).filter(s => s.status === 'completed');
  if (!completed.length) return;

  for (const s of completed) {
    const revieweeId = s.tutor_id === myId ? s.learner_id : s.tutor_id;
    const role       = s.tutor_id === myId ? 'as_tutor' : 'as_student';
    const reviewee   = s.tutor_id === myId ? s.learner : s.tutor;

    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('session_id', s.id)
      .eq('reviewer_id', myId)
      .maybeSingle();
    if (existing) continue;

    showReviewModal(s, revieweeId, reviewee, role);
    break;
  }
}

function showReviewModal(session, revieweeId, reviewee, role) {
  let selectedRating = 0;
  const modal = createModal(`
    <h2 class="font-headline-md text-on-surface mb-1">Seans Tamamlandı! ⭐</h2>
    <p class="font-body-sm text-on-surface-variant mb-4">${esc(reviewee?.display_name || reviewee?.handle)} için değerlendirme yaz.</p>
    <div class="flex justify-center gap-2 mb-4" id="star-row">
      ${[1,2,3,4,5].map(i => `<button class="text-4xl transition-all star-btn" data-val="${i}">☆</button>`).join('')}
    </div>
    <textarea id="review-comment" rows="3" placeholder="Yorumun (opsiyonel)" class="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none resize-none font-body-md mb-4"></textarea>
    <button id="review-submit" class="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl">Değerlendirmeyi Gönder</button>
  `);

  modal.el.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      modal.el.querySelectorAll('.star-btn').forEach((b, i) => {
        b.textContent = i < selectedRating ? '★' : '☆';
        b.style.color = i < selectedRating ? '#eab308' : '#9ca3af';
      });
    });
  });

  modal.el.querySelector('#review-submit').addEventListener('click', async () => {
    if (!selectedRating) return toast.warning('Puan seçin.');
    const comment = modal.el.querySelector('#review-comment').value.trim();
    const { error } = await createReview(session.id, revieweeId, role, selectedRating, comment);
    if (error) return toast.error(error.message);
    toast.success('Değerlendirme gönderildi!');
    modal.close();
  });
}

async function init() {

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  myId = session.user.id;
  initNotifications(myId).catch(e => console.warn("Notifications:", e));

  loadMatchRequests();
  loadNotifications();
  checkCompletedSessions();
}

init().catch(err => console.error('notifications init error:', err));

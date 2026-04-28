import { supabase } from '/js/supabase-client.js?v=3';
import { getMatches, getMatch, getMessages, sendMessage, markMessagesRead,
         getSessionsForMatch, createSession, updateSessionStatus, getTutorIdForMatch, getListingSkillIdForTutor } from '/js/api.js?v=8';
import { subscribeToChat, initNotifications, unsubscribe } from '/js/realtime.js?v=2';
import { store } from '/js/state.js?v=2';
import { toast, esc, avatarUrl, relativeTime, formatDateTime, setLoading, createModal } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

let myId = null;
let currentMatchId = null;
let chatChannel    = null;

const viewList   = document.getElementById('view-list');
const viewThread = document.getElementById('view-thread');
const convList   = document.getElementById('conv-list');
const messagesArea = document.getElementById('messages-area');
const msgInput   = document.getElementById('msg-input');
const sendBtn    = document.getElementById('btn-send');
const sessionBanner = document.getElementById('session-banner');
const sessionInfo   = document.getElementById('session-info');

// ─── Send message — wire immediately ─────────────────────────────────────────
async function doSend() {
  const body = msgInput?.value?.trim();
  if (!body || !currentMatchId) return;
  msgInput.value = '';
  msgInput.style.height = 'auto';
  appendMessage({ sender_id: myId, body, created_at: new Date().toISOString() }, true);
  const { error } = await sendMessage(currentMatchId, body);
  if (error) toast.error('Mesaj gönderilemedi: ' + error.message);
}

sendBtn?.addEventListener('click', doSend);
msgInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
});

document.getElementById('btn-back-to-list')?.addEventListener('click', () => {
  viewThread?.classList.add('hidden'); viewThread?.classList.remove('flex');
  viewList?.classList.remove('hidden'); viewList?.classList.add('flex');
  // Show bottom nav again
  document.getElementById('bottom-nav')?.classList.remove('hidden');
  if (chatChannel) { unsubscribe(chatChannel); chatChannel = null; }
  currentMatchId = null;
});

window.confirmSession = async (sessionId) => {
  const { error } = await updateSessionStatus(sessionId, 'confirmed');
  if (error) toast.error(error.message);
  else { toast.success('Seans onaylandı!'); }
};

window.cancelSession = async (sessionId) => {
  const { error } = await updateSessionStatus(sessionId, 'cancelled');
  if (error) toast.error(error.message);
  else { toast.info('Seans iptal edildi.'); if (sessionBanner) sessionBanner.classList.add('hidden'); }
};

// ─── Session proposal — wire immediately ─────────────────────────────────────
document.getElementById('btn-propose-session')?.addEventListener('click', async () => {
  if (!currentMatchId || !myId) return;
  const { data: matchData } = await getMatch(currentMatchId);
  const other = matchData?.user_a === myId ? matchData.profile_b : matchData.profile_a;

  // Auto-detect tutor: the listing owner (to_user in match_request) is the tutor
  const tutorIdInMatch = await getTutorIdForMatch(matchData.user_a, matchData.user_b);
  const amTutor = tutorIdInMatch ? tutorIdInMatch === myId : true;
  const tutorId   = amTutor ? myId : other.id;
  const learnerId = amTutor ? other.id : myId;

  const modal = createModal(`
    <h2 class="font-headline-md text-on-surface mb-4">📅 Seans Öner</h2>
    <div class="space-y-3">
      <div>
        <label class="font-label-md text-on-surface-variant block mb-1">Başlık</label>
        <input id="s-title" type="text" placeholder="Gitar Dersi" class="w-full h-12 px-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="font-label-md text-on-surface-variant block mb-1">Tarih & Saat</label>
          <input id="s-start" type="datetime-local" class="w-full h-12 px-3 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
        </div>
        <div>
          <label class="font-label-md text-on-surface-variant block mb-1">Süre (dk)</label>
          <input id="s-duration" type="number" value="60" min="15" max="240" class="w-full h-12 px-3 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
        </div>
      </div>
      <div>
        <label class="font-label-md text-on-surface-variant block mb-1">Platform / Adres</label>
        <input id="s-location" type="text" placeholder="Zoom linki veya adres" class="w-full h-12 px-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
      </div>
      <div class="flex gap-2" id="mode-btns">
        <button class="flex-1 py-2 rounded-xl border-2 border-primary bg-primary/10 text-primary font-label-md" data-mode="online">🌐 Online</button>
        <button class="flex-1 py-2 rounded-xl border-2 border-outline-variant text-on-surface-variant font-label-md" data-mode="in_person">📍 Yüz yüze</button>
      </div>
      <button id="s-submit" class="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl">Gönder</button>
    </div>
  `);

  let mode = 'online';
  modal.el.querySelectorAll('#mode-btns button').forEach(btn => {
    btn.addEventListener('click', () => {
      mode = btn.dataset.mode;
      modal.el.querySelectorAll('#mode-btns button').forEach(b => {
        const on = b === btn;
        b.className = `flex-1 py-2 rounded-xl border-2 font-label-md ${on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'}`;
      });
    });
  });

  modal.el.querySelector('#s-submit').addEventListener('click', async () => {
    const title    = modal.el.querySelector('#s-title').value.trim();
    const startStr = modal.el.querySelector('#s-start').value;
    const duration = parseInt(modal.el.querySelector('#s-duration').value) || 60;
    const location = modal.el.querySelector('#s-location').value.trim();
    if (!startStr) return toast.warning('Tarih seçin.');

    const { data: matchFull } = await getMatch(currentMatchId);
    const tutorRow =
      matchFull.user_a === tutorId ? matchFull.skill_a_data : matchFull.skill_b_data;
    let skillId = tutorRow?.skill_id || null;
    if (!skillId && tutorId) {
      skillId = await getListingSkillIdForTutor(tutorId, matchFull.user_a, matchFull.user_b);
    }
    if (!skillId) {
      return toast.error('Ders konusu bulunamadı. Eşleşme veya ilan verisi eksik olabilir.');
    }

    const { error } = await createSession({
      match_id: currentMatchId,
      tutor_id: tutorId,
      learner_id: learnerId,
      skill_id: skillId,
      title: title || 'Seans',
      starts_at: new Date(startStr).toISOString(),
      duration_min: duration,
      mode,
      location: location || null,
      proposed_by: myId,
    });

    if (error) return toast.error(error.message);
    toast.success('Seans önerisi gönderildi!');
    modal.close();
    loadSessionBanner(currentMatchId, other, matchFull);
  });
});

// ─── Core functions ───────────────────────────────────────────────────────────
async function loadConversations() {
  const { data: matches, error } = await getMatches();
  if (error) { if (convList) convList.innerHTML = '<p class="text-center text-outline py-8">Yükleme hatası.</p>'; return; }
  if (!matches?.length) {
    if (convList) convList.innerHTML = `
      <div class="text-center py-12 space-y-3">
        <span class="material-symbols-outlined text-5xl text-outline">chat_bubble_outline</span>
        <p class="text-on-surface-variant font-body-md">Henüz eşleşmen yok.</p>
        <a href="/listings" class="inline-block px-6 py-2 bg-primary text-white rounded-xl font-label-md">İlanları Keşfet</a>
      </div>`;
    return;
  }
  if (convList) convList.innerHTML = '';
  const params = new URLSearchParams(location.search);
  const directMatchId = params.get('match');
  matches.forEach(m => {
    const other = m.user_a === myId ? m.profile_b : m.profile_a;
    const el = document.createElement('div');
    el.className = 'flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all active:scale-[0.98]';
    el.innerHTML = `
      <img src="${avatarUrl(other)}" class="w-12 h-12 rounded-full object-cover border-2 border-indigo-50 flex-shrink-0" alt="${esc(other?.display_name)}"/>
      <div class="flex-grow min-w-0">
        <h3 class="font-label-md text-on-surface truncate">${esc(other?.display_name || other?.handle)}</h3>
        <p class="font-body-sm text-outline truncate text-[12px]">
          ${esc(m.skill_a_data?.skill?.name || '—')} ↔ ${esc(m.skill_b_data?.skill?.name || '—')}
        </p>
      </div>
      <span class="material-symbols-outlined text-outline flex-shrink-0">chevron_right</span>`;
    el.addEventListener('click', () => openThread(m.id, other, m));
    convList?.appendChild(el);
  });

  if (directMatchId) {
    const m = matches.find(x => x.id === directMatchId);
    if (m) {
      const other = m.user_a === myId ? m.profile_b : m.profile_a;
      openThread(m.id, other, m);
    }
  }
}

async function openThread(matchId, other, matchData) {
  currentMatchId = matchId;
  viewList?.classList.add('hidden'); viewList?.classList.remove('flex');
  viewThread?.classList.remove('hidden'); viewThread?.classList.add('flex');
  // Hide bottom nav in thread view
  document.getElementById('bottom-nav')?.classList.add('hidden');

  const threadAvatar = document.getElementById('thread-avatar');
  const threadName   = document.getElementById('thread-name');
  const threadSkill  = document.getElementById('thread-skill');
  if (threadAvatar) {
    threadAvatar.src = avatarUrl(other);
    if (other?.handle) {
      threadAvatar.style.cursor = 'pointer';
      threadAvatar.onclick = () => location.href = `/profile?u=${encodeURIComponent(other.handle)}`;
    }
  }
  if (threadName)   threadName.textContent = other?.display_name || other?.handle || '—';
  if (threadSkill) {
    const mySkill    = matchData.user_a === myId ? matchData.skill_a_data : matchData.skill_b_data;
    const theirSkill = matchData.user_a === myId ? matchData.skill_b_data : matchData.skill_a_data;
    threadSkill.textContent = `${mySkill?.skill?.name || '—'} ↔ ${theirSkill?.skill?.name || '—'}`;
  }

  await loadMessages(matchId);
  await markMessagesRead(matchId);

  if (chatChannel) unsubscribe(chatChannel);
  chatChannel = await subscribeToChat(matchId, (newMsg) => {
    appendMessage(newMsg, newMsg.sender_id === myId);
    markMessagesRead(matchId);
  });

  loadSessionBanner(matchId, other, matchData);
}

async function loadMessages(matchId) {
  if (!messagesArea) return;
  messagesArea.innerHTML = '<p class="text-center text-outline text-sm py-4">Yükleniyor...</p>';
  const { data: msgs, error } = await getMessages(matchId);
  if (error) { messagesArea.innerHTML = '<p class="text-center text-red-400 py-4">Mesajlar yüklenemedi.</p>'; return; }
  messagesArea.innerHTML = '';
  if (!msgs?.length) {
    messagesArea.innerHTML = '<p class="text-center text-outline text-sm py-8">Henüz mesaj yok. Merhaba de! 👋</p>';
    return;
  }
  msgs.forEach(msg => appendMessage(msg, msg.sender_id === myId));
  scrollToBottom();
}

function appendMessage(msg, isMine) {
  if (!messagesArea) return;
  const placeholder = messagesArea.querySelector('p.text-center');
  if (placeholder) placeholder.remove();

  const wrapper = document.createElement('div');
  wrapper.className = `flex ${isMine ? 'justify-end' : 'justify-start'} fade-in`;
  const bubble = document.createElement('div');
  bubble.className = `max-w-[78%] px-4 py-2.5 text-body-sm ${isMine ? 'bubble-out' : 'bubble-in'}`;
  bubble.textContent = msg.body || '';
  if (msg.attachment_url) {
    const link = document.createElement('a');
    link.href = msg.attachment_url;
    link.target = '_blank';
    link.className = 'underline block mt-1 text-[12px]';
    link.textContent = '📎 Ek dosya';
    bubble.appendChild(link);
  }
  const time = document.createElement('div');
  time.className = `text-[10px] mt-0.5 ${isMine ? 'text-white/70 text-right' : 'text-outline/70'}`;
  time.textContent = relativeTime(msg.created_at);
  bubble.appendChild(time);
  wrapper.appendChild(bubble);
  messagesArea.appendChild(wrapper);
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesArea) messagesArea.scrollTop = messagesArea.scrollHeight;
}

async function loadSessionBanner(matchId, other, matchData) {
  const { data: sessions } = await getSessionsForMatch(matchId);
  const active = sessions?.find(s => ['proposed', 'confirmed'].includes(s.status));
  if (!active) return;

  const statusLabels = { proposed: '⏳ Onay Bekliyor', confirmed: '✅ Onaylandı', completed: '✔ Tamamlandı' };
  if (sessionBanner) sessionBanner.classList.remove('hidden');
  if (sessionInfo) sessionInfo.innerHTML = `
    <span class="font-label-md text-on-surface">${esc(active.title || active.skill?.name)}</span>
    <span class="ml-2 text-primary">${formatDateTime(active.starts_at)}</span>
    <span class="ml-2 text-outline">${statusLabels[active.status] || active.status}</span>
    ${active.status === 'proposed' && active.proposed_by !== myId ? `
      <button onclick="confirmSession('${active.id}')" class="ml-3 px-3 py-1 bg-green-500 text-white font-label-sm rounded-lg">Onayla</button>
    ` : ''}
    ${active.status === 'confirmed' || active.status === 'proposed' ? `
      <button onclick="cancelSession('${active.id}')" class="ml-2 px-3 py-1 bg-red-100 text-red-600 font-label-sm rounded-lg">İptal</button>
    ` : ''}
  `;
}

async function init() {

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  myId = session.user.id;
  store.set({ user: session.user });
  initNotifications(myId).catch(e => console.warn("Notifications:", e));
  loadConversations();
}

init().catch(err => console.error('chat init error:', err));

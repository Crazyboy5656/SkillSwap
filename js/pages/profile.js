import { supabase } from '/js/supabase-client.js?v=4';
import { getProfile, getProfileByHandle, getUserSkills, updateProfile, uploadAvatar, getReviewsForUser, blockUser, reportUser, askAI, createDirectReview, deleteReview, getReviewEligibility } from '/js/api.js?v=8';
import { store } from '/js/state.js?v=2';
import { initNotifications } from '/js/realtime.js?v=2';
import { toast, esc, avatarUrl, renderStars, createModal, setLoading } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

async function init() {

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  const myId = session.user.id;
  initNotifications(myId).catch(e => console.warn("Notifications:", e));

  const params = new URLSearchParams(location.search);
  const handle = params.get('u');
  let profile;
  if (handle) {
    const { data, error } = await getProfileByHandle(handle);
    if (error || !data) { toast.error('Profil bulunamadı'); return; }
    profile = data;
  } else {
    const { data } = await getProfile(myId);
    profile = data;
  }
  if (!profile) return;

  const isOwn = profile?.id === myId;

  // ─── Populate profile header ─────────────────────────────────────────────────
  const avatarEl  = document.getElementById('profile-avatar');
  const nameEl    = document.getElementById('profile-name');
  const handleEl  = document.getElementById('profile-handle');
  const bioEl     = document.getElementById('profile-bio');
  const ratingTutorEl   = document.getElementById('tutor-rating');
  const ratingLearnerEl = document.getElementById('learner-rating');
  const tutorCountEl    = document.getElementById('tutor-count');
  const learnerCountEl  = document.getElementById('learner-count');

  if (avatarEl) avatarEl.src = avatarUrl(profile);
  if (nameEl)   nameEl.textContent  = profile.display_name || profile.handle;
  if (handleEl) handleEl.textContent = '@' + profile.handle;
  if (bioEl)    bioEl.textContent = profile.bio || (isOwn ? 'Henüz bir şey yazmadın. ✏️' : '');
  if (ratingTutorEl)   ratingTutorEl.textContent   = profile.tutor_rating > 0 ? profile.tutor_rating.toFixed(1) : '—';
  if (ratingLearnerEl) ratingLearnerEl.textContent = profile.learner_rating > 0 ? profile.learner_rating.toFixed(1) : '—';
  if (tutorCountEl)    tutorCountEl.textContent    = `${profile.tutor_reviews_count} değerlendirme`;
  if (learnerCountEl)  learnerCountEl.textContent  = `${profile.learner_reviews_count} değerlendirme`;

  const editBtn = document.getElementById('btn-edit-profile');
  if (editBtn && !isOwn) editBtn.remove();

  const avatarEditLabel = document.querySelector('label[for="avatar-input"]');
  if (!isOwn && avatarEditLabel) avatarEditLabel.style.display = 'none';

  if (isOwn) {
    const avatarInput = document.getElementById('avatar-input');
    avatarInput?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return toast.error('Dosya 5 MB\'dan küçük olmalı.');
      const { url, error } = await uploadAvatar(myId, file);
      if (error) return toast.error('Yükleme hatası: ' + error.message);
      if (avatarEl) avatarEl.src = url;
      await updateProfile(myId, { avatar_url: url });
      toast.success('Fotoğraf güncellendi!');
    });
  }

  editBtn?.addEventListener('click', () => {
    const modal = createModal(`
      <h2 class="font-headline-md text-on-surface mb-4">Profili Düzenle</h2>
      <div class="space-y-4">
        <div>
          <label class="font-label-md block mb-1 text-on-surface-variant">Görünür Ad</label>
          <input id="modal-name" type="text" value="${esc(profile.display_name || '')}" class="w-full h-12 px-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
        </div>
        <div>
          <label class="font-label-md block mb-1 text-on-surface-variant">Hakkında</label>
          <textarea id="modal-bio" rows="3" class="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md resize-none">${esc(profile.bio || '')}</textarea>
        </div>
        <div>
          <label class="font-label-md block mb-1 text-on-surface-variant">Şehir</label>
          <input id="modal-location" type="text" value="${esc(profile.location || '')}" class="w-full h-12 px-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md"/>
        </div>
        <button id="modal-save" class="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl">Kaydet</button>
      </div>
    `);
    modal.el.querySelector('#modal-save').addEventListener('click', async () => {
      const name = modal.el.querySelector('#modal-name').value.trim();
      const bio  = modal.el.querySelector('#modal-bio').value.trim();
      const loc  = modal.el.querySelector('#modal-location').value.trim();
      const updates = { display_name: name, bio, location: loc };
      const { error } = await updateProfile(myId, updates);
      if (error) return toast.error(error.message);
      if (nameEl) nameEl.textContent = name || profile.handle;
      if (bioEl)  bioEl.textContent  = bio || 'Henüz bir şey yazmadın. ✏️';
      profile = { ...profile, ...updates };
      modal.close();
      toast.success('Profil güncellendi!');
    });
  });

  // ─── Reviews + AI Analysis ────────────────────────────────────────────────────
  const { data: reviews } = await getReviewsForUser(profile.id);
  const allReviews = reviews || [];
  const reviewsWithComment = allReviews.filter(r => r.comment?.trim());

  // Show reviews section always (even if 0 reviews) when viewing others
  const reviewsSection = document.getElementById('reviews-section');

  if (!isOwn && reviewsSection) {
    reviewsSection.classList.remove('hidden');
    const writeBtn = document.getElementById('btn-write-review');
    if (writeBtn) {
      const elig = await getReviewEligibility(profile.id);
      if (elig.canAsTutor || elig.canAsStudent) {
        writeBtn.classList.remove('hidden');
        writeBtn.addEventListener('click', () => openReviewModal(profile.id, myId, reviewsSection, elig));
      } else {
        writeBtn.remove();
      }
    }
  }

  if (allReviews.length > 0) {
    if (reviewsSection) reviewsSection.classList.remove('hidden');

    const countBadge = document.getElementById('reviews-count-badge');
    if (countBadge) countBadge.textContent = `${allReviews.length} yorum`;

    const reviewsList = document.getElementById('reviews-list');
    if (reviewsList) {
      reviewsList.innerHTML = '';
      allReviews.forEach(r => {
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const reviewer = r.reviewer;
        const isMyReview = r.reviewer_id === myId;
        const card = document.createElement('div');
        card.dataset.reviewId = r.id;
        card.className = 'glass-card p-4 rounded-[20px]';
        card.innerHTML = `
          <div class="flex items-center gap-3 mb-2">
            <img src="${avatarUrl(reviewer)}" class="w-9 h-9 rounded-full object-cover flex-shrink-0"
              onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(reviewer?.display_name||'?')}&background=818cf8&color=fff&size=64'"/>
            <div class="flex-grow min-w-0">
              <p class="font-label-md text-on-surface text-sm truncate">${esc(reviewer?.display_name || reviewer?.handle || '—')}</p>
              <p class="text-[11px] text-on-surface-variant font-label-md mb-0.5">${r.role === 'as_tutor' ? 'Eğitmen olarak' : 'Öğrenci olarak'}</p>
              <span class="text-yellow-500 text-sm">${stars}</span>
            </div>
            ${isMyReview ? `<button data-del="${r.id}" class="del-review-btn p-1.5 rounded-full text-red-400 hover:bg-red-50 transition-colors flex-shrink-0" title="Yorumu sil">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>` : ''}
          </div>
          ${r.comment ? `<p class="font-body-sm text-on-surface-variant text-sm leading-relaxed">${esc(r.comment)}</p>` : ''}
        `;
        reviewsList.appendChild(card);
      });

      reviewsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('.del-review-btn');
        if (!btn) return;
        if (!confirm('Yorumu silmek istediğinden emin misin?')) return;
        const rid = btn.dataset.del;
        const { error } = await deleteReview(rid);
        if (error) { toast.error('Silinemedi: ' + (error.message || '')); return; }
        btn.closest('[data-review-id]')?.remove();
        toast.success('Yorum silindi.');
        const remaining = reviewsList.querySelectorAll('[data-review-id]').length;
        const badge = document.getElementById('reviews-count-badge');
        if (badge) badge.textContent = `${remaining} yorum`;
      });
    }

    if (reviewsWithComment.length >= 2) {
      document.getElementById('ai-analyze-btn')?.addEventListener('click', async () => {
        const analyzeBtn = document.getElementById('ai-analyze-btn');
        setLoading(analyzeBtn, true);
        const { result, error } = await askAI('analyze_reviews', {
          reviews: reviewsWithComment.map(r => ({ rating: r.rating, comment: r.comment })),
        });
        setLoading(analyzeBtn, false);
        if (error) {
          const msg = error.error || error.message || JSON.stringify(error);
          toast.error('AI analiz yapamadı: ' + msg);
          return;
        }
        const textEl = document.getElementById('ai-review-text');
        if (textEl && result) {
          textEl.textContent = result;
          textEl.classList.remove('hidden');
          analyzeBtn?.classList.add('hidden');
        }
      });
    } else {
      const analyzeBtn = document.getElementById('ai-analyze-btn');
      if (analyzeBtn) analyzeBtn.style.display = 'none';
    }
  }

  const listingsContainer = document.getElementById('active-listings');

  if (!isOwn) {
    const blockReportRow = document.createElement('section');
    blockReportRow.className = 'flex gap-3';
    blockReportRow.innerHTML = `
      <button id="btn-block" class="flex-1 h-10 rounded-xl border-2 border-slate-200 text-slate-500 font-label-sm flex items-center justify-center gap-1 hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-all">
        <span class="material-symbols-outlined text-[16px]">block</span> Engelle
      </button>
      <button id="btn-report-user" class="flex-1 h-10 rounded-xl border-2 border-slate-200 text-slate-500 font-label-sm flex items-center justify-center gap-1 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 transition-all">
        <span class="material-symbols-outlined text-[16px]">flag</span> Şikayet Et
      </button>`;
    document.querySelector('main')?.insertBefore(blockReportRow, listingsContainer?.parentElement);

    document.getElementById('btn-block')?.addEventListener('click', async () => {
      if (!confirm(`${profile.display_name || profile.handle} kullanıcısını engellemek istediğinizden emin misiniz?`)) return;
      const { error } = await blockUser(profile.id);
      if (error) toast.error(error.message);
      else { toast.success('Kullanıcı engellendi.'); setTimeout(() => history.back(), 1500); }
    });

    document.getElementById('btn-report-user')?.addEventListener('click', async () => {
      const reason = prompt('Şikayet nedeninizi kısaca belirtin:');
      if (!reason?.trim()) return;
      const { error } = await reportUser(profile.id, reason.trim());
      if (error) toast.error(error.message);
      else toast.success('Şikayetiniz alındı.');
    });
  }

  const showAllBtn = document.querySelector('[onclick*="active-listings"]');
  const PREVIEW = 3;

  function listingCardHTML(l) {
    return `
      <div class="glass-card p-4 rounded-[28px] flex gap-4 items-center cursor-pointer active:scale-[0.98] transition-transform"
           onclick="location.href='/listing?id=${esc(l.id)}'">
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
          <span class="material-symbols-outlined text-white text-2xl">school</span>
        </div>
        <div class="flex-grow min-w-0">
          <h4 class="font-label-md text-on-surface truncate">${esc(l.title || l.skill?.name)}</h4>
          <p class="font-body-sm text-outline mt-0.5">${esc(l.skill?.category?.name || '')} • ${l.mode === 'online' ? 'Online' : l.mode === 'in_person' ? 'Yüz yüze' : 'Her ikisi'}</p>
        </div>
        <span class="material-symbols-outlined text-outline flex-shrink-0">chevron_right</span>
      </div>`;
  }

  async function loadListings() {
    const { data, error } = await getUserSkills(profile.id);
    if (!listingsContainer) return;
    if (error || !data?.length) {
      listingsContainer.innerHTML = '<p class="text-on-surface-variant text-center py-4">Henüz ilan yok.</p>';
      if (showAllBtn) showAllBtn.parentElement.removeChild(showAllBtn);
      return;
    }

    const visible = data.slice(0, PREVIEW);
    const hidden  = data.slice(PREVIEW);

    listingsContainer.innerHTML = visible.map(listingCardHTML).join('');

    if (!hidden.length) {
      // All fit — remove the button
      if (showAllBtn) showAllBtn.style.display = 'none';
    } else {
      // Show remaining inline on click
      if (showAllBtn) {
        showAllBtn.textContent = `Hepsini Gör (${data.length})`;
        showAllBtn.onclick = () => {
          hidden.forEach(l => listingsContainer.insertAdjacentHTML('beforeend', listingCardHTML(l)));
          showAllBtn.style.display = 'none';
        };
      }
    }
  }

  loadListings();
}

function openReviewModal(revieweeId, myId, reviewsSection, elig) {
  const canT = elig?.canAsTutor;
  const canS = elig?.canAsStudent;
  if (!canT && !canS) {
    toast.warning('Bu kişiyle tamamlanmış bir dersin yok; yorum yazamazsın.');
    return;
  }
  const defaultRole = canT && !canS ? 'as_tutor' : (!canT && canS ? 'as_student' : 'as_tutor');
  const modal = createModal(`
    <h2 class="font-headline-md text-on-surface mb-4">Yorum Yaz</h2>
    <div class="space-y-4">
      <div>
        <label class="font-label-md block mb-2 text-on-surface-variant">Bu kişiyi değerlendirdiğin rol</label>
        <p id="role-hint" class="text-body-sm text-on-surface-variant mb-2 hidden"></p>
        <div class="flex gap-2" id="role-picker">
          ${canT ? `
          <button type="button" data-role="as_tutor"
            class="role-btn flex-1 py-2.5 rounded-xl border-2 border-primary bg-primary/10 text-primary font-label-md transition-all active:scale-95">
            Eğitmen olarak
          </button>` : ''}
          ${canS ? `
          <button type="button" data-role="as_student"
            class="role-btn flex-1 py-2.5 rounded-xl border-2 border-outline-variant text-on-surface-variant font-label-md transition-all active:scale-95">
            Öğrenci olarak
          </button>` : ''}
        </div>
        <input type="hidden" id="review-role" value="${esc(defaultRole)}"/>
      </div>
      <div>
        <label class="font-label-md block mb-2 text-on-surface-variant">Puanın</label>
        <div class="flex gap-2" id="star-picker">
          ${[1,2,3,4,5].map(n => `
            <button type="button" data-star="${n}" class="star-btn text-3xl text-slate-300 transition-all active:scale-90 hover:scale-110">★</button>
          `).join('')}
        </div>
        <input type="hidden" id="review-rating" value="0"/>
      </div>
      <div>
        <label class="font-label-md block mb-1 text-on-surface-variant">Yorumun (opsiyonel)</label>
        <textarea id="review-comment" rows="3" placeholder="Deneyimini paylaş..." class="w-full p-4 bg-surface-container-low rounded-xl border border-outline-variant focus:ring-2 focus:ring-primary outline-none font-body-md resize-none"></textarea>
      </div>
      <button id="modal-submit-review" class="w-full h-12 bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl">Gönder</button>
    </div>
  `);

  const roleInput = modal.el.querySelector('#review-role');
  const roleHint = modal.el.querySelector('#role-hint');
  if (canT && !canS) {
    roleHint.textContent = 'Ders aldığın eğitmeni değerlendiriyorsun.';
    roleHint.classList.remove('hidden');
  } else if (!canT && canS) {
    roleHint.textContent = 'Ders verdiğin öğrenciyi değerlendiriyorsun.';
    roleHint.classList.remove('hidden');
  }
  modal.el.querySelectorAll('.role-btn').forEach(btn => {
    const active = btn.dataset.role === defaultRole;
    btn.className = `role-btn flex-1 py-2.5 rounded-xl border-2 font-label-md transition-all active:scale-95 ${
      active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'
    }`;
  });

  // Role picker
  modal.el.querySelectorAll('.role-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      roleInput.value = btn.dataset.role;
      modal.el.querySelectorAll('.role-btn').forEach(b => {
        const active = b === btn;
        b.className = `role-btn flex-1 py-2.5 rounded-xl border-2 font-label-md transition-all active:scale-95 ${
          active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'
        }`;
      });
    });
  });

  let selectedRating = 0;
  const stars = modal.el.querySelectorAll('.star-btn');
  const ratingInput = modal.el.querySelector('#review-rating');

  function updateStars(n) {
    stars.forEach((s, i) => {
      s.classList.toggle('text-yellow-400', i < n);
      s.classList.toggle('text-slate-300', i >= n);
    });
  }

  stars.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.star);
      ratingInput.value = selectedRating;
      updateStars(selectedRating);
    });
    btn.addEventListener('mouseenter', () => updateStars(parseInt(btn.dataset.star)));
    btn.addEventListener('mouseleave', () => updateStars(selectedRating));
  });

  modal.el.querySelector('#modal-submit-review').addEventListener('click', async () => {
    const rating = parseInt(ratingInput.value);
    if (!rating) return toast.warning('Lütfen bir puan seç.');
    const comment = modal.el.querySelector('#review-comment').value.trim();
    const role    = roleInput.value || 'as_tutor';
    const submitBtn = modal.el.querySelector('#modal-submit-review');
    setLoading(submitBtn, true);
    const { error } = await createDirectReview(revieweeId, rating, comment, role);
    setLoading(submitBtn, false);
    if (error) {
      toast.error('Yorum gönderilemedi: ' + (error.message || JSON.stringify(error)));
      return;
    }
    modal.close();
    toast.success('Yorumun gönderildi! 🎉');
    if (reviewsSection) reviewsSection.classList.remove('hidden');
    // Reload page to show new review
    setTimeout(() => location.reload(), 1000);
  });
}

init().catch(err => console.error('profile init error:', err));

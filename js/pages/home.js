import { supabase } from '/js/supabase-client.js?v=4';
import { store } from '/js/state.js?v=2';
import { initNotifications } from '/js/realtime.js?v=2';
import { esc, avatarUrl, renderStars } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';


async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }

  const userId = session.user.id;
  const accessToken = session.access_token;

  // Load profile via raw REST
  const { data: profileArr } = await restGet(
    `profiles?id=eq.${userId}&select=*&limit=1`,
    accessToken
  );
  const profile = profileArr?.[0] ?? null;
  if (profile) {
    store.set({ user: session.user, profile });
    const greeting = document.getElementById('greeting');
    if (greeting) greeting.textContent = `Selam, ${profile.display_name || profile.handle}! 👋`;
  }

  // Non-blocking
  initNotifications(userId).catch(err => console.warn('Notifications init:', err));

  await Promise.all([loadSanaOzel(accessToken, profile?.interests), loadPopularTutors(accessToken)]);
}

// ── Raw REST helper (bypasses supabase-js client) ────────────────────────────
async function restGet(path, token) {
  const url = `${window.SUPABASE_URL}/rest/v1/${path}`;
  const resp = await fetch(url, {
    headers: {
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token || window.SUPABASE_ANON_KEY}`,
      'Accept': 'application/json',
    },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    return { data: null, error: err };
  }
  return { data: await resp.json(), error: null };
}

// ── "Sana Özel" horizontal listing cards (filtered by user interests) ─────────
async function loadSanaOzel(accessToken, interests) {
  const container = document.getElementById('size-gore-list');
  if (!container) return;

  const BASE_QUERY = 'user_skills?select=id,title,kind,mode,skill:skills(id,name,slug,category:categories(name,icon,slug)),profile:profiles(id,handle,display_name,avatar_url)&is_active=eq.true&kind=eq.teach&order=created_at.desc.nullslast&limit=8';

  try {
    let skillFilter = '';

    if (interests?.length > 0) {
      const slugList = interests.map(s => `"${s}"`).join(',');
      const { data: cats } = await restGet(`categories?slug=in.(${slugList})&select=id`, accessToken);
      if (cats?.length) {
        const catIds = cats.map(c => c.id).join(',');
        const { data: skills } = await restGet(`skills?category_id=in.(${catIds})&select=id`, accessToken);
        if (skills?.length) {
          skillFilter = `&skill_id=in.(${skills.map(s => s.id).join(',')})`;
        }
      }
    }

    let { data, error } = await restGet(BASE_QUERY + skillFilter, accessToken);

    // Fallback to all if personalized query returned nothing
    if (skillFilter && (!data?.length || error)) {
      ({ data, error } = await restGet(BASE_QUERY, accessToken));
    }

    if (error) { container.innerHTML = `<p class="text-red-400 text-xs px-2">${JSON.stringify(error)}</p>`; return; }
    if (!data?.length) { container.innerHTML = '<p class="text-slate-400 text-sm px-1 py-8">Henüz ilan yok.</p>'; return; }
    container.innerHTML = '';
    data.forEach(l => container.insertAdjacentHTML('beforeend', sizeGoreCardHTML(l)));
  } catch (e) {
    container.innerHTML = `<p class="text-red-400 text-xs px-2">Hata: ${e.message}</p>`;
  }
}

// ── "Popüler Eğitmenler" tutor list ──────────────────────────────────────────
async function loadPopularTutors(accessToken) {
  const container = document.getElementById('popular-tutors');
  if (!container) return;
  try {
    const { data, error } = await restGet(
      'profiles?select=id,handle,display_name,avatar_url,tutor_rating,tutor_reviews_count&tutor_rating=gt.0&order=tutor_rating.desc.nullslast&limit=5',
      accessToken
    );
    if (error) { container.innerHTML = `<p class="text-red-400 text-xs">${JSON.stringify(error)}</p>`; return; }
    if (!data?.length) { container.innerHTML = '<p class="text-slate-400 text-sm py-4 text-center">Henüz eğitmen yok.</p>'; return; }
    container.innerHTML = '';
    data.forEach(p => container.insertAdjacentHTML('beforeend', tutorCardHTML(p)));
  } catch (e) {
    container.innerHTML = `<p class="text-red-400 text-xs">Hata: ${e.message}</p>`;
  }
}

// ── Card templates ────────────────────────────────────────────────────────────

const CAT_OVERLAY = {
  'Müzik':       'rgba(53,37,205,0.75)',
  'Yazılım':     'rgba(37,53,180,0.75)',
  'Tasarım':     'rgba(104,0,180,0.75)',
  'Sanat':       'rgba(0,80,95,0.75)',
  'Matematik':   'rgba(29,78,216,0.75)',
  'Spor':        'rgba(22,101,52,0.75)',
  'Dil Öğrenimi':'rgba(146,64,14,0.75)',
};

function sizeGoreCardHTML(l) {
  const p = l.profile;
  const catName = l.skill?.category?.name || 'Diğer';
  const overlayColor = CAT_OVERLAY[catName] || 'rgba(30,27,75,0.75)';
  const modeLabel = l.mode === 'online' ? '🌐 Online' : l.mode === 'in_person' ? '📍 Yüz yüze' : '🌐/📍 Her ikisi';
  return `
    <div class="flex-shrink-0 w-64 snap-start cursor-pointer" onclick="location.href='/listing?id=${esc(l.id)}'">
      <div class="relative h-40 rounded-3xl overflow-hidden mb-3 shadow-lg group bg-slate-100">
        <img alt="${esc(p?.display_name)}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          src="${avatarUrl(p)}"
          onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p?.display_name||'?')}&background=818cf8&color=fff&size=200'"/>
        <div class="absolute inset-0 flex items-end p-3"
          style="background:linear-gradient(to top,${overlayColor} 0%,transparent 100%)">
          <span style="background:rgba(255,255,255,0.18);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.3)" class="text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">${esc(catName)}</span>
        </div>
      </div>
      <h4 class="font-headline-md text-[16px] text-on-surface mb-0.5 leading-tight">${esc(l.title || l.skill?.name)}</h4>
      <p class="font-body-sm text-on-surface-variant text-[12px] flex items-center gap-1">
        <span class="material-symbols-outlined text-[14px]">person</span> ${esc(p?.display_name || p?.handle || '—')}
        <span class="ml-2">${modeLabel}</span>
      </p>
    </div>`;
}

function tutorCardHTML(p) {
  return `
    <div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center gap-4 transition-all hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer" onclick="location.href='/profile?u=${esc(p.handle)}'">
      <div class="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 border-2 border-indigo-50 bg-slate-100">
        <img alt="${esc(p.display_name)}" class="w-full h-full object-cover" src="${avatarUrl(p)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.display_name||p.handle)}&background=818cf8&color=fff&size=200'"/>
      </div>
      <div class="flex-grow min-w-0">
        <h4 class="font-headline-md text-body-lg text-on-surface leading-tight truncate">${esc(p.display_name || p.handle)}</h4>
        <p class="font-body-sm text-secondary font-semibold text-[12px] truncate">@${esc(p.handle)}</p>
        <div class="flex items-center gap-2 mt-1">
          <span class="flex items-center text-[12px] font-bold text-yellow-500">${renderStars(p.tutor_rating)} ${p.tutor_rating?.toFixed(1) || '—'}</span>
          <span class="text-[12px] text-slate-400">• ${p.tutor_reviews_count || 0} ders</span>
        </div>
      </div>
      <button class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center transition-all active:scale-90 flex-shrink-0">
        <span class="material-symbols-outlined text-[20px]">arrow_forward</span>
      </button>
    </div>`;
}

init().catch(err => console.error('home init error:', err));

import { supabase } from '/js/supabase-client.js?v=4';
import { getCategories, getListings } from '/js/api.js?v=3';
import { initNotifications } from '/js/realtime.js?v=2';
import { esc, avatarUrl } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

const params = new URLSearchParams(location.search);

let filters = {
  kind: 'teach',
  category: null,
  mode: 'all',
  search: params.get('q') || '',
  offset: 0,
};
const PAGE_SIZE = 12;

const grid        = document.getElementById('listings-grid');
const catChips    = document.getElementById('cat-chips');
const searchInput = document.getElementById('search-input');
const loadMoreBtn = document.getElementById('btn-load-more');
const modeTabs    = document.querySelectorAll('.mode-tab');

if (searchInput && filters.search) searchInput.value = filters.search;

modeTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    filters.mode = tab.dataset.mode;
    filters.offset = 0;
    modeTabs.forEach(t => {
      const on = t === tab;
      t.className = `mode-tab px-4 py-1.5 rounded-full font-label-sm border-2 ${on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'}`;
    });
    reload();
  });
});

let debounceTimer;
searchInput?.addEventListener('input', (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    filters.search = e.target.value.trim();
    filters.offset = 0;
    reload();
  }, 400);
});

loadMoreBtn?.addEventListener('click', () => loadListings(true));

function reload() {
  filters.offset = 0;
  loadListings(false);
}

async function loadListings(append = false) {
  if (!append && grid) {
    grid.innerHTML = '<div class="skeleton h-32 rounded-3xl"></div><div class="skeleton h-32 rounded-3xl"></div>';
    loadMoreBtn?.classList.add('hidden');
  }

  const kindFilter = filters.kind === 'all' ? undefined : filters.kind;
  const modeFilter = filters.mode === 'all' ? undefined : filters.mode;

  // Resolve category → skill IDs (PostgREST can't filter on embedded foreign columns directly)
  let skillIds;
  if (filters.category) {
    const { data: catSkills } = await supabase.from('skills').select('id').eq('category_id', filters.category);
    skillIds = catSkills?.map(s => s.id) ?? [];
    if (!skillIds.length) {
      if (grid) grid.innerHTML = '<p class="text-center text-on-surface-variant py-8">Bu kategoride ilan yok.</p>';
      return;
    }
  }

  const { data, error } = await getListings({
    kind: kindFilter,
    mode: modeFilter,
    search: filters.search || undefined,
    skillIds,
    limit: PAGE_SIZE,
    offset: filters.offset,
  });

  if (!grid) return;
  if (error) {
    grid.innerHTML = '<p class="text-center text-on-surface-variant py-8">Bir hata oluştu.</p>';
    return;
  }
  if (!data?.length && !append) {
    grid.innerHTML = '<p class="text-center text-on-surface-variant py-8">Sonuç bulunamadı.</p>';
    return;
  }
  if (!append) grid.innerHTML = '';
  data.forEach(l => grid.insertAdjacentHTML('beforeend', cardHTML(l)));
  filters.offset += data.length;
  if (loadMoreBtn) loadMoreBtn.classList.toggle('hidden', data.length < PAGE_SIZE);
}

function activateCatChip(active) {
  catChips?.querySelectorAll('button').forEach(b => {
    const on = b === active;
    b.className = `flex-shrink-0 px-4 py-1.5 rounded-full font-label-sm border-2 ${on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'}`;
  });
}

function cardHTML(l) {
  const p = l.profile;
  return `
    <div class="glass-card rounded-3xl overflow-hidden shadow-sm cursor-pointer active:scale-[0.98] transition-transform"
         onclick="location.href='/listing?id=${esc(l.id)}'">
      <div class="p-5 flex gap-4">
        <img src="${avatarUrl(p)}" alt="${esc(p?.display_name)}" class="w-14 h-14 rounded-2xl object-cover flex-shrink-0 border-2 border-white shadow-sm"/>
        <div class="flex-grow min-w-0">
          <div class="flex items-start justify-between mb-1">
            <h3 class="font-headline-md text-[16px] text-on-surface leading-tight">${esc(l.title || l.skill?.name)}</h3>
          </div>
          <p class="font-body-sm text-on-surface-variant truncate">${esc(p?.display_name || p?.handle)}</p>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="px-2.5 py-0.5 bg-surface-container rounded-full font-label-sm text-[11px] text-primary">
              ${esc(l.skill?.category?.name || 'Diğer')}
            </span>
            <span class="text-[11px] text-outline">
              ${l.mode === 'online' ? '🌐 Online' : l.mode === 'in_person' ? '📍 Yüz yüze' : '🌐/📍 Her ikisi'}
            </span>
            ${p?.tutor_rating > 0 ? `<span class="flex items-center text-[11px] text-yellow-600 font-semibold">⭐ ${p.tutor_rating.toFixed(1)}</span>` : ''}
          </div>
        </div>
      </div>
    </div>`;
}

async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  initNotifications(session.user.id).catch(e => console.warn("Notifications:", e));

  const catSlugFromUrl = params.get('cat');
  const { data: cats } = await getCategories();

  if (cats && catChips) {
    catChips.innerHTML = '';
    const allChip = document.createElement('button');
    allChip.className = 'flex-shrink-0 px-4 py-1.5 rounded-full font-label-sm border-2 border-primary bg-primary/10 text-primary';
    allChip.textContent = 'Tümü';
    allChip.addEventListener('click', () => { filters.category = null; filters.offset = 0; activateCatChip(allChip); reload(); });
    catChips.appendChild(allChip);

    cats.forEach(cat => {
      const chip = document.createElement('button');
      chip.className = 'flex-shrink-0 px-4 py-1.5 rounded-full font-label-sm border-2 border-outline-variant text-on-surface-variant';
      chip.textContent = cat.name;
      chip.addEventListener('click', () => { filters.category = cat.id; filters.offset = 0; activateCatChip(chip); reload(); });
      catChips.appendChild(chip);

      // Pre-select chip if URL has ?cat=<slug>
      if (catSlugFromUrl && cat.slug === catSlugFromUrl) {
        filters.category = cat.id;
        activateCatChip(chip);
      }
    });
  }

  loadListings(false);
}

init().catch(err => console.error('listings init error:', err));

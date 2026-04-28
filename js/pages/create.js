import { supabase } from '/js/supabase-client.js?v=3';
import { getCategories, getSkills, createListing, askAI } from '/js/api.js?v=7';
import { initNotifications } from '/js/realtime.js?v=2';
import { toast, setLoading, esc } from '/js/ui.js?v=2';
import '/js/nav.js?v=2';

const params = new URLSearchParams(location.search);
const KIND = params.get('kind') === 'learn' ? 'learn' : 'teach';

const form = document.getElementById('create-form');
const submitBtn = document.querySelector('button[type="submit"]');

let selectedSkillId = null;
let selectedSkillName = null;
let selectedCategory = null;
let selectedCategoryName = null;
let selectedMode = 'both';
let selectedFreq = 1;
let availableFrom = null;
let availableTo = null;
let userId = null;

// ── Flatpickr date range ──────────────────────────────────────────────────────
const dateInput = document.getElementById('date-range-input');
const dateDisplay = document.getElementById('date-range-display');

if (dateInput && window.flatpickr) {
  flatpickr(dateInput, {
    mode: 'range',
    dateFormat: 'Y-m-d',
    altInput: true,
    altFormat: 'd M Y',
    locale: window.flatpickr.l10ns?.tr || 'tr',
    minDate: 'today',
    disableMobile: false,
    onChange(dates) {
      if (dates.length === 2) {
        availableFrom = dates[0].toISOString().split('T')[0];
        availableTo   = dates[1].toISOString().split('T')[0];
        const fmt = d => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        if (dateDisplay) {
          dateDisplay.textContent = `${fmt(dates[0])} → ${fmt(dates[1])}`;
          dateDisplay.classList.remove('hidden');
        }
        updatePreview();
      }
    },
  });
}

// ── Weekly frequency buttons ─────────────────────────────────────────────────
document.querySelectorAll('.freq-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedFreq = parseInt(btn.dataset.freq) || 1;
    document.querySelectorAll('.freq-btn').forEach(b => {
      const on = b === btn;
      b.className = `freq-btn px-4 py-2 rounded-full font-label-md border-2 transition-all active:scale-95 ${on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'}`;
    });
    updatePreview();
  });
});

// ── Live preview updater ──────────────────────────────────────────────────────
const titleInput = form?.querySelector('input[type="text"]');
const descInput  = document.getElementById('desc-input');
const timeStart  = document.getElementById('time-start');
const timeEnd    = document.getElementById('time-end');

titleInput?.addEventListener('input', updatePreview);
timeStart?.addEventListener('change', updatePreview);
timeEnd?.addEventListener('change', updatePreview);

function updatePreview() {
  const previewTitle = document.getElementById('preview-title');
  const previewSkill = document.getElementById('preview-skill');
  const previewMode  = document.getElementById('preview-mode');
  const previewFreq  = document.getElementById('preview-freq');
  const previewDates = document.getElementById('preview-dates');
  const previewAvatar = document.getElementById('preview-avatar');

  if (previewTitle) previewTitle.textContent = titleInput?.value?.trim() || 'Ders başlığın...';

  if (previewSkill) {
    previewSkill.textContent = selectedSkillName
      ? `${selectedSkillName}`
      : '— Kategori ve beceri seç —';
  }

  const modeLabels = { online: '🌐 Online', in_person: '📍 Yüz yüze', both: '✨ Her ikisi' };
  if (previewMode) previewMode.textContent = modeLabels[selectedMode] || modeLabels.both;

  if (previewFreq) previewFreq.textContent = `Haftada ${selectedFreq} kez`;

  if (previewDates && availableFrom && availableTo) {
    const fmt = d => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
    const ts = timeStart?.value || '';
    const te = timeEnd?.value || '';
    const timeStr = ts && te ? ` • ${ts}–${te}` : '';
    previewDates.textContent = `📅 ${fmt(availableFrom)} → ${fmt(availableTo)}${timeStr}`;
    previewDates.classList.remove('hidden');
  }
}

// ── Mode picker (HTML buttons) ────────────────────────────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedMode = btn.dataset.mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
      const on = b === btn;
      b.className = `mode-btn flex-1 py-2 rounded-xl font-label-md border-2 transition-all active:scale-95 ${on ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant text-on-surface-variant'}`;
    });
    updatePreview();
  });
});

// ── Category chips ────────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  userId = session.user.id;
  initNotifications(userId).catch(e => console.warn("Notifications:", e));

  const { data: categories } = await getCategories();
  const chipContainer = document.querySelector('.flex.flex-wrap.gap-sm');
  renderCategoryChips(categories || [], chipContainer);
}

function renderCategoryChips(cats, chipContainer) {
  if (!chipContainer || !cats) return;
  chipContainer.innerHTML = '';
  cats.forEach(cat => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.catId = cat.id;
    btn.className = 'px-md py-base rounded-full font-label-md transition-all active:scale-95 bg-surface-container-high text-on-surface-variant hover:bg-slate-200';
    btn.innerHTML = `<span class="material-symbols-outlined text-sm align-middle mr-1">${cat.icon}</span>${esc(cat.name)}`;
    btn.addEventListener('click', () => selectCategory(cat.id, cat.name, btn, chipContainer));
    chipContainer.appendChild(btn);
  });
}

function selectCategory(catId, catName, btn, chipContainer) {
  selectedCategory = catId;
  selectedCategoryName = catName;
  chipContainer.querySelectorAll('button').forEach(b => {
    const active = b === btn;
    b.className = `px-md py-base rounded-full font-label-md transition-all active:scale-95 ${active ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-high text-on-surface-variant hover:bg-slate-200'}`;
  });
  loadSkillsForCategory(catId, chipContainer);
}

let skillDropdown;
async function loadSkillsForCategory(catId, chipContainer) {
  const { data: skills } = await getSkills(catId);
  renderSkillDropdown(skills || [], chipContainer);
}

function renderSkillDropdown(skills, chipContainer) {
  if (!skillDropdown) {
    skillDropdown = document.createElement('div');
    skillDropdown.className = 'mt-3 space-y-2';
    chipContainer?.parentElement?.appendChild(skillDropdown);
  }
  const OTHER_SKILL_ID = '21c1e1d4-5c51-41b2-b3fa-96088c364f58';
  skillDropdown.innerHTML = `
    <label class="font-label-md text-on-surface-variant block ml-1">Yetenek Seç</label>
    <select id="skill-select" class="w-full h-12 px-4 bg-slate-50 border border-outline-variant rounded-xl focus:ring-2 focus:ring-primary outline-none font-body-md">
      <option value="">— Seç —</option>
      ${skills.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}
      <option value="__other__">Diğer</option>
    </select>
  `;
  skillDropdown.querySelector('#skill-select').addEventListener('change', e => {
    if (e.target.value === '__other__') {
      selectedSkillId   = OTHER_SKILL_ID;
      selectedSkillName = 'Diğer';
    } else {
      selectedSkillId   = e.target.value || null;
      selectedSkillName = e.target.selectedOptions[0]?.text !== '— Seç —' ? e.target.selectedOptions[0]?.text : null;
    }
    updatePreview();
  });
}

// ── AI Description button ─────────────────────────────────────────────────────
document.getElementById('ai-desc-btn')?.addEventListener('click', async () => {
  const title = titleInput?.value?.trim() || '';
  if (!selectedSkillName && !title) {
    return toast.warning('Önce bir başlık veya kategori/yetenek seç.');
  }
  const aiBtn = document.getElementById('ai-desc-btn');
  setLoading(aiBtn, true);
  const { result, error } = await askAI('generate_description', {
    skill: selectedSkillName || '',
    category: selectedCategoryName || '',
    title,
  });
  setLoading(aiBtn, false);
  if (error) {
    toast.error('AI yazamadı: ' + (error.error || error.message || 'Hata'));
    return;
  }
  if (descInput && result) {
    descInput.value = result;
    updatePreview();
    toast.success('AI açıklama oluşturdu! ✨');
  }
});

// ── Form submit ───────────────────────────────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!userId) return;
  const title       = titleInput?.value?.trim() || '';
  const description = descInput?.value?.trim() || '';

  if (!selectedSkillId)  return toast.warning('Bir yetenek seçmelisin.');
  if (!title)            return toast.warning('Başlık gereklidir.');
  if (!description)      return toast.warning('Açıklama zorunludur.');
  if (!availableFrom || !availableTo) return toast.warning('Tarih aralığı zorunludur.');

  setLoading(submitBtn, true);
  const payload = {
    user_id:     userId,
    skill_id:    selectedSkillId,
    kind:        KIND,
    title,
    description,
    mode:        selectedMode,
    level:       3,
    weekly_sessions: selectedFreq,
    available_from:  availableFrom,
    available_to:    availableTo,
  };
  if (timeStart?.value) payload.available_time_start = timeStart.value;
  if (timeEnd?.value)   payload.available_time_end   = timeEnd.value;

  const { error } = await createListing(payload);
  setLoading(submitBtn, false);

  if (error) {
    toast.error('Oluşturulamadı: ' + error.message);
  } else {
    toast.success('İlan oluşturuldu! 🎉');
    setTimeout(() => location.replace('/profile'), 1200);
  }
});

init().catch(err => console.error('create init error:', err));

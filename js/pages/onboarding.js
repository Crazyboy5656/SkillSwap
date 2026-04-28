import { supabase } from '/js/supabase-client.js?v=5';
import { getSkills, getCategories, updateProfile } from '/js/api.js?v=4';
import { store } from '/js/state.js?v=2';
import { toast, setLoading } from '/js/ui.js?v=2';

const selectedTeach     = new Set(); // skill ids
const selectedInterests = new Set(); // category slugs
let allSkills      = [];
let allCategories  = [];
let currentStep = 1;
let userId         = null;
let dataReady      = false;

const steps = { 1: document.getElementById('step-1'), 2: document.getElementById('step-2'), 3: document.getElementById('step-3') };
const progressBar = document.getElementById('progress-bar');
const stepLabel   = document.getElementById('step-label');
const btnNext     = document.getElementById('btn-next');
const btnBack     = document.getElementById('btn-back');

function setNextEnabled(on) {
  if (!btnNext) return;
  btnNext.disabled = !on;
  btnNext.classList.toggle('opacity-50', !on);
  btnNext.classList.toggle('pointer-events-none', !on);
}

/**
 * Yetenek + ilgi alanı seçimleri göstermelik; DB’ye yazılmaz.
 * Sadece akışı tamamlandı saymak için onboarded + (opsiyonel) profil alanları kaydedilir.
 */
window._finishOnboarding = async function finishOnboarding() {
  if (!userId) return toast.error('Oturum bulunamadı. Sayfayı yenileyin.');
  setLoading(btnNext, true);
  try {
    const displayName = document.getElementById('display-name')?.value.trim();
    const bio         = document.getElementById('bio')?.value.trim();
    const locationVal = document.getElementById('location')?.value.trim();
    const updates = { onboarded: true };
    if (displayName) updates.display_name = displayName;
    if (bio)         updates.bio = bio;
    if (locationVal) updates.location = locationVal;
    const { error: pErr } = await updateProfile(userId, updates);
    if (pErr) {
      const msg = pErr.message || pErr.details || pErr.hint || JSON.stringify(pErr);
      throw new Error(msg);
    }
    toast.success('Harika! Profilin hazır 🎉');
    setTimeout(() => { location.replace('/home'); }, 800);
  } catch (err) {
    console.error('finish onboarding:', err);
    toast.error('Bir hata oluştu: ' + (err.message || String(err)));
  } finally {
    setLoading(btnNext, false);
  }
};

btnNext?.addEventListener('click', handleNext);
btnBack?.addEventListener('click', handleBack);

async function init() {
  setNextEnabled(false);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { location.replace('/login'); return; }
  userId = session.user.id;
  store.set({ user: session.user });

  try {
    const [{ data: skills }, { data: categories }] = await Promise.all([getSkills(), getCategories()]);
    allSkills     = skills     || [];
    allCategories = categories || [];
  } catch (e) {
    console.error('onboarding load:', e);
    toast.error('Veriler yüklenemedi. Sayfayı yenileyin.');
    setNextEnabled(true);
    return;
  }
  dataReady     = true;
  renderSkillChips('teach-chips', allSkills, selectedTeach);
  setNextEnabled(true);
}

function renderSkillChips(containerId, skills, selectedSet) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  skills.forEach(skill => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = skill.name;
    chip.dataset.id = skill.id;
    chip.className = `skill-chip px-4 py-2 rounded-full border-2 font-label-md text-sm transition-all ${selectedSet.has(skill.id) ? 'selected border-primary bg-primary text-white' : 'border-outline-variant bg-surface-container text-on-surface'}`;
    chip.addEventListener('click', () => {
      if (selectedSet.has(skill.id)) {
        selectedSet.delete(skill.id);
        chip.classList.remove('selected', 'border-primary', 'bg-primary', 'text-white');
        chip.classList.add('border-outline-variant', 'bg-surface-container', 'text-on-surface');
      } else {
        selectedSet.add(skill.id);
        chip.classList.add('selected', 'border-primary', 'bg-primary', 'text-white');
        chip.classList.remove('border-outline-variant', 'bg-surface-container', 'text-on-surface');
      }
    });
    container.appendChild(chip);
  });
}

function renderInterestChips() {
  const container = document.getElementById('interest-chips');
  if (!container) return;
  container.innerHTML = '';
  allCategories.forEach(cat => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.textContent = cat.name;
    chip.dataset.slug = cat.slug;
    chip.className = `skill-chip px-4 py-2 rounded-full border-2 font-label-md text-sm transition-all ${selectedInterests.has(cat.slug) ? 'selected border-primary bg-primary text-white' : 'border-outline-variant bg-surface-container text-on-surface'}`;
    chip.addEventListener('click', () => {
      if (selectedInterests.has(cat.slug)) {
        selectedInterests.delete(cat.slug);
        chip.classList.remove('selected', 'border-primary', 'bg-primary', 'text-white');
        chip.classList.add('border-outline-variant', 'bg-surface-container', 'text-on-surface');
      } else {
        selectedInterests.add(cat.slug);
        chip.classList.add('selected', 'border-primary', 'bg-primary', 'text-white');
        chip.classList.remove('border-outline-variant', 'bg-surface-container', 'text-on-surface');
      }
    });
    container.appendChild(chip);
  });
}

function showStep(n) {
  Object.values(steps).forEach(el => el?.classList.add('hidden'));
  steps[n]?.classList.remove('hidden');
  currentStep = n;
  const pct = [33, 66, 90][n - 1];
  if (progressBar) progressBar.style.width = pct + '%';
  if (stepLabel)   stepLabel.textContent = `Adım ${n}/3`;
  btnBack?.classList.toggle('hidden', n === 1);
  if (btnNext) btnNext.innerHTML = n === 3
    ? 'Başla <span class="material-symbols-outlined">rocket_launch</span>'
    : 'Devam <span class="material-symbols-outlined">arrow_forward</span>';
}

async function handleNext() {
  if (!dataReady) {
    return toast.warning('Veriler yükleniyor, lütfen bir saniye…');
  }
  if (currentStep === 1) {
    if (selectedTeach.size === 0) return toast.warning('En az 1 öğretebileceğin yetenek seç.');
    renderInterestChips();
    showStep(2);
  } else if (currentStep === 2) {
    if (selectedInterests.size === 0) return toast.warning('En az 1 ilgi alanı seç.');
    showStep(3);
  } else if (currentStep === 3) {
    await window._finishOnboarding();
  }
}

function handleBack() {
  if (currentStep > 1) showStep(currentStep - 1);
}

init().catch(err => console.error('onboarding init error:', err));

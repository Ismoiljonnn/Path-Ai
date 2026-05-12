/* ================================================================
   Pathai — index.js
   Full app logic: state, routing, Gemini API, UI render
================================================================ */

// ================================================================
//  i18n
// ================================================================
const I18N = {
  en: {
    'app.name': 'Myjourney',
    'settings': 'Settings',
    'dark.mode': 'Dark Mode',
    'language': 'Language',
    'goals.title': 'Goals',
    'add.goal': 'Add Goal',
    'add.goal.sub': 'Plan your journey',
    'new.goal': 'New Goal',
    'goal.placeholder': 'What do you want to achieve?',
    'create.goal': 'Create Goal',
    'generating': 'Generating with AI…',
    'delete.goal': 'Delete Goal',
    'delete.confirm': 'Are you sure? This goal and all its quests will be permanently deleted.',
    'notes': 'Notes',
    'notes.placeholder': 'Write your notes here…',
    'notes.hint': 'Ctrl+Enter to save',
    'save': 'Save',
    'cancel': 'Cancel',
    'delete': 'Delete',
    'archive': 'Archive',
    'profile': 'Profile',
    'select.goal': 'Pick a goal',
    'select.goal.sub': 'Your quest roadmap will appear here',
    'no.goals': 'No goals yet',
    'no.goals.sub': 'Create your first goal to begin the journey',
    'no.archive': 'No completed goals yet',
    'no.archive.sub': 'Finish all tiers of a goal to archive it',
    'personal.info': 'Personal Info',
    'first.name': 'First Name',
    'last.name': 'Last Name',
    'bio': 'About You',
    'interests': 'Interests',
    'bio.ph': 'A short description about yourself…',
    'interests.ph': 'e.g. programming, chess, design, music…',
    'save.profile': 'Save Profile',
    'tier.locked': 'Complete the current tier first',
    'tier.unlocked': 'Tier {n} unlocked! 🎉',
    'goal.archived': 'Goal completed and archived! 🏆',
    'api.saved': 'API key saved ✓',
    'api.missing': 'Add your Gemini API key in the menu first',
    'profile.saved': 'Profile saved ✓',
    'completed': 'Completed',
  },
  uz: {
    'app.name': 'Pathai',
    'settings': 'Sozlamalar',
    'dark.mode': 'Tungi rejim',
    'language': 'Til',
    'goals.title': 'Maqsadlar',
    'add.goal': "Maqsad qo'sh",
    'add.goal.sub': "Yo'lingni rejalashtir",
    'new.goal': 'Yangi maqsad',
    'goal.placeholder': 'Nimaga erishmoqchisiz?',
    'create.goal': 'Maqsad yaratish',
    'generating': 'AI bilan generatsiya…',
    'delete.goal': "Maqsadni o'chirish",
    'delete.confirm': "Ishonchingiz komilmi? Maqsad va barcha questlar butunlay o'chiriladi.",
    'notes': 'Eslatmalar',
    'notes.placeholder': 'Bu yerga eslatmalaringizni yozing…',
    'notes.hint': "Saqlash uchun Ctrl+Enter",
    'save': 'Saqlash',
    'cancel': 'Bekor qilish',
    'delete': "O'chirish",
    'archive': 'Arxiv',
    'profile': 'Profil',
    'select.goal': 'Maqsad tanlang',
    'select.goal.sub': "Quest xaritasi shu yerda ko'rinadi",
    'no.goals': 'Hali maqsad yo\'q',
    'no.goals.sub': 'Birinchi maqsadingizni yarating',
    'no.archive': 'Tugallangan maqsadlar yo\'q',
    'no.archive.sub': "Maqsadning barcha tierlarini tugatib arxivga o'ting",
    'personal.info': "Shaxsiy ma'lumotlar",
    'first.name': 'Ism',
    'last.name': 'Familiya',
    'bio': 'Siz haqingizda',
    'interests': 'Qiziqishlar',
    'bio.ph': "O'zingiz haqingizda qisqacha…",
    'interests.ph': 'Mas: dasturlash, shaxmat, dizayn…',
    'save.profile': 'Profilni saqlash',
    'tier.locked': 'Avval joriy tierni tugatib oling',
    'tier.unlocked': '{n}-tier ochildi! 🎉',
    'goal.archived': 'Maqsad tugallandi va arxivga o\'tdi! 🏆',
    'api.saved': 'API kalit saqlandi ✓',
    'api.missing': 'Avval menyudan Gemini API kalitini kiriting',
    'profile.saved': 'Profil saqlandi ✓',
    'completed': 'Tugallandi',
  }
};

function t(key, vars = {}) {
  let str = I18N[state.settings.language]?.[key] || I18N.en[key] || key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{${k}}`, v);
  }
  return str;
}

// ================================================================
//  State
// ================================================================
let state = {
  goals: [],
  profile: { name: '', surname: '', bio: '', interests: '' },
  settings: { language: 'en', theme: 'dark', geminiApiKey: '' }
};

// Runtime (not persisted)
let currentPage  = 'home';
let currentGoalId = null;
let currentTierIdx = 0;
let editingQuestRef = null;  // { goalId, tierIdx, questIdx }
let deletingGoalId  = null;

// ================================================================
//  Persistence
// ================================================================
function saveState() {
  localStorage.setItem('pathai_v2', JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem('pathai_v2');
  if (!raw) return;
  try {
    const saved = JSON.parse(raw);
    state = deepMerge(state, saved);
  } catch(_) {}
}

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

// ================================================================
//  Boot
// ================================================================
window.onload = () => {
  loadState();
  applyTheme();
  initDrawer();
  initResizer();
  initRipple();
  initEsc();
  syncDrawerUI();
  navigate('home');
};

// ================================================================
//  Theme
// ================================================================
function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = state.settings.theme === 'dark';
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

// ================================================================
//  Language
// ================================================================
function setLanguage(lang) {
  state.settings.language = lang;
  saveState();
  syncDrawerUI();
  navigate(currentPage);
  closeDrawer();
}

function syncDrawerUI() {
  // Language checkmarks
  ['en', 'uz'].forEach(l => {
    const chk = document.getElementById('check-' + l);
    if (chk) chk.style.display = l === state.settings.language ? 'inline' : 'none';
    const opt = document.getElementById('lang-' + l);
    if (opt) opt.classList.toggle('active', l === state.settings.language);
  });

  // Drawer text
  setEl('txt-settings',  t('settings'));
  setEl('txt-dark-mode', t('dark.mode'));
  setEl('txt-language',  t('language'));

  // API key
  const apiInput = document.getElementById('apiKeyInput');
  if (apiInput && state.settings.geminiApiKey) {
    apiInput.value = state.settings.geminiApiKey;
  }

  // Theme toggle
  const toggle = document.getElementById('themeToggle');
  if (toggle) toggle.checked = state.settings.theme === 'dark';
}

function setEl(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ================================================================
//  API Key
// ================================================================
function saveApiKey() {
  const val = (document.getElementById('apiKeyInput')?.value || '').trim();
  state.settings.geminiApiKey = val;
  saveState();
  showToast(t('api.saved'));
}

// ================================================================
//  Drawer
// ================================================================
function initDrawer() {
  document.getElementById('menuBtn').addEventListener('click', openDrawer);
  document.getElementById('overlay').addEventListener('click', closeDrawer);
}

function openDrawer() {
  document.getElementById('sideDrawer').classList.add('active');
  document.getElementById('overlay').classList.add('active');
}
function closeDrawer() {
  document.getElementById('sideDrawer').classList.remove('active');
  document.getElementById('overlay').classList.remove('active');
}

// ================================================================
//  Resizer
// ================================================================
function initResizer() {
  const resizer = document.getElementById('resizer');
  const sb = document.getElementById('sidebar-content');
  let dragging = false;

  resizer.addEventListener('mousedown', e => {
    dragging = true;
    resizer.classList.add('dragging');
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  });

  function onMove(e) {
    if (!dragging) return;
    const newW = e.clientX - 71;  // subtract icon sidebar width
    if (newW > 180 && newW < 620) sb.style.width = newW + 'px';
  }
  function onUp() {
    dragging = false;
    resizer.classList.remove('dragging');
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }
}

// ================================================================
//  ESC
// ================================================================
function initEsc() {
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    // Priority: close modals first, then close goal detail
    if (isVisible('createGoalModal')) { closeCreateGoal(); return; }
    if (isVisible('notesModal'))      { closeNotesModal(); return; }
    if (isVisible('deleteModal'))     { closeDeleteModal(); return; }
    if (document.getElementById('sideDrawer').classList.contains('active')) { closeDrawer(); return; }
    if (currentGoalId !== null) {
      currentGoalId = null;
      renderSidebar();
      renderMain();
    }
  });
}

function isVisible(id) {
  return !document.getElementById(id)?.classList.contains('hidden');
}

// ================================================================
//  Ripple
// ================================================================
function initRipple() {
  document.addEventListener('mousedown', e => {
    const el = e.target.closest('.goal-item, .nav-item, .ripple');
    if (!el) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-circle';
    const r = el.getBoundingClientRect();
    const sz = Math.min(r.width, r.height, 70);
    Object.assign(ripple.style, {
      width: sz + 'px', height: sz + 'px',
      left: (e.clientX - r.left - sz/2) + 'px',
      top:  (e.clientY - r.top  - sz/2) + 'px',
    });
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}

// ================================================================
//  Toast
// ================================================================
let _toastTimer;
function showToast(msg) {
  let el = document.getElementById('global-toast');
  if (!el) {
    el = Object.assign(document.createElement('div'), { id: 'global-toast', className: 'toast' });
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ================================================================
//  Navigate
// ================================================================
function navigate(pageId) {
  currentPage = pageId;
  currentGoalId = null;

  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  renderSidebar();
  renderMain();
}

// ================================================================
//  Helpers
// ================================================================
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function goalColor(title) {
  const COLORS = ['#4A90E2','#E2844A','#4AE2A8','#E24A7B','#A84AE2','#E2C34A','#4AE2D4','#7B5CF6','#50C8E2','#E26060'];
  let h = 0;
  for (let i = 0; i < title.length; i++) h = title.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

function activeGoals()   { return state.goals.filter(g => g.status !== 'archived'); }
function archivedGoals() { return state.goals.filter(g => g.status === 'archived'); }

function getGoal(id) { return state.goals.find(g => g.id === id) || null; }

function totalProgress(goal) {
  const total = goal.tiers.reduce((a, t) => a + t.quests.length, 0);
  const done  = goal.tiers.reduce((a, t) => a + t.quests.filter(q => q.completed).length, 0);
  return total > 0 ? Math.round(done / total * 100) : 0;
}

function tierProgress(tier) {
  return {
    done: tier.quests.filter(q => q.completed).length,
    total: tier.quests.length
  };
}

function isTierDone(tier) { return tier.quests.length > 0 && tier.quests.every(q => q.completed); }

// ================================================================
//  Sidebar Render
// ================================================================
function renderSidebar() {
  const sb = document.getElementById('sidebar-content');

  if (currentPage === 'home') {
    const goals = activeGoals();
    const items = goals.map(g => {
      const pct = totalProgress(g);
      const init = (g.title[0] || '?').toUpperCase() + (g.title[1] || '').toUpperCase();
      const active = currentGoalId === g.id ? 'active-goal' : '';
      return `
        <div class="goal-item ${active}" onclick="openGoal('${g.id}')">
          <div class="goal-avatar" style="background:${goalColor(g.title)}">${esc(init)}</div>
          <div class="goal-info">
            <div class="goal-name">${esc(g.title)}</div>
            <div class="goal-sub">Tier ${(g.currentTier||0)+1} / 10</div>
            <div class="mini-prog-wrap"><div class="mini-prog-fill" style="width:${pct}%"></div></div>
          </div>
        </div>`;
    }).join('');

    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('app.name')}</span></div>
      <div class="goal-item" onclick="openCreateGoal()">
        <div class="goal-avatar add-av"><i class="fas fa-plus"></i></div>
        <div class="goal-info">
          <div class="goal-name" style="color:var(--accent-blue)">${t('add.goal')}</div>
          <div class="goal-sub">${t('add.goal.sub')}</div>
        </div>
      </div>
      ${items || `<div class="sb-empty">${t('no.goals.sub')}</div>`}`;

  } else if (currentPage === 'archive') {
    const goals = archivedGoals();
    const items = goals.map(g => {
      const active = currentGoalId === g.id ? 'active-goal' : '';
      return `
        <div class="goal-item ${active}" onclick="openGoal('${g.id}')">
          <div class="goal-avatar archive-av"><i class="fas fa-trophy"></i></div>
          <div class="goal-info">
            <div class="goal-name">${esc(g.title)}</div>
            <div class="goal-sub" style="color:var(--success)">✓ ${t('completed')}</div>
          </div>
        </div>`;
    }).join('');

    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('archive')}</span></div>
      ${items || `<div class="sb-empty">${t('no.archive.sub')}</div>`}`;

  } else if (currentPage === 'profile') {
    const p = state.profile;
    const initials = (p.name?.[0]||'?').toUpperCase() + (p.surname?.[0]||'').toUpperCase();
    sb.innerHTML = `
      <div class="sb-header"><span class="sb-brand">${t('profile')}</span></div>
      <div style="padding:24px 18px; text-align:center;">
        <div class="goal-avatar" style="margin:0 auto 12px; width:64px; height:64px; font-size:22px; background:var(--accent)">${esc(initials)}</div>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px">${esc(p.name)} ${esc(p.surname)}</div>
        <div style="font-size:13px; color:var(--text-3); line-height:1.5">${esc(p.interests || '')}</div>
      </div>`;
  }
}

// ================================================================
//  Main Content Render
// ================================================================
function renderMain() {
  const main = document.getElementById('main-content');

  if (currentGoalId) {
    renderGoalDetail(main);
    return;
  }

  if (currentPage === 'home') {
    main.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><i class="fas fa-map-marked-alt"></i></div>
        <h3>${t('select.goal')}</h3>
        <p>${t('select.goal.sub')}</p>
      </div>`;

  } else if (currentPage === 'archive') {
    const goals = archivedGoals();
    if (!goals.length) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon"><i class="fas fa-archive"></i></div>
          <h3>${t('no.archive')}</h3>
          <p>${t('no.archive.sub')}</p>
        </div>`;
    } else {
      const cards = goals.map(g => `
        <div class="archive-card">
          <div class="archive-card-info">
            <h3>${esc(g.title)}</h3>
            <p>${new Date(g.archivedAt || g.createdAt).toLocaleDateString()}</p>
          </div>
          <div class="archive-actions">
            <div class="badge-done"><i class="fas fa-check"></i> ${t('completed')}</div>
            <button class="arch-del-btn" onclick="openDeleteModal('${g.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>`).join('');
      main.innerHTML = `<div class="archive-page"><h2 class="page-title">${t('archive')}</h2>${cards}</div>`;
    }

  } else if (currentPage === 'profile') {
    const p = state.profile;
    main.innerHTML = `
      <div class="profile-page">
        <h2 class="page-title">${t('profile')}</h2>
        <div class="profile-avatar-area">
          <div class="profile-avatar-big" id="pf-av">${esc((p.name?.[0]||'?').toUpperCase()+(p.surname?.[0]||'').toUpperCase())}</div>
          <div class="profile-name-display">${esc(p.name||'')} ${esc(p.surname||'')}</div>
          <div class="profile-sub-display">${esc(p.interests||'')}</div>
        </div>
        <div class="section-label">${t('personal.info')}</div>
        <div class="field-group">
          <div class="field-row">
            <div class="field">
              <label>${t('first.name')}</label>
              <input class="f-input" id="pf-name" value="${esc(p.name||'')}" placeholder="${t('first.name')}" oninput="liveUpdateProfile()">
            </div>
            <div class="field">
              <label>${t('last.name')}</label>
              <input class="f-input" id="pf-surname" value="${esc(p.surname||'')}" placeholder="${t('last.name')}" oninput="liveUpdateProfile()">
            </div>
          </div>
          <div class="field">
            <label>${t('bio')}</label>
            <textarea class="f-textarea" id="pf-bio" placeholder="${t('bio.ph')}">${esc(p.bio||'')}</textarea>
          </div>
          <div class="field">
            <label>${t('interests')}</label>
            <textarea class="f-textarea" id="pf-interests" placeholder="${t('interests.ph')}">${esc(p.interests||'')}</textarea>
          </div>
        </div>
        <button class="save-profile-btn" onclick="saveProfile()">
          <i class="fas fa-check"></i> ${t('save.profile')}
        </button>
      </div>`;
  }
}

// ================================================================
//  Goal Detail
// ================================================================
function openGoal(goalId) {
  currentGoalId = goalId;
  const goal = getGoal(goalId);
  if (!goal) return;
  currentTierIdx = goal.currentTier || 0;
  renderSidebar();
  renderMain();
}

function renderGoalDetail(main) {
  const goal = getGoal(currentGoalId);
  if (!goal) return;

  const pct = totalProgress(goal);
  const tier = goal.tiers[currentTierIdx];
  if (!tier) return;

  const { done: tDone, total: tTotal } = tierProgress(tier);

  // Quest list
  const questsHTML = tier.quests.map((q, qi) => `
    <div class="quest-card ${q.completed ? 'done-card' : ''}">
      <div class="quest-row">
        <div class="quest-left">
          <div class="quest-check ${q.completed ? 'done' : ''}"
               onclick="toggleQuest('${goal.id}', ${currentTierIdx}, ${qi})"></div>
          <span class="quest-name ${q.completed ? 'struck' : ''}">${esc(q.title)}</span>
        </div>
        <div class="note-btn ${q.notes ? 'has-note' : ''}"
             onclick="openNotesModal('${goal.id}', ${currentTierIdx}, ${qi})"
             title="${t('notes')}">
          <i class="fas fa-sticky-note"></i>
        </div>
      </div>
      ${q.notes ? `<div class="quest-note-display">${esc(q.notes)}</div>` : ''}
    </div>`).join('');

  // Tiers list
  const tiersHTML = goal.tiers.map((tr, i) => {
    const done = isTierDone(tr);
    const isActive  = i === goal.currentTier;
    const isPast    = i < goal.currentTier;
    const isLocked  = i > goal.currentTier;
    const isSelected = i === currentTierIdx;

    let cls  = 't-locked';
    let icon = `<i class="fas fa-lock" style="font-size:11px"></i>`;
    if (done || isPast) { cls = 't-done';   icon = i + 1; }
    else if (isActive)  { cls = 't-active'; icon = i + 1; }

    const clickable = done || isPast || isActive;
    const onclick = clickable
      ? `selectTier(${i})`
      : `showToast('${t('tier.locked')}')`;

    return `<div class="tier-node ${cls} ${isSelected ? 't-selected' : ''}"
                 onclick="${onclick}" title="Tier ${i+1}">${icon}</div>`;
  }).join('');

  main.innerHTML = `
    <div class="goal-detail">
      <div class="goal-detail-header">
        <div class="gdh-left">
          <h2>${esc(goal.title)}</h2>
          <div class="progress-row">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width:${pct}%"></div>
            </div>
            <span class="progress-pct">${pct}%</span>
          </div>
        </div>
        <button class="del-goal-btn" onclick="openDeleteModal('${goal.id}')">
          <i class="fas fa-trash-alt"></i> ${t('delete.goal')}
        </button>
      </div>
      <div class="goal-body">
        <div class="quest-area">
          <div class="tier-heading">
            <span class="tier-heading-title">${esc(tier.title || 'Tier ' + (currentTierIdx+1))}</span>
            <span class="tier-badge">${tDone} / ${tTotal}</span>
          </div>
          ${questsHTML}
        </div>
        <div class="tiers-sidebar">${tiersHTML}</div>
      </div>
    </div>`;
}

function selectTier(idx) {
  currentTierIdx = idx;
  renderMain();
}

// ================================================================
//  Toggle Quest
// ================================================================
function toggleQuest(goalId, tierIdx, questIdx) {
  const goal = getGoal(goalId);
  if (!goal) return;

  const quest = goal.tiers[tierIdx].quests[questIdx];
  quest.completed = !quest.completed;

  checkTierCompletion(goal, tierIdx);
  saveState();
  renderMain();
  renderSidebar();
}

function checkTierCompletion(goal, tierIdx) {
  const tier = goal.tiers[tierIdx];
  if (!isTierDone(tier)) return;

  const nextIdx = tierIdx + 1;

  if (nextIdx < goal.tiers.length) {
    // Unlock next tier
    if ((goal.currentTier || 0) <= tierIdx) {
      goal.currentTier = nextIdx;
      showToast(t('tier.unlocked', { n: nextIdx + 1 }));
      // Auto-navigate to the newly unlocked tier after short delay
      setTimeout(() => {
        if (currentGoalId === goal.id) {
          currentTierIdx = nextIdx;
          renderMain();
        }
      }, 700);
    }
  } else {
    // All tiers done?
    const allDone = goal.tiers.every(tr => isTierDone(tr));
    if (allDone) {
      goal.status = 'archived';
      goal.archivedAt = Date.now();
      showToast(t('goal.archived'));
      setTimeout(() => {
        currentGoalId = null;
        currentPage = 'archive';
        navigate('archive');
      }, 1400);
    }
  }
}

// ================================================================
//  Notes
// ================================================================
function openNotesModal(goalId, tierIdx, questIdx) {
  editingQuestRef = { goalId, tierIdx, questIdx };
  const goal = getGoal(goalId);
  const quest = goal?.tiers[tierIdx]?.quests[questIdx];

  const ta = document.getElementById('notesInput');
  if (ta) ta.value = quest?.notes || '';

  setEl('txt-notes-title', t('notes'));
  setEl('txt-notes-hint', t('notes.hint'));
  setEl('txt-save', t('save'));
  if (ta) ta.placeholder = t('notes.placeholder');

  show('notesOverlay');
  show('notesModal');
  setTimeout(() => ta?.focus(), 80);
}

function closeNotesModal() {
  hide('notesOverlay');
  hide('notesModal');
  editingQuestRef = null;
}

function saveNote() {
  if (!editingQuestRef) return;
  const { goalId, tierIdx, questIdx } = editingQuestRef;
  const goal = getGoal(goalId);
  if (goal) {
    goal.tiers[tierIdx].quests[questIdx].notes =
      (document.getElementById('notesInput')?.value || '').trim();
    saveState();
  }
  closeNotesModal();
  renderMain();
}

// ================================================================
//  Delete
// ================================================================
function openDeleteModal(goalId) {
  deletingGoalId = goalId;
  setEl('txt-delete-heading', t('delete.goal'));
  setEl('txt-delete-confirm', t('delete.confirm'));
  setEl('txt-cancel', t('cancel'));
  setEl('txt-delete', t('delete'));
  show('deleteOverlay');
  show('deleteModal');
}

function closeDeleteModal() {
  deletingGoalId = null;
  hide('deleteOverlay');
  hide('deleteModal');
}

function confirmDelete() {
  if (!deletingGoalId) return;
  state.goals = state.goals.filter(g => g.id !== deletingGoalId);
  if (currentGoalId === deletingGoalId) currentGoalId = null;
  deletingGoalId = null;
  saveState();
  closeDeleteModal();
  renderSidebar();
  renderMain();
}

// ================================================================
//  Create Goal
// ================================================================
function openCreateGoal() {
  const input = document.getElementById('goalTitleInput');
  if (input) input.value = '';

  // Localize
  setEl('txt-new-goal', t('new.goal'));
  setEl('txt-create', t('create.goal'));
  const inp = document.getElementById('goalTitleInput');
  if (inp) inp.placeholder = t('goal.placeholder');

  show('createGoalOverlay');
  show('createGoalModal');
  setTimeout(() => inp?.focus(), 80);
}

function closeCreateGoal() {
  hide('createGoalOverlay');
  hide('createGoalModal');
}

async function createGoal() {
  const title = (document.getElementById('goalTitleInput')?.value || '').trim();
  if (!title) {
    document.getElementById('goalTitleInput')?.focus();
    return;
  }

  const btn = document.getElementById('createGoalBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner" style="width:18px;height:18px;border-width:2px;margin-right:8px"></div> ${t('generating')}`;
  }

  try {
    const tiers = await callGemini(title);
    const goal = {
      id: 'g' + Date.now(),
      title,
      createdAt: Date.now(),
      status: 'active',
      currentTier: 0,
      tiers
    };
    state.goals.push(goal);
    saveState();

    closeCreateGoal();
    currentGoalId = goal.id;
    currentTierIdx = 0;
    renderSidebar();
    renderMain();

  } catch (err) {
    showToast('Error: ' + (err.message || 'Failed'));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fas fa-wand-magic-sparkles" style="margin-right:7px"></i><span id="txt-create">${t('create.goal')}</span>`;
    }
  }
}

// ================================================================
//  Gemini API
// ================================================================




// async function callGemini(goalTitle) {
//   const p = state.profile;
//   const profileParts = [
//     p.name   ? `User name: ${p.name} ${p.surname}` : '',
//     p.bio    ? `About them: ${p.bio}` : '',
//     p.interests ? `Interests: ${p.interests}` : ''
//   ].filter(Boolean);

//   const profileContext = profileParts.length
//     ? `\nUser context:\n${profileParts.join('\n')}\n`
//     : '';

//   const prompt = `You are an expert goal-achievement coach. Create a structured 10-tier learning roadmap for the following goal.
// ${profileContext}
// Goal: "${goalTitle}"

// Rules:
// - Exactly 10 tiers, progressing from absolute beginner to mastery
// - Each tier has exactly 10 specific, actionable quests (tasks)
// - Quests should be concrete and completable, not vague
// - Tier titles should be short and descriptive (e.g. "Tier 1: Foundations")
// - Tailor quests to the user's profile if provided

// Respond with ONLY valid JSON, no markdown fences, no extra text:
// {
//   "tiers": [
//     {
//       "title": "Tier 1: Foundations",
//       "quests": [
//         "Quest description 1",
//         "Quest description 2",
//         "Quest description 3",
//         "Quest description 4",
//         "Quest description 5",
//         "Quest description 6",
//         "Quest description 7",
//         "Quest description 8",
//         "Quest description 9",
//         "Quest description 10"
//       ]
//     }
//   ]
// }`;

//   const resp = await fetch(
//     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${state.settings.geminiApiKey}`,
//     {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         contents: [{ parts: [{ text: prompt }] }],
//         generationConfig: { temperature: 0.72, maxOutputTokens: 6000 }
//       })
//     }
//   );

//   if (!resp.ok) {
//     const body = await resp.json().catch(() => ({}));
//     throw new Error(body?.error?.message || `HTTP ${resp.status}`);
//   }

//   const data = await resp.json();
//   const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
//   if (!rawText) throw new Error('No response from Gemini');

//   // Strip markdown fences just in case
//   const clean = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/,'').trim();
//   const parsed = JSON.parse(clean);

//   if (!parsed.tiers || !Array.isArray(parsed.tiers)) {
//     throw new Error('Invalid response structure from Gemini');
//   }

//   // Normalize to exactly 10 tiers with 10 quests each
//   const tiers = [];
//   for (let i = 0; i < 10; i++) {
//     const src = parsed.tiers[i] || {};
//     const rawQ = Array.isArray(src.quests) ? src.quests : [];
//     const quests = [];
//     for (let j = 0; j < 10; j++) {
//       const qTitle = typeof rawQ[j] === 'string' ? rawQ[j]
//                    : typeof rawQ[j]?.title === 'string' ? rawQ[j].title
//                    : `Task ${j + 1}`;
//       quests.push({ title: qTitle, completed: false, notes: '' });
//     }
//     tiers.push({
//       title: typeof src.title === 'string' ? src.title : `Tier ${i + 1}`,
//       quests
//     });
//   }

//   return tiers;
// }

// async function callGemini(goalTitle) {
//   const p = state.profile;

//   const profileContext = [
//     p.name      ? `User name: ${p.name} ${p.surname ?? ''}`.trim() : '',
//     p.bio       ? `About them: ${p.bio}` : '',
//     p.interests ? `Interests: ${p.interests}` : '',
//   ].filter(Boolean).join('\n');

//   const prompt = `You are an expert goal-achievement coach. Create a structured 10-tier learning roadmap.
// ${profileContext ? `\nUser context:\n${profileContext}\n` : ''}
// Goal: "${goalTitle}"

// Rules:
// - Exactly 10 tiers, absolute beginner to mastery
// - Each tier has exactly 10 concrete, actionable quests
// - Tier titles: short and descriptive (e.g. "Tier 1: Foundations")
// - Tailor quests to user profile if provided

// Respond with ONLY valid JSON, no markdown, no extra text:
// {"tiers":[{"title":"Tier 1: Foundations","quests":["quest 1","quest 2","quest 3","quest 4","quest 5","quest 6","quest 7","quest 8","quest 9","quest 10"]}]}`;

//   // Gemini free tier: 15 RPM, so we try once per model with generous delays
//   const MODELS = [
//     'gemini-2.0-flash',
//     'gemini-2.0-flash-lite',
//   ];

//   const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
//   const KEY = state.settings.geminiApiKey;

//   for (let m = 0; m < MODELS.length; m++) {
//     const model = MODELS[m];

//     // Wait before each model switch (except first attempt)
//     if (m > 0) await sleep(5000);

//     let lastErr;
//     for (let attempt = 0; attempt < 3; attempt++) {
//       // Exponential backoff: 0ms, 4s, 10s
//       if (attempt > 0) await sleep(attempt === 1 ? 4000 : 10000);

//       try {
//         const resp = await fetch(`${BASE_URL}/${model}:generateContent?key=${KEY}`, {
//           method: 'POST',
//           headers: { 'Content-Type': 'application/json' },
//           body: JSON.stringify({
//             contents: [{ parts: [{ text: prompt }] }],
//             generationConfig: { temperature: 0.7, maxOutputTokens: 6000 },
//           }),
//         });

//         // Key problem — stop everything
//         if (resp.status === 400 || resp.status === 401 || resp.status === 403) {
//           const body = await resp.json().catch(() => ({}));
//           const msg = body?.error?.message || `Auth error (${resp.status})`;
//           throw new Error(msg);
//         }

//         // Rate limited — retry this model
//         if (resp.status === 429) {
//           const body = await resp.json().catch(() => ({}));
//           lastErr = new Error(body?.error?.message || 'Rate limited (429)');
//           continue; // go to next attempt with backoff
//         }

//         // Other HTTP error
//         if (!resp.ok) {
//           const body = await resp.json().catch(() => ({}));
//           lastErr = new Error(body?.error?.message || `HTTP ${resp.status}`);
//           continue;
//         }

//         const data    = await resp.json();
//         const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
//         if (!rawText) {
//           lastErr = new Error('Empty response from Gemini');
//           continue;
//         }

//         return parseGeminiResponse(rawText); // ✅ success

//       } catch (err) {
//         // Auth errors bubble up immediately
//         if (err.message.includes('expired') ||
//             err.message.includes('invalid') ||
//             err.message.includes('Auth error')) {
//           throw err;
//         }
//         lastErr = err;
//       }
//     }

//     // All 3 attempts failed for this model, try next model
//     console.warn(`Model ${model} failed:`, lastErr?.message);
//   }

//   throw new Error('All models exhausted. Check your Gemini API key and quota at aistudio.google.com');
// }

// function sleep(ms) {
//   return new Promise(r => setTimeout(r, ms));
// }

// function parseGeminiResponse(rawText) {
//   // Strip markdown fences
//   let clean = rawText
//     .replace(/^```json\s*/i, '')
//     .replace(/^```\s*/i, '')
//     .replace(/```\s*$/, '')
//     .trim();

//   let parsed;
//   try {
//     parsed = JSON.parse(clean);
//   } catch {
//     // Extract first {...} block as fallback
//     const match = clean.match(/\{[\s\S]*\}/);
//     if (!match) throw new Error('Cannot parse Gemini response as JSON');
//     parsed = JSON.parse(match[0]);
//   }

//   if (!Array.isArray(parsed?.tiers)) {
//     throw new Error('Response missing tiers array');
//   }

//   return Array.from({ length: 10 }, (_, i) => {
//     const src  = parsed.tiers[i] ?? {};
//     const rawQ = Array.isArray(src.quests) ? src.quests : [];

//     const quests = Array.from({ length: 10 }, (_, j) => {
//       const q = rawQ[j];
//       const title =
//         typeof q === 'string'        ? q :
//         typeof q?.title === 'string' ? q.title :
//         `Task ${j + 1}`;
//       return { title, completed: false, notes: '' };
//     });

//     return {
//       title: typeof src.title === 'string' ? src.title : `Tier ${i + 1}`,
//       quests,
//     };
//   });
// }


// ================================================================
// AI ROADMAP GENERATOR
// ================================================================

// const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
// const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-70b-versatile', 'llama3-70b-8192'];
// const TIERS_COUNT  = 10;
// const QUESTS_COUNT = 10;
 
// const sleep = ms => new Promise(r => setTimeout(r, ms));
 
// /* ── 1. Prompt builder (Python _build_prompt logic → JS) ── */
// function buildGroqPrompt(goalTitle) {
//   const p = state.profile ?? {};
//   const ctx = [
//     p.name        ? `Name: ${[p.name, p.surname].filter(Boolean).join(' ')}` : '',
//     p.bio         ? `About: ${p.bio}` : '',
//     p.interests   ? `Interests: ${p.interests}` : '',
//   ].filter(Boolean).join(', ') || 'General';
 
//   return `Generate a roadmap for: "${goalTitle}"
// User context: ${ctx}
// Format: JSON array with 100 objects, each having "tier" (1-10), "order" (1-10), "title" (string).
// Example: [{"tier":1,"order":1,"title":"First step..."},{"tier":1,"order":2,"title":"Second step..."}]
// Rules: 10 tiers × 10 quests, concrete actionable steps, progress beginner to mastery.`;
// }
 
// /* ── 2. Response parser (Python strip + json.loads logic → JS) ── */
// function parseGroqResponse(rawText) {
//   // Strip markdown fences (same as Python)
//   let clean = rawText.trim();
//   if (clean.startsWith('```json')) clean = clean.slice(7);
//   else if (clean.startsWith('```')) clean = clean.slice(3);
//   if (clean.endsWith('```')) clean = clean.slice(0, -3);
//   clean = clean.trim();
 
//   // Extract JSON array if wrapped in extra text
//   const start = clean.indexOf('[');
//   const end   = clean.lastIndexOf(']');
//   if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);
 
//   let flatQuests;
//   try {
//     flatQuests = JSON.parse(clean);
//   } catch {
//     throw new Error('JSON parse failed: ' + clean.slice(0, 120));
//   }
 
//   if (!Array.isArray(flatQuests)) throw new Error('Expected JSON array');
 
//   // Convert flat [{tier,order,title}] → nested [{title, quests:[]}]
//   // Same data shape as Python generate_roadmap() return value
//   const tierMap = {};
//   for (const q of flatQuests) {
//     const t = q.tier || 1;
//     if (!tierMap[t]) tierMap[t] = [];
//     tierMap[t].push(q);
//   }
 
//   return Array.from({ length: TIERS_COUNT }, (_, i) => {
//     const tierNum  = i + 1;
//     const tierQ    = (tierMap[tierNum] || []).sort((a, b) => (a.order || 0) - (b.order || 0));
//     const quests   = Array.from({ length: QUESTS_COUNT }, (_, j) => ({
//       title:     tierQ[j]?.title || `Task ${j + 1}`,
//       completed: false,
//       notes:     '',
//     }));
//     return {
//       title:  `Tier ${tierNum}`,
//       quests,
//     };
//   });
// }
 
// /* ── 3. Fallback roadmap (Python _fallback_roadmap → JS) ── */
// function fallbackRoadmap(goalTitle) {
//   const BASE = [
//     'Research and understand the fundamentals',
//     'Set clear measurable objectives',
//     'Create a detailed action plan',
//     'Identify required resources',
//     'Find a mentor or expert in the field',
//     'Take an introductory course',
//     'Practice basic skills daily',
//     'Join a community of practitioners',
//     'Read top 5 books on the topic',
//     'Attend relevant events or workshops',
//     'Build your first project',
//     'Get feedback from experts',
//     'Iterate and improve based on feedback',
//     'Network with professionals in the field',
//     'Create a portfolio of your work',
//     'Develop a unique personal approach',
//     'Teach what you have learned to others',
//     'Scale your efforts systematically',
//     'Measure and track your progress',
//     'Celebrate milestones and reflect',
//   ];
//   return Array.from({ length: TIERS_COUNT }, (_, i) => ({
//     title:  `Tier ${i + 1}`,
//     quests: Array.from({ length: QUESTS_COUNT }, (_, j) => ({
//       title:     `${BASE[((i * 10) + j) % BASE.length]} — ${goalTitle}`,
//       completed: false,
//       notes:     '',
//     })),
//   }));
// }
 
// /* ── 4. Main caller with retry logic (ai_views.py robustness → JS) ── */
// async function callGemini(goalTitle) {   // name kept so rest of code works unchanged
//   const apiKey = (state.settings.geminiApiKey || '').trim();
//   if (!apiKey) throw new Error(t('api.missing'));
 
//   const prompt = buildGroqPrompt(goalTitle);
//   const SYSTEM = 'You are a goal-setting assistant. Generate a roadmap of 100 concrete, specific quests divided into 10 tiers (10 quests per tier). Each quest should be a unique, actionable step. Return ONLY valid JSON array with no additional text.';
 
//   let lastError = null;
 
//   for (const model of GROQ_MODELS) {
//     for (let attempt = 0; attempt < 3; attempt++) {
//       if (attempt > 0) await sleep(attempt * 4000);
 
//       try {
//         const resp = await fetch(GROQ_URL, {
//           method: 'POST',
//           headers: {
//             'Content-Type':  'application/json',
//             'Authorization': `Bearer ${apiKey}`,
//           },
//           body: JSON.stringify({
//             model,
//             messages: [
//               { role: 'system', content: SYSTEM },
//               { role: 'user',   content: prompt },
//             ],
//             temperature:  0.8,
//             max_tokens:   8000,
//           }),
//         });
 
//         // 429 → wait and retry
//         if (resp.status === 429) {
//           const body  = await resp.json().catch(() => ({}));
//           const match = (body?.error?.message || '').match(/(\d+)\s*s/);
//           const wait  = match ? parseInt(match[1], 10) : 15;
//           await sleep(wait * 1000);
//           continue;
//         }
 
//         // Auth errors → no point retrying
//         if (resp.status === 401 || resp.status === 403) {
//           const body = await resp.json().catch(() => ({}));
//           throw new Error(body?.error?.message || `Auth error (${resp.status}) — check your Groq API key`);
//         }
 
//         if (!resp.ok) {
//           lastError = new Error(`HTTP ${resp.status}`);
//           continue;
//         }
 
//         const data   = await resp.json();
//         const rawText = data.choices?.[0]?.message?.content;
//         if (!rawText) { lastError = new Error('Empty AI response'); continue; }
 
//         try {
//           return parseGroqResponse(rawText);
//         } catch (parseErr) {
//           lastError = parseErr;
//           continue;
//         }
 
//       } catch (err) {
//         // Auth errors bubble up immediately
//         if (err.message.includes('Auth error') || err.message.includes('API key')) throw err;
//         lastError = err;
//         continue;
//       }
//     }
//   }
 
//   // All models + retries failed → use fallback
//   console.warn('Groq failed, using fallback:', lastError?.message);
//   return fallbackRoadmap(goalTitle);
// }
 

/**
 * ── STATIC ROADMAP TEMPLATE ──
 * A structured progression from absolute beginner to mastery.
 * Each tier represents a specific phase of the learning journey.
 */
const ROADMAP_ARCHETYPE = [
  {
    tier: "Foundations & Terminology",
    steps: [
      "Define core concepts of {goal}",
      "Learn the history and evolution of {goal}",
      "Identify the top 5 industry leaders in {goal}",
      "Understand the basic vocabulary and jargon",
      "Research the 'Why' behind successful {goal} projects",
      "Set up your learning environment for {goal}",
      "Map out the sub-disciplines within the field",
      "Join 3 online forums dedicated to {goal}",
      "Find a beginner's 'Roadmap' specifically for {goal}",
      "Document your current baseline and 'Day 1' goals"
    ]
  },
  {
    tier: "Resource Gathering & Tools",
    steps: [
      "Select the best 3 books on {goal}",
      "Curate a YouTube playlist of {goal} tutorials",
      "Install and configure necessary software/hardware",
      "Identify high-quality paid vs free resources",
      "Create a 'Resource Vault' for bookmarking {goal} info",
      "Set a weekly budget (time/money) for {goal}",
      "Subscribe to {goal} newsletters for updates",
      "Analyze the toolkits used by experts in {goal}",
      "Find an open-source project related to {goal}",
      "Verify the credibility of your learning sources"
    ]
  },
  {
    tier: "Theoretical Deep Dive",
    steps: [
      "Study the underlying principles of {goal}",
      "Learn how {goal} impacts other industries",
      "Analyze case studies of common failures in {goal}",
      "Understand the ethical considerations of {goal}",
      "Watch a technical lecture on {goal} methodology",
      "Summarize the top 3 theories in the field",
      "Explain {goal} to a non-expert to test your knowledge",
      "Read a peer-reviewed paper or whitepaper on {goal}",
      "Identify current trends changing the face of {goal}",
      "Write a short essay on the future of {goal}"
    ]
  },
  {
    tier: "Hands-on Basic Drills",
    steps: [
      "Complete your first 'Hello World' equivalent in {goal}",
      "Perform daily 30-minute practice sessions",
      "Replicate a simple existing project in {goal}",
      "Troubleshoot 3 common beginner errors",
      "Document your initial hands-on workflow",
      "Focus on accuracy over speed in {goal} basics",
      "Learn a shortcut or automation for a repetitive task",
      "Compare your work to a 'standard' beginner project",
      "Implement a small change to a proven {goal} formula",
      "Build a simple habit loop to ensure daily progress"
    ]
  },
  {
    tier: "Intermediate Implementation",
    steps: [
      "Build a multi-stage project involving {goal}",
      "Incorporate 2 different techniques into one workflow",
      "Optimize your first project for better efficiency",
      "Learn to use professional-grade tools for {goal}",
      "Focus on 'Best Practices' and industry standards",
      "Debug or refactor an old {goal} attempt",
      "Standardize your personal {goal} workflow",
      "Experiment with 'Plan B' strategies in your project",
      "Increase the complexity of your practice drills",
      "Start a blog or log detailing your {goal} progress"
    ]
  },
  {
    tier: "Collaborative Practice & Feedback",
    steps: [
      "Submit your {goal} work for a public peer review",
      "Participate in a 48-hour 'Jam' or challenge",
      "Offer help to a beginner in {goal}",
      "Collaborate on a project with a partner",
      "Analyze feedback and create a 'Fix List'",
      "Join a live Q&A or workshop about {goal}",
      "Defend your choices in a {goal} project to others",
      "Learn how to give constructive criticism in this field",
      "Network with 3 people at your current level",
      "Adapt your style based on external professional input"
    ]
  },
  {
    tier: "Advanced Optimization",
    steps: [
      "Analyze the bottlenecks in your {goal} process",
      "Apply high-level performance optimization",
      "Learn the 'Math' or 'Deep Logic' behind {goal}",
      "Create a custom tool or template for your work",
      "Study 'Edge Cases'—what happens when things go wrong",
      "Refine your personal aesthetic/style in {goal}",
      "Focus on the last 10% of quality (The Polish)",
      "Automate 50% of your current {goal} workflow",
      "Study the psychology of {goal} user/consumer behavior",
      "Rewrite/Redesign your most successful project"
    ]
  },
  {
    tier: "Strategic Application",
    steps: [
      "Develop a 6-month roadmap for a major {goal} goal",
      "Analyze the ROI (Return on Investment) of your skills",
      "Create a 'Signature Project' that defines your style",
      "Learn how to manage a team on a {goal} project",
      "Pitch a {goal} idea to a professional or client",
      "Study the 'Business Side' of {goal}",
      "Diversify your application of {goal} across platforms",
      "Identify high-value problems in {goal} that need solving",
      "Implement risk-management strategies in your work",
      "Evaluate the scalability of your current projects"
    ]
  },
  {
    tier: "Contribution & Ecosystem",
    steps: [
      "Contribute to a major repository or library",
      "Write a detailed tutorial for an advanced topic",
      "Speak at a local meetup or online webinar",
      "Mentor someone through their first {goal} project",
      "Curate a list of 'Best Resources' for the community",
      "Participate in shaping {goal} industry standards",
      "Launch a public-facing product or initiative",
      "Translate a {goal} resource for a different language",
      "Organize a small community event around {goal}",
      "Apply for a professional certification or award"
    ]
  },
  {
    tier: "Mastery & Innovation",
    steps: [
      "Invent a new technique or approach in {goal}",
      "Publish an original research or thought-leadership piece",
      "Develop a long-term vision for the future of {goal}",
      "Become a go-to consultant for complex {goal} issues",
      "Maintain a high-level of consistency for 1 year+",
      "Audit your own mastery and identify the 'Final 1%'",
      "Build a legacy project that survives without you",
      "Integrate {goal} with a completely unrelated field",
      "Teach a Masterclass on {goal}",
      "Reflect on your journey and set a new 'Master' goal"
    ]
  }
];

/**
 * ── MAIN CALLER ──
 * Generates the roadmap without any API calls.
 */
async function callGemini(goalTitle) {
  // We simulate a tiny delay so the UI feels "active"
  await new Promise(r => setTimeout(r, 600));

  console.log(`Generating Template Roadmap for: ${goalTitle}`);

  const p = state.profile ?? {};
  const userName = p.name ? `${p.name}` : "User";

  // Map the archetype to the specific goalTitle
  return ROADMAP_ARCHETYPE.map((tierData, i) => {
    return {
      title: `Tier ${i + 1}: ${tierData.tier}`,
      quests: tierData.steps.map((step) => {
        // Replace the placeholder with the actual goal
        const formattedTitle = step.replace(/{goal}/g, goalTitle);
        
        return {
          title: formattedTitle,
          completed: false,
          notes: ''
        };
      })
    };
  });
}

// ================================================================
//  Profile
// ================================================================

function liveUpdateProfile() {
  // Update the avatar + name in sidebar instantly
  const name    = document.getElementById('pf-name')?.value || '';
  const surname = document.getElementById('pf-surname')?.value || '';
  const av = document.getElementById('pf-av');
  if (av) av.textContent = (name[0]||'?').toUpperCase() + (surname[0]||'').toUpperCase();
}

function saveProfile() {
  state.profile = {
    name:      (document.getElementById('pf-name')?.value || '').trim(),
    surname:   (document.getElementById('pf-surname')?.value || '').trim(),
    bio:       (document.getElementById('pf-bio')?.value || '').trim(),
    interests: (document.getElementById('pf-interests')?.value || '').trim(),
  };
  saveState();
  showToast(t('profile.saved'));
  renderSidebar();
}

// ================================================================
//  Show / Hide helpers
// ================================================================
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hide(id) { document.getElementById(id)?.classList.add('hidden'); }
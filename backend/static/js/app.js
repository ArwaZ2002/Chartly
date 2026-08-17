/* ============================================================
   Chartly — Frontend App
   Simple, clean SPA. Hash-based routing.
   ============================================================ */

const API_BASE = '/api';

// ---------------------------------------------------------------
// Icons (lucide-style inline SVGs)
// ---------------------------------------------------------------
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  upload: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m8 17 4-4 4 4"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  template: '<rect x="3" y="3" width="18" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  audit: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  settings: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  x: '<line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  pencil: '<path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  arrow: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="16" y2="12"/><line x1="12" x2="12.01" y1="8" y2="8"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  trending: '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  pie: '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
};

function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

// ---------------------------------------------------------------
// Core app object
// ---------------------------------------------------------------
const App = {
  token: localStorage.getItem('chartly_token') || null,
  user: JSON.parse(localStorage.getItem('chartly_user') || 'null'),

  async apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) { this.logout(true); throw new Error('Session expired'); }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Error ${res.status}`);
    }
    return res.json();
  },

  async login(email, password) {
    const data = await this.apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem('chartly_token', data.token);
    localStorage.setItem('chartly_user', JSON.stringify(data.user));
    return data;
  },

  logout(silent = false) {
    this.token = null;
    this.user = null;
    localStorage.removeItem('chartly_token');
    localStorage.removeItem('chartly_user');
    location.hash = '#login';
    if (!silent) this.toast('Signed out', 'info');
  },

  /* -------- formatting helpers -------- */
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  },

  formatNumber(n) { return n == null ? '0' : Number(n).toLocaleString(); },

  formatDate(d) {
    if (!d) return '—';
    const date = new Date(d);
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff / 86400000) + 'd ago';
    return date.toLocaleDateString();
  },

  formatDateTime(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  },

  chartAccent(type) {
    return { bar: 'orange', line: 'green', pie: 'purple', scatter: 'blue', area: 'indigo', histogram: 'green', box: 'orange', violin: 'purple', treemap: 'blue', funnel: 'indigo' }[type] || 'slate';
  },
  chartTypeLabel(type) {
    return { bar: 'Bar Chart', line: 'Line Chart', pie: 'Pie Chart', scatter: 'Scatter Plot', area: 'Area Chart', histogram: 'Histogram', box: 'Box Plot', violin: 'Violin Plot', treemap: 'Treemap', funnel: 'Funnel Chart' }[type] || type;
  },
  aggTypes: ['bar', 'line', 'area', 'pie', 'scatter', 'treemap', 'funnel'],
  rawTypes: ['histogram', 'box', 'violin'],

  /* -------- toast notifications -------- */
  ensureToasts() {
    if (!document.getElementById('toastContainer')) {
      const c = document.createElement('div');
      c.id = 'toastContainer';
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
  },

  toast(message, type = 'success', delay = 3600) {
    this.ensureToasts();
    const colors = { success: 'green', error: 'red', info: 'blue', warn: 'orange' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icon(type === 'success' ? 'check' : type === 'error' ? 'x' : type === 'warn' ? 'info' : 'info', 16)}</span><span>${this.escapeHtml(message)}</span>`;
    document.getElementById('toastContainer').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, delay);
  },

  /* -------- modal dialogs -------- */
  confirmDialog({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>${this.escapeHtml(title)}</h3>
          ${message ? `<p>${this.escapeHtml(message)}</p>` : ''}
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (act) {
          overlay.remove();
          resolve(act.dataset.act === 'ok');
        }
      });
    });
  },

  promptDialog({ title = 'Enter value', message = '', keyLabel = 'Value', defaultValue = '', placeholder = '', confirmText = 'Save' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>${this.escapeHtml(title)}</h3>
          ${message ? `<p>${this.escapeHtml(message)}</p>` : ''}
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">${this.escapeHtml(keyLabel)}</label>
            <input type="text" class="form-input" id="modalInput" value="${this.escapeHtml(defaultValue)}" placeholder="${this.escapeHtml(placeholder)}">
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="ok">${this.escapeHtml(confirmText)}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const input = overlay.querySelector('#modalInput');
      input.focus();
      input.select();
      const done = (val) => { overlay.remove(); resolve(val); };
      overlay.addEventListener('click', (e) => {
        const act = e.target.closest('[data-act]');
        if (act) done(act.dataset.act === 'ok' ? input.value.trim() : null);
      });
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(input.value.trim()); if (e.key === 'Escape') done(null); });
    });
  },

  /* -------- mobile drawer -------- */
  toggleDrawer(force) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;
    const open = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
  },

  /* -------- layout shell -------- */
  shell(activeKey, topTitle, inner) {
    return `
      <div class="layout">
        ${this.renderSidebar(activeKey)}
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="App.toggleDrawer(false)"></div>
        <div class="main">
          <header class="topbar">
            <button class="btn-icon" onclick="App.toggleDrawer()" aria-label="Menu">${icon('menu', 20)}</button>
            <span class="topbar-title">${this.escapeHtml(topTitle)}</span>
          </header>
          <div class="page">${inner}</div>
        </div>
      </div>`;
  },

  renderSidebar(activeKey) {
    const nav = [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'charts', label: 'Charts', icon: 'chart' },
      { key: 'templates', label: 'Templates', icon: 'template' },
    ];
    if (this.can('upload')) {
      nav.splice(1, 0, { key: 'upload', label: 'Upload Data', icon: 'upload' });
    }
    if (this.can('admin')) {
      nav.push(
        { key: 'audit', label: 'Audit Trail', icon: 'audit' },
        { key: 'users', label: 'Users', icon: 'users' },
        { key: 'settings', label: 'Settings', icon: 'settings' },
      );
    }
    const isActive = (k) => activeKey === k || (activeKey === 'charts' && ['charts'].includes(k) && k === 'charts');
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">${icon('chart', 17)}</div>
          <span class="brand-name">${this.escapeHtml(this.platformName())}</span>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-group-label">Menu</div>
          ${nav.map(i => `
            <a href="#${i.key}" class="nav-item ${isActive(i.key) ? 'active' : ''}">${icon(i.icon, 17)}<span>${i.label}</span></a>
          `).join('')}
        </nav>
        <div class="sidebar-user">
          <div class="avatar">${this.escapeHtml((this.user?.name || 'U')[0])}</div>
          <div class="user-meta">
            <div class="user-name">${this.escapeHtml(this.user?.name || 'User')}</div>
            <div class="user-role">${this.escapeHtml(this.user?.role || '')}</div>
          </div>
          <button class="btn-icon" title="Sign out" onclick="App.logout()">${icon('logout', 16)}</button>
        </div>
      </aside>`;
  },

  emptyState(iconName, title, text, actionHTML = '') {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(iconName, 22)}</div>
        <h3>${this.escapeHtml(title)}</h3>
        ${text ? `<p>${this.escapeHtml(text)}</p>` : ''}
        ${actionHTML}
      </div>`;
  },

  loading(text = 'Loading...') {
    return `<div class="loading"><span class="spinner"></span>${this.escapeHtml(text)}</div>`;
  },

  errBlock(message) {
    return `<div class="alert alert-error">${icon('info', 16)}<span>${this.escapeHtml(message)}</span></div>`;
  },

  /* -------- router -------- */
  pages: {},
  registerPage(hash, fn) { this.pages[hash] = fn; },

  renderApp() {
    const app = document.getElementById('app');
    if (!app) return;
    const hash = location.hash || '#login';
    if (this.pages[hash]) { this.pages[hash](app); return; }
    const sorted = Object.keys(this.pages).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
      if (key.length > 1 && hash.startsWith(key)) { this.pages[key](app); return; }
    }
    app.innerHTML = this.emptyState('file', 'Page not found', 'The page you are looking for does not exist.', '<a href="#dashboard" class="btn btn-primary">Go to Dashboard</a>');
  },

  auth() {
    if (!this.token) { location.hash = '#login'; return false; }
    return true;
  },

  /* -------- role-based UI -------- */
  can(action) {
    const role = this.user?.role;
    if (!role) return false;
    if (role === 'admin') return true;
    if (action === 'view' || action === 'export') return true;
    return role === 'analyst' && action !== 'admin';
  },

  settings: {},

  async loadSettings() {
    try {
      this.settings = await this.apiFetch('/settings/');
    } catch (_) { this.settings = {}; }
    return this.settings;
  },

  platformName() {
    return this.settings.platform_name || 'Chartly';
  },
};

// ---------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------
App.registerPage('#login', (app) => {
  if (App.token && App.user) { location.hash = '#dashboard'; return; }
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <div class="brand-mark">${icon('chart', 20)}</div>
          <h1>Chartly</h1>
          <p>Transform raw data into beautiful charts in minutes</p>
        </div>
        <form id="loginForm">
          <div class="form-group">
            <label class="form-label">Email address</label>
            <input type="email" id="email" class="form-input" placeholder="you@company.com" value="admin@chartly.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input type="password" id="password" class="form-input" placeholder="Enter your password" value="admin123" required>
          </div>
          <div id="loginError" style="display:none; margin-bottom:12px;"></div>
          <button type="submit" class="btn btn-primary" id="loginBtn" style="width:100%; padding:11px; font-size:14px;">
            Sign in
          </button>
        </form>
        <div class="demo-creds">
          <strong>Demo accounts</strong> — click to fill:<br>
          <a href="#" data-e="admin@chartly.com" data-p="admin123">Admin</a> ·
          <a href="#" data-e="analyst@chartly.com" data-p="analyst123">Analyst</a> ·
          <a href="#" data-e="viewer@chartly.com" data-p="viewer123">Viewer</a>
        </div>
      </div>
    </div>`;

  app.querySelectorAll('.demo-creds a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('email').value = a.dataset.e;
      document.getElementById('password').value = a.dataset.p;
    });
  });

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Signing in...';
    errEl.style.display = 'none';
    try {
      await App.login(email, password);
      location.hash = '#dashboard';
    } catch (err) {
      errEl.innerHTML = App.errBlock(err.message);
      errEl.style.display = 'block';
      btn.disabled = false; btn.innerHTML = 'Sign in';
    }
  });
});

// ---------------------------------------------------------------
// DASHBOARD
// ---------------------------------------------------------------
App.registerPage('#dashboard', async (app) => {
  if (!App.auth()) return;

  app.innerHTML = App.shell('dashboard', 'Dashboard', `
    <div class="page-header">
      <div>
        <h1>Welcome back, ${App.escapeHtml(App.user?.name || 'there')}</h1>
        <p class="subtitle">Here's what's happening in your analysis workspace.</p>
      </div>
      <div class="page-header-actions">
        ${App.can('upload') ? `<a href="#upload" class="btn btn-secondary">${icon('upload', 16)} Upload Data</a>` : ''}
        ${App.can('create') ? `<a href="#charts/new" class="btn btn-primary">${icon('plus', 16)} Create Chart</a>` : ''}
      </div>
    </div>

    <div class="stats-grid" id="statsGrid">
      <div class="stat-card"><div class="stat-top"><div class="stat-icon indigo">${icon('database', 18)}</div><span class="stat-delta" id="deltaDatasets"></span></div><div class="stat-value" id="statDatasets">—</div><div class="stat-label">Datasets</div></div>
      <div class="stat-card"><div class="stat-top"><div class="stat-icon orange">${icon('chart', 18)}</div></div><div class="stat-value" id="statCharts">—</div><div class="stat-label">Charts Created</div></div>
      <div class="stat-card"><div class="stat-top"><div class="stat-icon purple">${icon('template', 18)}</div></div><div class="stat-value" id="statTemplates">—</div><div class="stat-label">Templates</div></div>
      <div class="stat-card"><div class="stat-top"><div class="stat-icon blue">${icon('trending', 18)}</div></div><div class="stat-value" id="statWeek">—</div><div class="stat-label">This Week</div></div>
    </div>

    <div class="section-title" style="margin-top:4px;">Quick Actions</div>
    <div class="actions-grid">
      ${App.can('upload') ? `
      <a href="#upload" class="action-card">
        <div class="action-icon indigo" style="background:var(--indigo-soft);color:var(--indigo);">${icon('upload', 20)}</div>
        <div class="action-body"><h4>Upload Data</h4><p>Import CSV or Excel files</p></div>
        <span class="action-arrow">${icon('chevron', 16)}</span>
      </a>` : ''}
      ${App.can('create') ? `
      <a href="#charts/new" class="action-card">
        <div class="action-icon orange" style="background:var(--orange-soft);color:var(--orange);">${icon('chart', 20)}</div>
        <div class="action-body"><h4>Create Chart</h4><p>Build charts from datasets</p></div>
        <span class="action-arrow">${icon('chevron', 16)}</span>
      </a>` : ''}
      <a href="#templates" class="action-card">
        <div class="action-icon purple" style="background:var(--purple-soft);color:var(--purple);">${icon('template', 20)}</div>
        <div class="action-body"><h4>Templates</h4><p>Pre-built chart layouts</p></div>
        <span class="action-arrow">${icon('chevron', 16)}</span>
      </a>
    </div>

    <div class="section-title" style="margin-top:4px;">Recent Activity ${App.user && App.user.role === 'admin' ? '<a href="#audit" class="btn btn-ghost btn-sm">View all</a>' : ''}</div>
    <div class="activity-list" id="activityList">${App.loading()}</div>
  `);

  // Stats
  try {
    const [datasets, charts, templates] = await Promise.allSettled([
      App.apiFetch('/datasets/'),
      App.apiFetch('/charts/'),
      App.apiFetch('/templates/'),
    ]);
    if (datasets.status === 'fulfilled') {
      const list = Array.isArray(datasets.value) ? datasets.value : [];
      document.getElementById('statDatasets').textContent = App.formatNumber(list.length);
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekCount = list.filter(d => new Date(d.uploaded_at) > weekAgo).length;
      document.getElementById('statWeek').textContent = App.formatNumber(weekCount);
      const deltaEl = document.getElementById('deltaDatasets');
      if (weekCount > 0) {
        deltaEl.textContent = `+${weekCount} this wk`;
        deltaEl.classList.remove('down');
      } else {
        deltaEl.textContent = 'No new';
      }
    }
    if (charts.status === 'fulfilled') {
      const list = Array.isArray(charts.value) ? charts.value : [];
      document.getElementById('statCharts').textContent = App.formatNumber(list.length);
    }
    if (templates.status === 'fulfilled') {
      const list = Array.isArray(templates.value) ? templates.value : [];
      document.getElementById('statTemplates').textContent = App.formatNumber(list.length);
    }
  } catch (_) {}

  // Activity feed
  try {
    const audit = await App.apiFetch('/audit/');
    const list = Array.isArray(audit) ? audit.slice(0, 5) : [];
    const el = document.getElementById('activityList');
    if (!el) return;
    if (list.length === 0) {
      el.innerHTML = App.emptyState('calendar', 'No recent activity', 'Activity will appear here as you work.');
    } else {
      el.innerHTML = list.map(a => `
        <div class="activity-item">
          <span class="activity-dot ${a.action === 'create' ? 'blue' : a.action === 'regenerate' ? 'orange' : 'green'}"></span>
          <div class="activity-content">
            <div class="activity-text"><strong>${App.escapeHtml(a.user_name || 'System')}</strong> ${App.escapeHtml(a.action)}d a chart
              ${App.escapeHtml((a.specification && a.specification.chart_type) ? '— ' + App.chartTypeLabel(a.specification.chart_type) : '')}
            </div>
            <div class="activity-time">${App.formatDate(a.timestamp)}</div>
          </div>
        </div>`).join('');
    }
  } catch (_) {
    const el = document.getElementById('activityList');
    if (el) el.innerHTML = App.emptyState('calendar', 'No recent activity', '');
  }
});

// ---------------------------------------------------------------
// UPLOAD
// ---------------------------------------------------------------
App.registerPage('#upload', async (app) => {
  if (!App.auth() || !App.can('upload')) { location.hash = '#dashboard'; return; }
  let datasets = [];
  let selectedId = null;

  app.innerHTML = App.shell('upload', 'Upload Data', `
    <div class="page-header">
      <div>
        <h1>Upload Data</h1>
        <p class="subtitle">Import a CSV or Excel file, or pick a dataset below to inspect it.</p>
      </div>
    </div>

    <div class="upload-zone" id="uploadZone">
      <div class="upload-zone-icon">${icon('upload', 24)}</div>
      <h3>Drop your file here</h3>
      <p>or <span class="browse-link">click to browse</span></p>
      <p class="upload-formats">Supports CSV, XLSX, XLS — max 50 MB</p>
      <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" hidden>
    </div>

    <div id="uploadProgress" style="display:none; padding:14px 16px; margin-bottom:20px;" class="card">
      <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
        <span id="progressFileName">file.csv</span>
        <span id="progressFileSize" style="color:var(--text-muted); font-weight:500;">0 KB</span>
      </div>
      <div class="progress-track"><div class="progress-bar" id="progressBar" style="width:0%"></div></div>
      <div style="font-size:12px; color:var(--text-muted);" id="progressStatus">Uploading...</div>
    </div>

    <div class="upload-layout" style="margin-top:20px;">
      <div>
        <div class="section-title" style="margin-bottom:10px;">
          <span>Datasets <span class="badge slate" id="dsCount">0</span></span>
          <input type="text" class="form-input" id="dsSearch" placeholder="Search... " style="width:130px; padding:6px 10px; font-size:12.5px;">
        </div>
        <div class="card upload-list" id="datasetsList">${App.loading('Loading datasets...')}</div>
      </div>
      <div id="datasetDetail"><div class="card" style="padding:22px; color:var(--text-muted); text-align:center; font-size:13px;">Select a dataset to view details and create charts.</div></div>
    </div>
  `);

  const fileInput = document.getElementById('fileInput');
  const zone = document.getElementById('uploadZone');
  const dsListEl = document.getElementById('datasetsList');
  const detailEl = document.getElementById('datasetDetail');
  const searchEl = document.getElementById('dsSearch');

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function renderList(filter = '') {
    const list = datasets.filter(d => !filter || (d.name || '').toLowerCase().includes(filter.toLowerCase()));
    document.getElementById('dsCount').textContent = datasets.length;
    if (datasets.length === 0) {
      dsListEl.innerHTML = App.emptyState('file', 'No datasets yet', 'Upload a file above to get started.');
      return;
    }
    if (list.length === 0) {
      dsListEl.innerHTML = '<p style="padding:16px; font-size:13px; color:var(--text-muted);">No matches</p>';
      return;
    }
    dsListEl.innerHTML = list.map(d => `
      <div class="dataset-item ${d.id === selectedId ? 'selected' : ''}" data-id="${d.id}">
        <div class="dataset-item-icon">${icon('file', 16)}</div>
        <div class="dataset-item-info">
          <div class="dataset-item-name">${App.escapeHtml(d.name)}</div>
          <div class="dataset-item-meta">${App.formatNumber(d.row_count)} rows · ${d.columns?.length || 0} cols · ${App.formatDate(d.uploaded_at)}</div>
        </div>
        ${App.can('delete') ? `<button class="btn-icon danger delete-ds" data-id="${d.id}" title="Delete">${icon('trash', 15)}</button>` : ''}
      </div>`).join('');

    dsListEl.querySelectorAll('.dataset-item').forEach(item => {
      item.addEventListener('click', () => { selectedId = item.dataset.id; renderList(searchEl.value); renderDetail(selectedId); });
    });
    dsListEl.querySelectorAll('.delete-ds').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const ds = datasets.find(d => d.id === btn.dataset.id);
        const ok = await App.confirmDialog({
          title: 'Delete dataset?',
          message: `"${ds ? ds.name : 'This dataset'}" and all its charts will be removed. This cannot be undone.`,
          confirmText: 'Delete',
          danger: true,
        });
        if (!ok) return;
        try {
          await App.apiFetch(`/datasets/${btn.dataset.id}`, { method: 'DELETE' });
          datasets = datasets.filter(d => d.id !== btn.dataset.id);
          if (selectedId === btn.dataset.id) selectedId = null;
          renderList(searchEl.value);
          if (!selectedId) detailEl.innerHTML = '<div class="card" style="padding:22px; color:var(--text-muted); text-align:center; font-size:13px;">Select a dataset to view details.</div>';
          App.toast('Dataset deleted', 'info');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    });
  }

  async function renderDetail(dsId) {
    const ds = datasets.find(d => d.id === dsId);
    if (!ds) return;
    detailEl.innerHTML = `
      <div class="card" style="padding:22px;">
        <div class="chart-detail-head">
          <div style="display:flex; gap:12px; align-items:flex-start;">
            <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo); flex-shrink:0;">${icon('file', 18)}</div>
            <div>
              <h2 style="font-size:17px; font-weight:800;">${App.escapeHtml(ds.name)}</h2>
              <p class="subtitle" style="font-size:12.5px;">Uploaded ${App.formatDate(ds.uploaded_at)}</p>
            </div>
          </div>
          <div style="display:flex; gap:8px;">
            ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="renameBtn">${icon('pencil', 14)} Rename</button>` : ''}
            ${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary btn-sm">${icon('plus', 14)} Create Chart</a>` : ''}
          </div>
        </div>
        <div class="dataset-stat-row">
          <div class="dataset-stat"><div class="v">${App.formatNumber(ds.row_count)}</div><div class="l">Rows</div></div>
          <div class="dataset-stat"><div class="v">${ds.columns?.length || 0}</div><div class="l">Columns</div></div>
          <div class="dataset-stat"><div class="v">${ds.file_name ? ds.file_name.split('.').pop().toUpperCase() : '—'}</div><div class="l">Format</div></div>
        </div>
        <div style="margin-bottom:16px;">
          ${(ds.columns || []).map(c => `
            <span class="column-chip">
              ${App.escapeHtml(c.name)}
              <span class="t ${c.type === 'number' ? 'num' : c.type === 'date' ? 'date' : ''}">${c.type}</span>
            </span>`).join('')}
        </div>
        <div class="section-title" style="margin-bottom:10px;">Preview <span class="badge slate">first rows</span></div>
        <div id="previewBox"><div class="loading" style="padding:16px;"><span class="spinner"></span></div></div>
      </div>`;

    const renameBtn = document.getElementById('renameBtn');
    if (renameBtn) {
      renameBtn.addEventListener('click', async () => {
        const newName = await App.promptDialog({ title: 'Rename dataset', keyLabel: 'New name', defaultValue: ds.name, confirmText: 'Save' });
        if (!newName || newName === ds.name) return;
        try {
          await App.apiFetch(`/datasets/${ds.id}`, { method: 'PATCH', body: { name: newName } });
          ds.name = newName;
          renderList(searchEl.value);
          renderDetail(dsId);
          App.toast('Dataset renamed');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    }

    try {
      const preview = await App.apiFetch(`/datasets/${dsId}/preview`);
      const rows = (preview.rows || []).slice(0, 8);
      const cols = preview.columns || [];
      const box = document.getElementById('previewBox');
      box.innerHTML = rows.length === 0
        ? '<p style="font-size:13px; color:var(--text-muted); padding:8px 0;">No data to preview</p>'
        : `<div class="table-wrap" style="border:1px solid var(--border); border-radius:var(--radius-sm);">
            <table class="data-table">
              <thead><tr>${cols.map(c => `<th>${App.escapeHtml(c)}</th>`).join('')}</tr></thead>
              <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${App.escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>
          </div>`;
    } catch (e) {
      document.getElementById('previewBox').innerHTML = '<p style="font-size:13px; color:var(--text-muted); padding:8px 0;">Preview unavailable</p>';
    }
  }

  // Load datasets
  try {
    const data = await App.apiFetch('/datasets/');
    datasets = Array.isArray(data) ? data : [];
  } catch (_) { datasets = []; }
  renderList();

  searchEl.addEventListener('input', () => renderList(searchEl.value));

  // Upload flow
  async function uploadFile(file) {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!['.csv', '.xlsx', '.xls'].includes(ext)) { App.toast('Invalid file type — use CSV or Excel', 'error'); return; }
    if (file.size > 50 * 1024 * 1024) { App.toast('File too large (max 50 MB)', 'error'); return; }

    const progressContainer = document.getElementById('uploadProgress');
    progressContainer.style.display = 'block';
    document.getElementById('progressFileName').textContent = file.name;
    document.getElementById('progressFileSize').textContent = formatBytes(file.size);
    document.getElementById('progressStatus').textContent = 'Uploading...';
    const bar = document.getElementById('progressBar');
    bar.style.width = '0%';

    let progress = 0;
    const fakeInterval = setInterval(() => { progress = Math.min(progress + Math.random() * 15, 90); bar.style.width = progress + '%'; }, 200);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const data = await App.apiFetch('/datasets/upload', { method: 'POST', body: formData, headers: {} });
      clearInterval(fakeInterval);
      bar.style.width = '100%';
      document.getElementById('progressStatus').textContent = 'Complete!';

      const updated = await App.apiFetch('/datasets/');
      datasets = Array.isArray(updated) ? updated : [];
      selectedId = data.id;
      setTimeout(() => {
        progressContainer.style.display = 'none';
        fileInput.value = '';
        renderList(searchEl.value);
        renderDetail(data.id);
        App.toast(`Uploaded "${data.name}" — ${App.formatNumber(data.row_count)} rows`);
      }, 500);
    } catch (err) {
      clearInterval(fakeInterval);
      progressContainer.style.display = 'none';
      fileInput.value = '';
      App.toast('Upload failed: ' + err.message, 'error');
    }
  }

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.upload-zone') && !e.target.closest('input')) fileInput.click();
  });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); });
  ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag-over'); }));
  ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drag-over'); }));
  zone.addEventListener('drop', (e) => { const file = e.dataTransfer.files[0]; if (file) uploadFile(file); });
});

// ---------------------------------------------------------------
// CHARTS (Projects)
// ---------------------------------------------------------------
App.registerPage('#charts', async (app) => {
  if (!App.auth()) return;
  app.innerHTML = App.shell('charts', 'Charts', `
    <div class="page-header">
      <div>
        <h1>Projects</h1>
        <p class="subtitle">Every dataset is a project that can hold multiple charts.</p>
      </div>
      <div class="page-header-actions">
        ${App.can('upload') ? `<a href="#upload" class="btn btn-primary">${icon('upload', 16)} New Project</a>` : ''}
      </div>
    </div>
    <div id="projectsList">${App.loading()}</div>
  `);

  const listEl = document.getElementById('projectsList');
  try {
    const [datasets, charts] = await Promise.all([
      App.apiFetch('/datasets/'),
      App.apiFetch('/charts/'),
    ]);
    const dsList = Array.isArray(datasets) ? datasets : [];
    const chartList = Array.isArray(charts) ? charts : [];

    if (dsList.length === 0) {
      listEl.innerHTML = App.emptyState('database', 'No projects yet', 'Upload a dataset to create your first project.', '<a href="#upload" class="btn btn-primary">Upload Data</a>');
      return;
    }

    listEl.innerHTML = `<div class="projects-grid">${dsList.map(ds => {
      const count = chartList.filter(c => c.dataset_id === ds.id).length;
      return `
        <a href="#charts/project/${ds.id}" class="project-card">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo);">${icon('file', 17)}</div>
            <span class="badge ${count > 0 ? 'orange' : 'slate'}">${count} chart${count !== 1 ? 's' : ''}</span>
          </div>
          <div>
            <h3 style="font-size:14.5px; font-weight:700;">${App.escapeHtml(ds.display_name || ds.name)}</h3>
            <p class="meta" style="font-size:12.5px; color:var(--text-secondary); margin-top:2px;">${App.formatNumber(ds.row_count)} rows · ${ds.columns?.length || 0} columns</p>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <small class="date" style="font-size:11.5px; color:var(--text-muted);">Created ${App.formatDate(ds.uploaded_at)}</small>
            <span style="color:var(--text-muted);">${icon('chevron', 15)}</span>
          </div>
        </a>`;
    }).join('')}</div>`;
  } catch (err) {
    listEl.innerHTML = App.errBlock(err.message);
  }
});

// ---------------------------------------------------------------
// PROJECT DETAIL
// ---------------------------------------------------------------
App.registerPage('#charts/project/', async (app) => {
  if (!App.auth()) return;
  const datasetId = location.hash.split('/')[2];

  app.innerHTML = App.shell('charts', 'Project', `
    <div class="page-header"><a href="#charts" class="btn btn-secondary btn-sm">${icon('arrow', 15)} Back to Projects</a></div>
    <div id="projectContent">${App.loading()}</div>
  `);

  const contentEl = document.getElementById('projectContent');
  try {
    const [datasets, charts] = await Promise.all([
      App.apiFetch('/datasets/'),
      App.apiFetch('/charts/'),
    ]);
    const dsList = Array.isArray(datasets) ? datasets : [];
    const chartList = Array.isArray(charts) ? charts : [];
    const ds = dsList.find(d => d.id === datasetId);
    if (!ds) throw new Error('Project not found');
    const dsCharts = chartList.filter(c => c.dataset_id === datasetId);

    contentEl.innerHTML = `
      <div class="card" style="padding:22px; margin-bottom:20px;">
        <div class="chart-detail-head">
          <div style="display:flex; gap:12px; align-items:center;">
            <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo);">${icon('file', 18)}</div>
            <div>
              <h2 style="font-size:18px; font-weight:800;">${App.escapeHtml(ds.display_name || ds.name)}</h2>
              <p class="subtitle" style="font-size:12.5px;">${App.formatNumber(ds.row_count)} rows · ${ds.columns?.length || 0} columns · ${dsCharts.length} chart${dsCharts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="renameBtn">${icon('pencil', 14)} Rename</button>` : ''}
            ${App.can('delete') ? `<button class="btn btn-danger btn-sm" id="deleteBtn">${icon('trash', 14)} Delete</button>` : ''}
            ${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary btn-sm">${icon('plus', 14)} New Chart</a>` : ''}
          </div>
        </div>
      </div>
      <div class="section-title">Charts <span class="badge slate">${dsCharts.length}</span></div>
      <div class="charts-grid" id="projectCharts">
        ${dsCharts.length === 0
          ? App.emptyState('chart', 'No charts yet', 'Create your first chart with this dataset.', `${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary">${icon('plus', 15)} Create Chart</a>` : ''}`)
          : dsCharts.map(c => {
              const spec = c.specification || {};
              const accent = App.chartAccent(spec.chart_type);
              return `
                <a href="#charts/${c.id}" class="chart-card">
                  <div class="chart-card-head">
                    <div class="chart-card-icon ${accent}" style="background:var(--${accent}-soft);color:var(--${accent});">${icon('chart', 16)}</div>
                    <span class="badge ${accent}">${App.escapeHtml(spec.chart_type || 'chart')}</span>
                  </div>
                  <div>
                    <h3>${App.escapeHtml(spec.title || 'Untitled Chart')}</h3>
                    <p class="meta">${spec.chart_type === 'histogram' ? `Distribution of ${App.escapeHtml(spec.dimension || '—')}` : `${App.escapeHtml(spec.dimension || '—')} vs ${App.escapeHtml(spec.metric || '—')}`}</p>
                  </div>
                  <small class="date">Created ${App.formatDate(c.created_at)}</small>
                </a>`;
            }).join('')
        }
      </div>`;

    const renameBtn = document.getElementById('renameBtn');
    if (renameBtn) {
      renameBtn.addEventListener('click', async () => {
        const newName = await App.promptDialog({ title: 'Rename project', keyLabel: 'Project name', defaultValue: ds.display_name || ds.name, confirmText: 'Save' });
        if (!newName || newName === (ds.display_name || ds.name)) return;
        try {
          await App.apiFetch(`/datasets/${ds.id}`, { method: 'PATCH', body: { name: newName } });
          ds.display_name = newName;
          location.reload();
        } catch (err) { App.toast(err.message, 'error'); }
      });
    }

    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        const ok = await App.confirmDialog({
          title: 'Delete project?',
          message: `"${ds.display_name || ds.name}" and all its charts will be removed. This cannot be undone.`,
          confirmText: 'Delete',
          danger: true,
        });
        if (!ok) return;
        try {
          await App.apiFetch(`/datasets/${datasetId}`, { method: 'DELETE' });
          location.hash = '#charts';
          App.toast('Project deleted', 'info');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    }
  } catch (err) {
    contentEl.innerHTML = App.errBlock(err.message);
  }
});

// ---------------------------------------------------------------
// NEW CHART (editor)
// ---------------------------------------------------------------
App.registerPage('#charts/new', async (app) => {
  if (!App.auth() || !App.can('create')) { location.hash = '#dashboard'; return; }

  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const preset = JSON.parse(sessionStorage.getItem('chartly_preset') || 'null');
  sessionStorage.removeItem('chartly_preset');
  const defaultType = App.settings.default_chart_type || 'bar';

  app.innerHTML = App.shell('charts', 'Create Chart', `
    <div class="page-header">
      <div><h1>Create Chart</h1><p class="subtitle">Pick a dataset, configure the visual, and generate it instantly.</p></div>
      <div class="page-header-actions"><a href="#charts" class="btn btn-secondary">${icon('arrow', 15)} Back</a></div>
    </div>
    <div id="presetBanner" style="display:none;"></div>
    <div class="chart-editor">
      <div class="card editor-config" id="editorConfig">
        <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Configuration</h3>
        <div class="form-group">
          <label class="form-label">Dataset</label>
          <select id="datasetSelect" class="form-select"><option value="">Loading...</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Chart type</label>
          <select id="chartType" class="form-select">
            <option value="bar">Bar Chart</option>
            <option value="line">Line Chart</option>
            <option value="area">Area Chart</option>
            <option value="pie">Pie Chart</option>
            <option value="scatter">Scatter Plot</option>
            <option value="histogram">Histogram</option>
            <option value="box">Box Plot</option>
            <option value="violin">Violin Plot</option>
            <option value="treemap">Treemap</option>
            <option value="funnel">Funnel Chart</option>
          </select>
          <p class="form-hint" id="typeHint"></p>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" id="dimLabel">X-axis (dimension)</label>
            <select id="dimension" class="form-select"><option value="">Select dataset first</option></select>
          </div>
          <div class="form-group">
            <label class="form-label" id="metLabel">Y-axis (metric)</label>
            <select id="metric" class="form-select"><option value="">Select dataset first</option></select>
          </div>
        </div>
        <div class="form-group" id="aggGroup">
          <label class="form-label">Aggregation</label>
          <select id="aggregation" class="form-select">
            <option value="sum">Sum</option>
            <option value="average">Average</option>
            <option value="count">Count</option>
            <option value="min">Min</option>
            <option value="max">Max</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Sorting</label>
            <select id="sorting" class="form-select">
              <option value="none">None</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div class="form-group" id="granularityGroup" style="display:none;">
            <label class="form-label">Time granularity</label>
            <select id="granularity" class="form-select">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="chartTitle" class="form-input" placeholder="e.g. Revenue by Region">
        </div>
        <div class="config-summary" id="configSummary" style="display:none;"></div>
        <button class="btn btn-primary" id="createChartBtn" style="width:100%; padding:11px;">${icon('chart', 16)} Generate Chart</button>
        <div class="recommend-box" style="margin-top:18px;">
          <div class="form-label" style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">${icon('sparkles', 13)} Suggestions</div>
          <div id="recommendList"><p class="form-hint" style="margin:0;">Select a dataset to see recommended chart types.</p></div>
        </div>
      </div>
      <div class="card editor-preview" id="editorPreview">
        <div class="empty-state" style="border:none; background:transparent;">
          <div class="empty-icon">${icon('chart', 22)}</div>
          <h3>Your chart preview goes here</h3>
          <p>Select a dataset, adjust the options, and click <strong>Generate Chart</strong>.</p>
        </div>
      </div>
    </div>
  `);

  const datasetSelect = document.getElementById('datasetSelect');
  const dimEl = document.getElementById('dimension');
  const metEl = document.getElementById('metric');
  const aggGroup = document.getElementById('aggGroup');
  const granGroup = document.getElementById('granularityGroup');
  let datasets = [];
  let currentDs = null;

  function populateColumns(ds) {
    if (!ds || !ds.columns) return;
    currentDs = ds;
    const allCols = ds.columns.map(c => c.name);
    const numCols = ds.columns.filter(c => c.type === 'number').map(c => c.name);
    dimEl.innerHTML = allCols.length
      ? allCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
      : '<option value="">No columns</option>';
    metEl.innerHTML = numCols.length
      ? numCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
      : '<option value="">No numeric columns</option>';
  }

  function dimIsDate() {
    if (!currentDs) return false;
    const col = (currentDs.columns || []).find(c => c.name === dimEl.value);
    return !!(col && col.type === 'date');
  }

  function updateGranularityUI() {
    const type = document.getElementById('chartType').value;
    const show = dimIsDate() && ['bar', 'line', 'area'].includes(type);
    granGroup.style.display = show ? '' : 'none';
  }

  function updateSummary() {
    const el = document.getElementById('configSummary');
    const type = document.getElementById('chartType').value;
    if (!type || !dimEl.value || !currentDs) { el.style.display = 'none'; return; }
    const isHistogram = type === 'histogram';
    const isRaw = App.rawTypes.includes(type);
    const agg = document.getElementById('aggregation').value;
    const sort = document.getElementById('sorting').value;
    const gran = document.getElementById('granularity').value;
    const parts = [App.chartTypeLabel(type), `${dimEl.value}${!isHistogram ? ' by ' + metEl.value : ''}`];
    if (!isRaw) parts.push(agg === 'count' ? 'counted' : agg + ' of ' + metEl.value);
    if (sort !== 'none') parts.push('sorted ' + sort);
    if (granGroup.style.display !== 'none' && gran) parts.push('per ' + gran);
    el.style.display = '';
    el.innerHTML = `${icon('info', 14)}<span><strong>Ready to generate:</strong> ${App.escapeHtml(parts.join(' — '))}</span>`;
  }

  function updateTypeUI() {
    const type = document.getElementById('chartType').value;
    const hint = document.getElementById('typeHint');
    const isRaw = App.rawTypes.includes(type);
    const isHistogram = type === 'histogram';
    aggGroup.style.display = isRaw ? 'none' : '';
    dimEl.disabled = false;
    metEl.disabled = isHistogram;
    if (isHistogram) {
      hint.textContent = 'Plots the distribution of the X-axis column — pick a numeric or categorical column. Y-axis not needed.';
    } else if (type === 'box' || type === 'violin') {
      hint.textContent = 'Shows the raw spread of Y values for each X category — aggregation is not applied.';
    } else {
      hint.textContent = type === 'treemap' || type === 'funnel'
        ? 'Aggregates the metric by the X-axis, then plots the hierarchy.'
        : '';
    }
    updateGranularityUI();
    updateSummary();
  }
  document.getElementById('chartType').addEventListener('change', updateTypeUI);
  dimEl.addEventListener('change', () => { updateGranularityUI(); updateSummary(); });
  metEl.addEventListener('change', updateSummary);
  document.getElementById('aggregation').addEventListener('change', updateSummary);
  document.getElementById('sorting').addEventListener('change', updateSummary);
  document.getElementById('granularity').addEventListener('change', updateSummary);

  async function loadRecommendations(dsId) {
    const el = document.getElementById('recommendList');
    el.innerHTML = App.loading('Checking columns...');
    try {
      const recs = await App.apiFetch(`/charts/recommendations/${dsId}`);
      const list = Array.isArray(recs) ? recs : [];
      el.innerHTML = list.length === 0
        ? '<p class="form-hint" style="margin:0;">No suggestions available.</p>'
        : list.map(r => `
            <div class="recommend-item" data-type="${r.chart_type}">
              <span class="icon">${icon('sparkles', 14)}</span>
              <span class="txt"><b>${App.chartTypeLabel(r.chart_type)}</b><span>${App.escapeHtml(r.reason)}</span></span>
            </div>`).join('');
      el.querySelectorAll('.recommend-item').forEach(item => {
        item.addEventListener('click', () => { document.getElementById('chartType').value = item.dataset.type; updateTypeUI(); });
      });
    } catch (_) {
      el.innerHTML = '<p class="form-hint" style="margin:0;">Suggestions unavailable for this dataset.</p>';
    }
  }

  try {
    const data = await App.apiFetch('/datasets/');
    datasets = Array.isArray(data) ? data : [];
    datasetSelect.innerHTML = datasets.length
      ? datasets.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}</option>`).join('')
      : '<option value="">No datasets found</option>';

    const presetDsId = params.get('datasetId') || (preset && preset.dataset_id ? preset.dataset_id : '');
    if (presetDsId && datasets.some(d => d.id === presetDsId)) {
      datasetSelect.value = presetDsId;
      populateColumns(datasets.find(d => d.id === presetDsId));
      loadRecommendations(presetDsId);
    }

    if (preset) {
      const banner = document.getElementById('presetBanner');
      banner.style.display = 'flex';
      banner.className = 'preset-banner';
      banner.innerHTML = `${icon('sparkles', 16)}<span>Template applied: <strong>${App.escapeHtml(preset.name)}</strong> — options pre-filled below.</span><span style="margin-left:auto;"><button class="btn-icon" onclick="this.closest('.preset-banner').style.display='none'" >${icon('x', 15)}</button></span>`;
      if (preset.chart_type) document.getElementById('chartType').value = preset.chart_type;
      if (preset.title) document.getElementById('chartTitle').value = preset.title;
      if (preset.aggregation) document.getElementById('aggregation').value = preset.aggregation;
      if (preset.sorting) document.getElementById('sorting').value = preset.sorting;
      if (preset.time_granularity) document.getElementById('granularity').value = preset.time_granularity;
      if (preset.dimension && dimEl.querySelector(`option[value="${CSS.escape(preset.dimension)}"]`)) dimEl.value = preset.dimension;
      if (preset.metric && metEl.querySelector(`option[value="${CSS.escape(preset.metric)}"]`)) metEl.value = preset.metric;
    } else {
      document.getElementById('chartType').value = defaultType;
    }
    updateTypeUI();
  } catch (e) {
    datasetSelect.innerHTML = '<option value="">Failed to load datasets</option>';
  }

  datasetSelect.addEventListener('change', () => {
    const id = datasetSelect.value;
    const ds = datasets.find(d => d.id === id);
    populateColumns(ds);
    if (ds) loadRecommendations(id);
    updateGranularityUI();
    updateSummary();
  });

  document.getElementById('createChartBtn').addEventListener('click', async () => {
    const dsId = datasetSelect.value;
    const dimension = dimEl.value;
    const metric = metEl.value;
    const chartType = document.getElementById('chartType').value;
    const aggregation = document.getElementById('aggregation').value;
    const isHistogram = chartType === 'histogram';
    const title = document.getElementById('chartTitle').value.trim() || (isHistogram ? `Distribution of ${dimension}` : `${metric} by ${dimension}`);

    if (!dsId) { App.toast('Please select a dataset', 'warn'); return; }
    if (!dimension) { App.toast('Please select an X-axis dimension', 'warn'); return; }
    if (!isHistogram && !metric && aggregation !== 'count') { App.toast('Please select a Y-axis metric', 'warn'); return; }

    const btn = document.getElementById('createChartBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating...';
    try {
      const result = await App.apiFetch('/charts/generate', {
        method: 'POST',
        body: {
          dataset_id: dsId,
          specification: {
            chart_type: chartType,
            dimension,
            metric: metric || dimension,
            aggregation,
            sorting: document.getElementById('sorting').value || 'none',
            time_granularity: granGroup.style.display !== 'none' ? document.getElementById('granularity').value : null,
            title,
          },
        },
      });
      App.toast('Chart generated successfully');
      location.hash = `#charts/${result.id}`;
    } catch (err) {
      App.toast(err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = `${icon('chart', 16)} Generate Chart`;
    }
  });
});

// ---------------------------------------------------------------
// CHART DETAIL
// ---------------------------------------------------------------
App.registerPage('#charts/', async (app) => {
  if (!App.auth()) return;
  const chartId = location.hash.split('/')[1];
  if (!chartId) { location.hash = '#charts'; return; }

  app.innerHTML = App.shell('charts', 'Chart', `
    <div class="page-header"><a href="#charts" class="btn btn-secondary btn-sm">${icon('arrow', 15)} Back to Projects</a></div>
    <div id="chartDetail">${App.loading('Rendering chart...')}</div>
  `);

  try {
    const [charts, datasets] = await Promise.all([
      App.apiFetch('/charts/'),
      App.apiFetch('/datasets/'),
    ]);
    const chart = (Array.isArray(charts) ? charts : []).find(c => c.id === chartId);
    if (!chart) throw new Error('Chart not found');
    const spec = chart.specification || {};
    const ds = (Array.isArray(datasets) ? datasets : []).find(d => d.id === chart.dataset_id);
    const plotlyCode = generatePlotlyCode(spec, chart.dataset_id);

    document.getElementById('chartDetail').innerHTML = `
      <div class="card" style="padding:22px; margin-bottom:20px;">
        <div class="chart-detail-head">
          <div>
            <h2>${App.escapeHtml(spec.title || 'Untitled Chart')}</h2>
            <p class="subtitle" style="font-size:12.5px;">${ds ? App.escapeHtml(ds.name) : 'Dataset removed'} · ${App.formatDate(chart.created_at)}</p>
          </div>
          <div class="page-header-actions">
            ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="editChartBtn">${icon('pencil', 14)} Edit Chart</button>` : ''}
            ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="saveTemplateBtn">${icon('template', 14)} Save as Template</button>` : ''}
            <button class="btn btn-secondary btn-sm" id="exportPngBtn">${icon('download', 13)} PNG</button>
            <button class="btn btn-secondary btn-sm" id="exportJpgBtn">${icon('download', 13)} JPG</button>
            <button class="btn btn-secondary btn-sm" id="exportCodeBtn">${icon('code', 14)} Export Code</button>
            ${App.can('delete') ? `<button class="btn btn-danger btn-sm" id="deleteChartBtn" title="Delete chart">${icon('trash', 14)}</button>` : ''}
          </div>
        </div>
        <div class="chart-meta-chips">
          <span class="badge ${App.chartAccent(spec.chart_type)}">${App.chartTypeLabel(spec.chart_type)}</span>
          ${spec.chart_type === 'histogram'
            ? `<span class="meta-chip">Column: <strong>${App.escapeHtml(spec.dimension || '—')}</strong></span>`
            : `<span class="meta-chip">X: <strong>${App.escapeHtml(spec.dimension || '—')}</strong></span>
              ${spec.chart_type === 'box' || spec.chart_type === 'violin'
                ? `<span class="meta-chip">Y: <strong>${App.escapeHtml(spec.metric || '—')}</strong></span><span class="meta-chip">Distribution</span>`
                : `<span class="meta-chip">Y: <strong>${App.escapeHtml(spec.metric || '—')}</strong></span><span class="meta-chip">Method: <strong>${App.escapeHtml(spec.aggregation || '—')}</strong></span>`}`}
        </div>
      </div>

      <div class="card" id="editCard" style="display:none; padding:20px; margin-bottom:20px;">
        <div class="chart-detail-head" style="margin-bottom:14px;">
          <h3 style="font-size:14px; font-weight:700; display:flex; align-items:center; gap:8px;">${icon('refresh', 15)} Edit Chart</h3>
          <span class="badge orange">Saving creates a new version</span>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Chart type</label>
            <select id="editType" class="form-select">
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="scatter">Scatter Plot</option>
              <option value="histogram">Histogram</option>
              <option value="box">Box Plot</option>
              <option value="violin">Violin Plot</option>
              <option value="treemap">Treemap</option>
              <option value="funnel">Funnel Chart</option>
            </select>
          </div>
          <div class="form-group" id="editAggGroup">
            <label class="form-label">Aggregation</label>
            <select id="editAggregation" class="form-select">
              <option value="sum">Sum</option>
              <option value="average">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">X-axis (dimension)</label>
            <select id="editDimension" class="form-select"><option value="">Loading...</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Y-axis (metric)</label>
            <select id="editMetric" class="form-select"><option value="">Loading...</option></select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Sorting</label>
            <select id="editSorting" class="form-select">
              <option value="none">None</option>
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          <div class="form-group" id="editGranularityGroup" style="display:none;">
            <label class="form-label">Time granularity</label>
            <select id="editGranularity" class="form-select">
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="quarter">Quarter</option>
              <option value="year">Year</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input type="text" id="editTitle" class="form-input" placeholder="Chart title">
        </div>
        <p class="form-hint" id="editTypeHint" style="margin:0 0 14px;"></p>
        <div style="display:flex; gap:10px; justify-content:flex-end;">
          <button class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
          <button class="btn btn-primary" id="saveRegenBtn">${icon('check', 15)} Save Changes</button>
        </div>
      </div>

      <div class="chart-render-box" id="chartRenderBox">${App.loading('Plotting data...')}</div>
      <div style="margin-top:20px;">
        <div id="codeSection" style="display:none;">
          <div class="code-tabs">
            <button class="code-tab active" data-lang="python">Python</button>
            <button class="code-tab" data-lang="javascript">JavaScript</button>
            <button class="btn btn-secondary btn-sm" id="copyCodeBtn" style="margin-left:auto;">${icon('copy', 13)} Copy</button>
          </div>
          <pre class="code-block" id="codeOutput">${App.escapeHtml(plotlyCode.python)}</pre>
        </div>
      </div>
      <div class="card" style="padding:20px; margin-top:20px;">
        <div class="section-title" style="margin-bottom:12px;">Version History <span class="badge slate">${chart.versions?.length || 0}</span></div>
        <div class="versions-list">
          ${(chart.versions || []).length === 0
            ? '<p style="font-size:13px; color:var(--text-muted);">No versions recorded yet.</p>'
            : (chart.versions || []).map((v, i) => {
                const isCurrent = JSON.stringify(Object.entries(v.specification || {}).sort()) === JSON.stringify(Object.entries(chart.specification || {}).sort());
                return `
                <div class="version-item">
                  <div style="display:flex; flex-direction:column; gap:2px;">
                    <span><strong>Version ${i + 1}</strong> — ${App.chartTypeLabel(v.specification?.chart_type || 'chart')}</span>
                    <small style="color:var(--text-muted); font-size:11.5px;">${App.formatDateTime(v.created_at)}</small>
                  </div>
                  <div>
                    ${isCurrent
                      ? `<span class="badge green">${icon('check', 12)} Current</span>`
                      : App.can('edit')
                        ? `<button class="btn btn-secondary btn-sm restore-version" data-ver="${v.id}">${icon('refresh', 13)} Restore</button>`
                        : ''}
                  </div>
                </div>`;
              }).join('')}
        </div>
      </div>`;

    // Render chart
    const renderBox = document.getElementById('chartRenderBox');
    const drawChart = async () => {
      renderBox.innerHTML = App.loading('Plotting data...');
      try {
        const renderData = await App.apiFetch(`/charts/${chartId}/render`);
        const json = typeof renderData.json === 'string' ? JSON.parse(renderData.json) : renderData.json;
        renderBox.innerHTML = '';
        const el = document.createElement('div');
        el.style.width = '100%';
        el.style.minHeight = '380px';
        renderBox.appendChild(el);
        Plotly.newPlot(el, json.data, json.layout, { responsive: true, displayModeBar: true, locale: 'en-US' });
      } catch (err) {
        renderBox.innerHTML = App.errBlock('Failed to render chart: ' + err.message);
      }
    };
    drawChart();

    const editChartBtn = document.getElementById('editChartBtn');
    if (editChartBtn) {
      editChartBtn.addEventListener('click', () => {
        const card = document.getElementById('editCard');
        const shown = card.style.display !== 'none';
        card.style.display = shown ? 'none' : 'block';
        if (!shown) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
      document.getElementById('editCard').style.display = 'none';
    });

    // Populate + drive the edit form
    function populateEditForm() {
      if (!ds || !ds.columns) return;
      const allCols = ds.columns.map(c => c.name);
      const numCols = ds.columns.filter(c => c.type === 'number').map(c => c.name);
      const dimSel = document.getElementById('editDimension');
      const metSel = document.getElementById('editMetric');
      dimSel.innerHTML = allCols.length
        ? allCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
        : '<option value="">No columns</option>';
      metSel.innerHTML = numCols.length
        ? numCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
        : '<option value="">No numeric columns</option>';
      document.getElementById('editType').value = spec.chart_type || 'bar';
      if (spec.dimension) dimSel.value = spec.dimension;
      if (spec.metric && numCols.includes(spec.metric)) metSel.value = spec.metric;
      document.getElementById('editAggregation').value = spec.aggregation || 'sum';
      document.getElementById('editSorting').value = spec.sorting || 'none';
      document.getElementById('editGranularity').value = spec.time_granularity || 'month';
      document.getElementById('editTitle').value = spec.title || '';
      updateEditUI();
    }
    function editDimIsDate() {
      if (!ds || !ds.columns) return false;
      const col = ds.columns.find(c => c.name === document.getElementById('editDimension').value);
      return !!(col && col.type === 'date');
    }
    function updateEditUI() {
      const type = document.getElementById('editType').value;
      const isRaw = App.rawTypes.includes(type);
      const isHistogram = type === 'histogram';
      document.getElementById('editAggGroup').style.display = isRaw ? 'none' : '';
      document.getElementById('editMetric').disabled = isHistogram;
      document.getElementById('editGranularityGroup').style.display =
        editDimIsDate() && ['bar', 'line', 'area'].includes(type) ? '' : 'none';
      document.getElementById('editTypeHint').textContent = isHistogram
        ? 'Plots the distribution of the X-axis column — Y-axis not needed.'
        : (type === 'box' || type === 'violin' ? 'Shows the raw spread of Y values per X category — aggregation is not applied.' : '');
    }
    populateEditForm();
    document.getElementById('editType').addEventListener('change', updateEditUI);
    document.getElementById('editDimension').addEventListener('change', updateEditUI);

    // Save changes -> regenerate with the edited spec (creates a new version)
    document.getElementById('saveRegenBtn').addEventListener('click', async () => {
      const dimension = document.getElementById('editDimension').value;
      const metric = document.getElementById('editMetric').value;
      const chartType = document.getElementById('editType').value;
      const aggregation = document.getElementById('editAggregation').value;
      const isHistogram = chartType === 'histogram';
      const title = document.getElementById('editTitle').value.trim() || (isHistogram ? `Distribution of ${dimension}` : `${metric} by ${dimension}`);

      if (!dimension) { App.toast('Please select an X-axis dimension', 'warn'); return; }
      if (!isHistogram && !metric && aggregation !== 'count') { App.toast('Please select a Y-axis metric', 'warn'); return; }

      const btn = document.getElementById('saveRegenBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Regenerating...';
      try {
        const granGroup = document.getElementById('editGranularityGroup');
        await App.apiFetch(`/charts/${chartId}/regenerate`, {
          method: 'POST',
          body: {
            dataset_id: chart.dataset_id,
            specification: {
              chart_type: chartType,
              dimension,
              metric: metric || dimension,
              aggregation,
              sorting: document.getElementById('editSorting').value || 'none',
              time_granularity: granGroup.style.display !== 'none' ? document.getElementById('editGranularity').value : null,
              title,
            },
          },
        });
        App.toast('Chart updated — new version saved');
        location.reload();
      } catch (err) {
        App.toast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('check', 15)} Save Changes`;
      }
    });

    // Restore a previous version
    document.querySelectorAll('.restore-version').forEach(btn => {
      btn.addEventListener('click', async () => {
        const v = (chart.versions || []).find(x => x.id === btn.dataset.ver);
        const ok = await App.confirmDialog({
          title: 'Restore this version?',
          message: `The chart will be reverted to the ${App.chartTypeLabel(v?.specification?.chart_type || 'chart')} configuration from ${App.formatDate(v?.created_at)}. A new version entry will be recorded so you can always come back.`,
          confirmText: 'Restore',
        });
        if (!ok) return;
        try {
          await App.apiFetch(`/charts/${chartId}/restore/${btn.dataset.ver}`, { method: 'POST' });
          App.toast('Version restored');
          location.reload();
        } catch (err) { App.toast(err.message, 'error'); }
      });
    });

    const saveTemplateBtn = document.getElementById('saveTemplateBtn');
    if (saveTemplateBtn) {
      saveTemplateBtn.addEventListener('click', async () => {
        const name = await App.promptDialog({
          title: 'Save as template',
          message: 'Templates let you reuse this chart style with any dataset.',
          keyLabel: 'Template name',
          defaultValue: spec.title || '',
          placeholder: 'e.g. Monthly Trend',
        });
        if (!name) return;
        try {
          await App.apiFetch('/templates/', { method: 'POST', body: { chart_id: chart.id, name } });
          App.toast('Template saved');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    }

    let currentLang = 'python';
    document.getElementById('exportCodeBtn').addEventListener('click', () => {
      const section = document.getElementById('codeSection');
      section.style.display = section.style.display === 'none' ? 'block' : 'none';
    });

    const downloadImage = async (format) => {
      const plotEl = document.getElementById('chartRenderBox').querySelector('.js-plotly-plot');
      if (!plotEl) { App.toast('Chart is not rendered yet', 'warn'); return; }
      try {
        const dataUrl = await Plotly.toImage(plotEl, { format, width: 1280, height: 720, scale: 2 });
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${(spec.title || 'chart').replace(/[^\w\- ]+/g, '_').trim() || 'chart'}.${format === 'jpeg' ? 'jpg' : 'png'}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        App.toast(`${format.toUpperCase()} exported`);
      } catch (err) { App.toast('Export failed: ' + err.message, 'error'); }
    };
    document.getElementById('exportPngBtn').addEventListener('click', () => downloadImage('png'));
    document.getElementById('exportJpgBtn').addEventListener('click', () => downloadImage('jpeg'));

    const deleteChartBtn = document.getElementById('deleteChartBtn');
    if (deleteChartBtn) {
      deleteChartBtn.addEventListener('click', async () => {
        const ok = await App.confirmDialog({
          title: 'Delete this chart?',
          message: `"${spec.title || 'Untitled chart'}" and all its versions will be removed. This cannot be undone.`,
          confirmText: 'Delete',
          danger: true,
        });
        if (!ok) return;
        try {
          await App.apiFetch(`/charts/${chartId}`, { method: 'DELETE' });
          App.toast('Chart deleted', 'info');
          location.hash = '#charts';
        } catch (err) { App.toast(err.message, 'error'); }
      });
    }
    document.querySelectorAll('.code-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentLang = tab.dataset.lang;
        document.getElementById('codeOutput').textContent = currentLang === 'python' ? plotlyCode.python : plotlyCode.javascript;
      });
    });
    document.getElementById('copyCodeBtn').addEventListener('click', () => {
      const code = currentLang === 'python' ? plotlyCode.python : plotlyCode.javascript;
      navigator.clipboard.writeText(code).then(() => App.toast('Code copied to clipboard')).catch(() => App.toast('Copy failed', 'error'));
    });
  } catch (err) {
    document.getElementById('chartDetail').innerHTML = `
      ${App.errBlock(err.message)}
      <div style="margin-top:16px;">${App.emptyState('chart', 'Chart not found', 'The chart may have been deleted.', '<a href="#charts" class="btn btn-primary">Back to Projects</a>')}</div>`;
  }
});

// ---------------------------------------------------------------
// TEMPLATES
// ---------------------------------------------------------------
App.registerPage('#templates', async (app) => {
  if (!App.auth()) return;
  app.innerHTML = App.shell('templates', 'Templates', `
    <div class="page-header">
      <div><h1>Templates</h1><p class="subtitle">Reusable chart styles — apply one to any dataset.</p></div>
      <div class="page-header-actions">
        <input type="text" class="form-input" id="templateSearch" placeholder="Search templates..." style="width:190px; padding:7px 10px; font-size:12.5px;">
        <a href="#charts" class="btn btn-secondary">${icon('chart', 15)} Browse Charts</a>
      </div>
    </div>
    <div id="templatesList">${App.loading()}</div>
  `);

  const listEl = document.getElementById('templatesList');
  const searchEl = document.getElementById('templateSearch');
  let list = [];

  const render = () => {
    if (list.length === 0) {
      listEl.innerHTML = App.emptyState('template', 'No templates yet', 'Create a chart, then save it as a template to reuse the style.', App.can('create') ? '<a href="#charts/new" class="btn btn-primary">Create a Chart</a>' : '');
      return;
    }
    listEl.innerHTML = `<div class="charts-grid">${list.map(t => {
      const spec = t.specification || {};
      const accent = App.chartAccent(t.chart_type);
      return `
        <div class="chart-card">
          <div class="chart-card-head">
            <div class="chart-card-icon ${accent}" style="background:var(--${accent}-soft);color:var(--${accent});">${icon('template', 16)}</div>
            <span class="badge ${accent}">${App.escapeHtml(t.chart_type)}</span>
          </div>
          <div>
            <h3>${App.escapeHtml(t.name)}</h3>
            <p class="meta">${App.escapeHtml(spec.dimension || '—')} vs ${App.escapeHtml(spec.metric || '—')}</p>
          </div>
          <small class="date">Created ${App.formatDate(t.created_at)}</small>
          <div class="chart-card-footer">
            ${App.can('create') ? `<button class="btn btn-primary btn-sm apply-template" data-id="${t.id}" style="flex:1;">${icon('sparkles', 13)} Use Template</button>` : ''}
            ${App.can('delete') ? `<button class="btn btn-secondary btn-sm delete-template" data-id="${t.id}" title="Delete">${icon('trash', 14)}</button>` : ''}
          </div>
        </div>`;
    }).join('')}</div>`;

    listEl.querySelectorAll('.apply-template').forEach(btn => {
      btn.addEventListener('click', () => openApplyModal(list.find(x => x.id === btn.dataset.id)));
    });

    listEl.querySelectorAll('.delete-template').forEach(btn => {
      btn.addEventListener('click', async () => {
        const t = list.find(x => x.id === btn.dataset.id);
        const ok = await App.confirmDialog({ title: 'Delete template?', message: `"${t ? t.name : 'This template'}" will be removed.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
          await App.apiFetch(`/templates/${btn.dataset.id}`, { method: 'DELETE' });
          list = list.filter(x => x.id !== btn.dataset.id);
          render();
          App.toast('Template deleted', 'info');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    });
  };

  const openApplyModal = async (template) => {
    if (!template) return;
    let datasets = [];
    try {
      const data = await App.apiFetch('/datasets/');
      datasets = Array.isArray(data) ? data : [];
    } catch (_) {}
    if (datasets.length === 0) {
      App.toast('Upload a dataset first to apply this template', 'warn');
      location.hash = '#upload';
      return;
    }
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Apply "${App.escapeHtml(template.name)}"</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">Choose a dataset with matching columns. Chart options will be pre-filled.</p>
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Dataset</label>
          <select class="form-select" id="applyDataset">
            ${datasets.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" data-act="cancel">Cancel</button>
          <button class="btn btn-primary" data-act="apply">${icon('sparkles', 14)} Apply Template</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'cancel') { overlay.remove(); return; }
      const dsId = overlay.querySelector('#applyDataset').value;
      const applyBtn = overlay.querySelector('[data-act="apply"]');
      applyBtn.disabled = true;
      applyBtn.innerHTML = '<span class="spinner"></span> Validating...';
      try {
        const result = await App.apiFetch('/templates/apply', {
          method: 'POST',
          body: { template_id: template.id, dataset_id: dsId },
        });
        const spec = result.specification || {};
        sessionStorage.setItem('chartly_preset', JSON.stringify({
          name: result.template_name || template.name,
          dataset_id: dsId,
          chart_type: spec.chart_type,
          dimension: spec.dimension,
          metric: spec.metric,
          aggregation: spec.aggregation || 'sum',
          sorting: spec.sorting || 'none',
          time_granularity: spec.time_granularity || null,
          title: spec.title || '',
        }));
        overlay.remove();
        App.toast('Template validated — chart options pre-filled', 'info');
        location.hash = `#charts/new?dataset_id=${dsId}`;
      } catch (err) {
        applyBtn.disabled = false;
        applyBtn.innerHTML = `${icon('sparkles', 14)} Apply Template`;
        App.toast('Cannot apply template: ' + err.message, 'error');
      }
    });
  };

  const load = async () => {
    try {
      const q = searchEl.value.trim();
      const data = await App.apiFetch(`/templates/${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      list = Array.isArray(data) ? data : [];
    } catch (err) {
      listEl.innerHTML = App.errBlock(err.message);
      return;
    }
    render();
  };

  searchEl.addEventListener('input', () => { clearTimeout(searchEl._t); searchEl._t = setTimeout(load, 300); });
  load();
});

// ---------------------------------------------------------------
// AUDIT
// ---------------------------------------------------------------
App.registerPage('#audit', async (app) => {
  if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
  app.innerHTML = App.shell('audit', 'Audit Trail', `
    <div class="page-header"><div><h1>Audit Trail</h1><p class="subtitle">Every action recorded on the platform.</p></div></div>
    <div class="card" id="auditList">${App.loading()}</div>
  `);

  const listEl = document.getElementById('auditList');
  try {
    const audit = await App.apiFetch('/audit/');
    const list = Array.isArray(audit) ? audit : [];
    if (list.length === 0) {
      listEl.innerHTML = App.emptyState('audit', 'No audit entries yet', 'Actions will be recorded here as users work.');
    } else {
      listEl.innerHTML = `
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>User</th><th>Action</th><th>Chart</th><th>Details</th><th>Time</th></tr></thead>
            <tbody>${list.map(a => `
              <tr>
                <td><strong>${App.escapeHtml(a.user_name || 'System')}</strong></td>
                <td><span class="badge ${a.action === 'create' ? 'green' : a.action === 'regenerate' ? 'orange' : 'blue'}">${App.escapeHtml(a.action)}</span></td>
                <td><code style="font-size:12px; color:var(--text-secondary);">${a.chart_id ? a.chart_id.slice(0, 8) + '…' : '—'}</code></td>
                <td>${a.specification && a.specification.chart_type ? App.chartTypeLabel(a.specification.chart_type) + ' chart' : '—'}</td>
                <td style="white-space:nowrap;">${App.formatDateTime(a.timestamp)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }
  } catch (err) {
    listEl.innerHTML = App.errBlock(err.message);
  }
});

// ---------------------------------------------------------------
// USERS
// ---------------------------------------------------------------
App.registerPage('#users', async (app) => {
  if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
  app.innerHTML = App.shell('users', 'Users', `
    <div class="page-header">
      <div><h1>Users</h1><p class="subtitle">Accounts on this platform.</p></div>
      <div class="page-header-actions"><button class="btn btn-primary btn-sm" id="addUserBtn">${icon('plus', 14)} Add User</button></div>
    </div>
    <div class="card" style="padding:8px 0;" id="usersCard">${App.loading()}</div>
  `);

  const cardEl = document.getElementById('usersCard');
  let users = [];

  const render = () => {
    cardEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table" style="min-width:640px;">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th style="text-align:right;">Actions</th></tr></thead>
          <tbody>${users.map(u => {
            const isSelf = u.id === App.user?.id;
            return `
            <tr>
              <td><div style="display:flex; align-items:center; gap:10px;"><div class="avatar" style="width:30px; height:30px; font-size:12px;">${App.escapeHtml((u.name || 'U')[0])}</div><strong>${App.escapeHtml(u.name)}</strong>${isSelf ? '<span class="badge slate" style="margin-left:4px;">you</span>' : ''}</div></td>
              <td>${App.escapeHtml(u.email)}</td>
              <td>
                <select class="form-select role-select" data-id="${u.id}" ${isSelf ? 'disabled' : ''} style="width:110px; padding:5px 8px; font-size:12px;">
                  <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>viewer</option>
                  <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>analyst</option>
                  <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                </select>
              </td>
              <td style="font-size:12.5px; color:var(--text-secondary); white-space:nowrap;">${App.formatDate(u.created_at)}</td>
              <td style="text-align:right;">
                <button class="btn-icon danger delete-user" data-id="${u.id}" ${isSelf ? 'disabled' : ''} title="${isSelf ? 'You cannot delete your own account' : 'Delete user'}">${icon('trash', 15)}</button>
              </td>
            </tr>`;
          }).join('')}
          </tbody>
        </table>
      </div>`;

    cardEl.querySelectorAll('.role-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        const u = users.find(x => x.id === sel.dataset.id);
        if (!u || u.role === sel.value) return;
        const ok = await App.confirmDialog({
          title: 'Change role?',
          message: `${u.name} will become ${sel.value}. Their access level changes immediately.`,
          confirmText: 'Update role',
        });
        if (!ok) { sel.value = u.role; return; }
        try {
          await App.apiFetch(`/users/${u.id}`, { method: 'PATCH', body: { role: sel.value } });
          u.role = sel.value;
          App.toast(`Role updated to ${sel.value}`);
        } catch (err) { sel.value = u.role; App.toast(err.message, 'error'); }
      });
    });

    cardEl.querySelectorAll('.delete-user').forEach(btn => {
      btn.addEventListener('click', async () => {
        const u = users.find(x => x.id === btn.dataset.id);
        const ok = await App.confirmDialog({ title: 'Delete user?', message: `${u ? u.name : 'This user'} will lose access to the platform immediately.`, confirmText: 'Delete', danger: true });
        if (!ok) return;
        try {
          await App.apiFetch(`/users/${btn.dataset.id}`, { method: 'DELETE' });
          users = users.filter(x => x.id !== btn.dataset.id);
          render();
          App.toast('User deleted', 'info');
        } catch (err) { App.toast(err.message, 'error'); }
      });
    });
  };

  const openAddModal = () => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Add user</h3>
        <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">The new user can sign in immediately with these credentials.</p>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" id="nuName" placeholder="e.g. Sarah Analyst">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Email</label>
          <input type="email" class="form-input" id="nuEmail" placeholder="user@company.com">
        </div>
        <div class="form-group" style="margin-bottom:12px;">
          <label class="form-label">Password</label>
          <input type="password" class="form-input" id="nuPassword" placeholder="Min 6 characters">
        </div>
        <div class="form-group" style="margin-bottom:16px;">
          <label class="form-label">Role</label>
          <select class="form-select" id="nuRole">
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" data-act="cancel">Cancel</button>
          <button class="btn btn-primary" data-act="ok">${icon('check', 14)} Create User</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', async (e) => {
      const act = e.target.closest('[data-act]');
      if (!act) return;
      if (act.dataset.act === 'cancel') { overlay.remove(); return; }
      const name = overlay.querySelector('#nuName').value.trim();
      const email = overlay.querySelector('#nuEmail').value.trim();
      const password = overlay.querySelector('#nuPassword').value;
      const role = overlay.querySelector('#nuRole').value;
      if (!name || !email || !password) { App.toast('Name, email and password are required', 'warn'); return; }
      if (password.length < 6) { App.toast('Password must be at least 6 characters', 'warn'); return; }
      const btn = overlay.querySelector('[data-act="ok"]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Creating...';
      try {
        const created = await App.apiFetch('/users/', { method: 'POST', body: { name, email, password, role } });
        users.push(created);
        render();
        overlay.remove();
        App.toast(`User ${created.name} created`);
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = `${icon('check', 14)} Create User`;
        App.toast(err.message, 'error');
      }
    });
  };

  try {
    const data = await App.apiFetch('/users/');
    users = Array.isArray(data) ? data : [];
    render();
  } catch (err) {
    cardEl.innerHTML = App.errBlock(err.message);
  }
  document.getElementById('addUserBtn').addEventListener('click', openAddModal);
});

// ---------------------------------------------------------------
// SETTINGS
// ---------------------------------------------------------------
App.registerPage('#settings', async (app) => {
  if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
  app.innerHTML = App.shell('settings', 'Settings', `
    <div class="page-header"><div><h1>Settings</h1><p class="subtitle">Platform-wide settings shared by the team.</p></div></div>
    <div class="card" style="padding:22px; max-width:480px;">
      <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Platform Settings</h3>
      <div class="form-group">
        <label class="form-label">Platform name</label>
        <input type="text" class="form-input" id="platformName" value="Chartly">
        <p class="form-hint">Shown in the sidebar for every user.</p>
      </div>
      <div class="form-group">
        <label class="form-label">Default chart type</label>
        <select id="defaultChartType" class="form-select">
          <option value="bar">Bar Chart</option>
          <option value="line">Line Chart</option>
          <option value="area">Area Chart</option>
          <option value="pie">Pie Chart</option>
          <option value="scatter">Scatter Plot</option>
          <option value="histogram">Histogram</option>
          <option value="box">Box Plot</option>
          <option value="violin">Violin Plot</option>
          <option value="treemap">Treemap</option>
          <option value="funnel">Funnel Chart</option>
        </select>
        <p class="form-hint">Pre-selected whenever a chart editor opens.</p>
      </div>
      <button class="btn btn-primary" id="saveSettingsBtn">${icon('check', 15)} Save Settings</button>
    </div>
  `);
  const nameEl = document.getElementById('platformName');
  const typeEl = document.getElementById('defaultChartType');
  try {
    const settings = await App.apiFetch('/settings/');
    if (settings.platform_name) nameEl.value = settings.platform_name;
    if (settings.default_chart_type && [...typeEl.options].some(o => o.value === settings.default_chart_type)) typeEl.value = settings.default_chart_type;
  } catch (_) {}
  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveSettingsBtn');
    btn.disabled = true;
    try {
      const saved = await App.apiFetch('/settings/', {
        method: 'PUT',
        body: { platform_name: nameEl.value.trim() || 'Chartly', default_chart_type: typeEl.value },
      });
      App.settings = saved;
      App.toast('Settings saved');
      const brand = document.querySelector('.sidebar-brand .brand-name');
      if (brand) brand.textContent = saved.platform_name || 'Chartly';
    } catch (err) {
      App.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });
});

// ---------------------------------------------------------------
// Code generator for chart detail
// ---------------------------------------------------------------
function generatePlotlyCode(spec, datasetId) {
  const chartType = spec.chart_type || 'bar';
  const dim = spec.dimension || 'x';
  const met = spec.metric || 'y';
  const agg = spec.aggregation || 'sum';
  const title = spec.title || `${met} by ${dim}`;
  const isRaw = App.rawTypes.includes(chartType);

  if (isRaw) {
    const pyKwargs = chartType === 'histogram'
      ? `    x="${dim}",\n    title="${title}",\n    nbinsx=40`
      : `    x="${dim}",\n    y="${met}",\n    title="${title}"`;
    const python = `import plotly.express as px
import pandas as pd

# Load your data
df = pd.read_csv("your_data.csv")  # or pd.read_excel("your_data.xlsx")

# Create chart (plots raw values, no aggregation)
fig = px.${chartType}(
${pyKwargs}
)

fig.update_layout(template="plotly_white")
fig.show()`;

    const jsTrace = chartType === 'histogram'
      ? `const trace = {
  x: rawData.map(r => r["${dim}"]),
  type: "histogram",
  nbinsx: 40,
  marker: { color: "#3b82f6" }
};`
      : `const trace = {
  x: rawData.map(r => r["${dim}"]),
  y: rawData.map(r => r["${met}"]),
  type: "${chartType}",
  marker: { color: "#3b82f6" }
};`;
    const javascript = `<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"><\/script>
<script>
// Assumes data is an array of objects
const rawData = [
  // { "${dim}": "value1", "${met}": 100 },
  // { "${dim}": "value2", "${met}": 200 },
];

${jsTrace}

const layout = {
  title: "${title}",
  template: "plotly_white"
};

Plotly.newPlot("chart", [trace], layout);
<\/script>
<div id="chart"></div>`;
    return { python, javascript };
  }

  const pyCall = chartType === 'treemap'
    ? `    path=["${dim}"],\n    values="${met}"`
    : chartType === 'funnel'
      ? `    x="${met}",\n    y="${dim}"`
      : `    x="${dim}",\n    y="${met}"`;
  const python = `import plotly.express as px
import pandas as pd

# Load your data
df = pd.read_csv("your_data.csv")  # or pd.read_excel("your_data.xlsx")

# Aggregate data
chart_df = df.groupby("${dim}", as_index=False).agg(
    ${met}=("${met}", "${agg}")
)

# Create chart
fig = px.${chartType}(
${pyCall},
    title="${title}"
)

fig.update_layout(template="plotly_white")
fig.show()`;

  const jsTrace = chartType === 'pie'
    ? `const trace = {
  labels: labels,
  values: values,
  type: "pie"
};`
    : chartType === 'treemap'
      ? `const trace = {
  labels: labels,
  parents: labels.map(() => ""),
  values: values,
  type: "treemap"
};`
      : chartType === 'funnel'
        ? `const trace = {
  x: values,
  y: labels,
  type: "funnel"
};`
        : `const trace = {
  x: labels,
  y: values,
  type: "${chartType}"${chartType === 'area' ? ',\n  fill: "tozeroy"' : ''},
  marker: { color: "#3b82f6" }
};`;
  const javascript = `<script src="https://cdn.plot.ly/plotly-2.35.0.min.js"><\/script>
<script>
// Aggregate data (assumes data is an array of objects)
const rawData = [
  // { "${dim}": "value1", "${met}": 100 },
  // { "${dim}": "value2", "${met}": 200 },
];

const grouped = {};
rawData.forEach(row => {
  const key = row["${dim}"];
  if (!grouped[key]) grouped[key] = [];
  grouped[key].push(row["${met}"]);
});

const aggFunc = "${agg}" === "sum" ? (a,b) => a+b
  : "${agg}" === "average" ? (a,b) => a+b
  : "${agg}" === "count" ? (a,b) => a+1
  : "${agg}" === "min" ? (a,b) => Math.min(a,b)
  : (a,b) => Math.max(a,b);

const labels = Object.keys(grouped);
const values = labels.map(k => grouped[k].reduce(aggFunc, 0));

${jsTrace}

const layout = {
  title: "${title}",
  template: "plotly_white"
};

Plotly.newPlot("chart", [trace], layout);
<\/script>
<div id="chart"></div>`;

  return { python, javascript };
}

// ---------------------------------------------------------------
// Router
// ---------------------------------------------------------------
window.addEventListener('hashchange', () => { App.renderApp(); window.scrollTo(0, 0); });
window.addEventListener('DOMContentLoaded', async () => { await App.loadSettings(); App.renderApp(); });
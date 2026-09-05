/* ============================================================
   Chartly — Frontend App (entry module)
   Exposes the global App facade, registers pages, bootstraps the router.
   ============================================================ */

import { api } from './api.js';
import { router } from './router.js';
import { modal } from './components/modal.js';
import { sidebar } from './components/sidebar.js';
import { navbar } from './components/navbar.js';
import { chart } from './components/chart.js';
import { loginPage } from './views/login.js';
import { dashboardPage } from './views/dashboard.js';
import { uploadPage, projectsPage, projectDetailPage } from './views/datasets.js';
import { chartBuilderPage } from './views/chart-builder.js';
import { reviewPage } from './views/review.js';
import { templatesPage } from './views/templates.js';
import { auditPage } from './views/audit.js';
import { usersPage } from './views/users.js';
import { settingsPage } from './views/settings.js';
import { notificationsPage } from './views/notifications.js';

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
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 6 5 6 10H0s6-3 6-10"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
};

export function icon(name, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

// ---------------------------------------------------------------
// Core app facade
// ---------------------------------------------------------------
const App = {
  get user() { return api.user; },
  set user(v) { api.user = v; },

  settings: {},
  theme: 'light',

  login: (email, password) => api.login(email, password),

  applyTheme(theme) {
    this.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = this.theme;
    localStorage.setItem('chartly_theme', this.theme);
  },

  async loadTheme() {
    this.applyTheme(localStorage.getItem('chartly_theme') === 'dark' ? 'dark' : 'light');
    if (!api.user) return this.theme;
    try {
      const data = await api.apiFetch('/settings/theme');
      this.applyTheme(data.theme);
    } catch (_) {}
    return this.theme;
  },

  async logout() {
    await api.logout();
    this.toast('Signed out', 'info');
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

  chartAccent: (type) => chart.accent(type),
  chartTypeLabel: (type) => chart.typeLabel(type),
  aggTypes: chart.aggTypes,
  rawTypes: chart.rawTypes,

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
  confirmDialog: (opts) => modal.confirm(opts),
  promptDialog: (opts) => modal.prompt(opts),

  /* -------- mobile drawer -------- */
  toggleDrawer(force) { sidebar.toggle(force); },

  /* -------- layout shell -------- */
  shell(activeKey, topTitle, inner) {
    return `
      <div class="layout">
        ${sidebar.render(activeKey)}
        <div class="sidebar-overlay" id="sidebarOverlay" onclick="App.toggleDrawer(false)"></div>
        <div class="main">
          ${navbar.render(topTitle)}
          <div class="page">${inner}</div>
        </div>
      </div>`;
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

  /* -------- auth guard -------- */
  auth() {
    if (!api.user) { location.hash = '#login'; return false; }
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

  canDelete(ownerId) {
    return this.can('delete') && (this.user?.role === 'admin' || this.user?.id === ownerId);
  },

  async loadSettings() {
    try {
      this.settings = await api.apiFetch('/settings/');
    } catch (_) { this.settings = {}; }
    return this.settings;
  },

  platformName() {
    return this.settings.platform_name || 'Chartly';
  },

  /* -------- notifications -------- */
  notifCount: 0,
  _notifTimer: null,
  async refreshNotifCount() {
    if (!api.user) return;
    try {
      const data = await api.apiFetch('/notifications/unread-count');
      const count = Number(data.count) || 0;
      this.notifCount = count;
      const badge = document.getElementById('notifBadge');
      if (badge) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = count > 0 ? 'flex' : 'none';
      }
      const sideBadge = document.getElementById('notifSidebarBadge');
      if (sideBadge) {
        sideBadge.textContent = count > 99 ? '99+' : String(count);
        sideBadge.style.display = count > 0 ? 'inline-flex' : 'none';
      }
    } catch (_) {}
  },
  startNotifPolling() {
    if (this._notifTimer) clearInterval(this._notifTimer);
    if (!api.user) return;
    this.refreshNotifCount();
    this._notifTimer = setInterval(() => this.refreshNotifCount(), 30000);
  },
  stopNotifPolling() {
    if (this._notifTimer) { clearInterval(this._notifTimer); this._notifTimer = null; }
  },
};

export { App };
window.App = App;

// ---------------------------------------------------------------
// Page registration
// ---------------------------------------------------------------
router.registerPage(loginPage);
router.registerPage(dashboardPage);
router.registerPage(uploadPage);
router.registerPage(projectsPage);
router.registerPage(projectDetailPage);
router.registerPage(chartBuilderPage);
router.registerPage(reviewPage);
router.registerPage(templatesPage);
router.registerPage(auditPage);
router.registerPage(usersPage);
router.registerPage(settingsPage);
router.registerPage(notificationsPage);

// ---------------------------------------------------------------
// Router bootstrap
// ---------------------------------------------------------------
window.addEventListener('hashchange', () => { router.render(); window.scrollTo(0, 0); if (api.user) App.refreshNotifCount(); });
window.addEventListener('DOMContentLoaded', async () => {
  await App.loadTheme();
  await App.loadSettings();
  router.render();
  if (api.user) App.startNotifPolling();
  // restart polling after login (login sets api.user)
  const origLogin = api.login.bind(api);
  api.login = async (...args) => {
    const res = await origLogin(...args);
    App.startNotifPolling();
    return res;
  };
  const origLogout = api.logout.bind(api);
  api.logout = async (...args) => {
    App.stopNotifPolling();
    return origLogout(...args);
  };
});
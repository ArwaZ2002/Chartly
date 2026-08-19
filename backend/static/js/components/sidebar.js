/* ============================================================
   Chartly — Sidebar component
   Navigation (role-aware) + user block + mobile drawer.
   ============================================================ */

import { App } from '../app.js';
import { icon } from '../app.js';

export const sidebar = {
  render(activeKey) {
    const nav = [
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'charts', label: 'Charts', icon: 'chart' },
      { key: 'templates', label: 'Templates', icon: 'template' },
    ];
    if (App.can('upload')) {
      nav.splice(1, 0, { key: 'upload', label: 'Upload Data', icon: 'upload' });
    }
    if (App.can('admin')) {
      nav.push(
        { key: 'audit', label: 'Audit Trail', icon: 'audit' },
        { key: 'users', label: 'Users', icon: 'users' },
      );
    }
    nav.push({ key: 'settings', label: 'Settings', icon: 'settings' });
    const isActive = (k) => activeKey === k || (activeKey === 'charts' && ['charts'].includes(k) && k === 'charts');
    return `
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="brand-mark">${icon('chart', 17)}</div>
          <span class="brand-name">${App.escapeHtml(App.platformName())}</span>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-group-label">Menu</div>
          ${nav.map(i => `
            <a href="#${i.key}" class="nav-item ${isActive(i.key) ? 'active' : ''}">${icon(i.icon, 17)}<span>${i.label}</span></a>
          `).join('')}
        </nav>
        <div class="sidebar-user">
          <div class="avatar">${App.escapeHtml((App.user?.name || 'U')[0])}</div>
          <div class="user-meta">
            <div class="user-name">${App.escapeHtml(App.user?.name || 'User')}</div>
            <div class="user-role">${App.escapeHtml(App.user?.role || '')}</div>
          </div>
          <button class="btn-icon" title="Sign out" onclick="App.logout()">${icon('logout', 16)}</button>
        </div>
      </aside>`;
  },

  toggle(force) {
    const sidebarEl = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebarEl || !overlay) return;
    const open = typeof force === 'boolean' ? force : !sidebarEl.classList.contains('open');
    sidebarEl.classList.toggle('open', open);
    overlay.classList.toggle('show', open);
  },
};
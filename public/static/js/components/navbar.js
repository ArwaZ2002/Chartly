/* ============================================================
   Chartly — Navbar component
   Top bar with mobile menu toggle + page title.
   ============================================================ */

import { App } from '../app.js';
import { icon } from '../app.js';

export const navbar = {
  render(title) {
    const count = Number(App.notifCount) || 0;
    const show = count > 0 ? 'flex' : 'none';
    const txt = count > 99 ? '99+' : String(count);
    return `
      <header class="topbar">
        <button class="btn-icon" onclick="App.toggleDrawer()" aria-label="Menu">${icon('menu', 20)}</button>
        <span class="topbar-title">${App.escapeHtml(title)}</span>
        <div style="margin-left:auto; display:flex; align-items:center; gap:8px;">
          <a href="#notifications" class="notif-bell" id="notifBellBtn" aria-label="Notifications" title="Notifications">
            ${icon('bell', 18)}
            <span class="notif-badge" id="notifBadge" style="display:${show}">${App.escapeHtml(txt)}</span>
          </a>
        </div>
      </header>`;
  },
};
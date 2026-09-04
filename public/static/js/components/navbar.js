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
    // White topbar removed per request — keep only bell icon (fixed top-right)
    return `
      <a href="#notifications" class="notif-bell notif-bell-fixed" id="notifBellBtn" aria-label="Notifications" title="Notifications">
        ${icon('bell', 18)}
        <span class="notif-badge" id="notifBadge" style="display:${show}">${App.escapeHtml(txt)}</span>
      </a>`;
  },
};
/* ============================================================
   Chartly — Navbar component
   Top bar with mobile menu toggle + page title.
   ============================================================ */

import { App } from '../app.js';
import { icon } from '../app.js';

export const navbar = {
  render(title) {
    return `
      <header class="topbar">
        <button class="btn-icon" onclick="App.toggleDrawer()" aria-label="Menu">${icon('menu', 20)}</button>
        <span class="topbar-title">${App.escapeHtml(title)}</span>
      </header>`;
  },
};
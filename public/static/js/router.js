/* ============================================================
   Chartly — Router
   Hash-based routing. Pages register with a { hash, render } object.
   Prefix matching lets route groups (#charts/, #charts/project/) share handlers.
   ============================================================ */

import { App } from './app.js';

export const router = {
  pages: {},

  registerPage(hash, fn) {
    if (typeof hash === 'object') {
      this.pages[hash.hash] = hash.render;
      return;
    }
    this.pages[hash] = fn;
  },

  render() {
    const app = document.getElementById('app');
    if (!app) return;
    const hash = location.hash || '#login';
    if (this.pages[hash]) { this.pages[hash](app); return; }
    const sorted = Object.keys(this.pages).sort((a, b) => b.length - a.length);
    for (const key of sorted) {
      if (key.length > 1 && hash.startsWith(key)) { this.pages[key](app); return; }
    }
    app.innerHTML = App.emptyState('file', 'Page not found', 'The page you are looking for does not exist.', '<a href="#dashboard" class="btn btn-primary">Go to Dashboard</a>');
  },
};
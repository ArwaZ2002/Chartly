/* ============================================================
   Chartly — Modal component
   Promise-based confirm + prompt dialogs.
   ============================================================ */

import { App } from '../app.js';
import { icon } from '../app.js';

export const modal = {
  confirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', danger = false }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>${App.escapeHtml(title)}</h3>
          ${message ? `<p>${App.escapeHtml(message)}</p>` : ''}
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${App.escapeHtml(confirmText)}</button>
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

  prompt({ title = 'Enter value', message = '', keyLabel = 'Value', defaultValue = '', placeholder = '', confirmText = 'Save' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>${App.escapeHtml(title)}</h3>
          ${message ? `<p>${App.escapeHtml(message)}</p>` : ''}
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">${App.escapeHtml(keyLabel)}</label>
            <input type="text" class="form-input" id="modalInput" value="${App.escapeHtml(defaultValue)}" placeholder="${App.escapeHtml(placeholder)}">
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="ok">${App.escapeHtml(confirmText)}</button>
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
};
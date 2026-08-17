/* ============================================================
   Chartly — Audit view (#audit)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';
import { chart } from '../components/chart.js';

export const auditPage = {
  hash: '#audit',

  async render(app) {
    if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
    app.innerHTML = App.shell('audit', 'Audit Trail', `
      <div class="page-header"><div><h1>Audit Trail</h1><p class="subtitle">Every action recorded on the platform.</p></div></div>
      <div class="card" id="auditList">${App.loading()}</div>
    `);

    const listEl = document.getElementById('auditList');
    try {
      const audit = await api.apiFetch('/audit/');
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
                  <td>${a.specification && a.specification.chart_type ? chart.typeLabel(a.specification.chart_type) + ' chart' : '—'}</td>
                  <td style="white-space:nowrap;">${App.formatDateTime(a.timestamp)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      }
    } catch (err) {
      listEl.innerHTML = App.errBlock(err.message);
    }
  },
};
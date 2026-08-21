/* ============================================================
   Chartly — Dashboard view (#dashboard)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';
import { chart } from '../components/chart.js';

export const dashboardPage = {
  hash: '#dashboard',

  async render(app) {
    if (!App.auth()) return;

    app.innerHTML = App.shell('dashboard', 'Dashboard', `
      <div class="page-header">
        <div>
          <h1>Welcome back, ${App.escapeHtml(App.user?.name || 'there')}</h1>
          <p class="subtitle">Here's what's happening in your analysis workspace.</p>
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
        api.apiFetch('/datasets/'),
        api.apiFetch('/charts/'),
        api.apiFetch('/templates/'),
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
      const audit = await api.apiFetch('/audit/');
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
                ${App.escapeHtml((a.specification && a.specification.chart_type) ? '— ' + chart.typeLabel(a.specification.chart_type) : '')}
              </div>
              <div class="activity-time">${App.formatDate(a.timestamp)}</div>
            </div>
          </div>`).join('');
      }
    } catch (_) {
      const el = document.getElementById('activityList');
      if (el) el.innerHTML = App.emptyState('calendar', 'No recent activity', '');
    }
  },
};
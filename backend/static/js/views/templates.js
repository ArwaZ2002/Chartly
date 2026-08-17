/* ============================================================
   Chartly — Templates view (#templates)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';
import { chart } from '../components/chart.js';

export const templatesPage = {
  hash: '#templates',

  async render(app) {
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
        const accent = chart.accent(t.chart_type);
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
            await api.apiFetch(`/templates/${btn.dataset.id}`, { method: 'DELETE' });
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
        const data = await api.apiFetch('/datasets/');
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
          const result = await api.apiFetch('/templates/apply', {
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
        const data = await api.apiFetch(`/templates/${q ? `?search=${encodeURIComponent(q)}` : ''}`);
        list = Array.isArray(data) ? data : [];
      } catch (err) {
        listEl.innerHTML = App.errBlock(err.message);
        return;
      }
      render();
    };

    searchEl.addEventListener('input', () => { clearTimeout(searchEl._t); searchEl._t = setTimeout(load, 300); });
    load();
  },
};
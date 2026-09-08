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
          ${App.can('create') ? `<button class="btn btn-primary" id="newPaletteBtn">${icon('plus', 15)} New Palette</button>` : ''}
          <a href="#charts" class="btn btn-secondary">${icon('chart', 15)} Browse Charts</a>
        </div>
      </div>
      <div id="templatesList">${App.loading()}</div>
      <div class="card" style="padding:20px; margin-top:24px; display:none;" id="themeTemplatesCard">
        <div class="section-title" style="margin-bottom:12px;">Theme Templates <span class="badge slate" id="themeTemplatesCount">0</span></div>
        <p class="form-hint" style="margin:0 0 14px;">Saved color palettes and fonts — apply them to any new chart from the chart editor.</p>
        <div id="themeTemplatesList"></div>
      </div>
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
        const creator = App.escapeHtml(t.created_by_name || (t.created_by ? t.created_by.slice(0, 8) : 'Unknown'));
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
            <small class="date">Created by <strong>${creator}</strong> · ${App.formatDate(t.created_at)}</small>
            <div class="chart-card-footer">
              ${App.can('create') ? `<button class="btn btn-primary btn-sm apply-template" data-id="${t.id}" style="flex:1;">${icon('sparkles', 13)} Use Template</button>` : ''}
              ${App.canDelete(t.created_by) ? `<button class="btn btn-secondary btn-sm delete-template" data-id="${t.id}" title="Delete">${icon('trash', 14)}</button>` : ''}
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
      const usable = App.user?.role === 'admin' ? datasets : datasets.filter(d => d.status !== 'closed');
      if (usable.length === 0) {
        App.toast('No open projects available to apply this template', 'warn');
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
              ${usable.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}</option>`).join('')}
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

    const openPaletteModal = () => {
      const swatchPool = ['#f97316', '#4f46e5', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f59e0b'];
      let colors = [...swatchPool].slice(0, 4);
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      const renderSwatches = () => {
        const wrap = overlay.querySelector('#paletteSwatches');
        wrap.innerHTML = colors.map((c, i) => `
          <div class="palette-swatch" style="display:flex; align-items:center; gap:6px;">
            <input type="color" class="custom-color" data-i="${i}" value="${App.escapeHtml(c)}" title="Pick a color">
            <button type="button" class="btn-icon" data-remove="${i}" title="Remove color" style="border:1px solid var(--border); border-radius:6px; padding:4px;">${icon('x', 12)}</button>
          </div>`).join('');
        overlay.querySelector('#paletteAddBtn').style.display = colors.length >= 10 ? 'none' : '';
        const badge = overlay.querySelector('#paletteCount');
        if (badge) badge.textContent = `${colors.length}/10`;
        wrap.querySelectorAll('input[type="color"]').forEach(input => {
          input.addEventListener('input', () => { colors[Number(input.dataset.i)] = input.value; });
        });
        wrap.querySelectorAll('[data-remove]').forEach(btn => {
          btn.addEventListener('click', () => {
            colors = colors.filter((_, i) => i !== Number(btn.dataset.remove));
            renderSwatches();
          });
        });
      };
      overlay.innerHTML = `
        <div class="modal" style="max-width:440px;">
          <h3>${icon('template', 16)} Create Color Palette</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">Build a custom palette and save it to reuse on any chart.</p>
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label">Palette name</label>
            <input type="text" class="form-input" id="paletteName" placeholder="e.g. Brand Orange" maxlength="60">
          </div>
          <div class="form-group" style="margin-bottom:14px;">
            <label class="form-label">Colors <span class="badge slate" id="paletteCount">${colors.length}/10</span></label>
            <div id="paletteSwatches" style="display:flex; flex-direction:column; gap:8px;"></div>
            <button type="button" class="btn btn-secondary btn-sm" id="paletteAddBtn" style="margin-top:8px;">${icon('plus', 13)} Add Color</button>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="save">${icon('check', 15)} Save Palette</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      renderSwatches();
      overlay.querySelector('#paletteAddBtn').addEventListener('click', () => {
        if (colors.length >= 10) return;
        colors.push(swatchPool[colors.length % swatchPool.length]);
        renderSwatches();
      });
      overlay.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'cancel') { overlay.remove(); return; }
        const name = overlay.querySelector('#paletteName').value.trim();
        if (!name) { App.toast('Please enter a palette name', 'warn'); return; }
        const saveBtn = overlay.querySelector('[data-act="save"]');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner"></span> Saving...';
        try {
          await api.apiFetch('/theme-templates/', {
            method: 'POST',
            body: { name, colors, font_family: null },
          });
          overlay.remove();
          load();
          App.toast('Color palette saved');
        } catch (err) {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `${icon('check', 15)} Save Palette`;
          App.toast(err.message, 'error');
        }
      });
    };
    const newPaletteBtn = document.getElementById('newPaletteBtn');
    if (newPaletteBtn) newPaletteBtn.addEventListener('click', openPaletteModal);

    const renderThemes = (themes) => {
      const card = document.getElementById('themeTemplatesCard');
      const listEl = document.getElementById('themeTemplatesList');
      document.getElementById('themeTemplatesCount').textContent = themes.length;
      card.style.display = themes.length ? '' : 'none';
      listEl.innerHTML = themes.map(t => `
        <div class="theme-template-row">
          <div class="palette-dots">${(t.colors || []).map(c => `<i style="background:${App.escapeHtml(c)}"></i>`).join('')}</div>
          <div style="flex:1; min-width:0;">
            <strong style="color:var(--text); font-weight:600; font-size:13px;">${App.escapeHtml(t.name)}</strong>
            <div style="font-size:11.5px; color:var(--text-muted);">${App.escapeHtml(t.font_family || 'System font')} · ${App.formatDate(t.created_at)}</div>
          </div>
          <div style="display:flex; gap:8px;">
            ${App.can('create') ? `<button class="btn btn-primary btn-sm use-theme" data-id="${t.id}">${icon('sparkles', 13)} Use in Builder</button>` : ''}
            ${App.canDelete(t.created_by) ? `<button class="btn btn-secondary btn-sm delete-theme" data-id="${t.id}" title="Delete">${icon('trash', 14)}</button>` : ''}
          </div>
        </div>`).join('');

      listEl.querySelectorAll('.use-theme').forEach(btn => {
        btn.addEventListener('click', () => {
          const t = themes.find(x => x.id === btn.dataset.id);
          sessionStorage.setItem('chartly_preset', JSON.stringify({
            name: t.name,
            colors: t.colors || [],
            font_family: t.font_family || '',
          }));
          App.toast('Theme ready — create your chart', 'info');
          location.hash = '#charts/new';
        });
      });
      listEl.querySelectorAll('.delete-theme').forEach(btn => {
        btn.addEventListener('click', async () => {
          const t = themes.find(x => x.id === btn.dataset.id);
          const ok = await App.confirmDialog({ title: 'Delete theme template?', message: `"${t ? t.name : 'This theme'}" will be removed.`, confirmText: 'Delete', danger: true });
          if (!ok) return;
          try {
            await api.apiFetch(`/theme-templates/${btn.dataset.id}`, { method: 'DELETE' });
            load();
            App.toast('Theme template deleted', 'info');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      });
    };

    const load = async () => {
      try {
        const [q, themes] = await Promise.all([
          api.apiFetch(`/templates/${searchEl.value.trim() ? `?search=${encodeURIComponent(searchEl.value.trim())}` : ''}`),
          api.apiFetch('/theme-templates/'),
        ]);
        list = Array.isArray(q) ? q : [];
        renderThemes(Array.isArray(themes) ? themes : []);
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
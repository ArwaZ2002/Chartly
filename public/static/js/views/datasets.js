/* ============================================================
   Chartly — Datasets views
   #upload        — upload + dataset list + dataset detail
   #charts        — projects (datasets as projects)
   #charts/project/ — single project detail
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

// ---------------------------------------------------------------
// UPLOAD
// ---------------------------------------------------------------
export const uploadPage = {
  hash: '#upload',

  async render(app) {
    if (!App.auth() || !App.can('upload')) { location.hash = '#dashboard'; return; }
    let datasets = [];
    let selectedId = null;

    app.innerHTML = App.shell('upload', 'Upload Data', `
      <div class="page-header">
        <div>
          <h1>Upload Data</h1>
          <p class="subtitle">Import a CSV or Excel file, or pick a dataset below to inspect it.</p>
        </div>
      </div>

      <div class="upload-zone" id="uploadZone">
        <div class="upload-zone-icon">${icon('upload', 24)}</div>
        <h3>Drop your file here</h3>
        <p>or <span class="browse-link">click to browse</span></p>
        <p class="upload-formats">Supports CSV, XLSX, XLS — max 50 MB</p>
        <input type="file" id="fileInput" accept=".csv,.xlsx,.xls" hidden>
      </div>

      <div id="uploadProgress" style="display:none; padding:14px 16px; margin-bottom:20px;" class="card">
        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:600;">
          <span id="progressFileName">file.csv</span>
          <span id="progressFileSize" style="color:var(--text-muted); font-weight:500;">0 KB</span>
        </div>
        <div class="progress-track"><div class="progress-bar" id="progressBar" style="width:0%"></div></div>
        <div style="font-size:12px; color:var(--text-muted);" id="progressStatus">Uploading...</div>
      </div>

      <div class="upload-layout" style="margin-top:20px;">
        <div>
          <div class="section-title" style="margin-bottom:10px;">
            <span>Datasets <span class="badge slate" id="dsCount">0</span></span>
            <input type="text" class="form-input" id="dsSearch" placeholder="Search... " style="width:130px; padding:6px 10px; font-size:12.5px;">
          </div>
          <div class="card upload-list" id="datasetsList">${App.loading('Loading datasets...')}</div>
        </div>
        <div id="datasetDetail"><div class="card" style="padding:22px; color:var(--text-muted); text-align:center; font-size:13px;">Select a dataset to view details and create charts.</div></div>
      </div>
    `);

    const fileInput = document.getElementById('fileInput');
    const zone = document.getElementById('uploadZone');
    const dsListEl = document.getElementById('datasetsList');
    const detailEl = document.getElementById('datasetDetail');
    const searchEl = document.getElementById('dsSearch');

    function formatBytes(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function renderList(filter = '') {
      const list = datasets.filter(d => !filter || (d.name || '').toLowerCase().includes(filter.toLowerCase()));
      document.getElementById('dsCount').textContent = datasets.length;
      if (datasets.length === 0) {
        dsListEl.innerHTML = App.emptyState('file', 'No datasets yet', 'Upload a file above to get started.');
        return;
      }
      if (list.length === 0) {
        dsListEl.innerHTML = '<p style="padding:16px; font-size:13px; color:var(--text-muted);">No matches</p>';
        return;
      }
      dsListEl.innerHTML = list.map(d => `
        <div class="dataset-item ${d.id === selectedId ? 'selected' : ''}" data-id="${d.id}">
          <div class="dataset-item-icon">${icon('file', 16)}</div>
          <div class="dataset-item-info">
            <div class="dataset-item-name">${App.escapeHtml(d.name)}</div>
            <div class="dataset-item-meta">${App.formatNumber(d.row_count)} rows · ${d.columns?.length || 0} cols · ${App.formatDate(d.uploaded_at)}</div>
          </div>
          ${App.can('delete') ? `<button class="btn-icon danger delete-ds" data-id="${d.id}" title="Delete">${icon('trash', 15)}</button>` : ''}
        </div>`).join('');

      dsListEl.querySelectorAll('.dataset-item').forEach(item => {
        item.addEventListener('click', () => { selectedId = item.dataset.id; renderList(searchEl.value); renderDetail(selectedId); });
      });
      dsListEl.querySelectorAll('.delete-ds').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const ds = datasets.find(d => d.id === btn.dataset.id);
          const ok = await App.confirmDialog({
            title: 'Delete dataset?',
            message: `"${ds ? ds.name : 'This dataset'}" and all its charts will be removed. This cannot be undone.`,
            confirmText: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await api.apiFetch(`/datasets/${btn.dataset.id}`, { method: 'DELETE' });
            datasets = datasets.filter(d => d.id !== btn.dataset.id);
            if (selectedId === btn.dataset.id) selectedId = null;
            renderList(searchEl.value);
            if (!selectedId) detailEl.innerHTML = '<div class="card" style="padding:22px; color:var(--text-muted); text-align:center; font-size:13px;">Select a dataset to view details.</div>';
            App.toast('Dataset deleted', 'info');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      });
    }

    async function renderDetail(dsId) {
      const ds = datasets.find(d => d.id === dsId);
      if (!ds) return;
      detailEl.innerHTML = `
        <div class="card" style="padding:22px;">
          <div class="chart-detail-head">
            <div style="display:flex; gap:12px; align-items:flex-start;">
              <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo); flex-shrink:0;">${icon('file', 18)}</div>
              <div>
                <h2 style="font-size:17px; font-weight:800;">${App.escapeHtml(ds.name)}</h2>
                <p class="subtitle" style="font-size:12.5px;">Uploaded ${App.formatDate(ds.uploaded_at)}</p>
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="renameBtn">${icon('pencil', 14)} Rename</button>` : ''}
              ${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary btn-sm">${icon('plus', 14)} Create Chart</a>` : ''}
            </div>
          </div>
          <div class="dataset-stat-row">
            <div class="dataset-stat"><div class="v">${App.formatNumber(ds.row_count)}</div><div class="l">Rows</div></div>
            <div class="dataset-stat"><div class="v">${ds.columns?.length || 0}</div><div class="l">Columns</div></div>
            <div class="dataset-stat"><div class="v">${ds.file_name ? ds.file_name.split('.').pop().toUpperCase() : '—'}</div><div class="l">Format</div></div>
          </div>
          <div style="margin-bottom:16px;">
            ${(ds.columns || []).map(c => `
              <span class="column-chip">
                ${App.escapeHtml(c.name)}
                <span class="t ${c.type === 'number' ? 'num' : c.type === 'date' ? 'date' : ''}">${c.type}</span>
              </span>`).join('')}
          </div>
          <div class="section-title" style="margin-bottom:10px;">Preview <span class="badge slate">first rows</span></div>
          <div id="previewBox"><div class="loading" style="padding:16px;"><span class="spinner"></span></div></div>
        </div>`;

      const renameBtn = document.getElementById('renameBtn');
      if (renameBtn) {
        renameBtn.addEventListener('click', async () => {
          const newName = await App.promptDialog({ title: 'Rename dataset', keyLabel: 'New name', defaultValue: ds.name, confirmText: 'Save' });
          if (!newName || newName === ds.name) return;
          try {
            await api.apiFetch(`/datasets/${ds.id}`, { method: 'PATCH', body: { name: newName } });
            ds.name = newName;
            renderList(searchEl.value);
            renderDetail(dsId);
            App.toast('Dataset renamed');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      }

      try {
        const preview = await api.apiFetch(`/datasets/${dsId}/preview`);
        const rows = (preview.rows || []).slice(0, 8);
        const cols = preview.columns || [];
        const box = document.getElementById('previewBox');
        box.innerHTML = rows.length === 0
          ? '<p style="font-size:13px; color:var(--text-muted); padding:8px 0;">No data to preview</p>'
          : `<div class="table-wrap" style="border:1px solid var(--border); border-radius:var(--radius-sm);">
              <table class="data-table">
                <thead><tr>${cols.map(c => `<th>${App.escapeHtml(c)}</th>`).join('')}</tr></thead>
                <tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${App.escapeHtml(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
              </table>
            </div>`;
      } catch (e) {
        document.getElementById('previewBox').innerHTML = '<p style="font-size:13px; color:var(--text-muted); padding:8px 0;">Preview unavailable</p>';
      }
    }

    // Load datasets
    try {
      const data = await api.apiFetch('/datasets/');
      datasets = Array.isArray(data) ? data : [];
    } catch (_) { datasets = []; }
    renderList();

    searchEl.addEventListener('input', () => renderList(searchEl.value));

    // Upload flow
    async function uploadFile(file) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!['.csv', '.xlsx', '.xls'].includes(ext)) { App.toast('Invalid file type — use CSV or Excel', 'error'); return; }
      if (file.size > 50 * 1024 * 1024) { App.toast('File too large (max 50 MB)', 'error'); return; }

      const progressContainer = document.getElementById('uploadProgress');
      progressContainer.style.display = 'block';
      document.getElementById('progressFileName').textContent = file.name;
      document.getElementById('progressFileSize').textContent = formatBytes(file.size);
      document.getElementById('progressStatus').textContent = 'Uploading...';
      const bar = document.getElementById('progressBar');
      bar.style.width = '0%';

      let progress = 0;
      const fakeInterval = setInterval(() => { progress = Math.min(progress + Math.random() * 15, 90); bar.style.width = progress + '%'; }, 200);

      try {
        const formData = new FormData();
        formData.append('file', file);
        const data = await api.apiFetch('/datasets/upload', { method: 'POST', body: formData, headers: {} });
        clearInterval(fakeInterval);
        bar.style.width = '100%';
        document.getElementById('progressStatus').textContent = 'Complete!';

        const updated = await api.apiFetch('/datasets/');
        datasets = Array.isArray(updated) ? updated : [];
        selectedId = data.id;
        setTimeout(() => {
          progressContainer.style.display = 'none';
          fileInput.value = '';
          renderList(searchEl.value);
          renderDetail(data.id);
          App.toast(`Uploaded "${data.name}" — ${App.formatNumber(data.row_count)} rows`);
        }, 500);
      } catch (err) {
        clearInterval(fakeInterval);
        progressContainer.style.display = 'none';
        fileInput.value = '';
        App.toast('Upload failed: ' + err.message, 'error');
      }
    }

    zone.addEventListener('click', (e) => {
      if (e.target.closest('.upload-zone') && !e.target.closest('input')) fileInput.click();
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); });
    ['dragenter', 'dragover'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add('drag-over'); }));
    ['dragleave', 'drop'].forEach(ev => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.remove('drag-over'); }));
    zone.addEventListener('drop', (e) => { const file = e.dataTransfer.files[0]; if (file) uploadFile(file); });
  },
};

// ---------------------------------------------------------------
// CHARTS (Projects)
// ---------------------------------------------------------------
export const projectsPage = {
  hash: '#charts',

  async render(app) {
    if (!App.auth()) return;
    app.innerHTML = App.shell('charts', 'Charts', `
      <div class="page-header">
        <div>
          <h1>Projects</h1>
          <p class="subtitle">Every dataset is a project that can hold multiple charts.</p>
        </div>
        <div class="page-header-actions">
          ${App.can('upload') ? `<a href="#upload" class="btn btn-primary">${icon('upload', 16)} New Project</a>` : ''}
        </div>
      </div>
      <div id="projectsList">${App.loading()}</div>
    `);

    const listEl = document.getElementById('projectsList');
    try {
      const [datasets, charts] = await Promise.all([
        api.apiFetch('/datasets/'),
        api.apiFetch('/charts/'),
      ]);
      const dsList = Array.isArray(datasets) ? datasets : [];
      const chartList = Array.isArray(charts) ? charts : [];

      if (dsList.length === 0) {
        listEl.innerHTML = App.emptyState('database', 'No projects yet', 'Upload a dataset to create your first project.', '<a href="#upload" class="btn btn-primary">Upload Data</a>');
        return;
      }

      listEl.innerHTML = `<div class="projects-grid">${dsList.map(ds => {
        const count = chartList.filter(c => c.dataset_id === ds.id).length;
        return `
          <a href="#charts/project/${ds.id}" class="project-card">
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo);">${icon('file', 17)}</div>
              <span class="badge ${count > 0 ? 'orange' : 'slate'}">${count} chart${count !== 1 ? 's' : ''}</span>
            </div>
            <div>
              <h3 style="font-size:14.5px; font-weight:700;">${App.escapeHtml(ds.display_name || ds.name)}</h3>
              <p class="meta" style="font-size:12.5px; color:var(--text-secondary); margin-top:2px;">${App.formatNumber(ds.row_count)} rows · ${ds.columns?.length || 0} columns</p>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between;">
              <small class="date" style="font-size:11.5px; color:var(--text-muted);">Created ${App.formatDate(ds.uploaded_at)}</small>
              <span style="color:var(--text-muted);">${icon('chevron', 15)}</span>
            </div>
          </a>`;
      }).join('')}</div>`;
    } catch (err) {
      listEl.innerHTML = App.errBlock(err.message);
    }
  },
};

// ---------------------------------------------------------------
// PROJECT DETAIL
// ---------------------------------------------------------------
export const projectDetailPage = {
  hash: '#charts/project/',

  async render(app) {
    if (!App.auth()) return;
    const datasetId = location.hash.split('/')[2];

    app.innerHTML = App.shell('charts', 'Project', `
      <div class="page-header"><a href="#charts" class="btn btn-secondary btn-sm">${icon('arrow', 15)} Back to Projects</a></div>
      <div id="projectContent">${App.loading()}</div>
    `);

    const contentEl = document.getElementById('projectContent');
    try {
      const [datasets, charts] = await Promise.all([
        api.apiFetch('/datasets/'),
        api.apiFetch('/charts/'),
      ]);
      const dsList = Array.isArray(datasets) ? datasets : [];
      const chartList = Array.isArray(charts) ? charts : [];
      const ds = dsList.find(d => d.id === datasetId);
      if (!ds) throw new Error('Project not found');
      const dsCharts = chartList.filter(c => c.dataset_id === datasetId);

      contentEl.innerHTML = `
        <div class="card" style="padding:22px; margin-bottom:20px;">
          <div class="chart-detail-head">
            <div style="display:flex; gap:12px; align-items:center;">
              <div class="chart-card-icon indigo" style="background:var(--indigo-soft);color:var(--indigo);">${icon('file', 18)}</div>
              <div>
                <h2 style="font-size:18px; font-weight:800;">${App.escapeHtml(ds.display_name || ds.name)}</h2>
                <p class="subtitle" style="font-size:12.5px;">${App.formatNumber(ds.row_count)} rows · ${ds.columns?.length || 0} columns · ${dsCharts.length} chart${dsCharts.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="renameBtn">${icon('pencil', 14)} Rename</button>` : ''}
              ${App.can('delete') ? `<button class="btn btn-danger btn-sm" id="deleteBtn">${icon('trash', 14)} Delete</button>` : ''}
              ${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary btn-sm">${icon('plus', 14)} New Chart</a>` : ''}
            </div>
          </div>
        </div>
        <div class="section-title">Charts <span class="badge slate">${dsCharts.length}</span></div>
        <div class="charts-grid" id="projectCharts">
          ${dsCharts.length === 0
            ? App.emptyState('chart', 'No charts yet', 'Create your first chart with this dataset.', `${App.can('create') ? `<a href="#charts/new?datasetId=${ds.id}" class="btn btn-primary">${icon('plus', 15)} Create Chart</a>` : ''}`)
            : dsCharts.map(c => {
                const spec = c.specification || {};
                const accent = App.chartAccent(spec.chart_type);
                const creator = App.escapeHtml(c.created_by_name || (c.created_by ? c.created_by.slice(0,8) : 'Unknown'));
                const editor = c.updated_by_name ? App.escapeHtml(c.updated_by_name) : (c.updated_by ? c.updated_by.slice(0,8) : null);
                const hasEdit = !!(c.updated_at && c.updated_by);
                const metaLine = hasEdit
                  ? `Created by <strong>${creator}</strong> ${App.formatDate(c.created_at)} · Edited by <strong>${editor}</strong> ${App.formatDate(c.updated_at)}`
                  : `Created by <strong>${creator}</strong> ${App.formatDate(c.created_at)}`;
                return `
                  <a href="#charts/${c.id}" class="chart-card">
                    <div class="chart-card-head">
                      <div class="chart-card-icon ${accent}" style="background:var(--${accent}-soft);color:var(--${accent});">${icon('chart', 16)}</div>
                      <span class="badge ${accent}">${App.escapeHtml(spec.chart_type || 'chart')}</span>
                    </div>
                    <div>
                      <h3>${App.escapeHtml(spec.title || 'Untitled Chart')}</h3>
                      <p class="meta">${spec.chart_type === 'histogram' ? `Distribution of ${App.escapeHtml(spec.dimension || '—')}` : `${App.escapeHtml(spec.dimension || '—')} vs ${App.escapeHtml(spec.metric || '—')}`}</p>
                    </div>
                    <small class="date" style="line-height:1.4;">${metaLine}</small>
                  </a>`;
              }).join('')
          }
        </div>`;

      const renameBtn = document.getElementById('renameBtn');
      if (renameBtn) {
        renameBtn.addEventListener('click', async () => {
          const newName = await App.promptDialog({ title: 'Rename project', keyLabel: 'Project name', defaultValue: ds.display_name || ds.name, confirmText: 'Save' });
          if (!newName || newName === (ds.display_name || ds.name)) return;
          try {
            await api.apiFetch(`/datasets/${ds.id}`, { method: 'PATCH', body: { name: newName } });
            ds.display_name = newName;
            location.reload();
          } catch (err) { App.toast(err.message, 'error'); }
        });
      }

      const deleteBtn = document.getElementById('deleteBtn');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          const ok = await App.confirmDialog({
            title: 'Delete project?',
            message: `"${ds.display_name || ds.name}" and all its charts will be removed. This cannot be undone.`,
            confirmText: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await api.apiFetch(`/datasets/${datasetId}`, { method: 'DELETE' });
            location.hash = '#charts';
            App.toast('Project deleted', 'info');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      }
    } catch (err) {
      contentEl.innerHTML = App.errBlock(err.message);
    }
  },
};
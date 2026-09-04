/* ============================================================
   Chartly — Review view (#charts/:id)
   Chart detail: render, edit/regenerate, versions, exports.
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';
import { chart as chartUtil } from '../components/chart.js';

export const reviewPage = {
  hash: '#charts/',

  async render(app) {
    if (!App.auth()) return;
    const chartId = location.hash.split('/')[1];
    if (!chartId) { location.hash = '#charts'; return; }

    app.innerHTML = App.shell('charts', 'Chart', `
      <div class="page-header"><a href="#charts" class="btn btn-secondary btn-sm">${icon('arrow', 15)} Back to Projects</a></div>
      <div id="chartDetail">${App.loading('Rendering chart...')}</div>
    `);

    try {
      const [charts, datasets] = await Promise.all([
        api.apiFetch('/charts/'),
        api.apiFetch('/datasets/'),
      ]);
      const chart = (Array.isArray(charts) ? charts : []).find(c => c.id === chartId);
      if (!chart) throw new Error('Chart not found');
      const spec = chart.specification || {};
      const ds = (Array.isArray(datasets) ? datasets : []).find(d => d.id === chart.dataset_id);
      const plotlyCode = chartUtil.generateCode(spec, chart.dataset_id);

      const versions = chart.versions || [];
      const currentVersionId = chart.current_version_id || versions[versions.length - 1]?.id;
      const SPEC_FIELDS = [
        ['chart_type', 'chart type'],
        ['dimension', 'X-axis'],
        ['metric', 'Y-axis'],
        ['aggregation', 'aggregation'],
        ['sorting', 'sorting'],
        ['time_granularity', 'granularity'],
        ['title', 'title'],
      ];
      const diffFields = (prev, next) => {
        if (!prev) return [];
        const a = prev.specification || {};
        const b = next.specification || {};
        return SPEC_FIELDS.filter(([k]) => (a[k] ?? null) !== (b[k] ?? null)).map(([, label]) => label);
      };
      // Helper to resolve creator label for version
      const versionAuthor = (v) => App.escapeHtml(v.created_by_name || (v.created_by ? v.created_by.slice(0,8) : 'Unknown'));
      const versionsHtml = versions.length === 0
        ? '<p style="font-size:13px; color:var(--text-muted);">No versions recorded yet.</p>'
        : versions.map((v, i) => {
            const vs = v.specification || {};
            const isCurrent = v.id === currentVersionId;
            const changed = diffFields(versions[i - 1], v);
            const isHistogram = vs.chart_type === 'histogram';
            const isRaw = chartUtil.rawTypes.includes(vs.chart_type);
            return `
            <div class="version-item${isCurrent ? ' current' : ''}">
              <div class="version-item-main">
                <div class="version-item-head">
                  <strong>Version ${i + 1}</strong>
                  <span class="badge ${chartUtil.accent(vs.chart_type)}">${chartUtil.typeLabel(vs.chart_type || 'chart')}</span>
                  <span class="version-time">${App.formatDateTime(v.created_at)}</span>
                  <span class="meta-chip" style="font-size:11.5px;" title="${versionAuthor(v)}">${icon('users', 12)} ${versionAuthor(v)}</span>
                </div>
                <div class="version-item-chips">
                  <span class="meta-chip"><strong>${App.escapeHtml(vs.title || 'Untitled')}</strong></span>
                  ${isHistogram
                    ? `<span class="meta-chip">Column: <strong>${App.escapeHtml(vs.dimension || '—')}</strong></span>`
                    : `<span class="meta-chip">X: <strong>${App.escapeHtml(vs.dimension || '—')}</strong></span>
                       <span class="meta-chip">Y: <strong>${App.escapeHtml(vs.metric || '—')}</strong></span>`}
                  ${!isRaw && vs.aggregation ? `<span class="meta-chip">Method: <strong>${App.escapeHtml(vs.aggregation)}</strong></span>` : ''}
                </div>
                ${changed.length ? `<div class="version-diff">${icon('pencil', 12)} Changed: <span>${changed.map(App.escapeHtml).join(', ')}</span></div>` : ''}
              </div>
              <div class="version-item-actions">
                ${isCurrent
                  ? `<span class="badge green">${icon('check', 12)} Current</span>`
                  : `<button class="btn btn-secondary btn-sm preview-version" data-ver="${v.id}" data-title="${App.escapeHtml(vs.title || `Version ${i + 1}`)}">${icon('eye', 13)} Preview</button>
                     ${App.can('edit') ? `<button class="btn btn-secondary btn-sm restore-version" data-ver="${v.id}">${icon('refresh', 13)} Restore</button>` : ''}`}
              </div>
            </div>`;
          }).join('');

      const creatorLabel = App.escapeHtml(chart.created_by_name || (chart.created_by ? chart.created_by.slice(0,8) : 'Unknown'));
      const editorLabel = chart.updated_by_name ? App.escapeHtml(chart.updated_by_name) : (chart.updated_by ? chart.updated_by.slice(0,8) : null);
      const hasEdit = !!(chart.updated_at && chart.updated_by);
      const subtitleHtml = hasEdit
        ? `${ds ? App.escapeHtml(ds.name) : 'Dataset removed'} · Created by <strong>${creatorLabel}</strong> ${App.formatDate(chart.created_at)} · Edited by <strong>${editorLabel}</strong> ${App.formatDate(chart.updated_at)}`
        : `${ds ? App.escapeHtml(ds.name) : 'Dataset removed'} · Created by <strong>${creatorLabel}</strong> ${App.formatDate(chart.created_at)}`;
      document.getElementById('chartDetail').innerHTML = `
        <div class="card" style="padding:22px; margin-bottom:20px;">
          <div class="chart-detail-head">
            <div>
              <h2>${App.escapeHtml(spec.title || 'Untitled Chart')}</h2>
              <p class="subtitle" style="font-size:12.5px;">${subtitleHtml}</p>
            </div>
            <div class="page-header-actions">
              ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="editChartBtn">${icon('pencil', 14)} Edit Chart</button>` : ''}
              ${App.can('edit') ? `              <button class="btn btn-secondary btn-sm" id="saveTemplateBtn">${icon('template', 14)} Save as Template</button>` : ''}
              <div class="download-dropdown" id="downloadDropdown">
                <button class="btn btn-secondary btn-sm" id="downloadToggleBtn">${icon('download', 13)} Download</button>
                <div class="download-dropdown-panel" id="downloadPanel">
                  <div class="dd-section">
                    <div class="dd-label">Format</div>
                    <div class="dd-options">
                      <label class="dd-option"><input type="radio" name="dlFormat" value="png" checked> PNG</label>
                      <label class="dd-option"><input type="radio" name="dlFormat" value="jpeg"> JPG</label>
                      <label class="dd-option"><input type="radio" name="dlFormat" value="svg"> SVG</label>
                    </div>
                  </div>
                  <div class="dd-section">
                    <div class="dd-label">Background</div>
                    <div class="dd-options">
                      <label class="dd-option"><input type="radio" name="dlBg" value="white" checked> White</label>
                      <label class="dd-option"><input type="radio" name="dlBg" value="transparent"> Transparent</label>
                    </div>
                  </div>
                  <button class="btn btn-primary btn-sm" id="downloadConfirmBtn" style="width:100%; margin-top:8px;">${icon('download', 13)} Download</button>
                </div>
              </div>
              <button class="btn btn-secondary btn-sm" id="exportCodeBtn">${icon('code', 14)} Export Code</button>
              ${App.can('delete') ? `<button class="btn btn-danger btn-sm" id="deleteChartBtn" title="Delete chart">${icon('trash', 14)}</button>` : ''}
            </div>
          </div>
          <div class="chart-meta-chips">
            <span class="badge ${chartUtil.accent(spec.chart_type)}">${chartUtil.typeLabel(spec.chart_type)}</span>
            ${spec.chart_type === 'histogram'
              ? `<span class="meta-chip">Column: <strong>${App.escapeHtml(spec.dimension || '—')}</strong></span>`
              : `<span class="meta-chip">X: <strong>${App.escapeHtml(spec.dimension || '—')}</strong></span>
                ${spec.chart_type === 'box' || spec.chart_type === 'violin'
                  ? `<span class="meta-chip">Y: <strong>${App.escapeHtml(spec.metric || '—')}</strong></span><span class="meta-chip">Distribution</span>`
                  : `<span class="meta-chip">Y: <strong>${App.escapeHtml(spec.metric || '—')}</strong></span><span class="meta-chip">Method: <strong>${App.escapeHtml(spec.aggregation || '—')}</strong></span>`}`}
          </div>
        </div>

        <div class="card" id="editCard" style="display:none; padding:20px; margin-bottom:20px;">
          <div class="chart-detail-head" style="margin-bottom:14px;">
            <h3 style="font-size:14px; font-weight:700; display:flex; align-items:center; gap:8px;">${icon('refresh', 15)} Edit Chart</h3>
            <span class="badge orange">Saving creates a new version</span>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Chart type</label>
              <select id="editType" class="form-select">
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="histogram">Histogram</option>
                <option value="box">Box Plot</option>
                <option value="violin">Violin Plot</option>
                <option value="treemap">Treemap</option>
                <option value="funnel">Funnel Chart</option>
              </select>
            </div>
            <div class="form-group" id="editOrientationGroup" style="display:none;">
              <label class="form-label">Orientation</label>
              <select id="editOrientation" class="form-select">
                <option value="vertical">Vertical</option>
                <option value="horizontal">Horizontal</option>
              </select>
            </div>
            <div class="form-group" id="editAggGroup">
              <label class="form-label">Aggregation</label>
              <select id="editAggregation" class="form-select">
                <option value="sum">Sum</option>
                <option value="average">Average</option>
                <option value="count">Count</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">X-axis (dimension)</label>
              <select id="editDimension" class="form-select"><option value="">Loading...</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Y-axis (metric)</label>
              <select id="editMetric" class="form-select"><option value="">Loading...</option></select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sorting</label>
              <select id="editSorting" class="form-select">
                <option value="none">None</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div class="form-group" id="editGranularityGroup" style="display:none;">
              <label class="form-label">Time granularity</label>
              <select id="editGranularity" class="form-select">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="quarter">Quarter</option>
                <option value="year">Year</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input type="text" id="editTitle" class="form-input" placeholder="Chart title">
          </div>
          <div class="form-group">
            <label class="form-label">Color palette</label>
            <div class="palette-grid" id="editPaletteGrid"></div>
            <div class="custom-colors" id="editCustomColors" style="display:none;">
              <input type="color" class="custom-color" data-i="0" value="#f97316">
              <input type="color" class="custom-color" data-i="1" value="#4f46e5">
              <input type="color" class="custom-color" data-i="2" value="#3b82f6">
              <input type="color" class="custom-color" data-i="3" value="#10b981">
            </div>
          </div>
          <div class="form-group" id="editLabelsGroup" style="display:none;">
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
              <input type="checkbox" id="editShowLabels" style="width:16px; height:16px; accent-color:#f97316;">
              <span class="form-label" style="margin:0;">Show data labels</span>
            </label>
          </div>
          <p class="form-hint" id="editTypeHint" style="margin:0 0 14px;"></p>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
            <button class="btn btn-primary" id="saveRegenBtn">${icon('check', 15)} Save Changes</button>
          </div>
        </div>

        <div class="chart-render-box" id="chartRenderBox">${App.loading('Plotting data...')}</div>
        <div style="margin-top:20px;">
          <div id="codeSection" style="display:none;">
            <div class="code-tabs">
              <button class="code-tab active" data-lang="python">Python</button>
              <button class="code-tab" data-lang="javascript">JavaScript</button>
              <button class="btn btn-secondary btn-sm" id="copyCodeBtn" style="margin-left:auto;">${icon('copy', 13)} Copy</button>
            </div>
            <pre class="code-block" id="codeOutput">${App.escapeHtml(plotlyCode.python)}</pre>
          </div>
        </div>
        <div class="card" style="padding:20px; margin-top:20px;">
          <div class="section-title" style="margin-bottom:12px;">Version History <span class="badge slate">${versions.length}</span></div>
          <div class="versions-list">
            ${versionsHtml}
          </div>
        </div>`;

      // Render chart
      const renderBox = document.getElementById('chartRenderBox');
      const drawChart = async () => {
        renderBox.innerHTML = App.loading('Plotting data...');
        try {
          const renderData = await api.apiFetch(`/charts/${chartId}/render`);
          const json = typeof renderData.json === 'string' ? JSON.parse(renderData.json) : renderData.json;
          await chartUtil.render(renderBox, json);
        } catch (err) {
          renderBox.innerHTML = App.errBlock('Failed to render chart: ' + err.message);
        }
      };
      drawChart();

      const editChartBtn = document.getElementById('editChartBtn');
      if (editChartBtn) {
        editChartBtn.addEventListener('click', () => {
          const card = document.getElementById('editCard');
          const shown = card.style.display !== 'none';
          card.style.display = shown ? 'none' : 'block';
          if (!shown) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
      }
      document.getElementById('cancelEditBtn').addEventListener('click', () => {
        document.getElementById('editCard').style.display = 'none';
      });

      // Populate + drive the edit form
      function populateEditForm() {
        if (!ds || !ds.columns) return;
        const allCols = ds.columns.map(c => c.name);
        const numCols = ds.columns.filter(c => c.type === 'number').map(c => c.name);
        const dimSel = document.getElementById('editDimension');
        const metSel = document.getElementById('editMetric');
        dimSel.innerHTML = allCols.length
          ? allCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
          : '<option value="">No columns</option>';
        metSel.innerHTML = numCols.length
          ? numCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
          : '<option value="">No numeric columns</option>';
        document.getElementById('editType').value = spec.chart_type || 'bar';
        if (spec.dimension) dimSel.value = spec.dimension;
        if (spec.metric && numCols.includes(spec.metric)) metSel.value = spec.metric;
        document.getElementById('editAggregation').value = spec.aggregation || 'sum';
        document.getElementById('editSorting').value = spec.sorting || 'none';
        document.getElementById('editGranularity').value = spec.time_granularity || 'month';
        document.getElementById('editTitle').value = spec.title || '';
        document.getElementById('editOrientation').value = spec.orientation || 'vertical';
        document.getElementById('editShowLabels').checked = !!spec.show_labels;
        updateEditUI();
      }
      function editDimIsDate() {
        if (!ds || !ds.columns) return false;
        const col = ds.columns.find(c => c.name === document.getElementById('editDimension').value);
        return !!(col && col.type === 'date');
      }
      function updateEditUI() {
        const type = document.getElementById('editType').value;
        const isRaw = chartUtil.rawTypes.includes(type);
        const isHistogram = type === 'histogram';
        document.getElementById('editAggGroup').style.display = isRaw ? 'none' : '';
        document.getElementById('editMetric').disabled = isHistogram;
        document.getElementById('editOrientationGroup').style.display = type === 'bar' ? '' : 'none';
        const labelTypes = ['bar', 'line', 'area', 'pie', 'scatter', 'treemap', 'funnel'];
        document.getElementById('editLabelsGroup').style.display = labelTypes.includes(type) ? '' : 'none';
        document.getElementById('editGranularityGroup').style.display =
          editDimIsDate() && ['bar', 'line', 'area'].includes(type) ? '' : 'none';
        document.getElementById('editTypeHint').textContent = isHistogram
          ? 'Plots the distribution of the X-axis column — Y-axis not needed.'
          : (type === 'box' || type === 'violin' ? 'Shows the raw spread of Y values per X category — aggregation is not applied.' : '');
      }
      populateEditForm();
      document.getElementById('editType').addEventListener('change', updateEditUI);
      document.getElementById('editDimension').addEventListener('change', updateEditUI);

      // ---- color palette state ----
      const palettes = chartUtil.palettes;
      let paletteIndex = 0;
      let customColors = ['#f97316', '#4f46e5', '#3b82f6', '#10b981'];
      function currentColors() {
        if (paletteIndex === palettes.length) return [...customColors];
        return palettes[paletteIndex].colors;
      }
      function syncCustomInputs() {
        document.querySelectorAll('#editCustomColors .custom-color').forEach(input => {
          input.value = customColors[Number(input.dataset.i)] || customColors[customColors.length - 1];
        });
      }
      function refreshPaletteUI() {
        document.querySelectorAll('#editPaletteGrid .palette-btn').forEach(btn => {
          btn.classList.toggle('active', Number(btn.dataset.idx) === paletteIndex);
        });
        document.getElementById('editCustomColors').style.display = paletteIndex === palettes.length ? 'flex' : 'none';
        syncCustomInputs();
      }
      function renderPalettes() {
        const grid = document.getElementById('editPaletteGrid');
        const all = [...palettes, { name: 'Custom', colors: customColors }];
        grid.innerHTML = all.map((p, i) => `
          <button type="button" class="palette-btn" data-idx="${i}" title="${App.escapeHtml(p.name)}">
            <span class="palette-dots">${p.colors.map(c => `<i style="background:${App.escapeHtml(c)}"></i>`).join('')}</span>
            <span class="palette-name">${App.escapeHtml(p.name)}</span>
          </button>`).join('');
        grid.querySelectorAll('.palette-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            paletteIndex = Number(btn.dataset.idx);
            if (paletteIndex === palettes.length) customColors = [...palettes[0].colors].slice(0, 4);
            refreshPaletteUI();
          });
        });
        refreshPaletteUI();
      }
      const existingColors = Array.isArray(spec.colors) ? spec.colors : [];
      const paletteMatch = palettes.findIndex(p =>
        existingColors.length && p.colors.slice(0, existingColors.length).join(',') === existingColors.join(',')
      );
      if (paletteMatch >= 0) paletteIndex = paletteMatch;
      else if (existingColors.length) { customColors = existingColors.slice(0, 4); paletteIndex = palettes.length; }
      renderPalettes();
      document.querySelectorAll('#editCustomColors .custom-color').forEach(input => {
        input.addEventListener('input', () => { customColors[Number(input.dataset.i)] = input.value; });
      });

      // Save changes -> regenerate with the edited spec (creates a new version)
      document.getElementById('saveRegenBtn').addEventListener('click', async () => {
        const dimension = document.getElementById('editDimension').value;
        const metric = document.getElementById('editMetric').value;
        const chartType = document.getElementById('editType').value;
        const aggregation = document.getElementById('editAggregation').value;
        const isHistogram = chartType === 'histogram';
        const title = document.getElementById('editTitle').value.trim() || (isHistogram ? `Distribution of ${dimension}` : `${metric} by ${dimension}`);

        if (!dimension) { App.toast('Please select an X-axis dimension', 'warn'); return; }
        if (!isHistogram && !metric && aggregation !== 'count') { App.toast('Please select a Y-axis metric', 'warn'); return; }

        const btn = document.getElementById('saveRegenBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Regenerating...';
        try {
          const granGroup = document.getElementById('editGranularityGroup');
          await api.apiFetch(`/charts/${chartId}/regenerate`, {
            method: 'POST',
            body: {
              dataset_id: chart.dataset_id,
              specification: {
                chart_type: chartType,
                dimension,
                metric: metric || dimension,
                aggregation,
                sorting: document.getElementById('editSorting').value || 'none',
                time_granularity: granGroup.style.display !== 'none' ? document.getElementById('editGranularity').value : null,
                title,
                colors: currentColors(),
                font_family: spec.font_family || null,
                orientation: document.getElementById('editOrientation').value,
                show_labels: document.getElementById('editShowLabels').checked,
              },
            },
          });
          App.toast('Chart updated — new version saved');
          location.reload();
        } catch (err) {
          App.toast(err.message, 'error');
          btn.disabled = false;
          btn.innerHTML = `${icon('check', 15)} Save Changes`;
        }
      });

      // Restore a previous version
      document.querySelectorAll('.restore-version').forEach(btn => {
        btn.addEventListener('click', async () => {
          const v = (chart.versions || []).find(x => x.id === btn.dataset.ver);
          const ok = await App.confirmDialog({
            title: 'Restore this version?',
            message: `The chart will be reverted to the ${chartUtil.typeLabel(v?.specification?.chart_type || 'chart')} configuration from ${App.formatDate(v?.created_at)}. A new version entry will be recorded so you can always come back.`,
            confirmText: 'Restore',
          });
          if (!ok) return;
          try {
            await api.apiFetch(`/charts/${chartId}/restore/${btn.dataset.ver}`, { method: 'POST' });
            App.toast('Version restored');
            location.reload();
          } catch (err) { App.toast(err.message, 'error'); }
        });
      });

      // Preview a previous version in a modal
      const previewVersion = async (versionId, title) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
          <div class="modal preview-modal">
            <div class="preview-modal-head">
              <h3>${App.escapeHtml(title || 'Version Preview')}</h3>
              <button class="btn-icon" data-close>${icon('x', 16)}</button>
            </div>
            <div class="preview-modal-body">${App.loading('Rendering version...')}</div>
          </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
        overlay.addEventListener('click', (e) => {
          if (e.target.closest('[data-close]') || e.target === overlay) { close(); document.removeEventListener('keydown', onKey); }
        });
        document.addEventListener('keydown', onKey);
        try {
          const renderData = await api.apiFetch(`/charts/${chartId}/render?version_id=${versionId}`);
          const json = typeof renderData.json === 'string' ? JSON.parse(renderData.json) : renderData.json;
          const body = overlay.querySelector('.preview-modal-body');
          await chartUtil.render(body, json);
        } catch (err) {
          overlay.querySelector('.preview-modal-body').innerHTML = App.errBlock('Failed to render version: ' + err.message);
        }
      };
      document.querySelectorAll('.preview-version').forEach(btn => {
        btn.addEventListener('click', () => previewVersion(btn.dataset.ver, btn.dataset.title));
      });

      const saveTemplateBtn = document.getElementById('saveTemplateBtn');
      if (saveTemplateBtn) {
        saveTemplateBtn.addEventListener('click', async () => {
          const name = await App.promptDialog({
            title: 'Save as template',
            message: 'Templates let you reuse this chart style with any dataset.',
            keyLabel: 'Template name',
            defaultValue: spec.title || '',
            placeholder: 'e.g. Monthly Trend',
          });
          if (!name) return;
          try {
            await api.apiFetch('/templates/', { method: 'POST', body: { chart_id: chart.id, name } });
            App.toast('Template saved');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      }

      let currentLang = 'python';
      document.getElementById('exportCodeBtn').addEventListener('click', () => {
        const section = document.getElementById('codeSection');
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
      });

      const downloadImage = async (format, background) => {
        if (!renderBox.querySelector('.js-plotly-plot')) { App.toast('Chart is not rendered yet', 'warn'); return; }
        try {
          await chartUtil.downloadImage(format, renderBox, spec.title, background);
          App.toast(`${format.toUpperCase()} exported`);
        } catch (err) { App.toast('Export failed: ' + err.message, 'error'); }
      };

      // Download dropdown toggle
      const downloadToggleBtn = document.getElementById('downloadToggleBtn');
      const downloadPanel = document.getElementById('downloadPanel');
      downloadToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        downloadPanel.classList.toggle('open');
      });
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.download-dropdown')) downloadPanel.classList.remove('open');
      });

      // Download confirm
      document.getElementById('downloadConfirmBtn').addEventListener('click', () => {
        const format = document.querySelector('input[name="dlFormat"]:checked').value;
        const bg = document.querySelector('input[name="dlBg"]:checked').value;
        downloadPanel.classList.remove('open');
        downloadImage(format, bg);
      });

      const deleteChartBtn = document.getElementById('deleteChartBtn');
      if (deleteChartBtn) {
        deleteChartBtn.addEventListener('click', async () => {
          const ok = await App.confirmDialog({
            title: 'Delete this chart?',
            message: `"${spec.title || 'Untitled chart'}" and all its versions will be removed. This cannot be undone.`,
            confirmText: 'Delete',
            danger: true,
          });
          if (!ok) return;
          try {
            await api.apiFetch(`/charts/${chartId}`, { method: 'DELETE' });
            App.toast('Chart deleted', 'info');
            location.hash = '#charts';
          } catch (err) { App.toast(err.message, 'error'); }
        });
      }
      document.querySelectorAll('.code-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          document.querySelectorAll('.code-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          currentLang = tab.dataset.lang;
          document.getElementById('codeOutput').textContent = currentLang === 'python' ? plotlyCode.python : plotlyCode.javascript;
        });
      });
      document.getElementById('copyCodeBtn').addEventListener('click', () => {
        const code = currentLang === 'python' ? plotlyCode.python : plotlyCode.javascript;
        navigator.clipboard.writeText(code).then(() => App.toast('Code copied to clipboard')).catch(() => App.toast('Copy failed', 'error'));
      });
    } catch (err) {
      document.getElementById('chartDetail').innerHTML = `
        ${App.errBlock(err.message)}
        <div style="margin-top:16px;">${App.emptyState('chart', 'Chart not found', 'The chart may have been deleted.', '<a href="#charts" class="btn btn-primary">Back to Projects</a>')}</div>`;
    }
  },
};
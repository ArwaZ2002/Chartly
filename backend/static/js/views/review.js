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

      document.getElementById('chartDetail').innerHTML = `
        <div class="card" style="padding:22px; margin-bottom:20px;">
          <div class="chart-detail-head">
            <div>
              <h2>${App.escapeHtml(spec.title || 'Untitled Chart')}</h2>
              <p class="subtitle" style="font-size:12.5px;">${ds ? App.escapeHtml(ds.name) : 'Dataset removed'} · ${App.formatDate(chart.created_at)}</p>
            </div>
            <div class="page-header-actions">
              ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="editChartBtn">${icon('pencil', 14)} Edit Chart</button>` : ''}
              ${App.can('edit') ? `<button class="btn btn-secondary btn-sm" id="saveTemplateBtn">${icon('template', 14)} Save as Template</button>` : ''}
              <button class="btn btn-secondary btn-sm" id="exportPngBtn">${icon('download', 13)} PNG</button>
              <button class="btn btn-secondary btn-sm" id="exportJpgBtn">${icon('download', 13)} JPG</button>
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
          <div class="section-title" style="margin-bottom:12px;">Version History <span class="badge slate">${chart.versions?.length || 0}</span></div>
          <div class="versions-list">
            ${(chart.versions || []).length === 0
              ? '<p style="font-size:13px; color:var(--text-muted);">No versions recorded yet.</p>'
              : (chart.versions || []).map((v, i) => {
                  const isCurrent = JSON.stringify(Object.entries(v.specification || {}).sort()) === JSON.stringify(Object.entries(chart.specification || {}).sort());
                  return `
                  <div class="version-item">
                    <div style="display:flex; flex-direction:column; gap:2px;">
                      <span><strong>Version ${i + 1}</strong> — ${chartUtil.typeLabel(v.specification?.chart_type || 'chart')}</span>
                      <small style="color:var(--text-muted); font-size:11.5px;">${App.formatDateTime(v.created_at)}</small>
                    </div>
                    <div>
                      ${isCurrent
                        ? `<span class="badge green">${icon('check', 12)} Current</span>`
                        : App.can('edit')
                          ? `<button class="btn btn-secondary btn-sm restore-version" data-ver="${v.id}">${icon('refresh', 13)} Restore</button>`
                          : ''}
                    </div>
                  </div>`;
                }).join('')}
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
        document.getElementById('editGranularityGroup').style.display =
          editDimIsDate() && ['bar', 'line', 'area'].includes(type) ? '' : 'none';
        document.getElementById('editTypeHint').textContent = isHistogram
          ? 'Plots the distribution of the X-axis column — Y-axis not needed.'
          : (type === 'box' || type === 'violin' ? 'Shows the raw spread of Y values per X category — aggregation is not applied.' : '');
      }
      populateEditForm();
      document.getElementById('editType').addEventListener('change', updateEditUI);
      document.getElementById('editDimension').addEventListener('change', updateEditUI);

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

      const downloadImage = async (format) => {
        if (!renderBox.querySelector('.js-plotly-plot')) { App.toast('Chart is not rendered yet', 'warn'); return; }
        try {
          await chartUtil.downloadImage(format, renderBox, spec.title);
          App.toast(`${format.toUpperCase()} exported`);
        } catch (err) { App.toast('Export failed: ' + err.message, 'error'); }
      };
      document.getElementById('exportPngBtn').addEventListener('click', () => downloadImage('png'));
      document.getElementById('exportJpgBtn').addEventListener('click', () => downloadImage('jpeg'));

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
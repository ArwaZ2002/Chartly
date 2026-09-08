/* ============================================================
   Chartly — Chart Builder view (#charts/new)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';
import { chart } from '../components/chart.js';

export const chartBuilderPage = {
  hash: '#charts/new',

  async render(app) {
    if (!App.auth() || !App.can('create')) { location.hash = '#dashboard'; return; }

    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    const preset = JSON.parse(sessionStorage.getItem('chartly_preset') || 'null');
    sessionStorage.removeItem('chartly_preset');
    const defaultType = App.settings.default_chart_type || 'bar';

    app.innerHTML = App.shell('charts', 'Create Chart', `
      <div class="page-header">
        <div><h1>Create Chart</h1><p class="subtitle">Pick a dataset, configure the visual, and generate it instantly.</p></div>
        <div class="page-header-actions"><a href="#charts" class="btn btn-secondary">${icon('arrow', 15)} Back</a></div>
      </div>
      <div id="presetBanner" style="display:none;"></div>
      <div class="chart-editor">
        <div class="card editor-config" id="editorConfig">
          <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Configuration</h3>
          <div class="form-group">
            <label class="form-label">Dataset</label>
            <select id="datasetSelect" class="form-select"><option value="">Loading...</option></select>
          </div>
          <div class="form-group">
            <label class="form-label">Chart type</label>
            <select id="chartType" class="form-select">
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
            <p class="form-hint" id="typeHint"></p>
          </div>
          <div class="form-group" id="orientationGroup" style="display:none;">
            <label class="form-label">Orientation</label>
            <select id="barOrientation" class="form-select">
              <option value="vertical">Vertical</option>
              <option value="horizontal">Horizontal</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" id="dimLabel">X-axis (dimension)</label>
              <select id="dimension" class="form-select"><option value="">Select dataset first</option></select>
            </div>
            <div class="form-group">
              <label class="form-label" id="metLabel">Y-axis (metric)</label>
              <select id="metric" class="form-select"><option value="">Select dataset first</option></select>
            </div>
          </div>
          <div class="form-group" id="aggGroup">
            <label class="form-label">Aggregation</label>
            <select id="aggregation" class="form-select">
              <option value="sum">Sum</option>
              <option value="average">Average</option>
              <option value="count">Count</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Sorting</label>
              <select id="sorting" class="form-select">
                <option value="none">None</option>
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
            <div class="form-group" id="granularityGroup" style="display:none;">
              <label class="form-label">Time granularity</label>
              <select id="granularity" class="form-select">
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
            <input type="text" id="chartTitle" class="form-input" placeholder="e.g. Revenue by Region">
          </div>
          <div class="style-section">
            <div class="form-group">
              <label class="form-label">Theme template</label>
              <select id="themeTemplateSelect" class="form-select">
                <option value="">None — configure manually</option>
              </select>
              <p class="form-hint">Apply saved colors and font to this chart.</p>
            </div>
            <div class="form-group">
              <label class="form-label">Color palette</label>
              <div class="palette-grid" id="paletteGrid"></div>
              <div class="custom-colors" id="customColors" style="display:none;">
                <input type="color" class="custom-color" data-i="0" value="#f97316">
                <input type="color" class="custom-color" data-i="1" value="#4f46e5">
                <input type="color" class="custom-color" data-i="2" value="#3b82f6">
                <input type="color" class="custom-color" data-i="3" value="#10b981">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Font</label>
              <select id="chartFont" class="form-select">
                <option value="">System default</option>
                <option value="'Poppins', 'Inter', sans-serif">Poppins</option>
                <option value="Georgia, serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="Verdana, sans-serif">Verdana</option>
              </select>
            </div>
            <div class="form-group" id="labelsGroup" style="display:none;">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" id="showLabels" style="width:16px; height:16px; accent-color:#f97316;">
                <span class="form-label" style="margin:0;">Show data labels</span>
              </label>
              <p class="form-hint">Display values directly on the chart.</p>
            </div>
            <button class="btn btn-secondary" id="saveThemeBtn" style="width:100%;">${icon('template', 14)} Save as Theme Template</button>
          </div>
          <div class="config-summary" id="configSummary" style="display:none;"></div>
          <button class="btn btn-primary" id="createChartBtn" style="width:100%; padding:11px;">${icon('chart', 16)} Generate Chart</button>
          <div class="recommend-box" style="margin-top:18px;">
            <div class="form-label" style="display:flex; align-items:center; gap:6px; margin-bottom:8px;">${icon('sparkles', 13)} Suggestions</div>
            <div id="recommendList"><p class="form-hint" style="margin:0;">Select a dataset to see recommended chart types.</p></div>
          </div>
        </div>
        <div class="card editor-preview" id="editorPreview">
          <div class="empty-state" style="border:none; background:transparent;">
            <div class="empty-icon">${icon('chart', 22)}</div>
            <h3>Your chart preview goes here</h3>
            <p>Select a dataset, adjust the options, and click <strong>Generate Chart</strong>.</p>
          </div>
        </div>
      </div>
    `);

    const datasetSelect = document.getElementById('datasetSelect');
    const dimEl = document.getElementById('dimension');
    const metEl = document.getElementById('metric');
    const aggGroup = document.getElementById('aggGroup');
    const granGroup = document.getElementById('granularityGroup');
    let datasets = [];
    let currentDs = null;
    let themeTemplates = [];

    // ---- chart style state ----
    const palettes = chart.palettes;
    let paletteIndex = 0;
    let customColors = ['#f97316', '#4f46e5', '#3b82f6', '#10b981'];

    function currentColors() {
      if (paletteIndex === palettes.length) return [...customColors];
      return palettes[paletteIndex].colors;
    }
    function currentFont() {
      return document.getElementById('chartFont').value;
    }
    function syncCustomInputs() {
      document.querySelectorAll('.custom-color').forEach(input => {
        input.value = customColors[Number(input.dataset.i)] || customColors[customColors.length - 1];
      });
    }
    function refreshPaletteUI() {
      document.querySelectorAll('.palette-btn').forEach(btn => {
        btn.classList.toggle('active', Number(btn.dataset.idx) === paletteIndex);
      });
      document.getElementById('customColors').style.display = paletteIndex === palettes.length ? 'flex' : 'none';
      syncCustomInputs();
    }
    function renderPalettes() {
      const grid = document.getElementById('paletteGrid');
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
    function applyTheme(tpl) {
      if (!tpl || !tpl.colors || !tpl.colors.length) return;
      customColors = tpl.colors.slice(0, 4);
      paletteIndex = palettes.length;
      const fontEl = document.getElementById('chartFont');
      if (tpl.font_family && [...fontEl.options].some(o => o.value === tpl.font_family)) fontEl.value = tpl.font_family;
      refreshPaletteUI();
    }

    function populateColumns(ds) {
      if (!ds || !ds.columns) return;
      currentDs = ds;
      const allCols = ds.columns.map(c => c.name);
      const numCols = ds.columns.filter(c => c.type === 'number').map(c => c.name);
      dimEl.innerHTML = allCols.length
        ? allCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
        : '<option value="">No columns</option>';
      metEl.innerHTML = numCols.length
        ? numCols.map(c => `<option value="${App.escapeHtml(c)}">${App.escapeHtml(c)}</option>`).join('')
        : '<option value="">No numeric columns</option>';
    }

    function dimIsDate() {
      if (!currentDs) return false;
      const col = (currentDs.columns || []).find(c => c.name === dimEl.value);
      return !!(col && col.type === 'date');
    }

    function updateGranularityUI() {
      const type = document.getElementById('chartType').value;
      const show = dimIsDate() && ['bar', 'line', 'area'].includes(type);
      granGroup.style.display = show ? '' : 'none';
    }

    function updateSummary() {
      const el = document.getElementById('configSummary');
      const type = document.getElementById('chartType').value;
      if (!type || !dimEl.value || !currentDs) { el.style.display = 'none'; return; }
      const isHistogram = type === 'histogram';
      const isRaw = chart.rawTypes.includes(type);
      const agg = document.getElementById('aggregation').value;
      const sort = document.getElementById('sorting').value;
      const gran = document.getElementById('granularity').value;
      const parts = [chart.typeLabel(type), `${dimEl.value}${!isHistogram ? ' by ' + metEl.value : ''}`];
      if (!isRaw) parts.push(agg === 'count' ? 'counted' : agg + ' of ' + metEl.value);
      if (sort !== 'none') parts.push('sorted ' + sort);
      if (granGroup.style.display !== 'none' && gran) parts.push('per ' + gran);
      el.style.display = '';
      el.innerHTML = `${icon('info', 14)}<span><strong>Ready to generate:</strong> ${App.escapeHtml(parts.join(' — '))}</span>`;
    }

    function updateTypeUI() {
      const type = document.getElementById('chartType').value;
      const hint = document.getElementById('typeHint');
      const isRaw = chart.rawTypes.includes(type);
      const isHistogram = type === 'histogram';
      aggGroup.style.display = isRaw ? 'none' : '';
      dimEl.disabled = false;
      metEl.disabled = isHistogram;
      document.getElementById('orientationGroup').style.display = type === 'bar' ? '' : 'none';
      const labelTypes = ['bar', 'line', 'area', 'pie', 'scatter', 'treemap', 'funnel'];
      document.getElementById('labelsGroup').style.display = labelTypes.includes(type) ? '' : 'none';
      if (isHistogram) {
        hint.textContent = 'Plots the distribution of the X-axis column — pick a numeric or categorical column. Y-axis not needed.';
      } else if (type === 'box' || type === 'violin') {
        hint.textContent = 'Shows the raw spread of Y values for each X category — aggregation is not applied.';
      } else {
        hint.textContent = type === 'treemap' || type === 'funnel'
          ? 'Aggregates the metric by the X-axis, then plots the hierarchy.'
          : '';
      }
      updateGranularityUI();
      updateSummary();
    }
    document.getElementById('chartType').addEventListener('change', updateTypeUI);
    dimEl.addEventListener('change', () => { updateGranularityUI(); updateSummary(); });
    metEl.addEventListener('change', updateSummary);
    document.getElementById('aggregation').addEventListener('change', updateSummary);
    document.getElementById('sorting').addEventListener('change', updateSummary);
    document.getElementById('granularity').addEventListener('change', updateSummary);

    async function loadRecommendations(dsId) {
      const el = document.getElementById('recommendList');
      el.innerHTML = App.loading('Checking columns...');
      try {
        const recs = await api.apiFetch(`/charts/recommendations/${dsId}`);
        const list = Array.isArray(recs) ? recs : [];
        el.innerHTML = list.length === 0
          ? '<p class="form-hint" style="margin:0;">No suggestions available.</p>'
          : list.map(r => `
              <div class="recommend-item" data-type="${r.chart_type}">
                <span class="icon">${icon('sparkles', 14)}</span>
                <span class="txt"><b>${chart.typeLabel(r.chart_type)}</b><span>${App.escapeHtml(r.reason)}</span></span>
              </div>`).join('');
        el.querySelectorAll('.recommend-item').forEach(item => {
          item.addEventListener('click', () => { document.getElementById('chartType').value = item.dataset.type; updateTypeUI(); });
        });
      } catch (_) {
        el.innerHTML = '<p class="form-hint" style="margin:0;">Suggestions unavailable for this dataset.</p>';
      }
    }

    try {
      const data = await api.apiFetch('/datasets/');
      datasets = Array.isArray(data) ? data : [];
      const usable = App.user?.role === 'admin' ? datasets : datasets.filter(d => d.status !== 'closed');
      datasetSelect.innerHTML = usable.length
        ? usable.map(d => `<option value="${d.id}">${App.escapeHtml(d.name)}${d.status === 'closed' ? ' (Closed)' : ''}</option>`).join('')
        : '<option value="">No datasets found</option>';

      const presetDsId = params.get('datasetId') || (preset && preset.dataset_id ? preset.dataset_id : '');
      if (presetDsId && usable.some(d => d.id === presetDsId)) {
        datasetSelect.value = presetDsId;
        populateColumns(datasets.find(d => d.id === presetDsId));
        loadRecommendations(presetDsId);
      } else if (usable.length > 0) {
        datasetSelect.value = usable[0].id;
        populateColumns(usable[0]);
        loadRecommendations(usable[0].id);
      }

      if (preset) {
        const banner = document.getElementById('presetBanner');
        banner.style.display = 'flex';
        banner.className = 'preset-banner';
        banner.innerHTML = `${icon('sparkles', 16)}<span>Template applied: <strong>${App.escapeHtml(preset.name)}</strong> — options pre-filled below.</span><span style="margin-left:auto;"><button class="btn-icon" onclick="this.closest('.preset-banner').style.display='none'" >${icon('x', 15)}</button></span>`;
        if (preset.chart_type) document.getElementById('chartType').value = preset.chart_type;
        if (preset.title) document.getElementById('chartTitle').value = preset.title;
        if (preset.aggregation) document.getElementById('aggregation').value = preset.aggregation;
        if (preset.sorting) document.getElementById('sorting').value = preset.sorting;
        if (preset.time_granularity) document.getElementById('granularity').value = preset.time_granularity;
        if (preset.dimension && dimEl.querySelector(`option[value="${CSS.escape(preset.dimension)}"]`)) dimEl.value = preset.dimension;
        if (preset.metric && metEl.querySelector(`option[value="${CSS.escape(preset.metric)}"]`)) metEl.value = preset.metric;
        if (Array.isArray(preset.colors) && preset.colors.length) {
          customColors = preset.colors.slice(0, 4);
          paletteIndex = palettes.length;
        }
        if (preset.font_family && [...document.getElementById('chartFont').options].some(o => o.value === preset.font_family)) {
          document.getElementById('chartFont').value = preset.font_family;
        }
        if (preset.orientation) document.getElementById('barOrientation').value = preset.orientation;
      } else {
        document.getElementById('chartType').value = defaultType;
      }
      updateTypeUI();
      renderPalettes();
    } catch (e) {
      datasetSelect.innerHTML = '<option value="">Failed to load datasets</option>';
    }

    document.querySelectorAll('.custom-color').forEach(input => {
      input.addEventListener('input', () => {
        customColors[Number(input.dataset.i)] = input.value;
      });
    });
    document.getElementById('saveThemeBtn').addEventListener('click', async () => {
      const name = await App.promptDialog({
        title: 'Save theme template',
        message: 'Theme templates store the color palette and font so you can reuse them on other charts.',
        keyLabel: 'Theme template name',
        defaultValue: document.getElementById('chartTitle').value.trim() || 'My Theme',
        placeholder: 'e.g. Brand Orange',
      });
      if (!name) return;
      try {
        await api.apiFetch('/theme-templates/', {
          method: 'POST',
          body: { name, colors: currentColors(), font_family: currentFont() || null },
        });
        App.toast('Theme template saved');
        loadThemeTemplates();
      } catch (err) { App.toast(err.message, 'error'); }
    });

    async function loadThemeTemplates() {
      const sel = document.getElementById('themeTemplateSelect');
      try {
        const data = await api.apiFetch('/theme-templates/');
        themeTemplates = Array.isArray(data) ? data : [];
      } catch (_) { themeTemplates = []; }
      sel.innerHTML = '<option value="">None — configure manually</option>'
        + themeTemplates.map(t => `<option value="${t.id}">${App.escapeHtml(t.name)}</option>`).join('');
    }
    document.getElementById('themeTemplateSelect').addEventListener('change', (e) => {
      const t = themeTemplates.find(x => x.id === e.target.value);
      if (t) applyTheme(t);
      e.target.value = '';
    });
    loadThemeTemplates();

    datasetSelect.addEventListener('change', () => {
      const id = datasetSelect.value;
      const ds = datasets.find(d => d.id === id);
      populateColumns(ds);
      if (ds) loadRecommendations(id);
      updateGranularityUI();
      updateSummary();
    });

    document.getElementById('createChartBtn').addEventListener('click', async () => {
      const dsId = datasetSelect.value;
      const dimension = dimEl.value;
      const metric = metEl.value;
      const chartType = document.getElementById('chartType').value;
      const aggregation = document.getElementById('aggregation').value;
      const isHistogram = chartType === 'histogram';
      const title = document.getElementById('chartTitle').value.trim() || (isHistogram ? `Distribution of ${dimension}` : `${metric} by ${dimension}`);

      if (!dsId) { App.toast('Please select a dataset', 'warn'); return; }
      if (!dimension) { App.toast('Please select an X-axis dimension', 'warn'); return; }
      if (!isHistogram && !metric && aggregation !== 'count') { App.toast('Please select a Y-axis metric', 'warn'); return; }

      const btn = document.getElementById('createChartBtn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generating...';
      try {
        const result = await api.apiFetch('/charts/generate', {
          method: 'POST',
          body: {
            dataset_id: dsId,
            specification: {
              chart_type: chartType,
              dimension,
              metric: metric || dimension,
              aggregation,
              sorting: document.getElementById('sorting').value || 'none',
              time_granularity: granGroup.style.display !== 'none' ? document.getElementById('granularity').value : null,
              title,
              colors: currentColors(),
              font_family: currentFont() || null,
              orientation: document.getElementById('barOrientation').value,
              show_labels: document.getElementById('showLabels').checked,
            },
          },
        });
        App.toast('Chart generated successfully');
        location.hash = `#charts/${result.id}`;
      } catch (err) {
        App.toast(err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${icon('chart', 16)} Generate Chart`;
      }
    });
  },
};
/* ============================================================
   Chartly — Settings view (#settings)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

export const settingsPage = {
  hash: '#settings',

  async render(app) {
    if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
    app.innerHTML = App.shell('settings', 'Settings', `
      <div class="page-header"><div><h1>Settings</h1><p class="subtitle">Platform-wide settings shared by the team.</p></div></div>
      <div class="card" style="padding:22px; max-width:480px;">
        <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Platform Settings</h3>
        <div class="form-group">
          <label class="form-label">Platform name</label>
          <input type="text" class="form-input" id="platformName" value="Chartly">
          <p class="form-hint">Shown in the sidebar for every user.</p>
        </div>
        <div class="form-group">
          <label class="form-label">Default chart type</label>
          <select id="defaultChartType" class="form-select">
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
          <p class="form-hint">Pre-selected whenever a chart editor opens.</p>
        </div>
        <button class="btn btn-primary" id="saveSettingsBtn">${icon('check', 15)} Save Settings</button>
      </div>
    `);
    const nameEl = document.getElementById('platformName');
    const typeEl = document.getElementById('defaultChartType');
    try {
      const settings = await api.apiFetch('/settings/');
      if (settings.platform_name) nameEl.value = settings.platform_name;
      if (settings.default_chart_type && [...typeEl.options].some(o => o.value === settings.default_chart_type)) typeEl.value = settings.default_chart_type;
    } catch (_) {}
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveSettingsBtn');
      btn.disabled = true;
      try {
        const saved = await api.apiFetch('/settings/', {
          method: 'PUT',
          body: { platform_name: nameEl.value.trim() || 'Chartly', default_chart_type: typeEl.value },
        });
        App.settings = saved;
        App.toast('Settings saved');
        const brand = document.querySelector('.sidebar-brand .brand-name');
        if (brand) brand.textContent = saved.platform_name || 'Chartly';
      } catch (err) {
        App.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  },
};
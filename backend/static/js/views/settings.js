/* ============================================================
   Chartly — Settings view (#settings)
   Appearance (all users) + Platform settings (admin only).
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

export const settingsPage = {
  hash: '#settings',

  async render(app) {
    if (!App.auth()) return;

    app.innerHTML = App.shell('settings', 'Settings', `
      <div class="page-header"><div><h1>Settings</h1><p class="subtitle">Personal preferences and platform-wide settings.</p></div></div>
      <div class="card" style="padding:22px; max-width:480px;">
        <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Appearance</h3>
        <div class="form-group">
          <label class="form-label">Theme</label>
          <div class="theme-segmented" id="themeSwitch">
            <button class="theme-option" data-theme="light">${icon('sun', 15)} Light</button>
            <button class="theme-option" data-theme="dark">${icon('moon', 15)} Dark</button>
          </div>
          <p class="form-hint">Your choice is saved to your account and follows you on every device.</p>
        </div>
      </div>
      ${App.can('admin') ? `
      <div class="card" style="padding:22px; max-width:480px; margin-top:16px;">
        <h3 style="font-size:14px; font-weight:700; margin-bottom:16px;">Platform Settings</h3>
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
      </div>` : ''}
    `);

    const themeBtns = document.querySelectorAll('.theme-option');
    const highlightTheme = (theme) => {
      themeBtns.forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    };
    highlightTheme(App.theme);
    themeBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const theme = btn.dataset.theme;
        highlightTheme(theme);
        App.applyTheme(theme);
        try {
          await api.apiFetch('/settings/theme', { method: 'PUT', body: { theme } });
          App.toast(theme === 'dark' ? 'Dark theme applied' : 'Light theme applied');
        } catch (err) {
          App.toast(err.message, 'error');
        }
      });
    });

    if (!App.can('admin')) return;

    const typeEl = document.getElementById('defaultChartType');
    try {
      const settings = await api.apiFetch('/settings/');
      if (settings.default_chart_type && [...typeEl.options].some(o => o.value === settings.default_chart_type)) typeEl.value = settings.default_chart_type;
    } catch (_) {}
    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
      const btn = document.getElementById('saveSettingsBtn');
      btn.disabled = true;
      try {
        const saved = await api.apiFetch('/settings/', {
          method: 'PUT',
          body: { default_chart_type: typeEl.value },
        });
        App.settings = saved;
        App.toast('Settings saved');
      } catch (err) {
        App.toast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  },
};

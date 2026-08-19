/* ============================================================
   Chartly — Login view (#login)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

export const loginPage = {
  hash: '#login',

  render(app) {
    if (api.user) { location.hash = '#dashboard'; return; }
    app.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-brand">
            <div class="brand-mark">${icon('chart', 20)}</div>
            <h1>Chartly</h1>
            <p>Transform raw data into beautiful charts in minutes</p>
          </div>
          <form id="loginForm">
            <div class="form-group">
              <label class="form-label">Email address</label>
              <input type="email" id="email" class="form-input" placeholder="you@company.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Password</label>
              <input type="password" id="password" class="form-input" placeholder="Enter your password" required>
            </div>
            <div id="loginError" style="display:none; margin-bottom:12px;"></div>
            <button type="submit" class="btn btn-primary" id="loginBtn" style="width:100%; padding:11px; font-size:14px;">
              Sign in
            </button>
          </form>
        </div>
      </div>`;

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      const errEl = document.getElementById('loginError');
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Signing in...';
      errEl.style.display = 'none';
      try {
        await api.login(email, password);
        await App.loadTheme();
        location.hash = '#dashboard';
      } catch (err) {
        errEl.innerHTML = App.errBlock(err.message);
        errEl.style.display = 'block';
        btn.disabled = false; btn.innerHTML = 'Sign in';
      }
    });
  },
};
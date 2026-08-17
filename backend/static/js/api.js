/* ============================================================
   Chartly — API client
   Auth state + fetch wrapper + login/logout.
   ============================================================ */

const API_BASE = '/api';

export const api = {
  token: localStorage.getItem('chartly_token') || null,
  user: JSON.parse(localStorage.getItem('chartly_user') || 'null'),

  async apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
      this.clearSession();
      location.hash = '#login';
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e.detail || `Error ${res.status}`);
    }
    return res.json();
  },

  clearSession() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('chartly_token');
    localStorage.removeItem('chartly_user');
  },

  async login(email, password) {
    const data = await this.apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    this.token = data.token;
    this.user = data.user;
    localStorage.setItem('chartly_token', data.token);
    localStorage.setItem('chartly_user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    this.clearSession();
    location.hash = '#login';
  },
};
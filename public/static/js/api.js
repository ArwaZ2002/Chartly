/* ============================================================
   Chartly — API client
   Auth state + fetch wrapper + login/logout.
   The JWT is held in an HttpOnly cookie set by the backend; it is
   never stored in localStorage. Only the (non-sensitive) user
   profile is cached locally.
   ============================================================ */

const API_BASE = '/api';

export const api = {
  user: JSON.parse(localStorage.getItem('chartly_user') || 'null'),

  async apiFetch(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    if (res.status === 401) {
      const e = await res.json().catch(() => ({}));
      if (e.detail && e.detail !== 'Could not validate credentials') {
        throw new Error(e.detail);
      }
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
    this.user = null;
    localStorage.removeItem('chartly_user');
  },

  async login(email, password) {
    const user = await this.apiFetch('/auth/login', { method: 'POST', body: { email, password } });
    this.user = user;
    localStorage.setItem('chartly_user', JSON.stringify(user));
    return user;
  },

  async logout() {
    try {
      await this.apiFetch('/auth/logout', { method: 'POST' });
    } catch (_) { /* cookie cleared server-side regardless */ }
    this.clearSession();
    location.hash = '#login';
  },
};
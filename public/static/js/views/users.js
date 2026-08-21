/* ============================================================
   Chartly — Users view (#users)
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

export const usersPage = {
  hash: '#users',

  async render(app) {
    if (!App.auth() || App.user?.role !== 'admin') { location.hash = '#dashboard'; return; }
    app.innerHTML = App.shell('users', 'Users', `
      <div class="page-header">
        <div><h1>Users</h1><p class="subtitle">Accounts on this platform.</p></div>
        <div class="page-header-actions"><button class="btn btn-primary btn-sm" id="addUserBtn">${icon('plus', 14)} Add User</button></div>
      </div>
      <div class="card" style="padding:8px 0;" id="usersCard">${App.loading()}</div>
    `);

    const cardEl = document.getElementById('usersCard');
    let users = [];

    const render = () => {
      cardEl.innerHTML = `
        <div class="table-wrap">
          <table class="data-table" style="min-width:640px;">
            <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th><th style="text-align:right;">Actions</th></tr></thead>
            <tbody>${users.map(u => {
              const isSelf = u.id === App.user?.id;
              return `
              <tr>
                <td><div style="display:flex; align-items:center; gap:10px;"><div class="avatar" style="width:30px; height:30px; font-size:12px;">${App.escapeHtml((u.name || 'U')[0])}</div><strong>${App.escapeHtml(u.name)}</strong>${isSelf ? '<span class="badge slate" style="margin-left:4px;">you</span>' : ''}</div></td>
                <td>${App.escapeHtml(u.email)}</td>
                <td>
                  <select class="form-select role-select" data-id="${u.id}" ${isSelf ? 'disabled' : ''} style="width:110px; padding:5px 8px; font-size:12px;">
                    <option value="viewer" ${u.role === 'viewer' ? 'selected' : ''}>viewer</option>
                    <option value="analyst" ${u.role === 'analyst' ? 'selected' : ''}>analyst</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                  </select>
                </td>
                <td style="font-size:12.5px; color:var(--text-secondary); white-space:nowrap;">${App.formatDate(u.created_at)}</td>
                <td style="text-align:right;">
                  <button class="btn-icon danger delete-user" data-id="${u.id}" ${isSelf ? 'disabled' : ''} title="${isSelf ? 'You cannot delete your own account' : 'Delete user'}">${icon('trash', 15)}</button>
                </td>
              </tr>`;
            }).join('')}
            </tbody>
          </table>
        </div>`;

      cardEl.querySelectorAll('.role-select').forEach(sel => {
        sel.addEventListener('change', async () => {
          const u = users.find(x => x.id === sel.dataset.id);
          if (!u || u.role === sel.value) return;
          const ok = await App.confirmDialog({
            title: 'Change role?',
            message: `${u.name} will become ${sel.value}. Their access level changes immediately.`,
            confirmText: 'Update role',
          });
          if (!ok) { sel.value = u.role; return; }
          try {
            await api.apiFetch(`/users/${u.id}`, { method: 'PATCH', body: { role: sel.value } });
            u.role = sel.value;
            App.toast(`Role updated to ${sel.value}`);
          } catch (err) { sel.value = u.role; App.toast(err.message, 'error'); }
        });
      });

      cardEl.querySelectorAll('.delete-user').forEach(btn => {
        btn.addEventListener('click', async () => {
          const u = users.find(x => x.id === btn.dataset.id);
          const ok = await App.confirmDialog({ title: 'Delete user?', message: `${u ? u.name : 'This user'} will lose access to the platform immediately.`, confirmText: 'Delete', danger: true });
          if (!ok) return;
          try {
            await api.apiFetch(`/users/${btn.dataset.id}`, { method: 'DELETE' });
            users = users.filter(x => x.id !== btn.dataset.id);
            render();
            App.toast('User deleted', 'info');
          } catch (err) { App.toast(err.message, 'error'); }
        });
      });
    };

    const openAddModal = () => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal">
          <h3>Add user</h3>
          <p style="font-size:13px; color:var(--text-muted); margin-bottom:14px;">The new user can sign in immediately with these credentials.</p>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Name</label>
            <input type="text" class="form-input" id="nuName" placeholder="e.g. Sarah Analyst">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" id="nuEmail" placeholder="user@company.com">
          </div>
          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Password</label>
            <input type="password" class="form-input" id="nuPassword" placeholder="Min 6 characters">
          </div>
          <div class="form-group" style="margin-bottom:16px;">
            <label class="form-label">Role</label>
            <select class="form-select" id="nuRole">
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" data-act="cancel">Cancel</button>
            <button class="btn btn-primary" data-act="ok">${icon('check', 14)} Create User</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.addEventListener('click', async (e) => {
        const act = e.target.closest('[data-act]');
        if (!act) return;
        if (act.dataset.act === 'cancel') { overlay.remove(); return; }
        const name = overlay.querySelector('#nuName').value.trim();
        const email = overlay.querySelector('#nuEmail').value.trim();
        const password = overlay.querySelector('#nuPassword').value;
        const role = overlay.querySelector('#nuRole').value;
        if (!name || !email || !password) { App.toast('Name, email and password are required', 'warn'); return; }
        if (password.length < 6) { App.toast('Password must be at least 6 characters', 'warn'); return; }
        const btn = overlay.querySelector('[data-act="ok"]');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Creating...';
        try {
          const created = await api.apiFetch('/users/', { method: 'POST', body: { name, email, password, role } });
          users.push(created);
          render();
          overlay.remove();
          App.toast(`User ${created.name} created`);
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = `${icon('check', 14)} Create User`;
          App.toast(err.message, 'error');
        }
      });
    };

    try {
      const data = await api.apiFetch('/users/');
      users = Array.isArray(data) ? data : [];
      render();
    } catch (err) {
      cardEl.innerHTML = App.errBlock(err.message);
    }
    document.getElementById('addUserBtn').addEventListener('click', openAddModal);
  },
};
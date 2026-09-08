/* ============================================================
   Chartly — Notifications view (#notifications)
   Shows up to 100 notifications, auto-purged after 30 days.
   Bell in header shows unread count, click navigates here.
   ============================================================ */

import { App } from '../app.js';
import { api } from '../api.js';
import { icon } from '../app.js';

export const notificationsPage = {
  hash: '#notifications',

  async render(app) {
    if (!App.auth()) return;
    app.innerHTML = App.shell('notifications', 'Notifications', `
      <div class="page-header">
        <div>
          <h1>Notifications</h1>
        </div>
        <div class="page-header-actions">
          <span class="badge slate" id="notifCountBadge">0</span>
          <button class="btn btn-secondary btn-sm" id="markAllReadBtn">${icon('check',14)} Mark all as read</button>
        </div>
      </div>
      <div class="card" id="notifList">${App.loading('Loading notifications...')}</div>
    `);

    const listEl = document.getElementById('notifList');
    const countBadge = document.getElementById('notifCountBadge');
    const markAllBtn = document.getElementById('markAllReadBtn');

    async function load() {
      try {
        const [list, countData] = await Promise.all([
          api.apiFetch('/notifications/'),
          api.apiFetch('/notifications/unread-count').catch(() => ({ count: 0 })),
        ]);
        const notifs = Array.isArray(list) ? list : [];
        const unread = Number(countData.count) || notifs.filter(n => !n.is_read).length;
        countBadge.textContent = `${unread} unread · ${notifs.length} total`;
        countBadge.className = `badge ${unread > 0 ? 'orange' : 'slate'}`;
        App.notifCount = unread;
        // update header badges immediately
        App.refreshNotifCount();

        if (notifs.length === 0) {
          listEl.innerHTML = App.emptyState('bell', 'No notifications', 'When a project is shared, closed, reopened, or someone edits your charts, you’ll see it here.');
          return;
        }

        const actionIcon = (action) => ({
          regenerate: 'refresh', restore: 'refresh', create: 'chart',
          upload: 'upload', shared: 'share', close: 'lock', reopen: 'unlock',
        }[action] || 'bell');
        const actionLine = (n) => {
          const actor = `<strong>${App.escapeHtml(n.actor_name || 'Someone')}</strong>`;
          const name = `<strong>${App.escapeHtml(n.chart_title || 'Untitled')}</strong>`;
          switch (n.action) {
            case 'restore': return `${actor} restored your chart ${name}`;
            case 'regenerate': return `${actor} regenerated your chart ${name}`;
            case 'create': return `${actor} created a chart in your project ${name}`;
            case 'upload': return `${actor} uploaded a new project ${name}`;
            case 'shared': return `${actor} shared ${name} with you`;
            case 'close': return `${actor} closed the project ${name}`;
            case 'reopen': return `${actor} reopened the project ${name}`;
            default: return `${actor} ${App.escapeHtml(n.action)} ${name}`;
          }
        };
        const targetUrl = (n) => (n.dataset_id && !n.chart_id ? `#charts/project/${n.dataset_id}` : `#charts/${n.chart_id}`);

        listEl.innerHTML = `
          <div class="notif-list">
            ${notifs.map(n => {
              const isUnread = !n.is_read;
              const time = App.formatDateTime(n.created_at);
              const ago = App.formatDate(n.created_at);
              const isProject = n.dataset_id && !n.chart_id;
              return `
                <div class="notif-item ${isUnread ? 'unread' : ''}" data-id="${n.id}">
                  <div class="notif-item-icon ${isUnread ? 'unread' : ''}">${icon(actionIcon(n.action), 16)}</div>
                  <div class="notif-item-main">
                    <div class="notif-item-text">${actionLine(n)}</div>
                    <div class="notif-item-meta">
                      <span>${App.escapeHtml(n.action)}</span> · ${isProject
                        ? `<a href="#charts/project/${n.dataset_id}" class="notif-link">View project</a>`
                        : `<a href="#charts/${n.chart_id}" class="notif-link">${App.escapeHtml((n.chart_id || '').slice(0, 8))}…</a>`} · ${App.escapeHtml(time)} · ${App.escapeHtml(ago)}
                    </div>
                  </div>
                  <div class="notif-item-actions">
                    ${isUnread ? `<button class="btn btn-secondary btn-sm mark-read" data-id="${n.id}">${icon('check',13)} Mark read</button>` : `<span class="badge green">${icon('check',12)} Read</span>`}
                    <a href="${targetUrl(n)}" class="btn btn-ghost btn-sm" title="View">${icon('eye',14)}</a>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `;

        listEl.querySelectorAll('.mark-read').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            try {
              await api.apiFetch(`/notifications/${id}/read`, { method: 'POST' });
              App.refreshNotifCount();
              load();
            } catch (err) {
              App.toast(err.message, 'error');
              btn.disabled = false;
            }
          });
        });

      } catch (err) {
        listEl.innerHTML = App.errBlock(err.message);
      }
    }

    markAllBtn.addEventListener('click', async () => {
      markAllBtn.disabled = true;
      try {
        await api.apiFetch('/notifications/read-all', { method: 'POST' });
        App.toast('All marked as read');
        App.refreshNotifCount();
        load();
      } catch (err) {
        App.toast(err.message, 'error');
      } finally {
        markAllBtn.disabled = false;
      }
    });

    load();
  },
};

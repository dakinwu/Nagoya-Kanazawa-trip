(() => {
  'use strict';

  const config = window.TRIP_CLOUD_CONFIG || {};
  const functionUrl = String(config.functionUrl || '').trim();
  const syncIntervalMs = Math.max(5000, Number(config.syncIntervalMs) || 15000);
  const storagePrefix = 'nagoya-kanazawa-2026-';
  const tokenStorageKey = storagePrefix + 'cloud-share-token';
  const pendingStorageKey = storagePrefix + 'cloud-pending';
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/trip-state$/i.test(functionUrl)
    && !functionUrl.includes('YOUR_PROJECT_REF');

  let shareToken = localStorage.getItem(tokenStorageKey) || '';
  let applyingRemote = false;
  let syncing = false;
  let pollTimer = null;
  let budgetSaveTimer = null;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[ch]);
  }

  function getPending() {
    try {
      const parsed = JSON.parse(localStorage.getItem(pendingStorageKey) || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function setPending(pending) {
    if (Object.keys(pending).length === 0) localStorage.removeItem(pendingStorageKey);
    else localStorage.setItem(pendingStorageKey, JSON.stringify(pending));
  }

  function isSharedCheckbox(input) {
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return false;
    const key = input.dataset.key || '';
    return Boolean(key) && !key.startsWith('pack-');
  }

  function stateKeyForBudget(input) {
    return `budget-${input.dataset.day}-${input.dataset.category}`;
  }

  function getLocalSnapshot() {
    const snapshot = {};
    const seen = new Set();

    $$('.event-check[data-key], .persist-check[data-key]').forEach(input => {
      if (!isSharedCheckbox(input)) return;
      const key = input.dataset.key;
      if (seen.has(key)) return;
      seen.add(key);
      snapshot[key] = Boolean(input.checked);
    });

    $$('.budget-input[data-day][data-category]').forEach(input => {
      snapshot[stateKeyForBudget(input)] = Math.max(0, Number(input.value) || 0);
    });

    return snapshot;
  }

  function applyRemoteState(states) {
    if (!states || typeof states !== 'object') return;
    applyingRemote = true;
    try {
      for (const [key, value] of Object.entries(states)) {
        if (key.startsWith('budget-')) {
          const match = /^budget-(\d+)-(.+)$/.exec(key);
          if (!match) continue;
          const input = $(`.budget-input[data-day="${CSS.escape(match[1])}"][data-category="${CSS.escape(match[2])}"]`);
          if (!input) continue;
          const nextValue = Math.max(0, Number(value) || 0);
          if (Number(input.value) !== nextValue) {
            input.value = String(nextValue);
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
          continue;
        }

        const checkboxes = $$(`input[data-key="${CSS.escape(key)}"]`).filter(isSharedCheckbox);
        if (!checkboxes.length) continue;
        const nextChecked = Boolean(value);
        const target = checkboxes[0];
        if (target.checked !== nextChecked) {
          target.checked = nextChecked;
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    } finally {
      applyingRemote = false;
    }
  }

  async function apiRequest(method = 'GET', body = null) {
    if (!configured) throw new Error('尚未設定 Supabase Function URL');
    if (!shareToken) throw new Error('尚未輸入共享碼');
    if (!navigator.onLine) throw new Error('目前離線');

    const response = await fetch(functionUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-trip-share-token': shareToken
      },
      body: body === null ? undefined : JSON.stringify(body),
      cache: 'no-store'
    });

    let payload = null;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `同步失敗（HTTP ${response.status}）`;
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload || {};
  }

  function queueChange(key, value) {
    const pending = getPending();
    pending[key] = value;
    setPending(pending);
    updateCloudUi('pending');
    flushPending().catch(() => {});
  }

  async function flushPending() {
    if (syncing || !shareToken || !navigator.onLine || !configured) return false;
    const pending = getPending();
    const keys = Object.keys(pending);
    if (!keys.length) return true;

    syncing = true;
    updateCloudUi('syncing');
    try {
      await apiRequest('POST', { changes: pending });
      const current = getPending();
      keys.forEach(key => {
        if (JSON.stringify(current[key]) === JSON.stringify(pending[key])) delete current[key];
      });
      setPending(current);
      updateCloudUi(Object.keys(current).length ? 'pending' : 'synced');
      return true;
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        updateCloudUi('invalid');
      } else {
        updateCloudUi('error');
      }
      throw error;
    } finally {
      syncing = false;
    }
  }

  async function pullRemote({ initializeIfEmpty = false } = {}) {
    if (syncing || !shareToken || !navigator.onLine || !configured) return;
    syncing = true;
    updateCloudUi('syncing');
    try {
      const result = await apiRequest('GET');
      const states = result.states || {};
      const remoteKeys = Object.keys(states);

      if (initializeIfEmpty && remoteKeys.length === 0) {
        const snapshot = getLocalSnapshot();
        await apiRequest('POST', { changes: snapshot });
        updateCloudUi('synced');
        return;
      }

      applyRemoteState(states);
      updateCloudUi('synced');
    } catch (error) {
      if (error.status === 401 || error.status === 403) updateCloudUi('invalid');
      else updateCloudUi('error');
      throw error;
    } finally {
      syncing = false;
    }
  }

  async function syncNow({ initializeIfEmpty = false } = {}) {
    if (!configured || !shareToken) return;
    try {
      await flushPending();
      await pullRemote({ initializeIfEmpty });
    } catch {
      // 狀態已由 updateCloudUi 顯示；避免未處理的 Promise 影響其他 UI。
    }
  }

  function statusText(state) {
    if (!configured) return '未設定雲端';
    if (!shareToken) return '僅本機';
    if (!navigator.onLine) return '離線・待同步';
    const map = {
      syncing: '同步中…',
      synced: '雲端已同步',
      pending: '有變更待同步',
      invalid: '共享碼錯誤',
      error: '雲端連線失敗'
    };
    return map[state] || '雲端同步';
  }

  function updateCloudUi(state = '') {
    const text = statusText(state);
    const button = $('#tripCloudButton');
    const status = $('#tripCloudStatus');
    const hint = $('#tripCloudHint');
    if (button) button.textContent = `☁ ${text}`;
    if (status) status.textContent = text;
    if (hint) {
      if (!configured) hint.textContent = '先在 cloud-config.js 設定 Supabase Function URL。';
      else if (!shareToken) hint.textContent = '輸入旅行共享碼後，預約、住宿決選、預算與行程完成狀態會多人共用。';
      else if (!navigator.onLine) hint.textContent = '目前離線；修改會先保存在本機，恢復網路後再上傳。';
      else hint.textContent = '此裝置已啟用多人共用；冬季行李、主題與單日顯示模式仍只存在本機。';
    }
  }

  function closeModal() {
    const modal = $('#tripCloudModal');
    if (modal) modal.classList.remove('open');
  }

  function openModal() {
    const modal = $('#tripCloudModal');
    const input = $('#tripCloudTokenInput');
    if (!modal) return;
    modal.classList.add('open');
    if (input) {
      input.value = shareToken;
      setTimeout(() => input.focus(), 30);
    }
    updateCloudUi();
  }

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = `
      .trip-cloud-button{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:8px 11px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer}
      .trip-cloud-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:none;align-items:center;justify-content:center;padding:18px}
      .trip-cloud-modal.open{display:flex}
      .trip-cloud-dialog{width:min(520px,100%);background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
      .trip-cloud-dialog h2{margin:0 0 6px;font-size:1.15rem}.trip-cloud-dialog p{margin:0 0 14px;color:var(--muted);font-size:.85rem;line-height:1.6}
      .trip-cloud-dialog label{display:block;font-size:.78rem;font-weight:800}.trip-cloud-dialog input{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);color:var(--text);padding:11px 12px;font:inherit}
      .trip-cloud-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.trip-cloud-actions button{border:1px solid var(--line);background:var(--surface-2);color:var(--text);border-radius:10px;padding:9px 12px;font:inherit;font-weight:800;cursor:pointer}.trip-cloud-actions .primary{background:var(--accent);color:white;border-color:var(--accent)}
      .trip-cloud-meta{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:.76rem;color:var(--muted);line-height:1.55}
      @media(max-width:560px){.trip-cloud-dialog{padding:15px}.trip-cloud-actions button{flex:1 1 44%}}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'tripCloudButton';
    button.className = 'trip-cloud-button';
    button.addEventListener('click', openModal);

    const dashboardHead = $('.dashboard-head');
    if (dashboardHead) {
      const existing = $('#networkPill');
      if (existing && existing.parentElement === dashboardHead) dashboardHead.appendChild(button);
      else dashboardHead.appendChild(button);
    } else {
      document.body.appendChild(button);
    }

    const modal = document.createElement('div');
    modal.id = 'tripCloudModal';
    modal.className = 'trip-cloud-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'tripCloudTitle');
    modal.innerHTML = `
      <div class="trip-cloud-dialog">
        <h2 id="tripCloudTitle">多人共用同步</h2>
        <p id="tripCloudHint"></p>
        <label>旅行共享碼
          <input id="tripCloudTokenInput" type="password" autocomplete="off" placeholder="輸入共享碼" />
        </label>
        <div class="trip-cloud-actions">
          <button type="button" class="primary" id="tripCloudConnect">儲存並同步</button>
          <button type="button" id="tripCloudSyncNow">立即同步</button>
          <button type="button" id="tripCloudForget">忘記共享碼</button>
          <button type="button" id="tripCloudClose">關閉</button>
        </div>
        <div class="trip-cloud-meta">狀態：<b id="tripCloudStatus">${escapeHtml(statusText())}</b><br>共享碼只存在這台裝置的瀏覽器；高權限 Supabase 金鑰不會寫入 GitHub Pages。</div>
      </div>`;
    document.body.appendChild(modal);

    $('#tripCloudClose').addEventListener('click', closeModal);
    modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
    $('#tripCloudConnect').addEventListener('click', async () => {
      const input = $('#tripCloudTokenInput');
      const next = String(input ? input.value : '').trim();
      if (!next) {
        alert('請輸入旅行共享碼。');
        return;
      }
      shareToken = next;
      localStorage.setItem(tokenStorageKey, shareToken);
      updateCloudUi('syncing');
      await syncNow({ initializeIfEmpty: true });
      if ($('#tripCloudStatus')?.textContent === '雲端已同步') closeModal();
    });
    $('#tripCloudSyncNow').addEventListener('click', () => syncNow());
    $('#tripCloudForget').addEventListener('click', () => {
      if (!confirm('只會移除這台裝置保存的共享碼，不會刪除雲端資料；確定嗎？')) return;
      shareToken = '';
      localStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(pendingStorageKey);
      updateCloudUi();
      const input = $('#tripCloudTokenInput');
      if (input) input.value = '';
    });

    updateCloudUi();
  }

  function bindSharedInputs() {
    document.addEventListener('change', event => {
      const target = event.target;
      if (applyingRemote || !isSharedCheckbox(target)) return;
      queueChange(target.dataset.key, Boolean(target.checked));
    });

    document.addEventListener('input', event => {
      const target = event.target;
      if (applyingRemote || !(target instanceof HTMLInputElement) || !target.classList.contains('budget-input')) return;
      clearTimeout(budgetSaveTimer);
      budgetSaveTimer = setTimeout(() => {
        queueChange(stateKeyForBudget(target), Math.max(0, Number(target.value) || 0));
      }, 500);
    });
  }

  function schedulePolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine && shareToken) syncNow();
    }, syncIntervalMs);
  }

  function start() {
    injectUi();
    bindSharedInputs();
    schedulePolling();

    window.addEventListener('online', () => syncNow());
    window.addEventListener('focus', () => syncNow());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncNow();
    });

    if (shareToken && configured) syncNow({ initializeIfEmpty: true });
  }

  window.tripCloud = {
    open: openModal,
    sync: () => syncNow(),
    isConfigured: () => configured,
    isConnected: () => Boolean(shareToken)
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

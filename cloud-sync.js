(() => {
  'use strict';

  const storagePrefix = 'nagoya-hokuriku-2027-v6-';
  const tokenStorageKey = storagePrefix + 'cloud-share-token';
  const pendingStorageKey = storagePrefix + 'cloud-pending';

  // Read cloud-config.js dynamically instead of freezing its value at script startup.
  // This also makes a recovered/fresh config usable without stale in-memory `configured` state.
  function readCloudConfig() {
    const config = window.TRIP_CLOUD_CONFIG || {};
    const functionUrl = String(config.functionUrl || '').trim().replace(/\/+$/, '');
    const namespaceBase = String(config.namespace || 'nagoya-hokuriku-v6-2027').replace(/[^a-zA-Z0-9._-]/g, '');
    const cloudNamespace = (namespaceBase || 'nagoya-hokuriku-v6-2027') + ':';
    const syncIntervalMs = Math.max(10000, Number(config.syncIntervalMs) || 60000);
    const requestTimeoutMs = Math.max(5000, Number(config.requestTimeoutMs) || 12000);
    const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/trip-state$/i.test(functionUrl)
      && !functionUrl.includes('YOUR_PROJECT_REF');
    return { functionUrl, cloudNamespace, syncIntervalMs, requestTimeoutMs, configured };
  }

  let shareToken = localStorage.getItem(tokenStorageKey) || '';
  let applyingRemote = false;
  let syncing = false;
  let pollTimer = null;
  let budgetSaveTimer = null;
  let lastCloudError = '';
  let verifiedConnection = false;

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

  function isSharedValueInput(input) {
    if (!(input instanceof HTMLInputElement)) return false;
    const key = input.dataset.cloudKey || '';
    return Boolean(key);
  }

  function stateKeyForBudget(input) {
    return `budget-${input.dataset.day}-${input.dataset.category}`;
  }


  function toRemoteChanges(changes) {
    return Object.fromEntries(
      Object.entries(changes || {}).map(([key, value]) => [readCloudConfig().cloudNamespace + key, value])
    );
  }

  function fromRemoteStates(allStates) {
    return Object.fromEntries(
      Object.entries(allStates || {})
        .filter(([key]) => key.startsWith(readCloudConfig().cloudNamespace))
        .map(([key, value]) => [key.slice(readCloudConfig().cloudNamespace.length), value])
    );
  }

  function legacyRemoteStates(allStates) {
    const expected = new Set(Object.keys(getLocalSnapshot()));
    return Object.fromEntries(
      Object.entries(allStates || {}).filter(([key]) => expected.has(key))
    );
  }

  function friendlyCloudError(error) {
    if (!error) return '雲端同步失敗，請稍後再試。';
    if (error.code === 'timeout') return 'Supabase 連線逾時，請檢查網路或 Edge Function 是否正常。';
    if (error.code === 'network') return '無法連上 Supabase Edge Function，請檢查 Function URL、CORS 與網路。';
    if (error.status === 401 || error.status === 403) return '旅行共享碼錯誤，請重新確認後再試。';
    if (error.status === 404) return '找不到 trip-state Edge Function，請檢查 Function URL。';
    return String(error.message || '雲端同步失敗，請稍後再試。');
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

    $$('input[data-cloud-key]').forEach(input => {
      if (!isSharedValueInput(input)) return;
      snapshot[input.dataset.cloudKey] = String(input.value || '');
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

        const valueInput = $(`input[data-cloud-key="${CSS.escape(key)}"]`);
        if (valueInput && isSharedValueInput(valueInput)) {
          const nextValue = value === null || value === undefined ? '' : String(value);
          if (valueInput.value !== nextValue) {
            valueInput.value = nextValue;
            valueInput.dispatchEvent(new Event('change', { bubbles: true }));
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
    const { configured, functionUrl, requestTimeoutMs } = readCloudConfig();
    if (!configured) {
      const error = new Error('cloud-config.js 尚未設定有效的 Supabase Function URL。');
      error.code = 'config';
      throw error;
    }
    if (!shareToken) {
      const error = new Error('尚未輸入旅行共享碼。');
      error.code = 'token';
      throw error;
    }
    if (!navigator.onLine) {
      const error = new Error('目前離線。');
      error.code = 'offline';
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
    let response;
    try {
      response = await fetch(functionUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-trip-share-token': shareToken
        },
        body: body === null ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: controller.signal
      });
    } catch (error) {
      if (error && error.name === 'AbortError') {
        const timeoutError = new Error(`Supabase 連線超過 ${Math.round(requestTimeoutMs / 1000)} 秒仍未回應。`);
        timeoutError.code = 'timeout';
        throw timeoutError;
      }
      const networkError = new Error('無法連上 Supabase Edge Function。');
      networkError.code = 'network';
      throw networkError;
    } finally {
      clearTimeout(timer);
    }

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
    if (syncing || !shareToken || !navigator.onLine || !readCloudConfig().configured) return false;
    const pending = getPending();
    const keys = Object.keys(pending);
    if (!keys.length) return true;

    syncing = true;
    updateCloudUi('syncing');
    try {
      await apiRequest('POST', { changes: toRemoteChanges(pending) });
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
    if (syncing || !shareToken || !navigator.onLine || !readCloudConfig().configured) return false;
    syncing = true;
    updateCloudUi('syncing');
    try {
      const result = await apiRequest('GET');
      const allStates = result.states || {};
      let states = fromRemoteStates(allStates);
      let remoteKeys = Object.keys(states);

      // V11 以前曾把 state key 直接寫入資料庫、沒有 namespace。
      // 若目前 namespace 還是空的，就把能辨識的舊資料自動搬到新 namespace，一次完成相容遷移。
      if (remoteKeys.length === 0) {
        const legacy = legacyRemoteStates(allStates);
        if (Object.keys(legacy).length > 0) {
          await apiRequest('POST', { changes: toRemoteChanges(legacy) });
          states = legacy;
          remoteKeys = Object.keys(states);
        }
      }

      if (initializeIfEmpty && remoteKeys.length === 0) {
        const snapshot = getLocalSnapshot();
        await apiRequest('POST', { changes: toRemoteChanges(snapshot) });
        updateCloudUi('synced');
        return true;
      }

      applyRemoteState(states);
      updateCloudUi('synced');
      return true;
    } catch (error) {
      lastCloudError = friendlyCloudError(error);
      if (error.status === 401 || error.status === 403) updateCloudUi('invalid');
      else updateCloudUi('error');
      throw error;
    } finally {
      syncing = false;
    }
  }

  async function syncNow({ initializeIfEmpty = false, reportErrors = false } = {}) {
    if (!readCloudConfig().configured) {
      updateCloudUi('config');
      if (reportErrors) showCloudMessage('尚未設定 Supabase Function URL。請先確認 GitHub 上的 cloud-config.js 沒有被覆蓋成 YOUR_PROJECT_REF。', 'error');
      return false;
    }
    if (!shareToken) {
      updateCloudUi();
      if (reportErrors) showCloudMessage('請先輸入旅行共享碼。', 'error');
      return false;
    }
    if (!navigator.onLine) {
      updateCloudUi('offline');
      if (reportErrors) showCloudMessage('目前離線；恢復網路後會自動再同步。', 'warning');
      return false;
    }

    lastCloudError = '';
    try {
      await flushPending();
      await pullRemote({ initializeIfEmpty });
      verifiedConnection = true;
      if (reportErrors) showCloudMessage('共享碼驗證成功，雲端資料已同步。', 'success');
      return true;
    } catch (error) {
      verifiedConnection = false;
      lastCloudError = friendlyCloudError(error);
      if (reportErrors) showCloudMessage(lastCloudError, 'error');
      return false;
    }
  }

  function statusText(state) {
    if (!readCloudConfig().configured) return '未設定雲端';
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
    const visualState = !readCloudConfig().configured ? 'disabled' : !shareToken ? 'local' : !navigator.onLine ? 'offline' : (state || 'local');
    if (button) {
      button.textContent = `☁ ${text}`;
      button.dataset.state = visualState;
    }
    if (status) {
      status.textContent = text;
      status.dataset.state = visualState;
    }
    if (hint) {
      if (!readCloudConfig().configured) hint.textContent = '尚未設定雲端：cloud-config.js 的 functionUrl 仍是空值或 YOUR_PROJECT_REF。';
      else if (!shareToken) hint.textContent = '輸入旅行共享碼後，預約、住宿候選／最終住宿、預算與行程完成狀態會多人共用。';
      else if (!navigator.onLine) hint.textContent = '目前離線；修改會先保存在本機，恢復網路後再上傳。';
      else if (state === 'invalid') hint.textContent = '共享碼驗證失敗；請重新輸入正確的旅行共享碼。';
      else if (state === 'error') hint.textContent = lastCloudError || '雲端連線失敗；請檢查 Function URL、CORS 與網路。';
      else if (state === 'syncing') hint.textContent = '正在驗證共享碼並同步雲端資料…';
      else hint.textContent = '此裝置已啟用多人共用；冬季行李、主題與單日顯示模式仍只存在本機。';
    }
  }

  function showCloudMessage(message = '', type = '') {
    const box = $('#tripCloudMessage');
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = '';
      box.dataset.type = '';
      return;
    }
    box.hidden = false;
    box.textContent = message;
    box.dataset.type = type;
  }

  function setConnectBusy(busy) {
    const button = $('#tripCloudConnect');
    if (!button) return;
    button.disabled = Boolean(busy);
    button.textContent = busy ? '驗證中…' : '儲存並同步';
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
    if (!readCloudConfig().configured) showCloudMessage('尚未設定 Supabase Function URL；如果你剛用完整 ZIP 覆蓋 GitHub，請把原本的 cloud-config.js 還原。', 'error');
    else showCloudMessage();
  }

  function injectUi() {
    const style = document.createElement('style');
    style.textContent = `
      .trip-cloud-button{border:1px solid var(--line);background:var(--surface);color:var(--text);border-radius:999px;padding:8px 11px;font:inherit;font-size:.78rem;font-weight:800;cursor:pointer;transition:.16s ease}
      .trip-cloud-button[data-state="synced"]{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 35%,var(--line));background:color-mix(in srgb,var(--ok) 7%,var(--surface))}
      .trip-cloud-button[data-state="pending"],.trip-cloud-button[data-state="syncing"],.trip-cloud-button[data-state="offline"]{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 38%,var(--line));background:color-mix(in srgb,var(--warn) 7%,var(--surface))}
      .trip-cloud-button[data-state="invalid"],.trip-cloud-button[data-state="error"]{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 38%,var(--line));background:color-mix(in srgb,var(--danger) 7%,var(--surface))}
      #tripCloudStatus[data-state="synced"]{color:var(--ok)}#tripCloudStatus[data-state="pending"],#tripCloudStatus[data-state="syncing"],#tripCloudStatus[data-state="offline"]{color:var(--warn)}#tripCloudStatus[data-state="invalid"],#tripCloudStatus[data-state="error"]{color:var(--danger)}
      .trip-cloud-modal{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.48);display:none;align-items:center;justify-content:center;padding:calc(18px + env(safe-area-inset-top)) calc(18px + env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) calc(18px + env(safe-area-inset-left));overflow:auto;overscroll-behavior:contain}
      .trip-cloud-modal.open{display:flex}
      .trip-cloud-dialog{width:min(520px,100%);max-height:min(720px,calc(100dvh - 36px - env(safe-area-inset-top) - env(safe-area-inset-bottom)));overflow:auto;background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:18px;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.2)}
      .trip-cloud-dialog h2{margin:0 0 6px;font-size:1.15rem}.trip-cloud-dialog p{margin:0 0 14px;color:var(--muted);font-size:.85rem;line-height:1.6}
      .trip-cloud-dialog label{display:block;font-size:.78rem;font-weight:800}.trip-cloud-dialog input{width:100%;box-sizing:border-box;margin-top:6px;border:1px solid var(--line);border-radius:11px;background:var(--surface-2);color:var(--text);padding:11px 12px;font:inherit}
      .trip-cloud-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.trip-cloud-actions button{border:1px solid var(--line);background:var(--surface-2);color:var(--text);border-radius:10px;padding:9px 12px;font:inherit;font-weight:800;cursor:pointer}.trip-cloud-actions .primary{background:var(--accent);color:white;border-color:var(--accent)}
      .trip-cloud-meta{margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:.76rem;color:var(--muted);line-height:1.55}
      .trip-cloud-message{margin-top:10px;border:1px solid var(--line);border-radius:10px;padding:9px 10px;font-size:.79rem;font-weight:750;line-height:1.5}.trip-cloud-message[hidden]{display:none}.trip-cloud-message[data-type="success"]{color:var(--ok);border-color:color-mix(in srgb,var(--ok) 35%,var(--line));background:color-mix(in srgb,var(--ok) 7%,var(--surface))}.trip-cloud-message[data-type="warning"]{color:var(--warn);border-color:color-mix(in srgb,var(--warn) 38%,var(--line));background:color-mix(in srgb,var(--warn) 7%,var(--surface))}.trip-cloud-message[data-type="error"]{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 38%,var(--line));background:color-mix(in srgb,var(--danger) 7%,var(--surface))}
      .trip-cloud-actions button:disabled{opacity:.55;cursor:wait}
      @media(max-width:560px){.trip-cloud-modal{align-items:flex-end;padding-left:calc(12px + env(safe-area-inset-left));padding-right:calc(12px + env(safe-area-inset-right));padding-bottom:calc(12px + env(safe-area-inset-bottom))}.trip-cloud-dialog{padding:15px;border-radius:18px 18px 14px 14px;max-height:calc(100dvh - 28px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}.trip-cloud-actions{display:grid;grid-template-columns:1fr 1fr}.trip-cloud-actions button{min-height:44px;width:100%}}
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
        <div id="tripCloudMessage" class="trip-cloud-message" role="status" aria-live="polite" hidden></div>
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
        showCloudMessage('請輸入旅行共享碼。', 'error');
        if (input) input.focus();
        return;
      }
      if (!readCloudConfig().configured) {
        updateCloudUi('config');
        showCloudMessage('尚未設定 Supabase Function URL。請檢查 GitHub 上的 cloud-config.js，確認 functionUrl 不是 YOUR_PROJECT_REF。', 'error');
        return;
      }

      shareToken = next;
      verifiedConnection = false;
      localStorage.setItem(tokenStorageKey, shareToken);
      setConnectBusy(true);
      showCloudMessage('正在驗證共享碼並同步雲端資料…', 'warning');
      updateCloudUi('syncing');
      const ok = await syncNow({ initializeIfEmpty: true, reportErrors: true });
      setConnectBusy(false);
      if (ok) setTimeout(closeModal, 700);
      else if (input) input.select();
    });
    $('#tripCloudSyncNow').addEventListener('click', () => syncNow({ reportErrors: true }));
    $('#tripCloudForget').addEventListener('click', () => {
      if (!confirm('只會移除這台裝置保存的共享碼，不會刪除雲端資料；確定嗎？')) return;
      shareToken = '';
      verifiedConnection = false;
      localStorage.removeItem(tokenStorageKey);
      localStorage.removeItem(pendingStorageKey);
      updateCloudUi();
      showCloudMessage('這台裝置保存的共享碼已移除。', 'success');
      const input = $('#tripCloudTokenInput');
      if (input) input.value = '';
    });

    updateCloudUi();
  }

  function bindSharedInputs() {
    document.addEventListener('change', event => {
      const target = event.target;
      if (applyingRemote) return;
      if (isSharedCheckbox(target)) {
        queueChange(target.dataset.key, Boolean(target.checked));
        return;
      }
      if (isSharedValueInput(target)) queueChange(target.dataset.cloudKey, String(target.value || ''));
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
    }, readCloudConfig().syncIntervalMs);
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

    if (shareToken && readCloudConfig().configured) syncNow({ initializeIfEmpty: true });
  }

  window.tripCloud = {
    open: openModal,
    sync: () => syncNow(),
    isConfigured: () => readCloudConfig().configured,
    isConnected: () => Boolean(readCloudConfig().configured && shareToken && verifiedConnection),
    lastError: () => lastCloudError
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

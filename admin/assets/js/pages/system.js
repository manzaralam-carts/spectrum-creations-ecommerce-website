/* ============================================================
   System — Notifications, Users & Roles, Media Library,
   Payment & Shipping, Taxes, SEO, Email Templates, Backups,
   Activity Logs, System Settings.
   ============================================================ */

registerPage('notifications', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Notifications</h1><p class="desc">New orders, low stock alerts, and other store events.</p></div>
      <div class="page-actions"><button class="btn btn-outline" id="markAll">Mark all as read</button></div>
    </div>
    <div class="table-wrap"><div data-table-slot></div><div class="table-footer" data-footer></div></div>`;
  const state = { page: 1 };
  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('notifications.php', { page: state.page, per_page: 15 });
      if (!res.data.length) { slot.innerHTML = `<div class="table-empty">${icon('bell', 34)}<div>No notifications</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
      slot.innerHTML = res.data.map(n => `
        <div style="display:flex; gap:12px; padding:14px 16px; border-bottom:1px solid var(--border); align-items:flex-start; ${n.is_read ? '' : 'background:var(--teal-tint)'}">
          <div style="width:8px; height:8px; border-radius:50%; background:${n.is_read ? 'transparent' : 'var(--teal)'}; margin-top:6px; flex-shrink:0"></div>
          <div style="flex:1">
            <div style="font-weight:600; font-size:13.5px">${escapeHtml(n.title)}</div>
            <div class="cell-sub">${escapeHtml(n.message || '')}</div>
            <div class="cell-sub" style="margin-top:2px">${fmtDateTime(n.created_at)}</div>
          </div>
          ${!n.is_read ? `<button class="btn btn-ghost btn-sm" data-read="${n.id}">Mark read</button>` : ''}
        </div>`).join('');
      slot.querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', async () => {
        await Api.put('notifications.php', {}, { id: b.dataset.read });
        load(); refreshUnreadBadge();
      }));
      const foot = root.querySelector('[data-footer]');
      foot.innerHTML = `<span>Showing ${res.data.length} of ${res.meta.total}</span>
        <div class="pager">
          <button ${res.meta.page <= 1 ? 'disabled' : ''} data-p="${res.meta.page - 1}">‹</button>
          <button class="active">${res.meta.page}</button>
          <button ${res.meta.page >= res.meta.total_pages ? 'disabled' : ''} data-p="${res.meta.page + 1}">›</button>
        </div>`;
      foot.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { state.page = parseInt(b.dataset.p, 10); load(); }));
    } catch (e) { slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }
  root.querySelector('#markAll').addEventListener('click', async () => {
    await Api.post('notifications.php', {}, { mark_all_read: 1 });
    load(); refreshUnreadBadge();
  });
  load();
});

registerPage('users', async (root) => {
  const view = new CrudView({
    endpoint: 'users.php',
    title: 'Users & Roles',
    singular: 'User',
    description: 'Admin accounts and what each role is allowed to do.',
    perPage: 10,
    canCreate: true,
    columns: [
      { key: 'name', label: 'User', render: (r) => `<div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">${escapeHtml(r.email)}</div>` },
      { key: 'role', label: 'Role', render: (r) => `<span class="role-tag">${escapeHtml(r.role)}</span>` },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : 'red'}">${escapeHtml(r.status)}</span>` },
      { key: 'last_login_at', label: 'Last login', render: (r) => r.last_login_at ? fmtDateTime(r.last_login_at) : 'Never' },
    ],
    formFields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password', hint: 'Leave blank to keep the current password when editing' },
      { name: 'role', label: 'Role', type: 'select', required: true, options: [
        { value: 'viewer', label: 'Viewer — read only' },
        { value: 'editor', label: 'Editor — manage content & catalog' },
        { value: 'manager', label: 'Manager — + orders, reports, settings' },
        { value: 'admin', label: 'Admin — full access' },
      ]},
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'suspended', label: 'Suspended' }] },
    ],
  });
  view.mount(root);

  // Small role explainer under the table.
  const note = document.createElement('div');
  note.className = 'card card-pad';
  note.style.marginTop = '16px';
  note.innerHTML = `<h3 style="margin-bottom:10px">Role capabilities</h3>
    <table class="data-table"><tbody>
      <tr><td class="cell-title">Viewer</td><td class="cell-sub">Can view dashboards, catalog, and orders — no changes.</td></tr>
      <tr><td class="cell-title">Editor</td><td class="cell-sub">+ create/edit products, categories, content, reviews, banners, blog.</td></tr>
      <tr><td class="cell-title">Manager</td><td class="cell-sub">+ order status, bulk actions, reports, shipping/general settings.</td></tr>
      <tr><td class="cell-title">Admin</td><td class="cell-sub">+ delete records, manage users, payment/tax settings, backups.</td></tr>
    </tbody></table>`;
  root.appendChild(note);
});

registerPage('media', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Media Library</h1><p class="desc">Images for products, banners, and blog posts. JPG, PNG, WEBP, or GIF — up to 5MB.</p></div>
    </div>
    <div class="dropzone" id="dropzone">
      ${icon('upload', 26)}
      <div style="margin-top:8px; font-weight:600">Drop an image here, or click to choose a file</div>
      <input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">
    </div>
    <div class="thumb-grid" id="mediaGrid"></div>
    <div class="table-footer" data-footer style="margin-top:10px"></div>`;

  const state = { page: 1 };
  const dz = root.querySelector('#dropzone');
  const fileInput = root.querySelector('#fileInput');
  dz.addEventListener('click', () => fileInput.click());
  ['dragover', 'dragleave', 'drop'].forEach(evt => dz.addEventListener(evt, (e) => {
    e.preventDefault();
    dz.classList.toggle('drag', evt === 'dragover');
  }));
  dz.addEventListener('drop', (e) => { if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]); });
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadFile(fileInput.files[0]); });

  async function uploadFile(file) {
    const fd = new FormData();
    fd.append('file', file);
    dz.innerHTML = `<div class="spinner dark" style="margin:0 auto"></div><div style="margin-top:8px">Uploading…</div>`;
    try {
      await Api.upload('media.php', fd);
      toast('File uploaded', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
    finally {
      dz.innerHTML = `${icon('upload', 26)}<div style="margin-top:8px; font-weight:600">Drop an image here, or click to choose a file</div><input type="file" id="fileInput" accept="image/jpeg,image/png,image/webp,image/gif" style="display:none">`;
      const newInput = root.querySelector('#fileInput');
      newInput.addEventListener('change', () => { if (newInput.files[0]) uploadFile(newInput.files[0]); });
    }
  }

  async function load() {
    const grid = root.querySelector('#mediaGrid');
    grid.innerHTML = `<div class="table-empty" style="grid-column:1/-1"><div class="spinner dark" style="margin:0 auto"></div></div>`;
    try {
      const res = await Api.get('media.php', { page: state.page, per_page: 18 });
      if (!res.data.length) { grid.innerHTML = `<div class="table-empty" style="grid-column:1/-1">${icon('folder', 34)}<div>No media uploaded yet</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
      grid.innerHTML = res.data.map(m => `
        <div class="thumb-card">
          <img src="../admin/${escapeHtml(m.path)}" alt="${escapeHtml(m.filename)}">
          <div class="meta">
            <div class="fn">${escapeHtml(m.filename)}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px">
              <span>${(m.size_bytes / 1024).toFixed(0)}KB</span>
              <div style="display:flex; gap:4px">
                <button class="icon-btn" data-copy="${escapeHtml(m.path)}" title="Copy path" style="width:22px;height:22px">${icon('edit3', 12)}</button>
                <button class="icon-btn" data-del="${m.id}" title="Delete" style="width:22px;height:22px">${icon('trash', 12)}</button>
              </div>
            </div>
          </div>
        </div>`).join('');
      grid.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
        navigator.clipboard?.writeText(b.dataset.copy);
        toast('Path copied', 'success');
      }));
      grid.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
        const ok = await confirmDialog('Delete this file?');
        if (!ok) return;
        try { await Api.del('media.php', { id: b.dataset.del }); toast('File deleted', 'success'); load(); }
        catch (e) { toast(e.message, 'error'); }
      }));
      const foot = root.querySelector('[data-footer]');
      foot.innerHTML = `<span>Showing ${res.data.length} of ${res.meta.total}</span>
        <div class="pager">
          <button ${res.meta.page <= 1 ? 'disabled' : ''} data-p="${res.meta.page - 1}">‹</button>
          <button class="active">${res.meta.page}</button>
          <button ${res.meta.page >= res.meta.total_pages ? 'disabled' : ''} data-p="${res.meta.page + 1}">›</button>
        </div>`;
      foot.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { state.page = parseInt(b.dataset.p, 10); load(); }));
    } catch (e) { grid.innerHTML = `<div class="table-empty" style="grid-column:1/-1">${escapeHtml(e.message)}</div>`; }
  }
  load();
});

/* ---------- Settings forms (payment/shipping, taxes, SEO, general) ---------- */
function settingsFormPage(group, fields, opts = {}) {
  return async (root) => {
    const res = await Api.get('settings.php', { group });
    const data = res.data;
    root.innerHTML = `
      <div class="page-head"><div><h1>${escapeHtml(opts.title)}</h1><p class="desc">${escapeHtml(opts.desc || '')}</p></div></div>
      <div class="card card-pad" style="max-width:640px">
        <form id="settingsForm">
          ${fields.map(f => `
            <div class="field">
              <label>${escapeHtml(f.label)}</label>
              ${f.type === 'select' ?
                `<select name="${f.key}">${f.options.map(o => `<option value="${o.value}" ${String(data[f.key]) === String(o.value) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}</select>` :
                f.type === 'checkbox' ?
                `<div class="checkbox-row"><input type="checkbox" name="${f.key}" ${data[f.key] === '1' ? 'checked' : ''}><span class="hint" style="margin:0">${escapeHtml(f.hint || '')}</span></div>` :
                `<input type="${f.type || 'text'}" name="${f.key}" value="${escapeHtml(data[f.key] ?? '')}" ${f.step ? `step="${f.step}"` : ''}>`
              }
              ${f.hint && f.type !== 'checkbox' ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ''}
            </div>`).join('')}
          <button type="submit" class="btn btn-primary">Save settings</button>
        </form>
      </div>`;

    root.querySelector('#settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {};
      fields.forEach(f => {
        if (f.type === 'checkbox') payload[f.key] = e.target.elements[f.key].checked ? '1' : '0';
        else payload[f.key] = fd.get(f.key) ?? '';
      });
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
      try {
        await Api.put('settings.php', payload, { group });
        toast('Settings saved', 'success');
      } catch (err) { toast(err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Save settings'; }
    });
  };
}

registerPage('payment-shipping', async (root) => {
  root.innerHTML = `
    <div class="page-head"><div><h1>Payment &amp; Shipping</h1><p class="desc">Checkout payment options and shipping rates.</p></div></div>
    <div class="tabs">
      <button class="tab-btn active" data-t="payment">Payment</button>
      <button class="tab-btn" data-t="shipping">Shipping</button>
    </div>
    <div id="psBody"></div>`;
  const paymentFields = [
    { key: 'cod_enabled', label: 'Cash on delivery', type: 'checkbox', hint: 'Allow customers to pay on delivery' },
    { key: 'card_enabled', label: 'Card payments', type: 'checkbox', hint: 'Enable online card checkout' },
    { key: 'card_provider', label: 'Card gateway', hint: 'e.g. Stripe, PayFast, JazzCash' },
    { key: 'card_api_key', label: 'Gateway API key', type: 'password' },
  ];
  const shippingFields = [
    { key: 'flat_rate', label: 'Flat shipping rate', type: 'number', step: '0.01' },
    { key: 'free_shipping_threshold', label: 'Free shipping over', type: 'number', step: '0.01' },
    { key: 'processing_days', label: 'Order processing days', type: 'number' },
  ];
  async function show(tab) {
    const body = document.getElementById('psBody');
    body.innerHTML = '';
    const render = tab === 'payment'
      ? settingsFormPage('payment', paymentFields, { title: '', desc: '' })
      : settingsFormPage('shipping', shippingFields, { title: '', desc: '' });
    const tmp = document.createElement('div');
    await render(tmp);
    body.innerHTML = tmp.querySelector('.card').outerHTML;
    rebind(body, tab);
  }
  function rebind(body, tab) {
    const group = tab;
    const fields = tab === 'payment' ? paymentFields : shippingFields;
    body.querySelector('#settingsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const payload = {};
      fields.forEach(f => {
        payload[f.key] = f.type === 'checkbox' ? (e.target.elements[f.key].checked ? '1' : '0') : (fd.get(f.key) ?? '');
      });
      const btn = e.target.querySelector('button[type=submit]');
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Saving…';
      try { await Api.put('settings.php', payload, { group }); toast('Settings saved', 'success'); }
      catch (err) { toast(err.message, 'error'); }
      finally { btn.disabled = false; btn.textContent = 'Save settings'; }
    });
  }
  root.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-t]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    show(b.dataset.t);
  }));
  show('payment');
});

registerPage('taxes', async (root) => {
  root.innerHTML = `<div id="taxSettings"></div><div style="margin-top:20px" id="taxRates"></div>`;
  const render = settingsFormPage('tax', [
    { key: 'tax_enabled', label: 'Charge tax at checkout', type: 'checkbox' },
    { key: 'default_rate', label: 'Default tax rate (%)', type: 'number', step: '0.01' },
  ], { title: 'Taxes', desc: 'Global tax settings and regional rate overrides.' });
  await render(document.getElementById('taxSettings'));

  const view = new CrudView({
    endpoint: 'tax_rates.php',
    title: 'Regional tax rates',
    singular: 'Tax rate',
    perPage: 10,
    columns: [
      { key: 'region', label: 'Region' },
      { key: 'rate', label: 'Rate', num: true, render: (r) => `${r.rate}%` },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : 'gray'}">${escapeHtml(r.status)}</span>` },
    ],
    formFields: [
      { name: 'region', label: 'Region / province', required: true },
      { name: 'rate', label: 'Rate (%)', type: 'number', step: '0.01', required: true },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ],
  });
  view.mount(document.getElementById('taxRates'));
});

registerPage('seo', settingsFormPage('seo', [
  { key: 'meta_title', label: 'Default meta title' },
  { key: 'meta_description', label: 'Default meta description', type: 'textarea' },
  { key: 'og_image', label: 'Default social share image URL' },
], { title: 'SEO', desc: 'Defaults used when a page has no specific meta tags of its own.' }));

registerPage('email-templates', async (root) => {
  const view = new CrudView({
    endpoint: 'email_templates.php',
    title: 'Email Templates',
    singular: 'Template',
    description: 'Transactional email content. Use {{customer_name}}, {{order_no}} as placeholders.',
    canCreate: false,
    perPage: 10,
    selectable: false,
    columns: [
      { key: 'name', label: 'Template', render: (r) => `<div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">${escapeHtml(r.code)}</div>` },
      { key: 'subject', label: 'Subject' },
      { key: 'updated_at', label: 'Updated', render: (r) => fmtDate(r.updated_at) },
    ],
    formFields: [
      { name: 'subject', label: 'Subject line', required: true },
      { name: 'body', label: 'Body', type: 'textarea', rows: 8, required: true },
    ],
    rowActions: (row) => `<button class="icon-btn" data-edit="${row.id}" title="Edit">${icon('edit3', 15)}</button>`,
  });
  view.mount(root);
});

registerPage('backups', async (root) => {
  root.innerHTML = `
    <div class="page-head"><div><h1>Backups</h1><p class="desc">Download a full data snapshot as JSON — portable to any host, no shell access required.</p></div></div>
    <div class="card card-pad" style="max-width:520px">
      <p style="font-size:13px; color:var(--text-mute); margin-bottom:16px">
        Includes products, orders, categories, vendors, coupons, reviews, banners, blog posts, tax rates,
        email templates, and settings. Wishlist data is per-visitor and included as-is.
      </p>
      <button class="btn btn-primary" id="dlBackup">${icon('download', 15)} Download backup (.json)</button>
    </div>`;
  root.querySelector('#dlBackup').addEventListener('click', () => {
    window.location.href = '../backend/api/backup.php?download=1';
  });
});

registerPage('activity-logs', async (root) => {
  root.innerHTML = `
    <div class="page-head"><div><h1>Activity Logs</h1><p class="desc">Audit trail of admin actions.</p></div></div>
    <div class="table-wrap">
      <div class="table-toolbar"><div class="search">${icon('search', 14)}<input type="text" placeholder="Search admin, action…" data-q></div></div>
      <div data-table-slot></div>
      <div class="table-footer" data-footer></div>
    </div>`;
  const state = { page: 1, q: '' };
  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('activity_logs.php', { page: state.page, per_page: 15, q: state.q || undefined });
      if (!res.data.length) { slot.innerHTML = `<div class="table-empty">${icon('clock', 34)}<div>No activity recorded yet</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
      slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
          <th>Admin</th><th>Action</th><th>Entity</th><th>Details</th><th>When</th>
        </tr></thead><tbody>
        ${res.data.map(r => `<tr>
          <td class="cell-title">${escapeHtml(r.admin_name || 'system')}</td>
          <td><span class="pill teal">${escapeHtml(r.action)}</span></td>
          <td class="cell-sub">${escapeHtml(r.entity)}${r.entity_id ? ' #' + escapeHtml(r.entity_id) : ''}</td>
          <td class="cell-sub">${escapeHtml(r.details || '')}</td>
          <td class="cell-sub">${fmtDateTime(r.created_at)}</td>
        </tr>`).join('')}
        </tbody></table></div>`;
      const foot = root.querySelector('[data-footer]');
      foot.innerHTML = `<span>Showing ${res.data.length} of ${res.meta.total}</span>
        <div class="pager">
          <button ${res.meta.page <= 1 ? 'disabled' : ''} data-p="${res.meta.page - 1}">‹</button>
          <button class="active">${res.meta.page}</button>
          <button ${res.meta.page >= res.meta.total_pages ? 'disabled' : ''} data-p="${res.meta.page + 1}">›</button>
        </div>`;
      foot.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { state.page = parseInt(b.dataset.p, 10); load(); }));
    } catch (e) { slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }
  root.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; state.page = 1; load(); }, 350));
  load();
});

registerPage('settings', settingsFormPage('general', [
  { key: 'site_name', label: 'Site name' },
  { key: 'currency', label: 'Currency', type: 'select', options: [
    { value: 'PKR', label: 'PKR — Pakistani Rupee' }, { value: 'USD', label: 'USD — US Dollar' },
    { value: 'EUR', label: 'EUR — Euro' }, { value: 'GBP', label: 'GBP — British Pound' }, { value: 'INR', label: 'INR — Indian Rupee' },
  ]},
  { key: 'support_email', label: 'Support email', type: 'email' },
  { key: 'timezone', label: 'Timezone', hint: 'e.g. Asia/Karachi' },
], { title: 'System Settings', desc: 'General store configuration.' }));

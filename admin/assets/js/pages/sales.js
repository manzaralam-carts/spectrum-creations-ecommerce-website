/* ============================================================
   Sales — Orders (custom detail view + status workflow),
   Customers (read-only, aggregated from orders), Vendors, Coupons.
   ============================================================ */

const ORDER_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const STATUS_COLOR = { pending: 'amber', confirmed: 'teal', shipped: 'teal', delivered: 'green', cancelled: 'red' };

registerPage('orders', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Orders</h1><p class="desc">Track and update order status.</p></div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <div class="search">${icon('search', 14)}<input type="text" placeholder="Search order #, customer, phone…" data-q></div>
        <select data-status>
          <option value="">Status: All</option>
          ${ORDER_STATUSES.map(s => `<option value="${s}">${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
        <input type="date" data-from title="From date" style="padding:7px 10px; border-radius:8px; border:1px solid var(--border); font-size:13px">
        <input type="date" data-to title="To date" style="padding:7px 10px; border-radius:8px; border:1px solid var(--border); font-size:13px">
      </div>
      <div class="bulk-bar" data-bulk-bar>
        <span data-bulk-count></span>
        <div class="spacer"></div>
        <select data-bulk-status style="padding:5px 8px; border-radius:7px; border:1px solid var(--border); font-size:12.5px">
          ${ORDER_STATUSES.map(s => `<option value="${s}">Mark as ${s}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-outline" data-apply-bulk>Apply</button>
      </div>
      <div data-table-slot></div>
      <div class="table-footer" data-footer></div>
    </div>`;

  const state = { page: 1, q: '', status: '', from: '', to: '', selected: new Set() };

  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('orders_admin.php', {
        page: state.page, per_page: 10, q: state.q || undefined, status: state.status || undefined,
        date_from: state.from || undefined, date_to: state.to || undefined,
      });
      state.selected.clear();
      renderRows(res.data, res.meta);
    } catch (e) { slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }

  function renderRows(rows, meta) {
    const slot = root.querySelector('[data-table-slot]');
    if (!rows.length) { slot.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>No orders found</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
    slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th style="width:34px"><input type="checkbox" data-select-all></th>
        <th>Order</th><th>Customer</th><th class="num">Total</th><th>Payment</th><th>Status</th><th>Date</th>
      </tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><input type="checkbox" data-select="${r.id}"></td>
        <td class="mono"><a href="#" data-view="${r.id}" style="color:var(--teal-dark); font-weight:600">${escapeHtml(r.order_no)}</a></td>
        <td>${escapeHtml(r.customer_name)}<div class="cell-sub">${escapeHtml(r.mobile || '')}</div></td>
        <td class="num mono">${fmtMoney(r.total)}</td>
        <td class="cell-sub">${escapeHtml(r.payment_method || '—')}</td>
        <td><span class="pill ${STATUS_COLOR[r.status] || 'gray'}">${escapeHtml(r.status)}</span></td>
        <td class="cell-sub">${fmtDate(r.created_at)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;

    slot.querySelectorAll('[data-view]').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); openOrderDetail(a.dataset.view, load); }));
    slot.querySelectorAll('[data-select]').forEach(cb => cb.addEventListener('change', () => {
      cb.checked ? state.selected.add(cb.dataset.select) : state.selected.delete(cb.dataset.select);
      const n = state.selected.size;
      root.querySelector('[data-bulk-bar]').classList.toggle('show', n > 0);
      root.querySelector('[data-bulk-count]').textContent = `${n} selected`;
    }));
    const selAll = slot.querySelector('[data-select-all]');
    selAll.addEventListener('change', () => slot.querySelectorAll('[data-select]').forEach(cb => { cb.checked = selAll.checked; cb.dispatchEvent(new Event('change')); }));

    const foot = root.querySelector('[data-footer]');
    foot.innerHTML = `<span>Showing ${rows.length} of ${meta.total}</span>
      <div class="pager">
        <button ${meta.page <= 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹</button>
        <button class="active">${meta.page}</button>
        <button ${meta.page >= meta.total_pages ? 'disabled' : ''} data-p="${meta.page + 1}">›</button>
      </div>`;
    foot.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { state.page = parseInt(b.dataset.p, 10); load(); }));
  }

  root.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; state.page = 1; load(); }, 350));
  root.querySelector('[data-status]').addEventListener('change', (e) => { state.status = e.target.value; state.page = 1; load(); });
  root.querySelector('[data-from]').addEventListener('change', (e) => { state.from = e.target.value; state.page = 1; load(); });
  root.querySelector('[data-to]').addEventListener('change', (e) => { state.to = e.target.value; state.page = 1; load(); });
  root.querySelector('[data-apply-bulk]').addEventListener('click', async () => {
    if (!state.selected.size) return;
    const status = root.querySelector('[data-bulk-status]').value;
    try {
      await Api.post('orders_admin.php', { ids: Array.from(state.selected).map(Number), status }, { bulk: 1 });
      toast('Orders updated', 'success');
      load();
    } catch (e) { toast(e.message, 'error'); }
  });

  load();
});

async function openOrderDetail(id, onChange) {
  const res = await Api.get('orders_admin.php', { id });
  const o = res.data;
  const { close } = openModal({
    title: `Order ${o.order_no}`,
    wide: true,
    bodyHtml: `
      <div class="grid-2" style="gap:16px">
        <div>
          <div style="font-size:12px; color:var(--text-mute); font-weight:600; text-transform:uppercase; margin-bottom:6px">Customer</div>
          <div>${escapeHtml(o.customer_name)}</div>
          <div class="cell-sub">${escapeHtml(o.mobile || '')}</div>
          <div class="cell-sub">${escapeHtml(o.address || '')}</div>
        </div>
        <div>
          <div style="font-size:12px; color:var(--text-mute); font-weight:600; text-transform:uppercase; margin-bottom:6px">Order info</div>
          <div class="cell-sub">Placed ${fmtDateTime(o.created_at)}</div>
          <div class="cell-sub">Payment: ${escapeHtml(o.payment_method || '—')}</div>
        </div>
      </div>
      <div style="margin:18px 0 8px; font-size:12px; color:var(--text-mute); font-weight:600; text-transform:uppercase">Items</div>
      <table class="data-table">
        <thead><tr><th>Product</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Subtotal</th></tr></thead>
        <tbody>
          ${(o.items || []).map(it => `<tr>
            <td>${escapeHtml(it.product_name)}</td>
            <td class="num">${it.qty}</td>
            <td class="num mono">${fmtMoney(it.unit_price)}</td>
            <td class="num mono">${fmtMoney(it.qty * it.unit_price)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div style="text-align:right; margin-top:10px; font-weight:700; font-family:var(--font-mono)">Total: ${fmtMoney(o.total)}</div>

      <div style="margin-top:18px">
        <label style="font-size:12.5px; font-weight:600; display:block; margin-bottom:6px">Update status</label>
        <select id="statusSelect" style="padding:8px 10px; border-radius:8px; border:1px solid var(--border); font-size:13px">
          ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${s[0].toUpperCase() + s.slice(1)}</option>`).join('')}
        </select>
      </div>
    `,
    footHtml: `<button class="btn btn-ghost" data-cancel>Close</button><button class="btn btn-primary" data-save>Update status</button>`,
    onMount: (el) => {
      el.querySelector('[data-cancel]').addEventListener('click', close);
      el.querySelector('[data-save]').addEventListener('click', async () => {
        const status = el.querySelector('#statusSelect').value;
        try {
          await Api.put('orders_admin.php', { status }, { id: o.id });
          toast('Order status updated', 'success');
          close();
          if (onChange) onChange();
        } catch (e) { toast(e.message, 'error'); }
      });
    },
  });
}

registerPage('customers', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Customers</h1><p class="desc">Aggregated from order history — the storefront has no account system, so a customer is a distinct name + phone number.</p></div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar"><div class="search">${icon('search', 14)}<input type="text" placeholder="Search name or phone…" data-q></div></div>
      <div data-table-slot></div>
      <div class="table-footer" data-footer></div>
    </div>`;

  const state = { page: 1, q: '' };
  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('customers.php', { page: state.page, per_page: 10, q: state.q || undefined });
      renderRows(res.data, res.meta);
    } catch (e) { slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }
  function renderRows(rows, meta) {
    const slot = root.querySelector('[data-table-slot]');
    if (!rows.length) { slot.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>No customers yet</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
    slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>Customer</th><th class="num">Orders</th><th class="num">Lifetime value</th><th>First order</th><th>Last order</th>
      </tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td class="cell-title">${escapeHtml(r.customer_name)}<div class="cell-sub">${escapeHtml(r.mobile)}</div></td>
        <td class="num">${r.order_count}</td>
        <td class="num mono">${fmtMoney(r.lifetime_value)}</td>
        <td class="cell-sub">${fmtDate(r.first_order_at)}</td>
        <td class="cell-sub">${fmtDate(r.last_order_at)}</td>
      </tr>`).join('')}
      </tbody></table></div>`;
    const foot = root.querySelector('[data-footer]');
    foot.innerHTML = `<span>Showing ${rows.length} of ${meta.total}</span>
      <div class="pager">
        <button ${meta.page <= 1 ? 'disabled' : ''} data-p="${meta.page - 1}">‹</button>
        <button class="active">${meta.page}</button>
        <button ${meta.page >= meta.total_pages ? 'disabled' : ''} data-p="${meta.page + 1}">›</button>
      </div>`;
    foot.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => { state.page = parseInt(b.dataset.p, 10); load(); }));
  }
  root.querySelector('[data-q]').addEventListener('input', debounce((e) => { state.q = e.target.value; state.page = 1; load(); }, 350));
  load();
});

registerPage('vendors', async (root) => {
  const view = new CrudView({
    endpoint: 'vendors.php',
    title: 'Vendors',
    singular: 'Vendor',
    description: 'Manage the suppliers and artists you source products from.',
    perPage: 10,
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }] }],
    bulkActions: [{ value: 'delete', label: 'Delete', danger: true }],
    columns: [
      { key: 'name', label: 'Vendor', render: (r) => `<div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">${escapeHtml(r.email || '')}</div>` },
      { key: 'commission_rate', label: 'Commission', num: true, render: (r) => `${r.commission_rate}%` },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : r.status === 'pending' ? 'amber' : 'red'}">${escapeHtml(r.status)}</span>` },
    ],
    formFields: [
      { name: 'name', label: 'Vendor name', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'phone', label: 'Phone' },
      { name: 'commission_rate', label: 'Commission rate (%)', type: 'number', step: '0.01', default: 0 },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'suspended', label: 'Suspended' }] },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  });
  view.mount(root);
});

registerPage('coupons', async (root) => {
  const view = new CrudView({
    endpoint: 'coupons.php',
    title: 'Coupons',
    singular: 'Coupon',
    description: 'Discount codes customers can apply at checkout.',
    perPage: 10,
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }],
    bulkActions: [{ value: 'delete', label: 'Delete', danger: true }],
    columns: [
      { key: 'code', label: 'Code', render: (r) => `<span class="mono cell-title">${escapeHtml(r.code)}</span>` },
      { key: 'value', label: 'Discount', num: true, render: (r) => r.type === 'percent' ? `${r.value}%` : fmtMoney(r.value) },
      { key: 'used_count', label: 'Used', num: true, render: (r) => `${r.used_count}${r.usage_limit ? ' / ' + r.usage_limit : ''}` },
      { key: 'expires_at', label: 'Expires', render: (r) => fmtDate(r.expires_at) },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : 'gray'}">${escapeHtml(r.status)}</span>` },
    ],
    formFields: [
      { name: 'code', label: 'Coupon code', required: true, hint: 'Will be uppercased automatically' },
      { name: 'type', label: 'Discount type', type: 'select', required: true, options: [{ value: 'percent', label: 'Percentage' }, { value: 'fixed', label: 'Fixed amount' }] },
      { name: 'value', label: 'Discount value', type: 'number', step: '0.01', required: true },
      { name: 'min_order', label: 'Minimum order amount', type: 'number', step: '0.01', default: 0 },
      { name: 'usage_limit', label: 'Usage limit', type: 'number', hint: 'Leave blank for unlimited' },
      { name: 'starts_at', label: 'Starts on', type: 'date' },
      { name: 'expires_at', label: 'Expires on', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ],
  });
  view.mount(root);
});

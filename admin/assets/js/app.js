/* ============================================================
   App shell: auth guard, sidebar, router, toast/modal/confirm
   helpers, and the generic CrudView engine that every list-based
   module (products, categories, orders, vendors, coupons,
   reviews, banners, blog, users, ...) is built from.
   ============================================================ */

const ICONS = {
  dashboard: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  tag: '<path d="M20.6 12.6L12 21.2 2.8 12 2 2l10 .8 8.6 9.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  layers: '<path d="M12 2l9 5-9 5-9-5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
  cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/>',
  users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.9"/><path d="M16 3.1a4 4 0 010 7.8"/>',
  truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  percent: '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  star: '<polygon points="12 2 15.1 8.6 22 9.6 17 14.6 18.2 21.5 12 18.2 5.8 21.5 7 14.6 2 9.6 8.9 8.6"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 000-7.8z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
  edit3: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  bell: '<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  barChart: '<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>',
  shield: '<path d="M12 2l8 4v6c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-4z"/>',
  folder: '<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>',
  creditCard: '<rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>',
  landmark: '<line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="12" y1="18" x2="12" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 21 8 3 8"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  globe: '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15 15 0 010 20 15 15 0 010-20z"/>',
  mail: '<path d="M4 4h16v16H4z"/><path d="M22 6l-10 7L2 6"/>',
  archive: '<rect x="2" y="3" width="20" height="5"/><path d="M4 8v11a2 2 0 002 2h12a2 2 0 002-2V8"/><line x1="10" y1="13" x2="14" y2="13"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.31.44.9 1.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  menu: '<line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  logout: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.5 5h13l3 7v7a2 2 0 01-2 2H4.5a2 2 0 01-2-2v-7z"/>',
};
function icon(name, size = 17) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ---------------- Toasts ---------------- */
function toast(message, type = 'default') {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    document.body.appendChild(stack);
  }
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${type === 'success' ? icon('check', 15) : type === 'error' ? icon('x', 15) : ''}<span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ---------------- Modal ---------------- */
function openModal({ title, bodyHtml, wide = false, onMount, footHtml }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''}">
      <div class="modal-head">
        <h3>${escapeHtml(title)}</h3>
        <button class="icon-btn" data-close>${icon('x', 16)}</button>
      </div>
      <div class="modal-body">${bodyHtml}</div>
      ${footHtml ? `<div class="modal-foot">${footHtml}</div>` : ''}
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('[data-close]').addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
  if (onMount) onMount(backdrop, close);
  return { el: backdrop, close };
}

function confirmDialog(message, { danger = true, confirmLabel = 'Delete' } = {}) {
  return new Promise((resolve) => {
    const { close } = openModal({
      title: 'Please confirm',
      bodyHtml: `<p style="font-size:13.5px; color:var(--text)">${escapeHtml(message)}</p>`,
      footHtml: `
        <button class="btn btn-ghost" data-cancel>Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-confirm>${escapeHtml(confirmLabel)}</button>`,
      onMount: (el) => {
        el.querySelector('[data-cancel]').addEventListener('click', () => { close(); resolve(false); });
        el.querySelector('[data-confirm]').addEventListener('click', () => { close(); resolve(true); });
      },
    });
  });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtMoney(n) {
  const v = Number(n || 0);
  return CURRENCY_SYMBOL + v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
let CURRENCY_SYMBOL = 'Rs ';
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s.replace(' ', 'T'));
  if (isNaN(d)) return s;
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) + ' · ' +
         d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}
function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

/* ============================================================
   CrudView — a generic list+form engine. Each module (products,
   categories, vendors, coupons, ...) supplies a config; this
   renders the searchable/filterable/paginated table, bulk actions,
   and the add/edit modal form, and wires them to the REST endpoint.
   ============================================================ */
class CrudView {
  constructor(config) {
    this.c = config; // endpoint, title, columns, formFields, filters, ...
    this.state = { page: 1, q: '', filters: {}, sort: config.defaultSort || null, dir: 'desc', selected: new Set(), rows: [], meta: {} };
  }

  async mount(container) {
    this.container = container;
    container.innerHTML = this.shell();
    this.bindToolbar();
    await this.load();
  }

  shell() {
    const c = this.c;
    return `
      <div class="page-head">
        <div>
          <h1>${escapeHtml(c.title)}</h1>
          ${c.description ? `<p class="desc">${escapeHtml(c.description)}</p>` : ''}
        </div>
        <div class="page-actions">
          ${c.extraActionsHtml || ''}
          ${c.canCreate !== false ? `<button class="btn btn-primary" data-add>${icon('plus', 15)} ${escapeHtml(c.createLabel || 'Add ' + c.singular)}</button>` : ''}
        </div>
      </div>
      <div class="table-wrap">
        <div class="table-toolbar">
          <div class="search">
            ${icon('search', 14)}
            <input type="text" placeholder="Search ${escapeHtml(c.title.toLowerCase())}…" data-q>
          </div>
          ${(c.filters || []).map(f => `
            <select data-filter="${f.key}">
              <option value="">${escapeHtml(f.label)}: All</option>
              ${f.options.map(o => `<option value="${o.value}">${escapeHtml(o.label)}</option>`).join('')}
            </select>`).join('')}
        </div>
        <div class="bulk-bar" data-bulk-bar>
          <span data-bulk-count></span>
          <div class="spacer"></div>
          ${(c.bulkActions || []).map(a => `<button class="btn btn-sm ${a.danger ? 'btn-danger' : 'btn-outline'}" data-bulk="${a.value}">${escapeHtml(a.label)}</button>`).join('')}
        </div>
        <div data-table-slot>
          <div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>
        </div>
        <div class="table-footer" data-footer></div>
      </div>`;
  }

  bindToolbar() {
    const root = this.container;
    root.querySelector('[data-add]')?.addEventListener('click', () => this.openForm());
    root.querySelector('[data-q]').addEventListener('input', debounce((e) => {
      this.state.q = e.target.value; this.state.page = 1; this.load();
    }, 350));
    root.querySelectorAll('[data-filter]').forEach(sel => {
      sel.addEventListener('change', (e) => {
        this.state.filters[sel.dataset.filter] = e.target.value;
        this.state.page = 1; this.load();
      });
    });
    root.querySelectorAll('[data-bulk]').forEach(btn => {
      btn.addEventListener('click', () => this.runBulk(btn.dataset.bulk));
    });
  }

  async load() {
    const c = this.c;
    const params = { page: this.state.page, per_page: c.perPage || 10, q: this.state.q || undefined, ...this.state.filters };
    if (this.state.sort) { params.sort = this.state.sort; params.dir = this.state.dir; }
    try {
      const res = await Api.get(c.endpoint, params);
      this.state.rows = res.data;
      this.state.meta = res.meta || {};
      this.state.selected.clear();
      this.renderTable();
    } catch (e) {
      this.container.querySelector('[data-table-slot]').innerHTML =
        `<div class="table-empty">${icon('inbox', 34)}<div>${escapeHtml(e.message)}</div></div>`;
      toast(e.message, 'error');
    }
  }

  renderTable() {
    const c = this.c;
    const slot = this.container.querySelector('[data-table-slot]');
    if (!this.state.rows.length) {
      slot.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>No ${escapeHtml(c.title.toLowerCase())} yet</div><div class="hint">${escapeHtml(c.emptyHint || 'Add your first one to get started.')}</div></div>`;
      this.container.querySelector('[data-footer]').innerHTML = '';
      return;
    }
    const cols = c.columns;
    slot.innerHTML = `
      <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>
          ${c.selectable !== false ? `<th class="nosort" style="width:34px"><input type="checkbox" data-select-all></th>` : ''}
          ${cols.map(col => `<th class="${col.num ? 'num' : ''} ${col.sortable ? '' : 'nosort'}" data-sort="${col.key}">${escapeHtml(col.label)}</th>`).join('')}
          <th class="nosort" style="width:90px">Actions</th>
        </tr></thead>
        <tbody>
          ${this.state.rows.map(row => `
            <tr data-row="${row.id}">
              ${c.selectable !== false ? `<td><input type="checkbox" data-select="${row.id}"></td>` : ''}
              ${cols.map(col => `<td class="${col.num ? 'num' : ''}">${col.render ? col.render(row) : escapeHtml(row[col.key])}</td>`).join('')}
              <td>
                <div style="display:flex; gap:4px;">
                  ${c.rowActions ? c.rowActions(row) : `<button class="icon-btn" data-edit="${row.id}" title="Edit">${icon('edit3', 15)}</button>
                  <button class="icon-btn" data-del="${row.id}" title="Delete">${icon('trash', 15)}</button>`}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
      </div>`;

    slot.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const row = this.state.rows.find(r => String(r.id) === b.dataset.edit);
      this.openForm(row);
    }));
    slot.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => this.deleteOne(b.dataset.del)));
    slot.querySelectorAll('[data-select]').forEach(cb => cb.addEventListener('change', () => this.toggleSelect(cb.dataset.select, cb.checked)));
    const selAll = slot.querySelector('[data-select-all]');
    if (selAll) selAll.addEventListener('change', () => {
      slot.querySelectorAll('[data-select]').forEach(cb => { cb.checked = selAll.checked; this.toggleSelect(cb.dataset.select, selAll.checked); });
    });
    slot.querySelectorAll('[data-sort]').forEach(th => {
      if (th.classList.contains('nosort')) return;
      th.addEventListener('click', () => {
        const key = th.dataset.sort;
        this.state.dir = (this.state.sort === key && this.state.dir === 'asc') ? 'desc' : 'asc';
        this.state.sort = key;
        this.load();
      });
    });

    this.renderFooter();
  }

  toggleSelect(id, checked) {
    if (checked) this.state.selected.add(String(id)); else this.state.selected.delete(String(id));
    const bar = this.container.querySelector('[data-bulk-bar]');
    const n = this.state.selected.size;
    bar.classList.toggle('show', n > 0);
    this.container.querySelector('[data-bulk-count]').textContent = `${n} selected`;
  }

  renderFooter() {
    const { page, per_page, total, total_pages } = this.state.meta;
    const foot = this.container.querySelector('[data-footer]');
    if (!total) { foot.innerHTML = ''; return; }
    const from = (page - 1) * per_page + 1;
    const to = Math.min(page * per_page, total);
    let pager = '';
    const maxBtns = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(total_pages, start + maxBtns - 1);
    start = Math.max(1, end - maxBtns + 1);
    pager += `<button ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
    for (let p = start; p <= end; p++) pager += `<button class="${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
    pager += `<button ${page >= total_pages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;

    foot.innerHTML = `<span>Showing ${from}–${to} of ${total}</span><div class="pager">${pager}</div>`;
    foot.querySelectorAll('[data-page]').forEach(b => b.addEventListener('click', () => {
      this.state.page = parseInt(b.dataset.page, 10);
      this.load();
    }));
  }

  async runBulk(action) {
    if (!this.state.selected.size) return;
    const ids = Array.from(this.state.selected).map(Number);
    if (action === 'delete') {
      const ok = await confirmDialog(`Delete ${ids.length} selected ${this.c.title.toLowerCase()}? This cannot be undone.`);
      if (!ok) return;
    }
    try {
      await Api.post(this.c.endpoint, { ids, action }, { bulk: 1 });
      toast(`Updated ${ids.length} item(s)`, 'success');
      this.load();
    } catch (e) { toast(e.message, 'error'); }
  }

  async deleteOne(id) {
    const ok = await confirmDialog(`Delete this ${this.c.singular.toLowerCase()}? This cannot be undone.`);
    if (!ok) return;
    try {
      await Api.del(this.c.endpoint, { id });
      toast(`${this.c.singular} deleted`, 'success');
      this.load();
    } catch (e) { toast(e.message, 'error'); }
  }

  openForm(row = null) {
    const c = this.c;
    const fields = c.formFields;
    const bodyHtml = `<form data-form>${fields.map(f => this.renderField(f, row)).join('')}</form>`;
    const { close } = openModal({
      title: row ? `Edit ${c.singular}` : `Add ${c.singular}`,
      bodyHtml,
      wide: c.wideForm,
      footHtml: `
        <button class="btn btn-ghost" data-cancel>Cancel</button>
        <button class="btn btn-primary" data-save>${row ? 'Save changes' : 'Create'}</button>`,
      onMount: (el) => {
        el.querySelector('[data-cancel]').addEventListener('click', close);
        el.querySelector('[data-save]').addEventListener('click', () => this.submitForm(el, row, close));
      },
    });
  }

  renderField(f, row) {
    const val = row ? (row[f.name] ?? '') : (f.default ?? '');
    const req = f.required ? 'required' : '';
    let input;
    if (f.type === 'select') {
      input = `<select name="${f.name}" ${req} data-field="${f.name}">
        ${f.placeholder ? `<option value="">${escapeHtml(f.placeholder)}</option>` : ''}
        ${f.options.map(o => `<option value="${o.value}" ${String(o.value) === String(val) ? 'selected' : ''}>${escapeHtml(o.label)}</option>`).join('')}
      </select>`;
    } else if (f.type === 'textarea') {
      input = `<textarea name="${f.name}" ${req} data-field="${f.name}" rows="${f.rows || 4}">${escapeHtml(val)}</textarea>`;
    } else {
      input = `<input type="${f.type || 'text'}" name="${f.name}" ${req} data-field="${f.name}" value="${escapeHtml(val)}" ${f.step ? `step="${f.step}"` : ''}>`;
    }
    return `<div class="field" data-field-wrap="${f.name}"><label>${escapeHtml(f.label)}</label>${input}${f.hint ? `<div class="hint">${escapeHtml(f.hint)}</div>` : ''}</div>`;
  }

  async submitForm(modalEl, row, close) {
    const c = this.c;
    const data = {};
    modalEl.querySelectorAll('[data-field]').forEach(el => { data[el.name] = el.value; });
    if (c.beforeSubmit) Object.assign(data, c.beforeSubmit(data, row) || {});

    const saveBtn = modalEl.querySelector('[data-save]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Saving…';
    try {
      if (row) await Api.put(c.endpoint, data, { id: row.id });
      else await Api.post(c.endpoint, data);
      toast(`${c.singular} ${row ? 'updated' : 'created'}`, 'success');
      close();
      this.load();
    } catch (e) {
      toast(e.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = row ? 'Save changes' : 'Create';
    }
  }
}

/* ============================================================
   Router + sidebar + shell bootstrap
   ============================================================ */
const NAV = [
  { group: 'Overview', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  ]},
  { group: 'Catalog', items: [
    { key: 'products', label: 'Products', icon: 'box' },
    { key: 'categories', label: 'Categories', icon: 'tag' },
    { key: 'inventory', label: 'Inventory', icon: 'layers' },
  ]},
  { group: 'Sales', items: [
    { key: 'orders', label: 'Orders', icon: 'cart' },
    { key: 'customers', label: 'Customers', icon: 'users' },
    { key: 'vendors', label: 'Vendors', icon: 'truck' },
    { key: 'coupons', label: 'Coupons', icon: 'percent' },
  ]},
  { group: 'Content', items: [
    { key: 'reviews', label: 'Reviews', icon: 'star' },
    { key: 'wishlist', label: 'Wishlist', icon: 'heart' },
    { key: 'banners', label: 'Banners', icon: 'image' },
    { key: 'blog', label: 'Blog', icon: 'edit3' },
  ]},
  { group: 'Insights', items: [
    { key: 'reports', label: 'Reports', icon: 'barChart', minRole: 'manager' },
  ]},
  { group: 'System', items: [
    { key: 'notifications', label: 'Notifications', icon: 'bell' },
    { key: 'users', label: 'Users & Roles', icon: 'shield', minRole: 'admin' },
    { key: 'media', label: 'Media Library', icon: 'folder' },
    { key: 'payment-shipping', label: 'Payment & Shipping', icon: 'creditCard', minRole: 'manager' },
    { key: 'taxes', label: 'Taxes', icon: 'landmark', minRole: 'manager' },
    { key: 'seo', label: 'SEO', icon: 'globe', minRole: 'manager' },
    { key: 'email-templates', label: 'Email Templates', icon: 'mail', minRole: 'manager' },
    { key: 'backups', label: 'Backups', icon: 'archive', minRole: 'admin' },
    { key: 'activity-logs', label: 'Activity Logs', icon: 'clock', minRole: 'manager' },
    { key: 'settings', label: 'System Settings', icon: 'settings', minRole: 'manager' },
  ]},
];

const ROLE_RANK = { viewer: 1, editor: 2, manager: 3, admin: 4 };
let CURRENT_ADMIN = null;
const PAGE_REGISTRY = {}; // key -> async render(container)

function registerPage(key, render) { PAGE_REGISTRY[key] = render; }

function canSee(navItem) {
  if (!navItem.minRole) return true;
  return (ROLE_RANK[CURRENT_ADMIN.role] || 0) >= ROLE_RANK[navItem.minRole];
}

function renderSidebar(activeKey) {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = NAV.map(group => {
    const items = group.items.filter(canSee);
    if (!items.length) return '';
    return `<div class="nav-group-label">${escapeHtml(group.group)}</div>` +
      items.map(item => `
        <a href="#${item.key}" class="nav-item ${item.key === activeKey ? 'active' : ''}" data-nav="${item.key}">
          ${icon(item.icon, 16)}<span>${escapeHtml(item.label)}</span>
          ${item.key === 'notifications' ? `<span class="count warn" data-unread-badge style="display:none"></span>` : ''}
        </a>`).join('');
  }).join('');
}

function initial(name) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

async function bootstrap() {
  try {
    const me = await Api.get('auth.php', { action: 'me' });
    CURRENT_ADMIN = me.data;
  } catch (e) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('avatarInitial').textContent = initial(CURRENT_ADMIN.name);
  document.getElementById('whoName').textContent = CURRENT_ADMIN.name;
  document.getElementById('whoRole').textContent = CURRENT_ADMIN.role;

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    try { await Api.post('auth.php', {}, { action: 'logout' }); } catch (e) {}
    window.location.href = 'login.html';
  });

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });

  try {
    const settings = await Api.get('settings.php', { group: 'general' });
    const currencyMap = { PKR: 'Rs ', USD: '$', EUR: '€', GBP: '£', INR: '₹' };
    CURRENCY_SYMBOL = currencyMap[settings.data.currency] || (settings.data.currency ? settings.data.currency + ' ' : 'Rs ');
    document.getElementById('sidebarSiteName').textContent = settings.data.site_name || 'Spectrum Creations';
  } catch (e) { /* non-fatal */ }

  refreshUnreadBadge();
  setInterval(refreshUnreadBadge, 60000);

  window.addEventListener('hashchange', route);
  route();
}

async function refreshUnreadBadge() {
  try {
    const res = await Api.get('notifications.php', { unread: 1, per_page: 1 });
    document.querySelectorAll('[data-unread-badge]').forEach(badge => {
      if (res.unread_count > 0) { badge.style.display = ''; badge.textContent = res.unread_count; }
      else badge.style.display = 'none';
    });
  } catch (e) { /* ignore */ }
}

async function route() {
  const key = (location.hash || '#dashboard').slice(1);
  renderSidebar(key);
  document.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.remove('open');
  }));

  const navItem = NAV.flatMap(g => g.items).find(i => i.key === key);
  document.getElementById('topbarTitle').textContent = navItem ? navItem.label : 'Dashboard';

  const content = document.getElementById('content');
  const renderer = PAGE_REGISTRY[key];
  if (!renderer) {
    content.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>Page not found</div></div>`;
    return;
  }
  if (navItem && navItem.minRole && (ROLE_RANK[CURRENT_ADMIN.role] || 0) < ROLE_RANK[navItem.minRole]) {
    content.innerHTML = `<div class="table-empty">${icon('shield', 34)}<div>You don't have permission to view this page</div></div>`;
    return;
  }
  content.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
  try {
    await renderer(content);
  } catch (e) {
    content.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>${escapeHtml(e.message)}</div></div>`;
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);

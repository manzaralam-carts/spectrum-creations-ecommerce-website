/* ============================================================
   Catalog — Products, Categories, Inventory. Products/Categories
   are CrudView instances; Inventory is a focused read+quick-adjust
   view built on top of the products endpoint.
   ============================================================ */

let CATEGORY_OPTIONS_CACHE = null;
async function getCategoryOptions() {
  if (CATEGORY_OPTIONS_CACHE) return CATEGORY_OPTIONS_CACHE;
  try {
    const res = await Api.get('categories.php', { per_page: 100 });
    CATEGORY_OPTIONS_CACHE = res.data.map(c => ({ value: c.id, label: c.name }));
  } catch (e) { CATEGORY_OPTIONS_CACHE = []; }
  return CATEGORY_OPTIONS_CACHE;
}

registerPage('products', async (root) => {
  const catOptions = await getCategoryOptions();
  const view = new CrudView({
    endpoint: 'products_admin.php',
    title: 'Products',
    singular: 'Product',
    description: 'Manage your catalog — pricing, stock, and status.',
    perPage: 10,
    filters: [
      { key: 'status', label: 'Status', options: [
        { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' },
      ]},
      { key: 'category_id', label: 'Category', options: catOptions.map(c => ({ value: c.value, label: c.label })) },
    ],
    bulkActions: [
      { value: 'activate', label: 'Activate' },
      { value: 'archive', label: 'Archive' },
      { value: 'delete', label: 'Delete', danger: true },
    ],
    columns: [
      { key: 'name', label: 'Product', render: (r) => `
        <div class="cell-media">
          <img src="${escapeHtml(r.image || '')}" onerror="this.style.visibility='hidden'" alt="">
          <div><div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">${escapeHtml(r.category_name || 'Uncategorized')}</div></div>
        </div>` },
      { key: 'price', label: 'Price', num: true, sortable: true, render: (r) => fmtMoney(r.price) },
      { key: 'stock', label: 'Stock', num: true, sortable: true, render: (r) => `<span class="${r.stock <= r.low_stock_threshold ? 'pill amber' : ''}">${r.stock}</span>` },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : r.status === 'draft' ? 'gray' : 'red'}">${escapeHtml(r.status)}</span>` },
    ],
    formFields: [
      { name: 'name', label: 'Product name', required: true },
      { name: 'sku', label: 'SKU', hint: 'Optional — internal stock code' },
      { name: 'category_id', label: 'Category', type: 'select', placeholder: 'No category', options: catOptions },
      { name: 'price', label: 'Price', type: 'number', step: '0.01', required: true },
      { name: 'stock', label: 'Stock quantity', type: 'number', default: 0 },
      { name: 'low_stock_threshold', label: 'Low stock alert threshold', type: 'number', default: 5 },
      { name: 'status', label: 'Status', type: 'select', options: [
        { value: 'active', label: 'Active' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' },
      ]},
      { name: 'image', label: 'Image URL', hint: 'Paste a URL, or upload via Media Library and paste the path here' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  });
  view.mount(root);
});

registerPage('categories', async (root) => {
  const view = new CrudView({
    endpoint: 'categories.php',
    title: 'Categories',
    singular: 'Category',
    description: 'Organize products into browsable categories.',
    perPage: 10,
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }],
    bulkActions: [{ value: 'delete', label: 'Delete', danger: true }],
    columns: [
      { key: 'name', label: 'Category', render: (r) => `<div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">/${escapeHtml(r.slug)}</div>` },
      { key: 'product_count', label: 'Products', num: true, render: (r) => r.product_count },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : 'gray'}">${escapeHtml(r.status)}</span>` },
      { key: 'sort_order', label: 'Order', num: true, sortable: true },
    ],
    formFields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'slug', label: 'Slug', hint: 'Leave blank to auto-generate from the name' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'image', label: 'Image URL' },
      { name: 'sort_order', label: 'Sort order', type: 'number', default: 0 },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ],
  });
  view.mount(root);
});

registerPage('inventory', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Inventory</h1><p class="desc">Stock levels across your catalog — adjust quantities directly.</p></div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <div class="search">${icon('search', 14)}<input type="text" placeholder="Search products…" data-q></div>
        <select data-stock-filter>
          <option value="">All stock levels</option>
          <option value="low">Low stock only</option>
        </select>
      </div>
      <div data-table-slot></div>
      <div class="table-footer" data-footer></div>
    </div>`;

  const state = { page: 1, q: '', stock: '' };

  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('products_admin.php', { page: state.page, per_page: 10, q: state.q || undefined, stock: state.stock || undefined, sort: 'stock', dir: 'asc' });
      renderRows(res.data, res.meta);
    } catch (e) {
      slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`;
    }
  }

  function renderRows(rows, meta) {
    const slot = root.querySelector('[data-table-slot]');
    if (!rows.length) { slot.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>No products found</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
    slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th>Product</th><th class="num">Current stock</th><th>Threshold</th><th style="width:220px">Adjust</th>
      </tr></thead><tbody>
      ${rows.map(r => `<tr data-id="${r.id}">
        <td><div class="cell-title">${escapeHtml(r.name)}</div><div class="cell-sub">${escapeHtml(r.sku || '')}</div></td>
        <td class="num"><span class="pill ${r.stock === 0 ? 'red' : r.stock <= r.low_stock_threshold ? 'amber' : 'green'}" data-stock-pill>${r.stock} in stock</span></td>
        <td class="cell-sub">alert below ${r.low_stock_threshold}</td>
        <td>
          <div style="display:flex; gap:6px; align-items:center">
            <button class="btn btn-outline btn-sm" data-adj="-1">−</button>
            <input type="number" class="mono" value="${r.stock}" data-stock-input style="width:70px; padding:6px 8px; border:1px solid var(--border); border-radius:7px; text-align:center">
            <button class="btn btn-outline btn-sm" data-adj="1">+</button>
            <button class="btn btn-primary btn-sm" data-save-stock>Save</button>
          </div>
        </td>
      </tr>`).join('')}
      </tbody></table></div>`;

    slot.querySelectorAll('tr[data-id]').forEach(tr => {
      const id = tr.dataset.id;
      const input = tr.querySelector('[data-stock-input]');
      tr.querySelectorAll('[data-adj]').forEach(b => b.addEventListener('click', () => {
        input.value = Math.max(0, parseInt(input.value || 0, 10) + parseInt(b.dataset.adj, 10));
      }));
      tr.querySelector('[data-save-stock]').addEventListener('click', async (e) => {
        const btn = e.target;
        btn.disabled = true;
        try {
          await Api.put('products_admin.php', { stock: parseInt(input.value, 10) }, { id });
          toast('Stock updated', 'success');
          load();
        } catch (err) { toast(err.message, 'error'); btn.disabled = false; }
      });
    });

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
  root.querySelector('[data-stock-filter]').addEventListener('change', (e) => { state.stock = e.target.value; state.page = 1; load(); });

  load();
});

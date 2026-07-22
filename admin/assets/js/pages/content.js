/* ============================================================
   Content — Reviews (moderation), Wishlist (read-only insights),
   Banners, Blog.
   ============================================================ */

registerPage('reviews', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Reviews</h1><p class="desc">Approve or reject customer reviews before they appear on product pages.</p></div>
    </div>
    <div class="table-wrap">
      <div class="table-toolbar">
        <div class="search">${icon('search', 14)}<input type="text" placeholder="Search reviewer or comment…" data-q></div>
        <select data-status>
          <option value="">Status: All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div class="bulk-bar" data-bulk-bar>
        <span data-bulk-count></span><div class="spacer"></div>
        <button class="btn btn-sm btn-outline" data-bulk="approved">Approve</button>
        <button class="btn btn-sm btn-outline" data-bulk="rejected">Reject</button>
        <button class="btn btn-sm btn-danger" data-bulk="delete">Delete</button>
      </div>
      <div data-table-slot></div>
      <div class="table-footer" data-footer></div>
    </div>`;

  const state = { page: 1, q: '', status: '', selected: new Set() };
  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('reviews.php', { page: state.page, per_page: 10, q: state.q || undefined, status: state.status || undefined });
      state.selected.clear();
      renderRows(res.data, res.meta);
    } catch (e) { slot.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }
  function renderRows(rows, meta) {
    const slot = root.querySelector('[data-table-slot]');
    if (!rows.length) { slot.innerHTML = `<div class="table-empty">${icon('inbox', 34)}<div>No reviews found</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
    slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
        <th style="width:34px"><input type="checkbox" data-select-all></th>
        <th>Product</th><th>Reviewer</th><th>Rating</th><th>Comment</th><th>Status</th><th style="width:100px">Actions</th>
      </tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><input type="checkbox" data-select="${r.id}"></td>
        <td class="cell-title">${escapeHtml(r.product_name || '—')}</td>
        <td>${escapeHtml(r.customer_name)}</td>
        <td>${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</td>
        <td class="cell-sub" style="max-width:260px">${escapeHtml((r.comment || '').slice(0, 90))}${(r.comment || '').length > 90 ? '…' : ''}</td>
        <td><span class="pill ${r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}">${escapeHtml(r.status)}</span></td>
        <td>
          <div style="display:flex; gap:4px">
            <button class="icon-btn" data-approve="${r.id}" title="Approve">${icon('check', 15)}</button>
            <button class="icon-btn" data-del="${r.id}" title="Delete">${icon('trash', 15)}</button>
          </div>
        </td>
      </tr>`).join('')}
      </tbody></table></div>`;

    slot.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', async () => {
      try { await Api.put('reviews.php', { status: 'approved' }, { id: b.dataset.approve }); toast('Review approved', 'success'); load(); }
      catch (e) { toast(e.message, 'error'); }
    }));
    slot.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const ok = await confirmDialog('Delete this review?');
      if (!ok) return;
      try { await Api.del('reviews.php', { id: b.dataset.del }); toast('Review deleted', 'success'); load(); }
      catch (e) { toast(e.message, 'error'); }
    }));
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
  root.querySelectorAll('[data-bulk]').forEach(b => b.addEventListener('click', async () => {
    if (!state.selected.size) return;
    const action = b.dataset.bulk;
    if (action === 'delete') { const ok = await confirmDialog(`Delete ${state.selected.size} reviews?`); if (!ok) return; }
    try { await Api.post('reviews.php', { ids: Array.from(state.selected).map(Number), action }, { bulk: 1 }); toast('Updated', 'success'); load(); }
    catch (e) { toast(e.message, 'error'); }
  }));
  load();
});

registerPage('wishlist', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Wishlist insights</h1><p class="desc">Which products get wishlisted most by storefront visitors.</p></div>
    </div>
    <div class="table-wrap"><div data-table-slot></div><div class="table-footer" data-footer></div></div>`;
  const state = { page: 1 };
  async function load() {
    const slot = root.querySelector('[data-table-slot]');
    slot.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    try {
      const res = await Api.get('wishlist_admin.php', { page: state.page, per_page: 12 });
      if (!res.data.length) { slot.innerHTML = `<div class="table-empty">${icon('heart', 34)}<div>No wishlist activity yet</div></div>`; root.querySelector('[data-footer]').innerHTML = ''; return; }
      slot.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
          <th>Product</th><th class="num">Price</th><th class="num">Stock</th><th class="num">Wishlisted</th>
        </tr></thead><tbody>
        ${res.data.map(r => `<tr>
          <td><div class="cell-media"><img src="${escapeHtml(r.image || '')}" onerror="this.style.visibility='hidden'"><div class="cell-title">${escapeHtml(r.product_name || 'Deleted product')}</div></div></td>
          <td class="num mono">${fmtMoney(r.price)}</td>
          <td class="num">${r.stock ?? '—'}</td>
          <td class="num"><span class="pill teal">${r.wishlist_count}</span></td>
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
  load();
});

registerPage('banners', async (root) => {
  const view = new CrudView({
    endpoint: 'banners.php',
    title: 'Banners',
    singular: 'Banner',
    description: 'Homepage hero and promo slots.',
    perPage: 10,
    filters: [
      { key: 'status', label: 'Status', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
      { key: 'position', label: 'Position', options: [{ value: 'home_hero', label: 'Home hero' }, { value: 'home_strip', label: 'Home strip' }, { value: 'category_top', label: 'Category top' }] },
    ],
    bulkActions: [{ value: 'delete', label: 'Delete', danger: true }],
    columns: [
      { key: 'title', label: 'Banner', render: (r) => `<div class="cell-media"><img src="${escapeHtml(r.image)}" onerror="this.style.visibility='hidden'"><div><div class="cell-title">${escapeHtml(r.title)}</div><div class="cell-sub">${escapeHtml(r.subtitle || '')}</div></div></div>` },
      { key: 'position', label: 'Position', render: (r) => escapeHtml(r.position.replace('_', ' ')) },
      { key: 'sort_order', label: 'Order', num: true, sortable: true },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'active' ? 'green' : 'gray'}">${escapeHtml(r.status)}</span>` },
    ],
    formFields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'subtitle', label: 'Subtitle' },
      { name: 'image', label: 'Image URL', required: true, hint: 'Upload via Media Library and paste the path, or use a full URL' },
      { name: 'link_url', label: 'Link URL' },
      { name: 'position', label: 'Position', type: 'select', options: [{ value: 'home_hero', label: 'Home hero' }, { value: 'home_strip', label: 'Home strip' }, { value: 'category_top', label: 'Category top' }] },
      { name: 'sort_order', label: 'Sort order', type: 'number', default: 0 },
      { name: 'starts_at', label: 'Starts on', type: 'date' },
      { name: 'ends_at', label: 'Ends on', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] },
    ],
  });
  view.mount(root);
});

registerPage('blog', async (root) => {
  const view = new CrudView({
    endpoint: 'blog.php',
    title: 'Blog',
    singular: 'Post',
    description: 'Articles and stories published to the storefront blog.',
    perPage: 10,
    wideForm: true,
    filters: [{ key: 'status', label: 'Status', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] }],
    bulkActions: [{ value: 'delete', label: 'Delete', danger: true }],
    columns: [
      { key: 'title', label: 'Post', render: (r) => `<div class="cell-title">${escapeHtml(r.title)}</div><div class="cell-sub">${escapeHtml(r.excerpt || '')}</div>` },
      { key: 'status', label: 'Status', render: (r) => `<span class="pill ${r.status === 'published' ? 'green' : 'gray'}">${escapeHtml(r.status)}</span>` },
      { key: 'created_at', label: 'Created', sortable: true, render: (r) => fmtDate(r.created_at) },
    ],
    formFields: [
      { name: 'title', label: 'Title', required: true },
      { name: 'slug', label: 'Slug', hint: 'Leave blank to auto-generate from the title' },
      { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2 },
      { name: 'cover_image', label: 'Cover image URL' },
      { name: 'body', label: 'Body', type: 'textarea', rows: 10, required: true },
      { name: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'published', label: 'Published' }] },
    ],
    beforeSubmit: (data) => {
      if (data.status === 'published') data.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
      return data;
    },
  });
  view.mount(root);
});

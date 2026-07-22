/* ============================================================
   Reports — sales / inventory / customer reports with a date
   range filter (sales) and a lightweight CSV export.
   ============================================================ */

registerPage('reports', async (root) => {
  root.innerHTML = `
    <div class="page-head">
      <div><h1>Reports</h1><p class="desc">Sales, inventory, and customer performance.</p></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="sales">Sales</button>
      <button class="tab-btn" data-tab="inventory">Inventory</button>
      <button class="tab-btn" data-tab="customers">Customers</button>
    </div>
    <div id="reportBody"></div>`;

  root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
    root.querySelectorAll('[data-tab]').forEach(x => x.classList.remove('active'));
    b.classList.add('active');
    renderReport(b.dataset.tab);
  }));

  async function renderReport(type) {
    const body = document.getElementById('reportBody');
    body.innerHTML = `<div class="table-empty"><div class="spinner dark" style="margin:0 auto 10px"></div>Loading…</div>`;
    if (type === 'sales') return renderSales(body);
    if (type === 'inventory') return renderInventory(body);
    if (type === 'customers') return renderCustomers(body);
  }

  async function renderSales(body, from, to) {
    try {
      const res = await Api.get('reports.php', { type: 'sales', from, to });
      const d = res.data;
      body.innerHTML = `
        <div class="card card-pad" style="margin-bottom:16px; display:flex; gap:12px; align-items:flex-end; flex-wrap:wrap">
          <div class="field" style="margin:0"><label>From</label><input type="date" id="repFrom" value="${from || ''}"></div>
          <div class="field" style="margin:0"><label>To</label><input type="date" id="repTo" value="${to || ''}"></div>
          <button class="btn btn-outline" id="repApply">Apply</button>
          <button class="btn btn-primary" id="repExport">${icon('download', 15)} Export CSV</button>
        </div>
        <div class="stat-grid">
          <div class="stat-card"><div class="label">Orders</div><div class="value mono">${d.summary.orders}</div></div>
          <div class="stat-card"><div class="label">Revenue</div><div class="value mono">${fmtMoney(d.summary.revenue)}</div></div>
          <div class="stat-card"><div class="label">Avg. order value</div><div class="value mono">${fmtMoney(d.summary.aov)}</div></div>
        </div>
        <div class="grid-2">
          <div class="card card-pad">
            <h3 style="margin-bottom:12px">By status</h3>
            <table class="data-table"><tbody>
              ${d.by_status.map(s => `<tr><td><span class="pill ${STATUS_COLOR[s.status] || 'gray'}">${escapeHtml(s.status)}</span></td><td class="num">${s.count}</td><td class="num mono">${fmtMoney(s.revenue)}</td></tr>`).join('') || '<tr><td class="cell-sub">No data</td></tr>'}
            </tbody></table>
          </div>
          <div class="card card-pad">
            <h3 style="margin-bottom:12px">Top products</h3>
            <table class="data-table"><tbody>
              ${d.top_products.map(p => `<tr><td class="cell-title">${escapeHtml(p.product_name)}</td><td class="num">${p.qty_sold}</td><td class="num mono">${fmtMoney(p.revenue)}</td></tr>`).join('') || '<tr><td class="cell-sub">No data</td></tr>'}
            </tbody></table>
          </div>
        </div>`;
      body.querySelector('#repApply').addEventListener('click', () => {
        renderSales(body, body.querySelector('#repFrom').value, body.querySelector('#repTo').value);
      });
      body.querySelector('#repExport').addEventListener('click', () => {
        const rows = [['Date', 'Orders', 'Revenue'], ...d.by_day.map(r => [r.date, r.orders, r.revenue])];
        downloadCsv('sales-report.csv', rows);
      });
    } catch (e) { body.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }

  async function renderInventory(body) {
    try {
      const res = await Api.get('reports.php', { type: 'inventory' });
      const d = res.data;
      body.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><div class="label">Total units in stock</div><div class="value mono">${d.total_units}</div></div>
          <div class="stat-card warn"><div class="label">Out of stock</div><div class="value mono">${d.out_of_stock_count}</div></div>
          <div class="stat-card"><div class="label">Inventory value</div><div class="value mono">${fmtMoney(d.inventory_value)}</div></div>
        </div>
        <div class="card card-pad">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px">
            <h3>Low stock products</h3>
            <button class="btn btn-outline btn-sm" id="repExport">${icon('download', 14)} Export CSV</button>
          </div>
          <table class="data-table"><thead><tr><th>Product</th><th>SKU</th><th class="num">Stock</th><th class="num">Threshold</th></tr></thead><tbody>
            ${d.low_stock.map(p => `<tr><td class="cell-title">${escapeHtml(p.name)}</td><td class="cell-sub">${escapeHtml(p.sku || '—')}</td><td class="num"><span class="pill ${p.stock === 0 ? 'red' : 'amber'}">${p.stock}</span></td><td class="num">${p.low_stock_threshold}</td></tr>`).join('') || '<tr><td class="cell-sub">Everything is well stocked</td></tr>'}
          </tbody></table>
        </div>`;
      body.querySelector('#repExport').addEventListener('click', () => {
        const rows = [['Product', 'SKU', 'Stock', 'Threshold'], ...d.low_stock.map(p => [p.name, p.sku || '', p.stock, p.low_stock_threshold])];
        downloadCsv('inventory-report.csv', rows);
      });
    } catch (e) { body.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }

  async function renderCustomers(body) {
    try {
      const res = await Api.get('reports.php', { type: 'customers' });
      const d = res.data;
      body.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card"><div class="label">Total customers</div><div class="value mono">${d.total_customers}</div></div>
          <div class="stat-card good"><div class="label">Returning customers</div><div class="value mono">${d.returning_customers}</div></div>
        </div>
        <div class="card card-pad">
          <h3 style="margin-bottom:12px">Top customers</h3>
          <table class="data-table"><thead><tr><th>Customer</th><th class="num">Orders</th><th class="num">Lifetime value</th></tr></thead><tbody>
            ${d.top_customers.map(c => `<tr><td class="cell-title">${escapeHtml(c.customer_name)}<div class="cell-sub">${escapeHtml(c.mobile)}</div></td><td class="num">${c.order_count}</td><td class="num mono">${fmtMoney(c.lifetime_value)}</td></tr>`).join('') || '<tr><td class="cell-sub">No data</td></tr>'}
          </tbody></table>
        </div>`;
    } catch (e) { body.innerHTML = `<div class="table-empty">${escapeHtml(e.message)}</div>`; }
  }

  renderReport('sales');
});

function downloadCsv(filename, rows) {
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* ============================================================
   Dashboard — summary cards, sales trend (sparkline bars drawn
   with inline SVG, no charting library dependency), top products,
   low stock, recent orders.
   ============================================================ */
registerPage('dashboard', async (root) => {
  const res = await Api.get('dashboard.php');
  const d = res.data;
  const c = d.cards;

  root.innerHTML = `
    <div class="page-head">
      <div><h1>Dashboard</h1><p class="desc">Here's how the store is doing.</p></div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">Total revenue</div>
        <div class="value mono">${fmtMoney(c.total_revenue)}</div>
        <div class="delta">${fmtMoney(c.revenue_30d)} in the last 30 days</div>
      </div>
      <div class="stat-card">
        <div class="label">Orders</div>
        <div class="value mono">${c.order_count}</div>
        <div class="delta">${c.pending_orders} pending</div>
      </div>
      <div class="stat-card">
        <div class="label">Products</div>
        <div class="value mono">${c.product_count}</div>
        <div class="delta">${c.low_stock_count} low on stock</div>
      </div>
      <div class="stat-card ${c.low_stock_count > 0 ? 'warn' : 'good'}">
        <div class="label">Customers</div>
        <div class="value mono">${c.customer_count}</div>
        <div class="delta">by distinct phone number</div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Sales — last 14 days</h3>
        <div id="salesTrend"></div>
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Order status</h3>
        <div id="statusBreakdown"></div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:16px">
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Top products</h3>
        <div id="topProducts"></div>
      </div>
      <div class="card card-pad">
        <h3 style="margin-bottom:14px">Low stock</h3>
        <div id="lowStock"></div>
      </div>
    </div>

    <div class="card card-pad" style="margin-top:16px">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px">
        <h3>Recent orders</h3>
        <a href="#orders" class="btn btn-outline btn-sm">View all</a>
      </div>
      <div id="recentOrders"></div>
    </div>
  `;

  renderTrend(document.getElementById('salesTrend'), d.trend);
  renderStatusBreakdown(document.getElementById('statusBreakdown'), d.status_breakdown);
  renderTopProducts(document.getElementById('topProducts'), d.top_products);
  renderLowStock(document.getElementById('lowStock'), d.low_stock);
  renderRecentOrders(document.getElementById('recentOrders'), d.recent_orders);
});

function renderTrend(el, trend) {
  if (!trend.length) { el.innerHTML = '<div class="table-empty" style="padding:20px">No sales yet</div>'; return; }
  const max = Math.max(1, ...trend.map(t => t.total));
  const w = 600, h = 140, barW = w / trend.length;
  const bars = trend.map((t, i) => {
    const bh = Math.max(2, (t.total / max) * (h - 24));
    const x = i * barW + barW * 0.18;
    const bw = barW * 0.64;
    const y = h - bh - 20;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${t.total > 0 ? 'var(--teal)' : 'var(--border)'}">
      <title>${t.date}: ${fmtMoney(t.total)} (${t.orders} orders)</title>
    </rect>`;
  }).join('');
  const labels = trend.filter((_, i) => i % 3 === 0).map((t, idx) => {
    const i = idx * 3;
    const x = i * barW + barW / 2;
    return `<text x="${x.toFixed(1)}" y="${h - 4}" font-size="9" fill="var(--text-faint)" text-anchor="middle" font-family="JetBrains Mono, monospace">${t.date.slice(5)}</text>`;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" style="overflow:visible">${bars}${labels}</svg>`;
}

function renderStatusBreakdown(el, rows) {
  if (!rows.length) { el.innerHTML = '<div class="table-empty" style="padding:20px">No orders yet</div>'; return; }
  const colors = { pending: 'amber', confirmed: 'teal', shipped: 'teal', delivered: 'green', cancelled: 'red' };
  const total = rows.reduce((a, r) => a + Number(r.count), 0);
  el.innerHTML = rows.map(r => {
    const pct = total ? Math.round((r.count / total) * 100) : 0;
    return `<div style="margin-bottom:10px">
      <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px">
        <span class="pill ${colors[r.status] || 'gray'}">${escapeHtml(r.status)}</span>
        <span class="mono">${r.count} · ${pct}%</span>
      </div>
      <div style="background:var(--canvas); border-radius:6px; height:6px; overflow:hidden">
        <div style="width:${pct}%; height:100%; background:var(--teal)"></div>
      </div>
    </div>`;
  }).join('');
}

function renderTopProducts(el, rows) {
  if (!rows.length) { el.innerHTML = '<div class="table-empty" style="padding:20px">No sales yet</div>'; return; }
  el.innerHTML = `<table class="data-table"><tbody>
    ${rows.map(r => `<tr>
      <td><div class="cell-title">${escapeHtml(r.product_name)}</div><div class="cell-sub">${r.qty_sold} sold</div></td>
      <td class="num mono">${fmtMoney(r.revenue)}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderLowStock(el, rows) {
  if (!rows.length) { el.innerHTML = '<div class="table-empty" style="padding:20px">Everything is well stocked</div>'; return; }
  el.innerHTML = `<table class="data-table"><tbody>
    ${rows.map(r => `<tr>
      <td class="cell-title">${escapeHtml(r.name)}</td>
      <td class="num"><span class="pill ${r.stock === 0 ? 'red' : 'amber'}">${r.stock} left</span></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function renderRecentOrders(el, rows) {
  if (!rows.length) { el.innerHTML = '<div class="table-empty" style="padding:20px">No orders yet</div>'; return; }
  const colors = { pending: 'amber', confirmed: 'teal', shipped: 'teal', delivered: 'green', cancelled: 'red' };
  el.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr>
      <th>Order</th><th>Customer</th><th class="num">Total</th><th>Status</th><th>Date</th>
    </tr></thead><tbody>
    ${rows.map(r => `<tr>
      <td class="mono">${escapeHtml(r.order_no)}</td>
      <td>${escapeHtml(r.customer_name)}</td>
      <td class="num mono">${fmtMoney(r.total)}</td>
      <td><span class="pill ${colors[r.status] || 'gray'}">${escapeHtml(r.status)}</span></td>
      <td class="cell-sub">${fmtDate(r.created_at)}</td>
    </tr>`).join('')}
  </tbody></table></div>`;
}

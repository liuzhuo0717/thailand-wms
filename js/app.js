// ============================================================
// app.js – Main application logic
// ============================================================

// ---- State ----
let currentPage = 'dashboard';
let currentModal = null;
let tableState = {}; // { page: { sortCol, sortDir, search, filterType, filterPart, page: num } }

// ---- Utilities ----
function $(sel, ctx) { return (ctx || document).querySelector(sel); }
function $$(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function debounce(fn, delay) { let timer; return function(...args) { clearTimeout(timer); timer = setTimeout(() => fn.apply(this, args), delay); }; }

function toast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast toast-' + (type || 'success');
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

function formatMoney(n) {
  if (!n && n !== 0) return '-';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function tableToCSV(tableEl) {
  const rows = [];
  $$('.tbl-header .tbl-cell', tableEl).forEach(c => rows.push('"' + c.textContent.replace(/"/g, '""') + '"'));
  let headerDone = false;
  $$('.tbl-body .tbl-row', tableEl).forEach(row => {
    if (!headerDone) { rows.push(rows.pop()); headerDone = true; } // already have header
    const cells = [];
    $$('.tbl-cell', row).forEach(c => cells.push('"' + c.textContent.replace(/"/g, '""') + '"'));
    rows.push(cells.join(','));
  });
  // actually let's redo
  const allRows = [];
  const headerCells = [];
  $$('.tbl-header .tbl-cell', tableEl).forEach(c => headerCells.push(c.textContent.trim()));
  allRows.push(headerCells.map(c => '"' + c.replace(/"/g, '""') + '"').join(','));
  $$('.tbl-body .tbl-row', tableEl).forEach(row => {
    const cells = [];
    $$('.tbl-cell', row).forEach(c => cells.push(c.textContent.trim()));
    allRows.push(cells.map(c => '"' + c.replace(/"/g, '""') + '"').join(','));
  });
  return allRows.join('\n');
}

function badge(status) {
  const map = { DONE: 'badge-done', PENDING: 'badge-pending', APPROVED: 'badge-approved', REJECTED: 'badge-rejected', '-': 'badge-neutral' };
  return '<span class="badge ' + (map[status] || 'badge-neutral') + '">' + esc(status || '-') + '</span>';
}

function getTableState(page) {
  if (!tableState[page]) tableState[page] = { sortCol: null, sortDir: 'asc', search: '', filterType: '', filterPart: '', curPage: 1 };
  return tableState[page];
}

function paginate(arr, page, perPage) {
  perPage = perPage || 20;
  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const cur = Math.max(1, Math.min(page, totalPages));
  return { items: arr.slice((cur - 1) * perPage, cur * perPage), total, totalPages, curPage: cur };
}

function sortArray(arr, col, dir) {
  if (!col) return arr;
  return [...arr].sort((a, b) => {
    let va = a[col] ?? '', vb = b[col] ?? '';
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    va = String(va).toLowerCase(); vb = String(vb).toLowerCase();
    return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });
}

// ---- Modal ----
function showModal(title, content, onOK, okText) {
  const overlay = document.getElementById('modal-overlay');
  overlay.innerHTML = '<div class="modal"><div class="modal-header"><h3>' + esc(title) + '</h3><button class="modal-close" onclick="closeModal()">&times;</button></div><div class="modal-body">' + content + '</div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>' + (onOK ? '<button class="btn btn-primary" id="modal-ok-btn">' + esc(okText || 'Save') + '</button>' : '') + '</div></div>';
  overlay.classList.add('show');
  if (onOK) document.getElementById('modal-ok-btn').onclick = () => { onOK(); closeModal(); };
}
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
}

// ---- Navigation ----
function navigate(page) {
  currentPage = page;
  renderSidebar();
  renderPage();
}

function renderSidebar() {
  const isAdmin = Auth.isAdmin();
  const region = Auth.getRegion();
  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'inventory', label: 'Total Inventory', icon: '📦' },
    { id: 'inbound', label: 'Inbound Management', icon: '📥' },
    { id: 'requests', label: 'Material Requests', icon: '📋', adminOnly: false },
    { divider: true, label: 'Regions' },
    ...REGIONS.map(r => ({ id: 'region-' + r, label: r, icon: '📍', regionOnly: r })),
    { divider: true, label: 'Channels' },
    { id: 'xiaomi-store', label: 'Xiaomi Store & New Retail', icon: '🏬' },
    { id: 'aiot', label: 'AIOT', icon: '🤖' },
    { id: 'office', label: 'Office', icon: '🏢' },
    { id: 'inv-check', label: 'Inventory Check', icon: '✅' },
  ];

  let html = '<div class="sidebar-header"><div class="sidebar-logo">🦞</div><div class="sidebar-title">WMS Thailand</div></div>';
  html += '<div class="sidebar-user"><div class="user-avatar">' + (isAdmin ? 'A' : 'R') + '</div><div class="user-info"><div class="user-name">' + esc(Auth.getSession().displayName) + '</div><div class="user-role">' + (isAdmin ? 'Admin' : 'RRM — ' + region) + '</div></div></div>';
  html += '<nav class="sidebar-nav">';
  nav.forEach(item => {
    if (item.divider) { html += '<div class="nav-divider">' + esc(item.label) + '</div>'; return; }
    // RRM users can only see their own region + dashboard + requests + inventory (view)
    if (!isAdmin && item.regionOnly && item.regionOnly !== region) return;
    const active = currentPage === item.id ? ' active' : '';
    html += '<a class="nav-item' + active + '" onclick="navigate(\'' + item.id + '\')"><span class="nav-icon">' + item.icon + '</span><span class="nav-label">' + esc(item.label) + '</span></a>';
  });
  html += '</nav>';
  html += '<div class="sidebar-footer"><button class="btn btn-secondary btn-block" onclick="Auth.logout();location.reload()">Logout</button></div>';
  document.getElementById('sidebar').innerHTML = html;
}

// ---- Page Router ----
function renderPage() {
  const main = document.getElementById('main-content');
  switch (currentPage) {
    case 'dashboard': renderDashboard(main); break;
    case 'inventory': renderInventory(main); break;
    case 'inbound': renderInbound(main); break;
    case 'requests': renderRequests(main); break;
    case 'xiaomi-store': renderXiaomiStore(main); break;
    case 'aiot': renderAiot(main); break;
    case 'office': renderOffice(main); break;
    case 'inv-check': renderInvCheck(main); break;
    default:
      if (currentPage.startsWith('region-')) {
        renderRegionPage(main, currentPage.replace('region-', ''));
      } else {
        main.innerHTML = '<p>Page not found.</p>';
      }
  }
}

// ============================
// DASHBOARD
// ============================
function renderDashboard(el) {
  const inv = getStore(DB.INVENTORY);
  const reqs = getStore(DB.REQUESTS);
  const totalItems = inv.length;
  const totalGood = inv.reduce((s, i) => s + (i.goodInv || 0), 0);
  const totalDamaged = inv.reduce((s, i) => s + (i.damagedInv || 0), 0);
  const pendingReqs = reqs.filter(r => r.status === 'PENDING').length;
  const totalValue = inv.reduce((s, i) => s + ((i.costUnit || 0) * (i.goodInv || 0)), 0);

  let html = '<div class="page-header"><h1>Dashboard</h1><button class="btn btn-outline" onclick="exportDashboardCSV()">Export Summary</button></div>';
  // KPI cards
  html += '<div class="kpi-grid">';
  html += kpiCard('Total Items', totalItems, '📦');
  html += kpiCard('Good Stock', totalGood.toLocaleString(), '✅');
  html += kpiCard('Damaged Stock', totalDamaged.toLocaleString(), '⚠️');
  html += kpiCard('Pending Requests', pendingReqs, '📋');
  html += kpiCard('Total Inventory Value', formatMoney(totalValue) + ' THB', '💰');
  html += '</div>';

  // Recent inbound
  const inbound = getStore(DB.INBOUND).sort((a, b) => b.incomingDate.localeCompare(a.incomingDate));
  html += '<div class="section"><h2>Recent Inbound</h2>';
  html += buildTable('dash-inbound', ['Inbound No.', 'Material Code', 'Description', 'Qty', 'Incoming Date', 'PO Number'],
    inbound.slice(0, 10).map(r => [r.inboundNo, r.materialCode, r.description, r.qty, r.incomingDate, r.poNumber]));
  html += '</div>';

  // Pending requests
  const pending = reqs.filter(r => r.status === 'PENDING').sort((a, b) => b.requestedDate.localeCompare(a.requestedDate));
  html += '<div class="section"><h2>Pending Requests</h2>';
  html += buildTable('dash-requests', ['Request ID', 'Date', 'Region', 'Channel', 'Shop Name', 'Item', 'Qty', 'Status'],
    pending.slice(0, 10).map(r => [r.requestId, r.requestedDate, r.region, r.channelName, r.shopName, r.itemName, r.qty, badge(r.status)]), true);
  html += '</div>';
  el.innerHTML = html;
}

function kpiCard(label, value, icon) {
  return '<div class="kpi-card"><div class="kpi-icon">' + icon + '</div><div class="kpi-value">' + value + '</div><div class="kpi-label">' + esc(label) + '</div></div>';
}

function buildTable(id, headers, rows, isHTML) {
  let html = '<div class="table-wrap" id="tbl-' + id + '"><div class="tbl-header tbl-row">' + headers.map(h => '<div class="tbl-cell">' + esc(h) + '</div>').join('') + '</div><div class="tbl-body">';
  if (rows.length === 0) {
    html += '<div class="tbl-row tbl-empty"><div class="tbl-cell" style="text-align:center;grid-column:1/-1">No data</div></div>';
  } else {
    rows.forEach(r => {
      html += '<div class="tbl-row">' + r.map((c, i) => '<div class="tbl-cell" data-col="' + i + '">' + (isHTML ? c : esc(String(c ?? '-'))) + '</div>').join('') + '</div>';
    });
  }
  html += '</div></div>';
  return html;
}

function exportDashboardCSV() {
  const inv = getStore(DB.INVENTORY);
  let csv = 'Material Code,Code,Description,Nick Name,Type,Part,Good Inventory,Damaged Inventory,Package Type,Cost/unit (Ex.Vat),Total Value,Days in Warehouse\n';
  inv.forEach(i => {
    csv += [i.materialCode, i.code, i.description, i.nickName, i.type, i.part, i.goodInv, i.damagedInv, i.packageType, i.costUnit, (i.costUnit || 0) * (i.goodInv || 0), daysBetween(i.incomingDate)].map(c => '"' + String(c ?? '') + '"').join(',') + '\n';
  });
  downloadCSV('wms_inventory_' + today() + '.csv', csv);
}

// ============================
// TOTAL INVENTORY
// ============================
function renderInventory(el) {
  const st = getTableState('inventory');
  let data = getStore(DB.INVENTORY);
  // search
  if (st.search) {
    const q = st.search.toLowerCase();
    data = data.filter(i => [i.materialCode, i.code, i.description, i.nickName, i.type, i.part].some(f => String(f).toLowerCase().includes(q)));
  }
  if (st.filterType) data = data.filter(i => i.type === st.filterType);
  if (st.filterPart) data = data.filter(i => i.part === st.filterPart);
  // sort
  data = sortArray(data, st.sortCol, st.sortDir);
  const pg = paginate(data, st.curPage);

  const types = [...new Set(getStore(DB.INVENTORY).map(i => i.type))].sort();
  const parts = [...new Set(getStore(DB.INVENTORY).map(i => i.part))].sort();

  let html = '<div class="page-header"><h1>Total Inventory</h1><div class="header-actions"><button class="btn btn-outline" onclick="exportInventoryCSV()">Export CSV</button>' + (Auth.isAdmin() ? '<button class="btn btn-primary" onclick="showAddInventory()">+ Add Item</button>' : '') + '</div></div>';
  // Filters
  html += '<div class="filter-bar"><input class="input" id="inv-search" placeholder="Search..." value="' + esc(st.search) + '">';
  html += '<select class="input" id="inv-filter-type" onchange="onInvFilterType(this.value)"><option value="">All Types</option>' + types.map(t => '<option value="' + esc(t) + '"' + (st.filterType === t ? ' selected' : '') + '>' + esc(t) + '</option>').join('') + '</select>';
  html += '<select class="input" id="inv-filter-part" onchange="onInvFilterPart(this.value)"><option value="">All Parts</option>' + parts.map(p => '<option value="' + esc(p) + '"' + (st.filterPart === p ? ' selected' : '') + '>' + esc(p) + '</option>').join('') + '</select>';
  html += '<span class="filter-count">' + data.length + ' items</span></div>';
  // Table
  const cols = [
    { key: 'materialCode', label: 'Material Code' }, { key: 'code', label: 'Code' },
    { key: 'description', label: 'Description' }, { key: 'nickName', label: 'Nick Name' },
    { key: 'type', label: 'Type' }, { key: 'part', label: 'Part' },
    { key: 'goodInv', label: 'Good inventory' }, { key: 'damagedInv', label: 'Damaged inventory' },
    { key: 'packageType', label: 'Package type' },
    { key: 'costUnit', label: 'Cost/unit (Ex.Vat)' }, { key: 'totalValue', label: 'Total value' },
    { key: 'daysInWH', label: 'Days in Warehouse' },
  ];
  if (Auth.isAdmin()) cols.push({ key: '_actions', label: 'Actions' });

  html += '<div class="table-wrap" id="tbl-inventory"><div class="tbl-header tbl-row">';
  cols.forEach(c => {
    const sortable = c.key !== '_actions';
    const sorted = st.sortCol === c.key ? ' sorted-' + st.sortDir : '';
    html += '<div class="tbl-cell' + sorted + (sortable ? ' sortable' : '') + '"' + (sortable ? ' onclick="onInvSort(\'' + c.key + '\')"' : '') + '>' + esc(c.label) + (st.sortCol === c.key ? (st.sortDir === 'asc' ? ' ↑' : ' ↓') : '') + '</div>';
  });
  html += '</div><div class="tbl-body">';
  if (pg.items.length === 0) {
    html += '<div class="tbl-row tbl-empty"><div class="tbl-cell" style="text-align:center;grid-column:1/-1">No items found</div></div>';
  }
  pg.items.forEach(item => {
    const totalVal = (item.costUnit || 0) * (item.goodInv || 0);
    const days = daysBetween(item.incomingDate);
    const vals = [item.materialCode, item.code, item.description, item.nickName, item.type, item.part, item.goodInv, item.damagedInv, item.packageType, formatMoney(item.costUnit), formatMoney(totalVal), days];
    html += '<div class="tbl-row">';
    vals.forEach((v, i) => html += '<div class="tbl-cell" data-col="' + i + '">' + esc(String(v ?? '-')) + '</div>');
    if (Auth.isAdmin()) {
      html += '<div class="tbl-cell"><button class="btn btn-sm btn-outline" onclick=\'showEditInventory("' + item.materialCode + '")\'>Edit</button> <button class="btn btn-sm btn-danger" onclick=\'deleteInventoryItem("' + item.materialCode + '")\'>Del</button></div>';
    }
    html += '</div>';
  });
  html += '</div></div>';
  // Pagination
  html += renderPagination('inventory', pg);
  el.innerHTML = html;
  // Attach debounced search listener
  const searchEl = document.getElementById('inv-search');
  if (searchEl) searchEl.addEventListener('input', debounce(e => { getTableState('inventory').search = e.target.value; getTableState('inventory').curPage = 1; renderPage(); }, 300));
}

function onInvSearch(v) { getTableState('inventory').search = v; getTableState('inventory').curPage = 1; renderPage(); }
function onInvFilterType(v) { getTableState('inventory').filterType = v; getTableState('inventory').curPage = 1; renderPage(); }
function onInvFilterPart(v) { getTableState('inventory').filterPart = v; getTableState('inventory').curPage = 1; renderPage(); }
function onInvSort(col) {
  const st = getTableState('inventory');
  if (st.sortCol === col) { st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc'; }
  else { st.sortCol = col; st.sortDir = 'asc'; }
  renderPage();
}

function showAddInventory() {
  const form = inventoryForm();
  showModal('Add Inventory Item', form, () => saveInventoryItem(null));
}

function showEditInventory(mc) {
  const item = getStore(DB.INVENTORY).find(i => i.materialCode === mc);
  if (!item) return;
  const form = inventoryForm(item);
  showModal('Edit Inventory Item', form, () => saveInventoryItem(mc));
}

function inventoryForm(item) {
  item = item || {};
  return '<div class="form-grid">' +
    formField('Material Code', 'inv-materialCode', item.materialCode || '', !item.materialCode) +
    formField('Code', 'inv-code', item.code || '') +
    formField('Description', 'inv-description', item.description || '') +
    formField('Nick Name', 'inv-nickName', item.nickName || '-') +
    formSelect('Type', 'inv-type', ['POSM', 'Event', 'Free gift', 'Furniture', 'Props', 'Security', 'Display Tray'], item.type) +
    formSelect('Part', 'inv-part', ['Phone', 'AIOT', 'Shop con', 'POSM General'], item.part) +
    formField('Good Inventory', 'inv-goodInv', item.goodInv ?? 0, false, 'number') +
    formField('Damaged Inventory', 'inv-damagedInv', item.damagedInv ?? 0, false, 'number') +
    formField('Package Type', 'inv-packageType', item.packageType || 'PCS') +
    formField('Incoming Date', 'inv-incomingDate', item.incomingDate || today(), false, 'date') +
    formField('Cost/unit (Ex.Vat)', 'inv-costUnit', item.costUnit ?? 0, false, 'number') +
    formField('Dimension W', 'inv-dimW', item.dimW ?? '', false, 'number') +
    formField('Dimension L', 'inv-dimL', item.dimL ?? '', false, 'number') +
    formField('Dimension H', 'inv-dimH', item.dimH ?? '', false, 'number') +
    formField('Weight/PCS/KG', 'inv-weightPcs', item.weightPcs ?? '', false, 'number') +
    '</div>';
}

function formField(label, id, value, required, type) {
  return '<div class="form-group"><label>' + esc(label) + (required ? ' *' : '') + '</label><input class="input" id="' + id + '" type="' + (type || 'text') + '" value="' + esc(String(value ?? '')) + '"' + (required ? ' required' : '') + '></div>';
}
function formSelect(label, id, options, value) {
  return '<div class="form-group"><label>' + esc(label) + '</label><select class="input" id="' + id + '">' + options.map(o => '<option value="' + esc(o) + '"' + (value === o ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
}
function formTextarea(label, id, value) {
  return '<div class="form-group"><label>' + esc(label) + '</label><textarea class="input" id="' + id + '">' + esc(value || '') + '</textarea></div>';
}

function getVal(id) { return document.getElementById(id)?.value?.trim() || ''; }

function saveInventoryItem(editMC) {
  const mc = getVal('inv-materialCode');
  if (!mc) { toast('Material Code is required', 'error'); return false; }
  let items = getStore(DB.INVENTORY);
  const obj = {
    materialCode: mc, code: getVal('inv-code'), description: getVal('inv-description'),
    nickName: getVal('inv-nickName') || '-', type: getVal('inv-type'), part: getVal('inv-part'),
    goodInv: parseInt(getVal('inv-goodInv')) || 0, damagedInv: parseInt(getVal('inv-damagedInv')) || 0,
    packageType: getVal('inv-packageType') || 'PCS', incomingDate: getVal('inv-incomingDate'),
    costUnit: parseFloat(getVal('inv-costUnit')) || 0,
    dimW: parseFloat(getVal('inv-dimW')) || 0, dimL: parseFloat(getVal('inv-dimL')) || 0,
    dimH: parseFloat(getVal('inv-dimH')) || 0, weightPcs: parseFloat(getVal('inv-weightPcs')) || 0,
  };
  if (editMC) {
    items = items.map(i => i.materialCode === editMC ? { ...i, ...obj } : i);
  } else {
    if (items.some(i => i.materialCode === mc)) { toast('Material Code already exists', 'error'); return false; }
    items.push(obj);
  }
  setStore(DB.INVENTORY, items);
  toast(editMC ? 'Item updated' : 'Item added');
  renderPage();
  return true;
}

function deleteInventoryItem(mc) {
  if (!confirm('Delete item ' + mc + '?')) return;
  setStore(DB.INVENTORY, getStore(DB.INVENTORY).filter(i => i.materialCode !== mc));
  toast('Item deleted');
  renderPage();
}

function exportInventoryCSV() {
  const inv = getStore(DB.INVENTORY);
  let csv = 'Material Code,Code,Description,Nick Name,Type,Part,Good Inventory,Damaged Inventory,Package Type,Incoming Date,Cost/unit (Ex.Vat),Total Value,Days in Warehouse\n';
  inv.forEach(i => {
    csv += [i.materialCode, i.code, i.description, i.nickName, i.type, i.part, i.goodInv, i.damagedInv, i.packageType, i.incomingDate, i.costUnit, (i.costUnit || 0) * (i.goodInv || 0), daysBetween(i.incomingDate)].map(c => '"' + String(c ?? '') + '"').join(',') + '\n';
  });
  downloadCSV('inventory_' + today() + '.csv', csv);
}

// ============================
// INBOUND MANAGEMENT
// ============================
function renderInbound(el) {
  const st = getTableState('inbound');
  let data = getStore(DB.INBOUND).sort((a, b) => b.incomingDate.localeCompare(a.incomingDate));
  if (st.search) {
    const q = st.search.toLowerCase();
    data = data.filter(r => [r.inboundNo, r.materialCode, r.description, r.poNumber].some(f => String(f).toLowerCase().includes(q)));
  }
  data = sortArray(data, st.sortCol, st.sortDir);
  const pg = paginate(data, st.curPage);

  const cols = [
    { key: 'inboundNo', label: 'Inbound No.' }, { key: 'materialCode', label: 'Material Code' },
    { key: 'description', label: 'Description' }, { key: 'qty', label: 'Qty' },
    { key: 'incomingDate', label: 'Incoming Date' }, { key: 'poNumber', label: 'PO Number' },
  ];
  if (Auth.isAdmin()) cols.push({ key: '_actions', label: 'Actions' });

  let html = '<div class="page-header"><h1>Inbound Management</h1><div class="header-actions"><button class="btn btn-outline" onclick="exportInboundCSV()">Export CSV</button>' + (Auth.isAdmin() ? '<button class="btn btn-primary" onclick="showAddInbound()">+ Add Inbound</button>' : '') + '</div></div>';
  html += '<div class="filter-bar"><input class="input" id="inbound-search" placeholder="Search..." value="' + esc(st.search) + '"><span class="filter-count">' + data.length + ' records</span></div>';
  html += buildSortableTable('inbound', cols, pg, 'onInboundSort');
  // Build rows
  pg.items.forEach(r => {
    html += '<div class="tbl-row">';
    [r.inboundNo, r.materialCode, r.description, r.qty, r.incomingDate, r.poNumber].forEach(v => html += '<div class="tbl-cell">' + esc(String(v ?? '-')) + '</div>');
    if (Auth.isAdmin()) html += '<div class="tbl-cell"><button class="btn btn-sm btn-danger" onclick=\'deleteInbound("' + r.inboundNo + '")\'>Del</button></div>';
    html += '</div>';
  });
  html += closeSortableTable();
  html += renderPagination('inbound', pg);
  el.innerHTML = html;
  // Attach debounced search listener
  const searchEl = document.getElementById('inbound-search');
  if (searchEl) searchEl.addEventListener('input', debounce(e => { getTableState('inbound').search = e.target.value; getTableState('inbound').curPage = 1; renderPage(); }, 300));
}

function deleteInbound(id) {
  if (!confirm('Delete inbound record?')) return;
  setStore(DB.INBOUND, getStore(DB.INBOUND).filter(r => r.inboundNo !== id));
  toast('Inbound deleted');
  renderPage();
}

function onInboundSearch(v) { getTableState('inbound').search = v; getTableState('inbound').curPage = 1; renderPage(); }
function onInboundSort(col) {
  const st = getTableState('inbound');
  if (st.sortCol === col) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
  else { st.sortCol = col; st.sortDir = 'asc'; }
  renderPage();
}

function showAddInbound() {
  const inv = getStore(DB.INVENTORY);
  const matOptions = inv.map(i => i.materialCode + ' — ' + i.description);
  const form = '<div class="form-grid">' +
    formField('Inbound No.', 'ib-inboundNo', genId('IB')) +
    '<div class="form-group"><label>Material Code *</label><select class="input" id="ib-materialCode">' + inv.map(i => '<option value="' + esc(i.materialCode) + '">' + esc(i.materialCode) + ' — ' + esc(i.description) + '</option>').join('') + '</select></div>' +
    formField('Qty', 'ib-qty', '', false, 'number') +
    formField('Incoming Date', 'ib-incomingDate', today(), false, 'date') +
    formField('PO Number', 'ib-poNumber', '') +
    '</div>';
  showModal('Add Inbound Record', form, () => saveInbound());
}

function saveInbound() {
  const mc = getVal('ib-materialCode');
  const qty = parseInt(getVal('ib-qty')) || 0;
  if (!mc || qty <= 0) { toast('Material Code and valid Qty required', 'error'); return false; }
  const inbound = getStore(DB.INBOUND);
  inbound.push({
    inboundNo: getVal('ib-inboundNo') || genId('IB'),
    materialCode: mc,
    description: getStore(DB.INVENTORY).find(i => i.materialCode === mc)?.description || '',
    qty, incomingDate: getVal('ib-incomingDate'), poNumber: getVal('ib-poNumber'),
  });
  setStore(DB.INBOUND, inbound);
  // Auto-update Good inventory
  const inv = getStore(DB.INVENTORY);
  const idx = inv.findIndex(i => i.materialCode === mc);
  if (idx >= 0) { inv[idx].goodInv = (inv[idx].goodInv || 0) + qty; }
  setStore(DB.INVENTORY, inv);
  toast('Inbound recorded, inventory updated');
  renderPage();
  return true;
}

function exportInboundCSV() {
  const data = getStore(DB.INBOUND);
  let csv = 'Inbound No.,Material Code,Description,Qty,Incoming Date,PO Number\n';
  data.forEach(r => { csv += [r.inboundNo, r.materialCode, r.description, r.qty, r.incomingDate, r.poNumber].map(c => '"' + String(c ?? '') + '"').join(',') + '\n'; });
  downloadCSV('inbound_' + today() + '.csv', csv);
}

// ============================
// MATERIAL REQUESTS
// ============================
function renderRequests(el) {
  const st = getTableState('requests');
  let data = getStore(DB.REQUESTS);
  // RRM users only see their region
  if (Auth.isRRM()) data = data.filter(r => r.region === Auth.getRegion());
  if (st.search) {
    const q = st.search.toLowerCase();
    data = data.filter(r => [r.requestId, r.region, r.channelName, r.shopName, r.itemName, r.rmName, r.receiverName, r.code].some(f => String(f).toLowerCase().includes(q)));
  }
  if (st.filterStatus) data = data.filter(r => r.status === st.filterStatus);
  if (st.filterRegion) data = data.filter(r => r.region === st.filterRegion);
  if (st.filterDateFrom) data = data.filter(r => r.requestedDate >= st.filterDateFrom);
  if (st.filterDateTo) data = data.filter(r => r.requestedDate <= st.filterDateTo);
  data = sortArray(data, st.sortCol, st.sortDir);
  const pg = paginate(data, st.curPage);

  // Count by status for tabs
  const allData = Auth.isRRM() ? getStore(DB.REQUESTS).filter(r => r.region === Auth.getRegion()) : getStore(DB.REQUESTS);
  const counts = { ALL: allData.length, PENDING: 0, APPROVED: 0, DONE: 0, REJECTED: 0 };
  allData.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  const cols = [
    { key: 'requestId', label: 'Request ID' }, { key: 'requestedDate', label: 'Requested date' },
    { key: 'region', label: 'Region' }, { key: 'channelName', label: 'Channel Name' },
    { key: 'shopCode', label: 'Shop Code' }, { key: 'shopName', label: 'Shop Name' },
    { key: 'province', label: 'Province' }, { key: 'shoppingMall', label: 'Shopping Mall' },
    { key: 'rmName', label: 'RM Name' }, { key: 'receiverName', label: 'Receiver NAME' },
    { key: 'contactNumber', label: 'Contact number' }, { key: 'code', label: 'Code' },
    { key: 'itemName', label: 'Item Name' }, { key: 'qty', label: 'Qty' },
    { key: 'support', label: 'Support' }, { key: 'part', label: 'Part' },
    { key: 'aiotApproval', label: 'AIOT Approval' }, { key: 'retailApproval', label: 'Retail Approval' },
    { key: 'shopConApproval', label: 'Shop con Approval' }, { key: 'status', label: 'Status' },
  ];
  if (Auth.isAdmin()) cols.push({ key: '_actions', label: 'Actions' });

  let html = '<div class="page-header"><h1>Material Requests</h1><div class="header-actions"><button class="btn btn-outline" onclick="exportRequestsCSV()">Export CSV</button><button class="btn btn-primary" onclick="showAddRequest()">+ New Request</button></div></div>';

  // Status tabs
  const activeTab = st.filterStatus || 'ALL';
  const tabs = ['ALL', 'PENDING', 'APPROVED', 'DONE', 'REJECTED'];
  html += '<div class="status-tabs">';
  tabs.forEach(tab => {
    const isActive = activeTab === tab ? ' active' : '';
    const tabClass = tab === 'ALL' ? 'all' : tab.toLowerCase();
    html += '<button class="status-tab status-tab-' + tabClass + isActive + '" onclick="onReqFilterStatus(\'' + (tab === 'ALL' ? '' : tab) + '\')">' + tab + ' <span class="tab-count">' + counts[tab] + '</span></button>';
  });
  html += '</div>';

  // Filter bar with multiple conditions
  const regionOptions = Auth.isAdmin() ? REGIONS : [Auth.getRegion()];
  html += '<div class="filter-bar filter-bar-multi">';
  html += '<div class="filter-group"><label class="filter-label">Search</label><input class="input" id="req-search" placeholder="ID, Shop, Item..." value="' + esc(st.search || '') + '"></div>';
  html += '<div class="filter-group"><label class="filter-label">Region</label><select class="input" id="req-filter-region"><option value="">All Regions</option>' + regionOptions.map(r => '<option value="' + esc(r) + '"' + (st.filterRegion === r ? ' selected' : '') + '>' + r + '</option>').join('') + '</select></div>';
  html += '<div class="filter-group"><label class="filter-label">From</label><input class="input" type="date" id="req-filter-from" value="' + (st.filterDateFrom || '') + '"></div>';
  html += '<div class="filter-group"><label class="filter-label">To</label><input class="input" type="date" id="req-filter-to" value="' + (st.filterDateTo || '') + '"></div>';
  html += '<button class="btn btn-outline btn-sm" onclick="clearReqFilters()">Clear Filters</button>';
  html += '<span class="filter-count">' + data.length + ' requests</span>';
  html += '</div>';

  // Add event listeners after render
  setTimeout(() => {
    const searchEl = document.getElementById('req-search');
    const regionEl = document.getElementById('req-filter-region');
    const fromEl = document.getElementById('req-filter-from');
    const toEl = document.getElementById('req-filter-to');
    if (searchEl) searchEl.addEventListener('input', debounce(e => { getTableState('requests').search = e.target.value; getTableState('requests').curPage = 1; renderTableOnly(); }, 300));
    if (regionEl) regionEl.addEventListener('change', e => { getTableState('requests').filterRegion = e.target.value; getTableState('requests').curPage = 1; renderPage(); });
    if (fromEl) fromEl.addEventListener('change', e => { getTableState('requests').filterDateFrom = e.target.value; getTableState('requests').curPage = 1; renderPage(); });
    if (toEl) toEl.addEventListener('change', e => { getTableState('requests').filterDateTo = e.target.value; getTableState('requests').curPage = 1; renderPage(); });
  }, 0);

  // Build table with approval badges
  html += '<div class="table-wrap table-scroll" id="tbl-requests"><div class="tbl-header tbl-row">';
  cols.forEach(c => {
    const sortable = c.key !== '_actions';
    const sorted = st.sortCol === c.key ? ' sorted-' + st.sortDir : '';
    html += '<div class="tbl-cell' + sorted + (sortable ? ' sortable' : '') + '"' + (sortable ? ' onclick="onReqSort(\'' + c.key + '\')"' : '') + '>' + esc(c.label) + '</div>';
  });
  html += '</div><div class="tbl-body">';
  if (pg.items.length === 0) html += '<div class="tbl-row tbl-empty"><div class="tbl-cell" style="text-align:center;grid-column:1/-1">No requests</div></div>';
  pg.items.forEach(r => {
    html += '<div class="tbl-row">';
    [r.requestId, r.requestedDate, r.region, r.channelName, r.shopCode, r.shopName, r.province, r.shoppingMall, r.rmName, r.receiverName, r.contactNumber, r.code, r.itemName, r.qty, r.support, r.part].forEach((v, i) => {
      html += '<div class="tbl-cell" data-col="' + i + '">' + esc(String(v ?? '-')) + '</div>';
    });
    html += '<div class="tbl-cell">' + badge(r.aiotApproval) + '</div>';
    html += '<div class="tbl-cell">' + badge(r.retailApproval) + '</div>';
    html += '<div class="tbl-cell">' + badge(r.shopConApproval) + '</div>';
    html += '<div class="tbl-cell">' + badge(r.status) + '</div>';
    if (Auth.isAdmin()) {
      html += '<div class="tbl-cell"><button class="btn btn-sm btn-outline" onclick=\'showApproveRequest("' + r.requestId + '")\'>Review</button>';
      if (r.status !== 'DONE') html += ' <button class="btn btn-sm btn-primary" onclick=\'markDone("' + r.requestId + '")\'>Done</button>';
      html += '</div>';
    }
    html += '</div>';
  });
  html += '</div></div>';
  html += renderPagination('requests', pg);
  el.innerHTML = html;
}

function onReqFilterStatus(v) { getTableState('requests').filterStatus = v; getTableState('requests').curPage = 1; renderPage(); }
function clearReqFilters() {
  const st = getTableState('requests');
  st.search = ''; st.filterRegion = ''; st.filterDateFrom = ''; st.filterDateTo = ''; st.filterStatus = ''; st.curPage = 1;
  renderPage();
}
function renderTableOnly() {
  const el = document.getElementById('page-requests');
  if (el) renderRequests(el);
}
function onReqSort(col) {
  const st = getTableState('requests');
  if (st.sortCol === col) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
  else { st.sortCol = col; st.sortDir = 'asc'; }
  renderPage();
}

function showAddRequest() {
  const regionOptions = Auth.isAdmin() ? REGIONS : [Auth.getRegion()];
  const form = '<div class="form-grid">' +
    formField('Request ID', 'req-requestId', genId('REQ')) +
    formField('Requested Date', 'req-requestedDate', today(), false, 'date') +
    formSelect('Region', 'req-region', regionOptions, regionOptions[0]) +
    formField('Channel Name', 'req-channelName', '') +
    formField('Shop Code', 'req-shopCode', '') +
    formField('Shop Name', 'req-shopName', '') +
    formField('Province', 'req-province', '') +
    formField('Shopping Mall', 'req-shoppingMall', '') +
    formTextarea('Address', 'req-address', '') +
    formField('RM Name', 'req-rmName', '') +
    formField('Receiver NAME', 'req-receiverName', '') +
    formField('Contact number', 'req-contactNumber', '') +
    '<div class="form-group"><label>Code *</label><select class="input" id="req-code">' + getStore(DB.INVENTORY).map(i => '<option value="' + esc(i.code) + '">' + esc(i.code) + ' — ' + esc(i.description) + '</option>').join('') + '</select></div>' +
    formField('Item Name', 'req-itemName', '') +
    formField('Qty', 'req-qty', '', false, 'number') +
    formField('Support', 'req-support', '') +
    formSelect('Part', 'req-part', ['Phone', 'AIOT', 'Shop con', 'POSM General'], 'Phone') +
    '</div>';
  showModal('New Material Request', form, () => saveRequest());
}

function saveRequest() {
  const code = getVal('req-code');
  const inv = getStore(DB.INVENTORY);
  const item = inv.find(i => i.code === code);
  const reqs = getStore(DB.REQUESTS);
  reqs.push({
    requestId: getVal('req-requestId') || genId('REQ'),
    requestedDate: getVal('req-requestedDate'),
    region: getVal('req-region'),
    channelName: getVal('req-channelName'),
    shopCode: getVal('req-shopCode'),
    shopName: getVal('req-shopName'),
    province: getVal('req-province'),
    shoppingMall: getVal('req-shoppingMall'),
    address: getVal('req-address'),
    rmName: getVal('req-rmName'),
    receiverName: getVal('req-receiverName'),
    contactNumber: getVal('req-contactNumber'),
    code: code,
    itemName: getVal('req-itemName') || (item ? item.description : ''),
    qty: parseInt(getVal('req-qty')) || 0,
    support: getVal('req-support'),
    part: getVal('req-part'),
    aiotApproval: '-', retailApproval: '-', shopConApproval: '-',
    status: 'PENDING', doneDate: null,
  });
  setStore(DB.REQUESTS, reqs);
  toast('Request submitted');
  renderPage();
  return true;
}

function showApproveRequest(reqId) {
  const req = getStore(DB.REQUESTS).find(r => r.requestId === reqId);
  if (!req) return;
  const opts = ['-', 'APPROVED', 'REJECTED', 'PENDING'];
  const makeOpts = (sel) => opts.map(o => '<option value="' + o + '"' + (o === sel ? ' selected' : '') + '>' + o + '</option>').join('');
  const form = '<div class="form-grid" style="max-width:500px">' +
    '<p><strong>' + esc(req.requestId) + '</strong> — ' + esc(req.itemName) + ' × ' + req.qty + '</p>' +
    '<p>Region: ' + esc(req.region) + ' | Channel: ' + esc(req.channelName) + ' | Shop: ' + esc(req.shopName) + '</p>' +
    '<div class="form-group"><label>AIOT Approval</label><select class="input" id="apr-aiot">' + makeOpts(req.aiotApproval) + '</select></div>' +
    '<div class="form-group"><label>Retail Approval</label><select class="input" id="apr-retail">' + makeOpts(req.retailApproval) + '</select></div>' +
    '<div class="form-group"><label>Shop con Approval</label><select class="input" id="apr-shopcon">' + makeOpts(req.shopConApproval) + '</select></div>' +
    '</div>';
  showModal('Review Request ' + reqId, form, () => saveApproval(reqId));
}

function saveApproval(reqId) {
  const aiot = getVal('apr-aiot');
  const retail = getVal('apr-retail');
  const shopcon = getVal('apr-shopcon');
  const reqs = getStore(DB.REQUESTS);
  const idx = reqs.findIndex(r => r.requestId === reqId);
  if (idx < 0) return;
  reqs[idx].aiotApproval = aiot;
  reqs[idx].retailApproval = retail;
  reqs[idx].shopConApproval = shopcon;
  // Determine overall status
  const approvals = [aiot, retail, shopcon].filter(a => a !== '-');
  if (approvals.length > 0 && approvals.every(a => a === 'APPROVED')) reqs[idx].status = 'APPROVED';
  else if (approvals.some(a => a === 'REJECTED')) reqs[idx].status = 'REJECTED';
  else reqs[idx].status = 'PENDING';
  setStore(DB.REQUESTS, reqs);
  toast('Approval updated');
  renderPage();
  return true;
}

function markDone(reqId) {
  if (!confirm('Mark as DONE? This will deduct inventory and add to region distribution.')) return;
  const reqs = getStore(DB.REQUESTS);
  const idx = reqs.findIndex(r => r.requestId === reqId);
  if (idx < 0) return;
  const req = reqs[idx];
  req.status = 'DONE';
  req.doneDate = today();
  // Deduct inventory
  const inv = getStore(DB.INVENTORY);
  const invIdx = inv.findIndex(i => i.code === req.code);
  if (invIdx >= 0) {
    inv[invIdx].goodInv = Math.max(0, (inv[invIdx].goodInv || 0) - (req.qty || 0));
    setStore(DB.INVENTORY, inv);
  }
  // Add to region
  const regions = getStore(DB.REGIONS);
  if (!regions[req.region]) regions[req.region] = [];
  regions[req.region].push({
    requestId: req.requestId, doneDate: req.doneDate, channelName: req.channelName,
    shopCode: req.shopCode, shopName: req.shopName, province: req.province,
    code: req.code, itemName: req.itemName, qty: req.qty, part: req.part,
    receiverName: req.receiverName,
  });
  setStore(DB.REGIONS, regions);
  // Add to Xiaomi Store if applicable
  if (req.channelName && req.channelName.toLowerCase().includes('xiaomi')) {
    const xs = JSON.parse(localStorage.getItem('wms_xiaomi_store') || '[]');
    xs.push({ requestId: req.requestId, doneDate: req.doneDate, channelName: req.channelName, shopCode: req.shopCode, shopName: req.shopName, province: req.province, code: req.code, itemName: req.itemName, qty: req.qty, part: req.part, receiverName: req.receiverName });
    localStorage.setItem('wms_xiaomi_store', JSON.stringify(xs));
  }
  setStore(DB.REQUESTS, reqs);
  toast('Request marked as DONE, inventory deducted');
  renderPage();
}

function exportRequestsCSV() {
  let data = getStore(DB.REQUESTS);
  if (Auth.isRRM()) data = data.filter(r => r.region === Auth.getRegion());
  let csv = 'Request ID,Requested Date,Region,Channel Name,Shop Code,Shop Name,Province,Shopping Mall,Address,RM Name,Receiver NAME,Contact Number,Code,Item Name,Qty,Support,Part,AIOT Approval,Retail Approval,Shop con Approval,Status\n';
  data.forEach(r => {
    csv += [r.requestId, r.requestedDate, r.region, r.channelName, r.shopCode, r.shopName, r.province, r.shoppingMall, r.address, r.rmName, r.receiverName, r.contactNumber, r.code, r.itemName, r.qty, r.support, r.part, r.aiotApproval, r.retailApproval, r.shopConApproval, r.status].map(c => '"' + String(c ?? '') + '"').join(',') + '\n';
  });
  downloadCSV('requests_' + today() + '.csv', csv);
}

// ============================
// REGION PAGES
// ============================
function renderRegionPage(el, region) {
  const data = getStore(DB.REGIONS)[region] || [];
  let html = '<div class="page-header"><h1>📍 ' + esc(region) + ' Distribution</h1><button class="btn btn-outline" onclick="exportRegionCSV(\'' + esc(region) + '\')">Export CSV</button></div>';
  const cols = ['Request ID', 'Done Date', 'Channel Name', 'Shop Code', 'Shop Name', 'Province', 'Code', 'Item Name', 'Qty', 'Part', 'Receiver NAME'];
  html += buildTable('region-' + region, cols, data.map(r => [r.requestId, r.doneDate, r.channelName, r.shopCode, r.shopName, r.province, r.code, r.itemName, r.qty, r.part, r.receiverName]));
  el.innerHTML = html;
}

function exportRegionCSV(region) {
  const data = getStore(DB.REGIONS)[region] || [];
  let csv = 'Request ID,Done Date,Channel Name,Shop Code,Shop Name,Province,Code,Item Name,Qty,Part,Receiver NAME\n';
  data.forEach(r => { csv += [r.requestId, r.doneDate, r.channelName, r.shopCode, r.shopName, r.province, r.code, r.itemName, r.qty, r.part, r.receiverName].map(c => '"' + String(c ?? '') + '"').join(',') + '\n'; });
  downloadCSV(region.replace(/\s+/g, '_') + '_distribution_' + today() + '.csv', csv);
}

// ============================
// XIAOMI STORE & NEW RETAIL
// ============================
function renderXiaomiStore(el) {
  const data = JSON.parse(localStorage.getItem('wms_xiaomi_store') || '[]');
  let html = '<div class="page-header"><h1>🏬 Xiaomi Store & New Retail</h1></div>';
  const cols = ['Request ID', 'Done Date', 'Channel Name', 'Shop Code', 'Shop Name', 'Province', 'Code', 'Item Name', 'Qty', 'Part', 'Receiver NAME'];
  html += buildTable('xiaomi-store', cols, data.map(r => [r.requestId, r.doneDate, r.channelName, r.shopCode, r.shopName, r.province, r.code, r.itemName, r.qty, r.part, r.receiverName]));
  el.innerHTML = html;
}

// ============================
// AIOT
// ============================
function renderAiot(el) {
  const data = JSON.parse(localStorage.getItem('wms_aiot') || '[]');
  let html = '<div class="page-header"><h1>🤖 AIOT</h1></div>';
  const cols = ['Request ID', 'Done Date', 'Channel Name', 'Shop Code', 'Shop Name', 'Province', 'Code', 'Description', 'Qty', 'Part', 'Receiver NAME'];
  html += buildTable('aiot', cols, data.map(r => [r.requestId, r.doneDate, r.channelName, r.shopCode, r.shopName, r.province, r.code, r.description, r.qty, r.part, r.receiverName]));
  el.innerHTML = html;
}

// ============================
// OFFICE
// ============================
function renderOffice(el) {
  const st = getTableState('office');
  let data = getStore(DB.OFFICE);
  if (st.search) {
    const q = st.search.toLowerCase();
    data = data.filter(r => [r.id, r.team, r.contactPerson, r.itemName, r.code].some(f => String(f).toLowerCase().includes(q)));
  }
  data = sortArray(data, st.sortCol, st.sortDir);
  const pg = paginate(data, st.curPage);

  const cols = [
    { key: 'id', label: 'ID' }, { key: 'statusDelivery', label: 'Status Delivery' },
    { key: 'requestedDate', label: 'Requested date' }, { key: 'team', label: 'Team' },
    { key: 'contactPerson', label: 'Contact Person' }, { key: 'contactNumber', label: 'Contact number' },
    { key: 'code', label: 'Code' }, { key: 'itemName', label: 'Item Name' },
    { key: 'qty', label: 'Qty' }, { key: 'support', label: 'Support' },
  ];
  if (Auth.isAdmin()) cols.push({ key: '_actions', label: 'Actions' });

  let html = '<div class="page-header"><h1>🏢 Office</h1><div class="header-actions">' + (Auth.isAdmin() ? '<button class="btn btn-primary" onclick="showAddOffice()">+ Add Request</button>' : '') + '</div></div>';
  html += '<div class="filter-bar"><input class="input" id="office-search" placeholder="Search..." value="' + esc(st.search) + '"><span class="filter-count">' + data.length + ' records</span></div>';
  html += buildSortableTable('office', cols, pg, 'onOfficeSort');
  pg.items.forEach(r => {
    html += '<div class="tbl-row">';
    [r.id, r.statusDelivery, r.requestedDate, r.team, r.contactPerson, r.contactNumber, r.code, r.itemName, r.qty, r.support].forEach((v, i) => {
      html += '<div class="tbl-cell" data-col="' + i + '">' + (i === 1 ? badge(v) : esc(String(v ?? '-'))) + '</div>';
    });
    if (Auth.isAdmin()) html += '<div class="tbl-cell"><button class="btn btn-sm btn-outline" onclick=\'editOffice("' + r.id + '")\'>Edit</button></div>';
    html += '</div>';
  });
  html += closeSortableTable();
  html += renderPagination('office', pg);
  el.innerHTML = html;
  // Attach debounced search listener
  const searchEl = document.getElementById('office-search');
  if (searchEl) searchEl.addEventListener('input', debounce(e => { getTableState('office').search = e.target.value; getTableState('office').curPage = 1; renderPage(); }, 300));
}

function editOffice(id) {
  const item = getStore(DB.OFFICE).find(r => r.id === id);
  if (!item) return;
  const form = '<div class="form-grid">' +
    formSelect('Status Delivery', 'ofc-status', ['PENDING', 'DONE'], item.statusDelivery) +
    formField('Team', 'ofc-team', item.team) +
    formField('Contact Person', 'ofc-contact', item.contactPerson) +
    formField('Contact number', 'ofc-phone', item.contactNumber) +
    formField('Qty', 'ofc-qty', item.qty, false, 'number') +
    '</div>';
  showModal('Edit Office Request', form, () => {
    const items = getStore(DB.OFFICE);
    const idx = items.findIndex(r => r.id === id);
    if (idx < 0) return;
    items[idx].statusDelivery = getVal('ofc-status');
    items[idx].team = getVal('ofc-team');
    items[idx].contactPerson = getVal('ofc-contact');
    items[idx].contactNumber = getVal('ofc-phone');
    items[idx].qty = parseInt(getVal('ofc-qty')) || 0;
    setStore(DB.OFFICE, items);
    toast('Office request updated');
    renderPage();
  });
}

function onOfficeSearch(v) { getTableState('office').search = v; getTableState('office').curPage = 1; renderPage(); }
function onOfficeSort(col) {
  const st = getTableState('office');
  if (st.sortCol === col) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
  else { st.sortCol = col; st.sortDir = 'asc'; }
  renderPage();
}

function showAddOffice() {
  const form = '<div class="form-grid">' +
    formField('ID', 'ofc-id', genId('OFC')) +
    formSelect('Status Delivery', 'ofc-status', ['PENDING', 'DONE'], 'PENDING') +
    formField('Requested Date', 'ofc-date', today(), false, 'date') +
    formField('Team', 'ofc-team', '') +
    formField('Contact Person', 'ofc-contact', '') +
    formField('Contact number', 'ofc-phone', '') +
    formField('Code', 'ofc-code', '') +
    formField('Item Name', 'ofc-itemName', '') +
    formField('Qty', 'ofc-qty', '', false, 'number') +
    formField('Support', 'ofc-support', 'Office') +
    '</div>';
  showModal('Add Office Request', form, () => saveOffice());
}

function saveOffice() {
  const items = getStore(DB.OFFICE);
  items.push({
    id: getVal('ofc-id') || genId('OFC'),
    statusDelivery: getVal('ofc-status'),
    requestedDate: getVal('ofc-date'),
    team: getVal('ofc-team'),
    contactPerson: getVal('ofc-contact'),
    contactNumber: getVal('ofc-phone'),
    code: getVal('ofc-code'),
    itemName: getVal('ofc-itemName'),
    qty: parseInt(getVal('ofc-qty')) || 0,
    support: getVal('ofc-support'),
  });
  setStore(DB.OFFICE, items);
  toast('Office request added');
  renderPage();
  return true;
}

// ============================
// INVENTORY CHECK
// ============================
function renderInvCheck(el) {
  const st = getTableState('inv-check');
  let data = getStore(DB.INVENTORY_CHECK);
  if (st.search) {
    const q = st.search.toLowerCase();
    data = data.filter(r => [r.materialCode, r.description, r.remark].some(f => String(f).toLowerCase().includes(q)));
  }
  data = sortArray(data, st.sortCol, st.sortDir);
  const pg = paginate(data, st.curPage);

  const cols = [
    { key: 'id', label: 'Check ID' }, { key: 'checkDate', label: 'Check Date' },
    { key: 'materialCode', label: 'Material Code' }, { key: 'description', label: 'Description' },
    { key: 'systemQty', label: 'System Qty' }, { key: 'actualQty', label: 'Actual Qty' },
    { key: 'difference', label: 'Difference' }, { key: 'remark', label: 'Remark' },
  ];
  if (Auth.isAdmin()) cols.push({ key: '_actions', label: 'Actions' });

  let html = '<div class="page-header"><h1>✅ Inventory Check</h1><div class="header-actions">' + (Auth.isAdmin() ? '<button class="btn btn-primary" onclick="showAddInvCheck()">+ New Check</button>' : '') + '</div></div>';
  html += '<div class="filter-bar"><input class="input" id="check-search" placeholder="Search..." value="' + esc(st.search) + '"><span class="filter-count">' + data.length + ' records</span></div>';
  html += buildSortableTable('inv-check', cols, pg, 'onCheckSort');
  pg.items.forEach(r => {
    const diffClass = r.difference < 0 ? 'color:#dc3545' : (r.difference > 0 ? 'color:#FF6900' : '');
    html += '<div class="tbl-row">';
    [r.id, r.checkDate, r.materialCode, r.description, r.systemQty, r.actualQty].forEach(v => html += '<div class="tbl-cell">' + esc(String(v ?? '-')) + '</div>');
    html += '<div class="tbl-cell" style="' + diffClass + '">' + r.difference + '</div>';
    html += '<div class="tbl-cell">' + esc(r.remark || '-') + '</div>';
    if (Auth.isAdmin()) html += '<div class="tbl-cell"><button class="btn btn-sm btn-danger" onclick=\'deleteInvCheck("' + r.id + '")\'>Del</button></div>';
    html += '</div>';
  });
  html += closeSortableTable();
  html += renderPagination('inv-check', pg);
  el.innerHTML = html;
  // Attach debounced search listener
  const searchEl = document.getElementById('check-search');
  if (searchEl) searchEl.addEventListener('input', debounce(e => { getTableState('inv-check').search = e.target.value; getTableState('inv-check').curPage = 1; renderPage(); }, 300));
}

function deleteInvCheck(id) {
  if (!confirm('Delete check record?')) return;
  setStore(DB.INVENTORY_CHECK, getStore(DB.INVENTORY_CHECK).filter(r => r.id !== id));
  toast('Check record deleted');
  renderPage();
}

function onCheckSearch(v) { getTableState('inv-check').search = v; getTableState('inv-check').curPage = 1; renderPage(); }
function onCheckSort(col) {
  const st = getTableState('inv-check');
  if (st.sortCol === col) st.sortDir = st.sortDir === 'asc' ? 'desc' : 'asc';
  else { st.sortCol = col; st.sortDir = 'asc'; }
  renderPage();
}

function showAddInvCheck() {
  const inv = getStore(DB.INVENTORY);
  const form = '<div class="form-grid">' +
    formField('Check ID', 'chk-id', genId('CHK')) +
    formField('Check Date', 'chk-date', today(), false, 'date') +
    '<div class="form-group"><label>Material Code *</label><select class="input" id="chk-materialCode">' + inv.map(i => '<option value="' + esc(i.materialCode) + '">' + esc(i.materialCode) + ' — ' + esc(i.description) + '</option>').join('') + '</select></div>' +
    formField('Actual Qty', 'chk-actualQty', '', false, 'number') +
    formTextarea('Remark', 'chk-remark', '') +
    '</div>';
  showModal('New Inventory Check', form, () => saveInvCheck());
}

function saveInvCheck() {
  const mc = getVal('chk-materialCode');
  const inv = getStore(DB.INVENTORY);
  const item = inv.find(i => i.materialCode === mc);
  const actualQty = parseInt(getVal('chk-actualQty')) || 0;
  const checks = getStore(DB.INVENTORY_CHECK);
  checks.push({
    id: getVal('chk-id') || genId('CHK'),
    checkDate: getVal('chk-date'),
    materialCode: mc,
    description: item ? item.description : '',
    systemQty: item ? item.goodInv : 0,
    actualQty,
    difference: actualQty - (item ? item.goodInv : 0),
    remark: getVal('chk-remark'),
  });
  setStore(DB.INVENTORY_CHECK, checks);
  toast('Inventory check recorded');
  renderPage();
  return true;
}

// ============================
// SHARED TABLE + PAGINATION BUILDERS
// ============================
function buildSortableTable(pageId, cols, pg, sortFn) {
  const st = getTableState(pageId);
  let html = '<div class="table-wrap table-scroll" id="tbl-' + pageId + '"><div class="tbl-header tbl-row">';
  cols.forEach(c => {
    const sortable = c.key !== '_actions';
    const sorted = st.sortCol === c.key ? ' sorted-' + st.sortDir : '';
    html += '<div class="tbl-cell' + sorted + (sortable ? ' sortable' : '') + '"' + (sortable ? ' onclick="' + sortFn + '(\'' + c.key + '\')"' : '') + '>' + esc(c.label) + '</div>';
  });
  html += '</div><div class="tbl-body">';
  if (pg.items.length === 0) html += '<div class="tbl-row tbl-empty"><div class="tbl-cell" style="text-align:center;grid-column:1/-1">No data</div></div>';
  return html;
}

function closeSortableTable() {
  return '</div></div>';
}

function renderPagination(page, pg) {
  if (pg.totalPages <= 1) return '';
  let html = '<div class="pagination"><span class="page-info">Showing ' + ((pg.curPage - 1) * 20 + 1) + '-' + Math.min(pg.curPage * 20, pg.total) + ' of ' + pg.total + '</span><div class="page-buttons">';
  if (pg.curPage > 1) html += '<button class="btn btn-sm btn-outline" onclick="goPage(\'' + page + '\',1)">«</button><button class="btn btn-sm btn-outline" onclick="goPage(\'' + page + '\',' + (pg.curPage - 1) + ')">‹</button>';
  html += '<span class="page-current">Page ' + pg.curPage + ' / ' + pg.totalPages + '</span>';
  if (pg.curPage < pg.totalPages) html += '<button class="btn btn-sm btn-outline" onclick="goPage(\'' + page + '\',' + (pg.curPage + 1) + ')">›</button><button class="btn btn-sm btn-outline" onclick="goPage(\'' + page + '\',' + pg.totalPages + ')">»</button>';
  html += '</div></div>';
  return html;
}

function goPage(page, n) {
  getTableState(page).curPage = n;
  renderPage();
}

// ============================
// LOGIN SCREEN
// ============================
function renderLogin() {
  document.getElementById('app').innerHTML = '<div class="login-screen"><div class="login-box"><div class="login-logo">🦞</div><h1>WMS Thailand</h1><p>Warehouse Management System</p><div class="form-group"><label>Username</label><input class="input" id="login-user" placeholder="admin or rrm-bkk-east" autofocus></div><div class="form-group"><label>Password</label><input class="input" id="login-pass" type="password" placeholder="Password"></div><button class="btn btn-primary btn-block" id="login-btn">Login</button><div class="login-hint">Admin: admin / thailand2026<br>RRM: rrm-bkk-east / rrm2026</div></div></div>';
  document.getElementById('login-btn').onclick = doLogin;
  document.getElementById('login-pass').onkeydown = e => { if (e.key === 'Enter') doLogin(); };
  document.getElementById('login-user').onkeydown = e => { if (e.key === 'Enter') document.getElementById('login-pass').focus(); };
}

function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const session = Auth.login(u, p);
  if (!session) { toast('Invalid credentials', 'error'); return; }
  startApp();
}

function startApp() {
  document.getElementById('app').innerHTML = '<div class="app-layout"><aside class="sidebar" id="sidebar"></aside><main class="main-content" id="main-content"></main></div><div class="modal-overlay" id="modal-overlay"></div><div id="toast-container"></div>';
  renderSidebar();
  navigate('dashboard');
}

// ============================
// INIT
// ============================
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isLoggedIn()) { startApp(); } else { renderLogin(); }
});

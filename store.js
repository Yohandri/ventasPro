/* ===== VentasPro — Data Store & Utilities ===== */
const Store = {
  _get(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } },
  _set(key, data) { localStorage.setItem(key, JSON.stringify(data)); },
  get products() { return this._get('vp_products'); },
  set products(v) { this._set('vp_products', v); },
  get clients() { return this._get('vp_clients'); },
  set clients(v) { this._set('vp_clients', v); },
  get sales() { return this._get('vp_sales'); },
  set sales(v) { this._set('vp_sales', v); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
};

/* ===== Formatting Helpers ===== */
const fmt = {
  money(n) { return '$' + Number(n || 0).toFixed(2); },
  date(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' }); },
  dateShort(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }); },
  dateInput(d) { const dt = new Date(d); return dt.toISOString().split('T')[0]; },
  relativeTime(d) {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Ahora';
    if (mins < 60) return mins + ' min';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h';
    const days = Math.floor(hrs / 24);
    return days + 'd';
  }
};

/* ===== Toast Notifications ===== */
function toast(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => { el.classList.add('toast-exit'); setTimeout(() => el.remove(), 300); }, 2500);
}

/* ===== Modal Manager ===== */
function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
document.addEventListener('click', e => {
  // Close button
  const closeBtn = e.target.closest('[data-close]');
  if (closeBtn) { closeModal(closeBtn.dataset.close); return; }
  // Click overlay
  if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
    closeModal(e.target.id);
  }
});

/* ===== Confirm Dialog ===== */
function confirmDialog(title, message, icon = '⚠️') {
  return new Promise(resolve => {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-icon').textContent = icon;
    openModal('modal-confirm');
    const ok = document.getElementById('confirm-ok');
    const cancel = document.getElementById('confirm-cancel');
    function cleanup() { ok.replaceWith(ok.cloneNode(true)); cancel.replaceWith(cancel.cloneNode(true)); closeModal('modal-confirm'); }
    document.getElementById('confirm-ok').addEventListener('click', () => { cleanup(); resolve(true); });
    document.getElementById('confirm-cancel').addEventListener('click', () => { cleanup(); resolve(false); });
  });
}

/* ===== Router ===== */
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');
  const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (nav) nav.classList.add('active');
  // Refresh page data
  if (page === 'dashboard') Dashboard.render();
  if (page === 'products') Products.render();
  if (page === 'clients') Clients.render();
  if (page === 'sales') Sales.renderList();
  if (page === 'payments') Payments.render();
}

/* ===== Date Utilities ===== */
function getDateRange(period) {
  const now = new Date();
  let start;
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      start = new Date(0);
  }
  return { start, end: now };
}

function generateFiadoInstallments(total, saleDate) {
  const date = new Date(saleDate);
  let dueDate;
  // Single installment: next 15th or 30th, whichever comes first
  if (date.getDate() < 15) {
    dueDate = new Date(date.getFullYear(), date.getMonth(), 15);
  } else if (date.getDate() < 30) {
    dueDate = new Date(date.getFullYear(), date.getMonth(), 30);
  } else {
    dueDate = new Date(date.getFullYear(), date.getMonth() + 1, 15);
  }
  return [{ num: 1, amount: total, dueDate: dueDate.toISOString(), paidDate: null, paid: false }];
}

function generateCuotaInstallments(total, count, dates) {
  const amount = Math.round((total / count) * 100) / 100;
  const installments = [];
  for (let i = 0; i < count; i++) {
    const isLast = i === count - 1;
    const cuotaAmount = isLast ? Math.round((total - amount * (count - 1)) * 100) / 100 : amount;
    installments.push({
      num: i + 1,
      amount: cuotaAmount,
      dueDate: dates[i] ? new Date(dates[i]).toISOString() : new Date().toISOString(),
      paidDate: null,
      paid: false
    });
  }
  return installments;
}

/* ===== VentasPro — Dashboard, Payments, Backup & Init ===== */

const Dashboard = {
  render() {
    const period = document.getElementById('dash-period').value;
    const { start, end } = getDateRange(period);
    const allSales = Store.sales;
    const sales = allSales.filter(s => { const d = new Date(s.date); return d >= start && d <= end; });
    const products = Store.products;
    const clients = Store.clients;

    const totalRevenue = sales.reduce((s, v) => s + v.total, 0);
    const totalCost = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((s2, item) => {
        const p = products.find(pr => pr.id === item.productId);
        return s2 + (p ? p.costPrice : 0) * item.qty;
      }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const totalSalesCount = sales.length;

    // Pending amount across ALL sales
    const pendingAmount = allSales.reduce((sum, s) => {
      if (!s.installments) return sum;
      return sum + s.installments.filter(i => !i.paid).reduce((a, i) => a + i.amount, 0);
    }, 0);

    // KPIs
    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card kpi-1"><div class="kpi-label">Ventas</div><div class="kpi-value">${fmt.money(totalRevenue)}</div><div class="kpi-sub">${totalSalesCount} venta${totalSalesCount !== 1 ? 's' : ''}</div></div>
      <div class="kpi-card kpi-2"><div class="kpi-label">Ganancia</div><div class="kpi-value">${fmt.money(totalProfit)}</div><div class="kpi-sub">${totalRevenue > 0 ? Math.round(totalProfit / totalRevenue * 100) : 0}% margen</div></div>
      <div class="kpi-card kpi-3"><div class="kpi-label">Por cobrar</div><div class="kpi-value">${fmt.money(pendingAmount)}</div><div class="kpi-sub">Total pendiente</div></div>
      <div class="kpi-card kpi-4"><div class="kpi-label">Productos</div><div class="kpi-value">${products.length}</div><div class="kpi-sub">${clients.length} clientes</div></div>`;

    // Top Products
    const prodMap = {};
    sales.forEach(s => s.items.forEach(i => { prodMap[i.name] = (prodMap[i.name] || 0) + i.qty; }));
    const topProds = Object.entries(prodMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('top-products-list').innerHTML = topProds.length
      ? topProds.map((p, i) => `<div class="widget-row"><span class="widget-rank">${i + 1}</span><span class="widget-name">${p[0]}</span><span class="widget-value">${p[1]} uds</span></div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem;padding:0.5rem 0">Sin datos</div>';

    // Top Clients
    const clientMap = {};
    sales.forEach(s => { clientMap[s.clientId] = (clientMap[s.clientId] || 0) + s.total; });
    const topClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]).slice(0, 5);
    document.getElementById('top-clients-list').innerHTML = topClients.length
      ? topClients.map((c, i) => {
        const cl = clients.find(x => x.id === c[0]);
        return `<div class="widget-row"><span class="widget-rank">${i + 1}</span><span class="widget-name">${cl ? cl.name : '—'}</span><span class="widget-value">${fmt.money(c[1])}</span></div>`;
      }).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem;padding:0.5rem 0">Sin datos</div>';

    // Low Stock
    const lowStock = products.filter(p => p.stock <= (p.minStock || 5)).sort((a, b) => a.stock - b.stock);
    document.getElementById('low-stock-list').innerHTML = lowStock.length
      ? lowStock.slice(0, 5).map(p => `<div class="widget-row"><span style="color:var(--danger)">⚠️</span><span class="widget-name">${p.name}</span><span class="widget-value" style="color:var(--danger)">${p.stock} uds</span></div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem;padding:0.5rem 0">Todo en orden ✓</div>';

    // Pending Payments widget
    const overdue = [];
    allSales.forEach(s => {
      if (!s.installments) return;
      s.installments.forEach(inst => {
        if (!inst.paid) {
          const cl = clients.find(c => c.id === s.clientId);
          overdue.push({ clientName: cl ? cl.name : '—', amount: inst.amount, dueDate: inst.dueDate, isOverdue: new Date(inst.dueDate) < new Date() });
        }
      });
    });
    overdue.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    document.getElementById('pending-payments-list').innerHTML = overdue.length
      ? overdue.slice(0, 5).map(p => `<div class="widget-row"><span style="color:${p.isOverdue ? 'var(--danger)' : 'var(--warning)'}">${p.isOverdue ? '🔴' : '🟡'}</span><span class="widget-name">${p.clientName} · ${fmt.dateShort(p.dueDate)}</span><span class="widget-value">${fmt.money(p.amount)}</span></div>`).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem;padding:0.5rem 0">Sin pagos pendientes ✓</div>';

    // Recent Sales
    const recent = allSales.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    document.getElementById('recent-sales-list').innerHTML = recent.length
      ? recent.map(s => {
        const cl = clients.find(c => c.id === s.clientId);
        return `<div class="widget-row" style="cursor:pointer" onclick="Sales.showDetail('${s.id}')"><span>${cl ? cl.name : '—'}</span><span class="widget-value">${fmt.money(s.total)}</span></div>`;
      }).join('')
      : '<div style="color:var(--text-muted);font-size:0.82rem;padding:0.5rem 0">Sin ventas</div>';

    this.renderChart(sales);
  },

  renderChart(sales) {
    const canvas = document.getElementById('chart-sales');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    // IMPORTANT: read layout width BEFORE setting canvas.width
    const W = canvas.offsetWidth;
    const H = Math.min(200, W * 0.5); // responsive height
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    // Group by day (last 7 days)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    const values = days.map(day => {
      const next = new Date(day); next.setDate(next.getDate() + 1);
      return sales.filter(s => { const d = new Date(s.date); return d >= day && d < next; }).reduce((sum, s) => sum + s.total, 0);
    });
    const max = Math.max(...values, 1);
    const padding = { top: 20, bottom: 35, left: 10, right: 10 };
    const chartW = W - padding.left - padding.right;
    const chartH = H - padding.top - padding.bottom;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, H - padding.bottom);
    grad.addColorStop(0, 'rgba(108,99,255,0.3)');
    grad.addColorStop(1, 'rgba(108,99,255,0)');

    // Draw area
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * chartW;
      const y = padding.top + chartH - (v / max) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding.left + chartW, H - padding.bottom);
    ctx.lineTo(padding.left, H - padding.bottom);
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * chartW;
      const y = padding.top + chartH - (v / max) * chartH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#6c63ff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots and labels
    ctx.fillStyle = '#e8e8f0';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    values.forEach((v, i) => {
      const x = padding.left + (i / (values.length - 1)) * chartW;
      const y = padding.top + chartH - (v / max) * chartH;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#6c63ff';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillText(dayNames[days[i].getDay()], x, H - padding.bottom + 14);
      if (v > 0) { ctx.fillStyle = '#e8e8f0'; ctx.fillText(fmt.money(v), x, y - 10); }
    });
  },

  init() {
    document.getElementById('dash-period').addEventListener('change', () => this.render());
  }
};

/* ===== PAYMENTS MODULE ===== */
const Payments = {
  viewMode: 'client', // 'client' or 'sale'

  render() {
    const filter = document.getElementById('filter-payments').value;
    const list = document.getElementById('payments-list');
    const sales = Store.sales.filter(s => s.installments && s.installments.length > 0);
    const clients = Store.clients;
    const now = new Date();

    let items = [];
    sales.forEach(s => {
      const cl = clients.find(c => c.id === s.clientId);
      s.installments.forEach(inst => {
        items.push({ saleId: s.id, clientId: s.clientId, clientName: cl ? cl.name : '—', paymentType: s.paymentType, ...inst, isOverdue: !inst.paid && new Date(inst.dueDate) < now });
      });
    });

    if (this.viewMode === 'client') {
      return this.renderGrouped(items);
    }

    if (filter === 'pending') items = items.filter(i => !i.paid);
    else if (filter === 'overdue') items = items.filter(i => i.isOverdue);
    else if (filter === 'paid') items = items.filter(i => i.paid);

    items.sort((a, b) => {
      if (!a.paid && b.paid) return -1;
      if (a.paid && !b.paid) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

    if (!items.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">💳</div><div class="empty-state-text">No hay cuotas ${filter === 'pending' ? 'pendientes' : filter === 'overdue' ? 'vencidas' : ''}</div></div>`;
      return;
    }

    list.innerHTML = items.map(i => {
      const statusClass = i.paid ? 'status-paid' : i.isOverdue ? 'status-overdue' : 'status-pending';
      const statusText = i.paid ? 'Pagada' : i.isOverdue ? 'Vencida' : 'Pendiente';
      const bg = i.paid ? 'var(--gradient-2)' : i.isOverdue ? 'var(--gradient-3)' : 'var(--gradient-4)';
      return `<div class="list-item">
        <div class="item-icon" style="background:${bg}">${i.paid ? '✓' : i.isOverdue ? '!' : '⏳'}</div>
        <div class="item-info">
          <div class="item-name">${i.clientName}</div>
          <div class="item-detail">Cuota ${i.num} · ${fmt.date(i.dueDate)} · <span class="badge badge-${i.paymentType}">${i.paymentType}</span></div>
        </div>
        <div class="item-right">
          <div class="item-price">${fmt.money(i.amount)}</div>
          ${!i.paid ? `<button class="pay-btn" onclick="Payments.payInstallment('${i.saleId}',${i.num})">Pagar</button>` : `<span class="installment-status ${statusClass}">${statusText}</span>`}
        </div>
      </div>`;
    }).join('');
  },

  renderGrouped(items) {
    const list = document.getElementById('payments-list');
    const filter = document.getElementById('filter-payments').value;
    const groups = {};

    items.forEach(i => {
      if (!groups[i.clientId]) {
        groups[i.clientId] = {
          clientId: i.clientId,
          name: i.clientName,
          total: 0,
          pending: 0,
          overdue: 0,
          count: 0
        };
      }
      groups[i.clientId].total += i.amount;
      if (!i.paid) {
        groups[i.clientId].pending += i.amount;
        if (i.isOverdue) groups[i.clientId].overdue += i.amount;
        groups[i.clientId].count++;
      }
    });

    let groupedItems = Object.values(groups);
    
    // Filter based on payment status if needed
    if (filter === 'pending' || filter === 'overdue') {
      groupedItems = groupedItems.filter(g => g.pending > 0);
      if (filter === 'overdue') groupedItems = groupedItems.filter(g => g.overdue > 0);
    } else if (filter === 'paid') {
      groupedItems = groupedItems.filter(g => g.pending === 0);
    }

    groupedItems.sort((a, b) => b.overdue - a.overdue || b.pending - a.pending);

    if (!groupedItems.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">No hay deudas ${filter === 'pending' ? 'pendientes' : filter === 'overdue' ? 'vencidas' : ''}</div></div>`;
      return;
    }

    list.innerHTML = groupedItems.map(g => {
      const hasOverdue = g.overdue > 0;
      const bg = hasOverdue ? 'var(--gradient-3)' : 'var(--gradient-4)';
      return `<div class="list-item" onclick="Payments.switchToSales('${g.name}')">
        <div class="item-icon" style="background:${bg}">${hasOverdue ? '!' : '⏳'}</div>
        <div class="item-info">
          <div class="item-name">${g.name}</div>
          <div class="item-detail">${g.count} cuota${g.count !== 1 ? 's' : ''} pendiente${g.count !== 1 ? 's' : ''}</div>
        </div>
        <div class="item-right">
          <div class="item-price">${fmt.money(g.pending)}</div>
          ${g.pending > 0 ? `<button class="pay-btn" onclick="event.stopPropagation(); Payments.payAll('${g.clientId}')">Pagar</button>` : ''}
          ${hasOverdue ? `<div style="color:var(--danger);font-size:0.7rem;font-weight:600">Vencido: ${fmt.money(g.overdue)}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  async payAll(clientId) {
    const cl = Store.clients.find(c => c.id === clientId);
    const clientName = cl ? cl.name : 'este cliente';
    
    // Calculate total pending
    const sales = Store.sales;
    let total = 0;
    sales.forEach(s => {
      if (s.clientId === clientId && s.installments) {
        s.installments.forEach(inst => { if (!inst.paid) total += inst.amount; });
      }
    });

    if (total === 0) return;

    const ok = await confirmDialog('Pagar todo', `¿Confirmás el pago total de ${fmt.money(total)} para ${clientName}?`, '💰');
    if (!ok) return;

    // Process payment
    sales.forEach(s => {
      if (s.clientId === clientId && s.installments) {
        s.installments.forEach(inst => {
          if (!inst.paid) {
            inst.paid = true;
            inst.paidDate = new Date().toISOString();
          }
        });
        // Update sale status
        const allPaid = s.installments.every(i => i.paid);
        const somePaid = s.installments.some(i => i.paid);
        s.status = allPaid ? 'paid' : somePaid ? 'partial' : 'pending';
      }
    });

    Store.sales = sales;
    toast(`Deuda de ${clientName} saldada ✓`);
    this.render();
  },

  switchToSales(clientName) {
    this.viewMode = 'sale';
    document.getElementById('btn-view-sale').classList.add('active');
    document.getElementById('btn-view-client').classList.remove('active');
    // We could filter the sales list by client name here if we wanted
    this.render();
  },

  async payInstallment(saleId, num) {
    const sales = Store.sales;
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.installments) return;
    const inst = sale.installments.find(i => i.num === num);
    if (!inst || inst.paid) return;

    const cl = Store.clients.find(c => c.id === sale.clientId);
    const ok = await confirmDialog('Registrar Pago', `¿Confirmás el pago de ${fmt.money(inst.amount)} de ${cl ? cl.name : 'este cliente'}?`, '💵');
    if (!ok) return;

    inst.paid = true;
    inst.paidDate = new Date().toISOString();
    // Update sale status
    const allPaid = sale.installments.every(i => i.paid);
    const somePaid = sale.installments.some(i => i.paid);
    sale.status = allPaid ? 'paid' : somePaid ? 'partial' : 'pending';
    Store.sales = sales;
    toast('Cuota marcada como pagada ✓');
    this.render();
    // Refresh detail if open
    const detailModal = document.getElementById('modal-sale-detail');
    if (detailModal && detailModal.classList.contains('open')) Sales.showDetail(saleId);
  },

  init() {
    document.getElementById('filter-payments').addEventListener('change', () => this.render());
    
    document.getElementById('btn-view-client').addEventListener('click', () => {
      this.viewMode = 'client';
      document.getElementById('btn-view-client').classList.add('active');
      document.getElementById('btn-view-sale').classList.remove('active');
      this.render();
    });

    document.getElementById('btn-view-sale').addEventListener('click', () => {
      this.viewMode = 'sale';
      document.getElementById('btn-view-sale').classList.add('active');
      document.getElementById('btn-view-client').classList.remove('active');
      this.render();
    });
  }
};

/* ===== BACKUP MODULE ===== */
const Backup = {
  exportData() {
    const data = { products: Store.products, clients: Store.clients, sales: Store.sales, exportDate: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventaspro-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado ✓');
    closeModal('modal-backup');
  },

  async importData(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.products || !data.clients || !data.sales) throw new Error('Formato inválido');
      const ok = await confirmDialog('Importar datos', 'Esto reemplazará TODOS los datos actuales. ¿Continuar?', '📥');
      if (!ok) return;
      Store.products = data.products;
      Store.clients = data.clients;
      Store.sales = data.sales;
      closeModal('modal-backup');
      navigateTo('dashboard');
      toast('Datos importados correctamente ✓');
    } catch (e) {
      toast('Error al importar: ' + e.message, 'error');
    }
  },

  init() {
    document.getElementById('btn-backup').addEventListener('click', () => openModal('modal-backup'));
    document.getElementById('btn-export').addEventListener('click', () => this.exportData());
    document.getElementById('import-file').addEventListener('change', e => { if (e.target.files[0]) this.importData(e.target.files[0]); });
  }
};

/* ===== APP INIT ===== */
document.addEventListener('DOMContentLoaded', () => {
  Products.init();
  Clients.init();
  Sales.init();
  Payments.init();
  Dashboard.init();
  Backup.init();

  // Nav
  document.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // Add delete buttons to product/client modals
  const prodForm = document.getElementById('form-product');
  const origProdFooter = prodForm.querySelector('.modal-footer');
  const prodDeleteBtn = document.createElement('button');
  prodDeleteBtn.type = 'button';
  prodDeleteBtn.className = 'btn btn-danger btn-sm';
  prodDeleteBtn.textContent = 'Eliminar';
  prodDeleteBtn.id = 'btn-delete-product';
  prodDeleteBtn.style.marginRight = 'auto';
  prodDeleteBtn.addEventListener('click', () => {
    const id = document.getElementById('product-id').value;
    if (id) Products.delete(id);
  });
  origProdFooter.prepend(prodDeleteBtn);

  const clientForm = document.getElementById('form-client');
  const origClientFooter = clientForm.querySelector('.modal-footer');
  const clientDeleteBtn = document.createElement('button');
  clientDeleteBtn.type = 'button';
  clientDeleteBtn.className = 'btn btn-danger btn-sm';
  clientDeleteBtn.textContent = 'Eliminar';
  clientDeleteBtn.id = 'btn-delete-client';
  clientDeleteBtn.style.marginRight = 'auto';
  clientDeleteBtn.addEventListener('click', () => {
    const id = document.getElementById('client-id').value;
    if (id) Clients.delete(id);
  });
  origClientFooter.prepend(clientDeleteBtn);

  // Show/hide delete buttons based on edit vs new
  const origOpenProduct = Products.openForm.bind(Products);
  Products.openForm = function (p) {
    origOpenProduct(p);
    document.getElementById('btn-delete-product').style.display = p ? '' : 'none';
  };
  const origOpenClient = Clients.openForm.bind(Clients);
  Clients.openForm = function (c) {
    origOpenClient(c);
    document.getElementById('btn-delete-client').style.display = c ? '' : 'none';
  };

  Dashboard.render();
});

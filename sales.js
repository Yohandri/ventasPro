/* ===== VentasPro — Sales Module ===== */
const Sales = {
  cart: [],
  selectedClient: null,

  renderList(filter = '', typeFilter = 'all') {
    const list = document.getElementById('sales-list');
    let sales = Store.sales.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
    if (typeFilter !== 'all') sales = sales.filter(s => s.paymentType === typeFilter);
    if (filter) {
      const q = filter.toLowerCase();
      const clients = Store.clients;
      sales = sales.filter(s => {
        const cl = clients.find(c => c.id === s.clientId);
        return (cl && cl.name.toLowerCase().includes(q)) || s.items.some(i => i.name.toLowerCase().includes(q));
      });
    }
    if (!sales.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🛒</div><div class="empty-state-text">${filter || typeFilter !== 'all' ? 'Sin resultados' : 'No hay ventas aún.'}</div></div>`;
      return;
    }
    const clients = Store.clients;
    list.innerHTML = sales.map(s => {
      const cl = clients.find(c => c.id === s.clientId);
      const badgeClass = 'badge-' + s.paymentType;
      const statusBadge = s.paymentType === 'contado' ? '' :
        `<span class="badge badge-${s.status}">${s.status === 'paid' ? 'Pagado' : s.status === 'partial' ? 'Parcial' : 'Pendiente'}</span>`;
      return `<div class="list-item" onclick="Sales.showDetail('${s.id}')">
        <div class="item-icon" style="background:${s.paymentType === 'contado' ? 'var(--gradient-2)' : s.paymentType === 'fiado' ? 'var(--gradient-4)' : 'var(--gradient-1)'}">
          ${s.paymentType === 'contado' ? '💵' : s.paymentType === 'fiado' ? '📅' : '📋'}
        </div>
        <div class="item-info">
          <div class="item-name">${cl ? cl.name : 'Cliente eliminado'}</div>
          <div class="item-detail">${s.items.length} producto${s.items.length > 1 ? 's' : ''} · ${fmt.relativeTime(s.date)} · <span class="badge ${badgeClass}">${s.paymentType}</span> ${statusBadge}</div>
        </div>
        <div class="item-right">
          <div class="item-price">${fmt.money(s.total)}</div>
          <div class="item-stock">${fmt.dateShort(s.date)}</div>
        </div>
      </div>`;
    }).join('');
  },

  openSaleModal() {
    this.cart = [];
    this.selectedClient = null;
    document.getElementById('sale-client-search').value = '';
    document.getElementById('sale-client-id').value = '';
    document.getElementById('sale-client-selected').classList.add('hidden');
    document.getElementById('sale-client-results').classList.remove('show');
    document.getElementById('sale-product-search').value = '';
    document.getElementById('sale-product-results').classList.remove('show');
    document.getElementById('sale-cart').innerHTML = '';
    document.getElementById('sale-total-amount').textContent = '$0.00';
    document.querySelectorAll('.payment-type-card').forEach(c => c.classList.remove('active'));
    document.querySelector('.payment-type-card:first-child').classList.add('active');
    document.querySelector('input[name="payment-type"][value="contado"]').checked = true;
    document.getElementById('cuotas-config').classList.add('hidden');
    document.getElementById('cuotas-count').value = 2;
    openModal('modal-sale');
    setTimeout(() => document.getElementById('sale-client-search').focus(), 100);
  },

  renderCart() {
    const cartEl = document.getElementById('sale-cart');
    if (!this.cart.length) { cartEl.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:1rem;font-size:0.85rem">Agregá productos</div>'; }
    else {
      cartEl.innerHTML = this.cart.map((item, i) => `<div class="cart-item">
        <span class="cart-item-name">${item.name}</span>
        <div class="cart-qty">
          <button type="button" onclick="Sales.updateQty(${i},-1)">−</button>
          <span>${item.qty}</span>
          <button type="button" onclick="Sales.updateQty(${i},1)">+</button>
        </div>
        <span class="cart-item-total">${fmt.money(item.qty * item.unitPrice)}</span>
        <button class="cart-item-remove" onclick="Sales.removeFromCart(${i})">×</button>
      </div>`).join('');
    }
    const total = this.cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    document.getElementById('sale-total-amount').textContent = fmt.money(total);
  },

  addToCart(productId) {
    const product = Store.products.find(p => p.id === productId);
    if (!product) return;
    const existing = this.cart.find(i => i.productId === productId);
    if (existing) {
      if (existing.qty >= product.stock) { toast('Stock insuficiente', 'error'); return; }
      existing.qty++;
    } else {
      if (product.stock < 1) { toast('Sin stock', 'error'); return; }
      this.cart.push({ productId, name: product.name, qty: 1, unitPrice: product.salePrice });
    }
    document.getElementById('sale-product-search').value = '';
    document.getElementById('sale-product-results').classList.remove('show');
    this.renderCart();
  },

  updateQty(index, delta) {
    const item = this.cart[index];
    if (!item) return;
    const product = Store.products.find(p => p.id === item.productId);
    const newQty = item.qty + delta;
    if (newQty < 1) { this.removeFromCart(index); return; }
    if (product && newQty > product.stock) { toast('Stock insuficiente', 'error'); return; }
    item.qty = newQty;
    this.renderCart();
  },

  removeFromCart(index) { this.cart.splice(index, 1); this.renderCart(); },

  selectClient(client) {
    this.selectedClient = client;
    document.getElementById('sale-client-id').value = client.id;
    document.getElementById('sale-client-search').value = '';
    document.getElementById('sale-client-results').classList.remove('show');
    const tag = document.getElementById('sale-client-selected');
    tag.innerHTML = `${client.name} <span class="remove-tag" onclick="Sales.clearClient()">×</span>`;
    tag.classList.remove('hidden');
  },

  clearClient() {
    this.selectedClient = null;
    document.getElementById('sale-client-id').value = '';
    document.getElementById('sale-client-selected').classList.add('hidden');
    document.getElementById('sale-client-search').focus();
  },

  generateCuotaDates() {
    const count = parseInt(document.getElementById('cuotas-count').value) || 2;
    const container = document.getElementById('cuotas-dates');
    const today = new Date();
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + (i + 1) * 15);
      container.innerHTML += `<div class="cuota-row"><label>Cuota ${i + 1}</label><input type="date" class="cuota-date" value="${fmt.dateInput(d)}"></div>`;
    }
  },

  confirmSale() {
    if (!this.selectedClient) { toast('Seleccioná un cliente', 'error'); return; }
    if (!this.cart.length) { toast('Agregá al menos un producto', 'error'); return; }
    const paymentType = document.querySelector('input[name="payment-type"]:checked').value;
    const total = this.cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
    let installments = [];
    const now = new Date().toISOString();

    if (paymentType === 'fiado') {
      installments = generateFiadoInstallments(total, now);
    } else if (paymentType === 'cuotas') {
      const count = parseInt(document.getElementById('cuotas-count').value) || 2;
      const dateInputs = document.querySelectorAll('.cuota-date');
      const dates = Array.from(dateInputs).map(d => d.value);
      if (dates.some(d => !d)) { toast('Completá todas las fechas', 'error'); return; }
      installments = generateCuotaInstallments(total, count, dates);
    }

    const sale = {
      id: Store.uid(),
      clientId: this.selectedClient.id,
      items: this.cart.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
      total,
      paymentType,
      installments,
      date: now,
      status: paymentType === 'contado' ? 'paid' : 'pending'
    };

    // Update stock
    const products = Store.products;
    sale.items.forEach(item => {
      const p = products.find(pr => pr.id === item.productId);
      if (p) p.stock = Math.max(0, p.stock - item.qty);
    });
    Store.products = products;

    const sales = Store.sales;
    sales.push(sale);
    Store.sales = sales;

    closeModal('modal-sale');
    this.cart = [];
    this.selectedClient = null;
    toast('¡Venta registrada! ' + fmt.money(total), 'success');
    navigateTo('sales');
  },

  showDetail(id) {
    const sale = Store.sales.find(s => s.id === id);
    if (!sale) return;
    const client = Store.clients.find(c => c.id === sale.clientId);
    const content = document.getElementById('sale-detail-content');
    const badgeClass = 'badge-' + sale.paymentType;

    let html = `<div class="detail-section">
      <div class="detail-row"><span>Cliente</span><strong>${client ? client.name : '—'}</strong></div>
      <div class="detail-row"><span>Fecha</span><strong>${fmt.date(sale.date)}</strong></div>
      <div class="detail-row"><span>Tipo</span><span class="badge ${badgeClass}">${sale.paymentType}</span></div>
      <div class="detail-row"><span>Total</span><strong style="color:var(--accent2)">${fmt.money(sale.total)}</strong></div>
    </div>
    <div class="detail-section"><h4>Productos</h4>
      <table class="detail-items-table"><thead><tr><th>Producto</th><th>Cant</th><th>Precio</th><th>Sub</th></tr></thead><tbody>
      ${sale.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${fmt.money(i.unitPrice)}</td><td>${fmt.money(i.qty * i.unitPrice)}</td></tr>`).join('')}
      </tbody></table>
    </div>`;

    if (sale.installments && sale.installments.length) {
      html += `<div class="detail-section"><h4>Cuotas</h4>`;
      sale.installments.forEach(inst => {
        const isOverdue = !inst.paid && new Date(inst.dueDate) < new Date();
        const statusClass = inst.paid ? 'status-paid' : isOverdue ? 'status-overdue' : 'status-pending';
        const statusText = inst.paid ? 'Pagada' : isOverdue ? 'Vencida' : 'Pendiente';
        html += `<div class="installment-row ${inst.paid ? 'paid' : ''}">
          <span>Cuota ${inst.num} · ${fmt.money(inst.amount)}</span>
          <span>${fmt.dateShort(inst.dueDate)}</span>
          <span class="installment-status ${statusClass}">${statusText}</span>
          ${!inst.paid ? `<button class="pay-btn" onclick="Payments.payInstallment('${sale.id}',${inst.num})">Pagar</button>` : ''}
        </div>`;
      });
      html += '</div>';
    }

    html += `<div class="modal-footer"><button class="btn btn-danger btn-sm" onclick="Sales.deleteSale('${sale.id}')">Eliminar</button></div>`;
    content.innerHTML = html;
    openModal('modal-sale-detail');
  },

  async deleteSale(id) {
    const ok = await confirmDialog('Eliminar venta', '¿Estás seguro? Se repondrá el stock.', '🗑️');
    if (!ok) return;
    const sales = Store.sales;
    const sale = sales.find(s => s.id === id);
    if (sale) {
      const products = Store.products;
      sale.items.forEach(item => { const p = products.find(pr => pr.id === item.productId); if (p) p.stock += item.qty; });
      Store.products = products;
    }
    Store.sales = sales.filter(s => s.id !== id);
    closeModal('modal-sale-detail');
    this.renderList();
    toast('Venta eliminada');
  },

  init() {
    document.getElementById('btn-new-sale').addEventListener('click', () => this.openSaleModal());
    document.getElementById('nav-sale-txt').addEventListener('click', () => navigateTo('sales'));
    document.getElementById('btn-confirm-sale').addEventListener('click', () => this.confirmSale());
    document.getElementById('search-sales').addEventListener('input', e => {
      const type = document.getElementById('filter-sales-type').value;
      this.renderList(e.target.value, type);
    });
    document.getElementById('filter-sales-type').addEventListener('change', e => {
      const search = document.getElementById('search-sales').value;
      this.renderList(search, e.target.value);
    });

    // Client search
    const clientSearch = document.getElementById('sale-client-search');
    clientSearch.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      const results = document.getElementById('sale-client-results');
      if (!q) { results.classList.remove('show'); return; }
      const clients = Store.clients.filter(c => c.name.toLowerCase().includes(q));
      let html = clients.slice(0, 5).map(c => `<div class="dropdown-item" onclick="Sales.selectClient({id:'${c.id}',name:'${c.name.replace(/'/g, "\\'")}'})"> ${c.name}${c.phone ? ' · ' + c.phone : ''}</div>`).join('');
      html += `<div class="dropdown-item dropdown-item-new" onclick="Sales.createAndSelectClient('${q.replace(/'/g, "\\'")}')">+ Crear "${e.target.value.trim()}"</div>`;
      results.innerHTML = html;
      results.classList.add('show');
    });
    clientSearch.addEventListener('blur', () => setTimeout(() => document.getElementById('sale-client-results').classList.remove('show'), 200));

    // Product search
    const prodSearch = document.getElementById('sale-product-search');
    prodSearch.addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      const results = document.getElementById('sale-product-results');
      if (!q) { results.classList.remove('show'); return; }
      const products = Store.products.filter(p => p.name.toLowerCase().includes(q) && p.stock > 0);
      if (!products.length) { results.innerHTML = '<div class="dropdown-item" style="color:var(--text-muted)">Sin resultados</div>'; results.classList.add('show'); return; }
      results.innerHTML = products.slice(0, 8).map(p => `<div class="dropdown-item" onclick="Sales.addToCart('${p.id}')">${p.name} · ${fmt.money(p.salePrice)} <span style="color:var(--text-muted)">(${p.stock} disp.)</span></div>`).join('');
      results.classList.add('show');
    });
    prodSearch.addEventListener('blur', () => setTimeout(() => document.getElementById('sale-product-results').classList.remove('show'), 200));

    // Payment type
    document.querySelectorAll('input[name="payment-type"]').forEach(r => {
      r.addEventListener('change', e => {
        document.querySelectorAll('.payment-type-card').forEach(c => c.classList.remove('active'));
        e.target.closest('.payment-type-card').classList.add('active');
        const cuotasConfig = document.getElementById('cuotas-config');
        if (e.target.value === 'cuotas') { cuotasConfig.classList.remove('hidden'); this.generateCuotaDates(); }
        else cuotasConfig.classList.add('hidden');
      });
    });
    document.getElementById('cuotas-count').addEventListener('change', () => this.generateCuotaDates());
  },

  createAndSelectClient(name) {
    const client = Clients.quickCreate(name);
    this.selectClient(client);
  }
};

/* ===== VentasPro — Products & Clients Modules ===== */

const Products = {
  render(filter = '') {
    const list = document.getElementById('products-list');
    let products = Store.products;
    if (filter) {
      const q = filter.toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
    }
    if (!products.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📦</div><div class="empty-state-text">${filter ? 'Sin resultados' : 'No hay productos aún. ¡Agregá el primero!'}</div></div>`;
      return;
    }
    // Sort: low stock first, then alphabetical
    products.sort((a, b) => {
      const aLow = a.stock <= (a.minStock || 5);
      const bLow = b.stock <= (b.minStock || 5);
      if (aLow && !bLow) return -1;
      if (!aLow && bLow) return 1;
      return a.name.localeCompare(b.name);
    });
    list.innerHTML = products.map(p => {
      const isLow = p.stock <= (p.minStock || 5);
      const profit = p.salePrice - p.costPrice;
      const bg = isLow ? 'var(--gradient-3)' : 'var(--gradient-1)';
      return `<div class="list-item" onclick="Products.edit('${p.id}')">
        <div class="item-icon" style="background:${bg}">${p.name[0].toUpperCase()}</div>
        <div class="item-info">
          <div class="item-name">${p.name}</div>
          <div class="item-detail">${p.category || 'Sin categoría'} · Ganancia: ${fmt.money(profit)}</div>
        </div>
        <div class="item-right">
          <div class="item-price">${fmt.money(p.salePrice)}</div>
          <div class="item-stock" style="color:${isLow ? 'var(--danger)' : 'var(--text-muted)'}">Stock: ${p.stock}${isLow ? ' ⚠️' : ''}</div>
        </div>
      </div>`;
    }).join('');
    this.updateCategories();
  },

  updateCategories() {
    const cats = [...new Set(Store.products.map(p => p.category).filter(Boolean))];
    document.getElementById('categories-list').innerHTML = cats.map(c => `<option value="${c}">`).join('');
  },

  openForm(product = null) {
    document.getElementById('modal-product-title').textContent = product ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('product-id').value = product ? product.id : '';
    document.getElementById('product-name').value = product ? product.name : '';
    document.getElementById('product-category').value = product ? (product.category || '') : '';
    document.getElementById('product-cost').value = product ? product.costPrice : '';
    document.getElementById('product-price').value = product ? product.salePrice : '';
    document.getElementById('product-stock').value = product ? product.stock : '';
    document.getElementById('product-min-stock').value = product ? (product.minStock || 5) : 5;
    openModal('modal-product');
    setTimeout(() => document.getElementById('product-name').focus(), 100);
  },

  save(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const data = {
      name: document.getElementById('product-name').value.trim(),
      category: document.getElementById('product-category').value.trim(),
      costPrice: parseFloat(document.getElementById('product-cost').value) || 0,
      salePrice: parseFloat(document.getElementById('product-price').value) || 0,
      stock: parseInt(document.getElementById('product-stock').value) || 0,
      minStock: parseInt(document.getElementById('product-min-stock').value) || 5,
    };
    if (!data.name) { toast('Nombre es requerido', 'error'); return; }
    const products = Store.products;
    if (id) {
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) { products[idx] = { ...products[idx], ...data }; }
    } else {
      products.push({ id: Store.uid(), ...data, createdAt: new Date().toISOString() });
    }
    Store.products = products;
    closeModal('modal-product');
    this.render();
    toast(id ? 'Producto actualizado' : 'Producto creado');
  },

  edit(id) {
    const product = Store.products.find(p => p.id === id);
    if (product) this.openForm(product);
  },

  async delete(id) {
    const ok = await confirmDialog('Eliminar producto', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
    if (!ok) return;
    Store.products = Store.products.filter(p => p.id !== id);
    closeModal('modal-product');
    this.render();
    toast('Producto eliminado');
  },

  init() {
    document.getElementById('btn-add-product').addEventListener('click', () => this.openForm());
    document.getElementById('form-product').addEventListener('submit', e => this.save(e));
    document.getElementById('search-products').addEventListener('input', e => this.render(e.target.value));
  }
};

/* ===== CLIENTS MODULE ===== */
const Clients = {
  render(filter = '') {
    const list = document.getElementById('clients-list');
    let clients = Store.clients;
    if (filter) {
      const q = filter.toLowerCase();
      clients = clients.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    if (!clients.length) {
      list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">${filter ? 'Sin resultados' : 'No hay clientes aún.'}</div></div>`;
      return;
    }
    const sales = Store.sales;
    clients.sort((a, b) => a.name.localeCompare(b.name));
    list.innerHTML = clients.map(c => {
      const clientSales = sales.filter(s => s.clientId === c.id);
      const totalSpent = clientSales.reduce((sum, s) => sum + s.total, 0);
      const pendingSales = clientSales.filter(s => s.status !== 'paid');
      const pendingAmount = pendingSales.reduce((sum, s) => {
        if (!s.installments) return sum;
        return sum + s.installments.filter(i => !i.paid).reduce((a, i) => a + i.amount, 0);
      }, 0);
      return `<div class="list-item" onclick="Clients.edit('${c.id}')">
        <div class="item-icon" style="background:var(--gradient-2)">${c.name[0].toUpperCase()}</div>
        <div class="item-info">
          <div class="item-name">${c.name}</div>
          <div class="item-detail">${c.phone || 'Sin teléfono'} · ${clientSales.length} compras</div>
        </div>
        <div class="item-right">
          <div class="item-price">${fmt.money(totalSpent)}</div>
          ${pendingAmount > 0 ? `<div class="item-stock" style="color:var(--warning)">Debe: ${fmt.money(pendingAmount)}</div>` : '<div class="item-stock">Al día ✓</div>'}
        </div>
      </div>`;
    }).join('');
  },

  openForm(client = null) {
    document.getElementById('modal-client-title').textContent = client ? 'Editar Cliente' : 'Nuevo Cliente';
    document.getElementById('client-id').value = client ? client.id : '';
    document.getElementById('client-name').value = client ? client.name : '';
    document.getElementById('client-phone').value = client ? (client.phone || '') : '';
    openModal('modal-client');
    setTimeout(() => document.getElementById('client-name').focus(), 100);
  },

  save(e) {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const data = {
      name: document.getElementById('client-name').value.trim(),
      phone: document.getElementById('client-phone').value.trim(),
    };
    if (!data.name) { toast('Nombre es requerido', 'error'); return; }
    const clients = Store.clients;
    if (id) {
      const idx = clients.findIndex(c => c.id === id);
      if (idx !== -1) { clients[idx] = { ...clients[idx], ...data }; }
    } else {
      clients.push({ id: Store.uid(), ...data, createdAt: new Date().toISOString() });
    }
    Store.clients = clients;
    closeModal('modal-client');
    this.render();
    toast(id ? 'Cliente actualizado' : 'Cliente creado');
  },

  edit(id) {
    const client = Store.clients.find(c => c.id === id);
    if (client) this.openForm(client);
  },

  async delete(id) {
    const ok = await confirmDialog('Eliminar cliente', '¿Estás seguro? Esta acción no se puede deshacer.', '🗑️');
    if (!ok) return;
    Store.clients = Store.clients.filter(c => c.id !== id);
    closeModal('modal-client');
    this.render();
    toast('Cliente eliminado');
  },

  quickCreate(name) {
    const client = { id: Store.uid(), name: name.trim(), phone: '', createdAt: new Date().toISOString() };
    const clients = Store.clients;
    clients.push(client);
    Store.clients = clients;
    toast('Cliente creado: ' + client.name);
    return client;
  },

  init() {
    document.getElementById('btn-add-client').addEventListener('click', () => this.openForm());
    document.getElementById('form-client').addEventListener('submit', e => this.save(e));
    document.getElementById('search-clients').addEventListener('input', e => this.render(e.target.value));
  }
};

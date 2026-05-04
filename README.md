# 🛒 VentasPro

**Sistema de gestión de ventas, inventario y clientes** — PWA offline-first diseñada para comerciantes independientes.

[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-6c63ff?style=for-the-badge&logo=github)](https://yohandri.github.io/ventasPro/)

## ✨ Features

| Módulo | Descripción |
|--------|-------------|
| 📊 **Dashboard** | KPIs en tiempo real, gráfico de ventas, top productos/clientes, alertas de stock bajo |
| 📦 **Productos** | Inventario completo con precio de costo, precio de venta, stock y stock mínimo |
| 👥 **Clientes** | Gestión de clientes con tracking de compras y deuda pendiente |
| 🛒 **Ventas** | Registro de ventas con 3 tipos de pago: contado, fiado y cuotas |
| 💳 **Cuentas por Cobrar** | Control de cuotas pendientes, parciales y vencidas |
| 💾 **Backup** | Exportar/importar datos en formato JSON |

## 💰 Tipos de Pago

- **Contado** — Pago inmediato, se registra como pagado
- **Fiado** — Una cuota única que vence el próximo 15 o 30 del mes
- **Cuotas** — Pagos personalizados con cantidad y fechas definidas por el usuario

## 🚀 Tecnología

- **HTML5 + CSS3 + JavaScript** — Zero dependencies, zero frameworks
- **LocalStorage** — Datos persistentes sin servidor
- **PWA** — Instalable como app nativa, funciona 100% offline
- **Mobile-first** — Diseñado para uso en celulares

## 📱 Instalación

1. Abrí [la app](https://yohandri.github.io/ventasPro/) en Chrome desde tu celular
2. Tocá el menú **⋮** → **"Agregar a pantalla de inicio"**
3. ¡Listo! Se instala como app nativa

## 🛠️ Desarrollo

```bash
# Clonar
git clone https://github.com/Yohandri/ventasPro.git

# Abrir directamente (no necesita servidor)
open index.html
```

## 📄 Licencia

MIT


// Admin Dashboard JavaScript

// Backend API base
const API_BASE = 'http://localhost:3000/api';

async function apiGet(path) {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`GET ${path} failed`);
    return res.json();
}
async function apiPost(path, body) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
async function apiPut(path, body) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
async function apiDelete(path) {
    const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

// Data stores
let adminProducts = [];

// Initialize products from localStorage
async function initializeAdminProducts() {
    const defaultProducts = [
        { id: 1, name: "5 Gallon Water Jug", price: 120, size: "5 Gallons", stock: 50, image: "🚰" },
        { id: 2, name: "3 Gallon Water Jug", price: 85, size: "3 Gallons", stock: 75, image: "💧" },
        { id: 3, name: "1 Gallon Water Jug", price: 35, size: "1 Gallon", stock: 100, image: "🥤" },
        { id: 4, name: "500ml Water Bottle", price: 15, size: "500ml", stock: 200, image: "🍼" },
        { id: 5, name: "1.5L Water Bottle", price: 25, size: "1.5 Liters", stock: 150, image: "🧴" },
        { id: 6, name: "Premium 5 Gallon Jug", price: 150, size: "5 Gallons", stock: 30, image: "💎" }
    ];
    try {
        const rows = await apiGet('/products');
        adminProducts = rows.map(p => ({ id: p.id, name: p.name, price: p.price, size: p.size || '', stock: p.stock ?? 0, image: p.image_url || '' }));
        saveAdminProductsToStorage();
    } catch (e) {
        const storedProducts = localStorage.getItem('bigze-products');
        if (storedProducts) {
            adminProducts = JSON.parse(storedProducts);
        } else {
            adminProducts = defaultProducts;
            saveAdminProductsToStorage();
        }
    }
}

// Save products to localStorage
function saveAdminProductsToStorage() {
    localStorage.setItem('bigze-products', JSON.stringify(adminProducts));
}

let adminOrders = [];

let adminCustomers = [];

// Load customers from API
async function loadCustomersFromServer() {
    try {
        adminCustomers = await apiGet('/customers');
    } catch (e) {
        adminCustomers = [];
    }
}

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async function() {
    await initializeAdminProducts();
    await loadOrdersFromStorage();
    await loadCustomersFromServer();
    updateDashboardStats();
    loadProductsTable();
    loadOrdersTable();
    loadCustomersTable();
    setupProductForm();
    setDefaultDates();
});

// Load orders from localStorage to sync with user orders
async function loadOrdersFromStorage() {
    try {
        const rows = await apiGet('/orders');
        adminOrders = rows.map(r => {
            const items = r.items || [];
            const subtotal = items.reduce((sum, it) => sum + (it.price * it.quantity), 0);
            const deliveryFee = Math.max(0, (r.total || 0) - subtotal);
            return {
                id: r.id, // DB id
                orderId: r.order_id, // human-readable id
                customerId: r.customer_id,
                customerName: r.customer_id ? `Customer #${r.customer_id}` : 'Guest',
                customerEmail: '',
                items,
                subtotal,
                deliveryFee,
                total: r.total,
                deliveryType: (r.delivery || '').startsWith('scheduled') ? 'scheduled' : 'same-day',
                status: r.status,
                date: r.created_at
            };
        });
    } catch (e) {
        const storedOrders = JSON.parse(localStorage.getItem('bigze-orders') || '[]');
        adminOrders = storedOrders;
    }
}

// Navigation functions
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.admin-nav button');
    navButtons.forEach(btn => btn.classList.remove('active'));
    
    // Show selected section
    document.getElementById(sectionName).classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Dashboard functions
function updateDashboardStats() {
    const totalOrders = adminOrders.length;
    const totalRevenue = adminOrders.reduce((sum, order) => sum + order.total, 0);
    const totalProducts = adminProducts.length;
    const lowStockCount = adminProducts.filter(product => product.stock <= 10).length;
    
    document.getElementById('total-orders').textContent = totalOrders;
    document.getElementById('total-revenue').textContent = `₱${totalRevenue.toLocaleString()}`;
    document.getElementById('total-products').textContent = totalProducts;
    document.getElementById('low-stock-count').textContent = lowStockCount;
    
    loadRecentOrders();
}

function loadRecentOrders() {
    const recentOrdersTable = document.getElementById('recent-orders');
    const recentOrders = adminOrders.slice(-5).reverse();
    
    if (recentOrders.length === 0) {
        recentOrdersTable.innerHTML = '<tr><td colspan="5">No orders yet</td></tr>';
        return;
    }
    
    recentOrdersTable.innerHTML = recentOrders.map(order => `
        <tr>
            <td>${order.id}</td>
            <td>${order.customerName}</td>
            <td>₱${order.total}</td>
            <td><span class="status-badge ${order.status}">${order.status}</span></td>
            <td>${new Date(order.date).toLocaleDateString()}</td>
        </tr>
    `).join('');
}

// Product management functions
function loadProductsTable() {
    const productsTable = document.getElementById('products-table');
    
    productsTable.innerHTML = adminProducts.map(product => {
        const stockStatus = getStockStatus(product.stock);
        const hasImage = typeof product.image === 'string' && (product.image.startsWith('data:') || /\.(png|jpe?g|gif|webp|svg)$/i.test(product.image));
        return `
            <tr>
                <td>${product.id}</td>
                <td>${hasImage ? ('<img src="' + product.image + '" alt="' + product.name + '" style="width:28px;height:28px;object-fit:cover;border-radius:4px;margin-right:8px;vertical-align:middle;">') : (product.image ? product.image + ' ' : '')}${product.name}</td>
                <td>₱${product.price}</td>
                <td>${product.size}</td>
                <td>${product.stock}</td>
                <td><span class="stock-status ${stockStatus.class}">${stockStatus.text}</span></td>
                <td>
                    <button class="action-btn" onclick="editProduct(${product.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn" onclick="updateStock(${product.id})">
                        <i class="fas fa-boxes"></i> Stock
                    </button>
                    <button class="action-btn" onclick="updateProductImage(${product.id})">
                        <i class="fas fa-image"></i> Image
                    </button>
                    <button class="action-btn danger" onclick="deleteProduct(${product.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock' };
    } else if (stock <= 10) {
        return { class: 'low-stock', text: 'Low Stock' };
    } else {
        return { class: 'in-stock', text: 'In Stock' };
    }
}

function showAddProductForm() {
    document.getElementById('add-product-form').style.display = 'block';
}

function hideAddProductForm() {
    document.getElementById('add-product-form').style.display = 'none';
    document.getElementById('product-form').reset();
}

function setupProductForm() {
    document.getElementById('product-form').addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = document.getElementById('product-name').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const size = document.getElementById('product-size').value;
        const stock = parseInt(document.getElementById('product-stock').value);
        const fileInput = document.getElementById('product-image-file');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        const send = async (imageValue) => {
            try {
                const created = await apiPost('/products', { name, price, size, stock, image_url: imageValue || '' });
                const newProduct = { id: created.id, name: created.name, price: created.price, size: created.size || '', stock: created.stock ?? 0, image: created.image_url || '' };
                adminProducts.push(newProduct);
                saveAdminProductsToStorage();
                loadProductsTable();
                updateDashboardStats();
                hideAddProductForm();
                showNotification('Product added successfully!');
            } catch (err) {
                showNotification('Failed to add product.');
            }
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = () => send(reader.result);
            reader.onerror = () => send('');
            reader.readAsDataURL(file);
        } else {
            send('');
        }
    });
}

async function editProduct(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;

    const newName = prompt('Enter new product name:', product.name) ?? product.name;
    const newPriceInput = prompt('Enter new price:', product.price);
    const newPrice = (newPriceInput !== null && !isNaN(newPriceInput)) ? parseFloat(newPriceInput) : product.price;
    const newSize = prompt('Enter new size:', product.size) ?? product.size;

    try {
        const updated = await apiPut(`/products/${product.id}`, { name: newName, price: newPrice, size: newSize });
        product.name = updated.name;
        product.price = updated.price;
        product.size = updated.size || '';
        saveAdminProductsToStorage();
        loadProductsTable();
        updateDashboardStats();
        showNotification('Product updated successfully!');
    } catch (err) {
        showNotification('Failed to update product.');
    }
}

async function updateStock(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;

    const newStock = prompt(`Current stock: ${product.stock}\nEnter new stock quantity:`, product.stock);
    if (newStock !== null && !isNaN(newStock)) {
        try {
            const updated = await apiPut(`/products/${product.id}`, { stock: parseInt(newStock) });
            product.stock = updated.stock ?? parseInt(newStock);
            saveAdminProductsToStorage();
            loadProductsTable();
            updateDashboardStats();
            showNotification('Stock updated successfully!');
        } catch (err) {
            showNotification('Failed to update stock.');
        }
    }
}

function updateProductImage(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const updated = await apiPut(`/products/${product.id}`, { image_url: reader.result });
                product.image = updated.image_url || reader.result;
                saveAdminProductsToStorage();
                loadProductsTable();
                updateDashboardStats();
                showNotification('Product image updated successfully!');
            } catch (err) {
                showNotification('Failed to upload image. Please try again.');
            }
        };
        reader.onerror = () => showNotification('Failed to upload image. Please try again.');
        reader.readAsDataURL(file);
    };
    input.click();
}

async function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        try {
            await apiDelete(`/products/${productId}`);
            const index = adminProducts.findIndex(p => p.id === productId);
            if (index > -1) adminProducts.splice(index, 1);
            saveAdminProductsToStorage();
            loadProductsTable();
            updateDashboardStats();
            showNotification('Product deleted successfully!');
        } catch (err) {
            showNotification('Failed to delete product.');
        }
    }
}

// Order management functions
function loadOrdersTable() {
    const ordersTable = document.getElementById('orders-table');
    
    if (adminOrders.length === 0) {
        ordersTable.innerHTML = '<tr><td colspan="7">No orders yet</td></tr>';
        return;
    }
    
    ordersTable.innerHTML = adminOrders.map(order => `
        <tr>
            <td>${order.orderId || order.id}</td>
            <td>${order.customerName}<br><small>${order.customerEmail || ''}</small></td>
            <td>${order.items.length} items</td>
            <td>₱${order.total}</td>
            <td>${order.deliveryType}</td>
            <td>
                <select onchange="updateOrderStatus(${order.id}, this.value)">
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="out-for-delivery" ${order.status === 'out-for-delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails(${order.id})">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn danger" onclick="deleteOrder(${order.id})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

async function updateOrderStatus(orderDbId, newStatus) {
    const order = adminOrders.find(o => o.id === orderDbId);
    if (!order) return;
    try {
        await apiPut(`/orders/${orderDbId}`, { status: newStatus });
        order.status = newStatus;
        showNotification(`Order ${order.orderId || orderDbId} status updated to ${newStatus}`);
        updateDashboardStats();
    } catch (e) {
        showNotification('Failed to update order status.');
    }
}

function viewOrderDetails(orderDbId) {
    const order = adminOrders.find(o => o.id === orderDbId);
    if (!order) return;
    
    const itemsList = order.items.map(item => 
        `${item.name} x${item.quantity} = ₱${item.price * item.quantity}`
    ).join('\n');
    
    alert(`Order Details: ${order.orderId || orderDbId}
    
Customer: ${order.customerName}
Email: ${order.customerEmail || ''}
Date: ${new Date(order.date).toLocaleString()}

Items:
${itemsList}

Subtotal: ₱${order.subtotal}
Delivery Fee: ₱${order.deliveryFee}
Total: ₱${order.total}

Delivery Type: ${order.deliveryType}
Status: ${order.status}`);
}

async function deleteOrder(orderDbId) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await apiDelete(`/orders/${orderDbId}`);
            const index = adminOrders.findIndex(o => o.id === orderDbId);
            if (index > -1) adminOrders.splice(index, 1);
            loadOrdersTable();
            updateDashboardStats();
            showNotification('Order deleted successfully!');
        } catch (e) {
            showNotification('Failed to delete order.');
        }
    }
}

// Customer management functions
function loadCustomersTable() {
    const customersTable = document.getElementById('customers-table');
    
    if (adminCustomers.length === 0) {
        customersTable.innerHTML = '<tr><td colspan="6">No customers yet</td></tr>';
        return;
    }
    
    customersTable.innerHTML = adminCustomers.map(customer => `
        <tr>
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.totalOrders}</td>
            <td>₱${customer.totalSpent.toLocaleString()}</td>
        </tr>
    `).join('');
}

// Reports functions
function setDefaultDates() {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
    
    document.getElementById('report-from').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('report-to').value = today.toISOString().split('T')[0];
}

function generateReport() {
    const fromDate = new Date(document.getElementById('report-from').value);
    const toDate = new Date(document.getElementById('report-to').value);
    
    // Filter orders by date range
    const reportOrders = adminOrders.filter(order => {
        const orderDate = new Date(order.date);
        return orderDate >= fromDate && orderDate <= toDate;
    });
    
    // Calculate statistics
    const totalOrders = reportOrders.length;
    const totalRevenue = reportOrders.reduce((sum, order) => sum + order.total, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Product sales analysis
    const productSales = {};
    reportOrders.forEach(order => {
        order.items.forEach(item => {
            if (productSales[item.name]) {
                productSales[item.name].quantity += item.quantity;
                productSales[item.name].revenue += item.price * item.quantity;
            } else {
                productSales[item.name] = {
                    quantity: item.quantity,
                    revenue: item.price * item.quantity
                };
            }
        });
    });
    
    // Generate report HTML
    const reportResults = document.getElementById('report-results');
    reportResults.innerHTML = `
        <div style="background: white; padding: 2rem; border-radius: 10px; box-shadow: var(--shadow);">
            <h3>Sales Report (${fromDate.toLocaleDateString()} - ${toDate.toLocaleDateString()})</h3>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${totalOrders}</div>
                    <div>Total Orders</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">₱${totalRevenue.toLocaleString()}</div>
                    <div>Total Revenue</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">₱${avgOrderValue.toFixed(2)}</div>
                    <div>Average Order Value</div>
                </div>
            </div>
            
            <h4>Top Selling Products</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Quantity Sold</th>
                        <th>Revenue</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(productSales)
                        .sort((a, b) => b[1].revenue - a[1].revenue)
                        .map(([name, data]) => `
                            <tr>
                                <td>${name}</td>
                                <td>${data.quantity}</td>
                                <td>₱${data.revenue.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    showNotification('Report generated successfully!');
}

// Utility functions
// Add to admin.js (or make it a shared utility)
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 100px; right: 20px; background: var(--primary-color);
        color: white; padding: 1rem 2rem; border-radius: 25px; z-index: 3000;
        transform: translateX(100%); transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Initialize
console.log('Admin Dashboard Loaded Successfully!');

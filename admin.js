
// Admin Dashboard JavaScript

// Shared products data using localStorage
let adminProducts = [];

// Initialize products from localStorage
async function initializeAdminProducts() {
    try {
        const response = await fetch('http://localhost:3000/api/products');
        if (!response.ok) throw new Error('Failed to load products');
        adminProducts = await response.json();
    } catch (error) {
        console.error(error);
        // Fallback
        adminProducts = [
            { id: 1, name: "5 Gallon Water Jug", price: 120, size: "5 Gallons", stock: 50, image: "🚰" },
            // ... defaults
        ];
    }
}

// Save products to localStorage
function saveAdminProductsToStorage() {
    localStorage.setItem('bigze-products', JSON.stringify(adminProducts));
}

let adminOrders = [
    {
        id: 'ORD1701234567',
        customerId: 1,
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        items: [
            { id: 1, name: '5 Gallon Water Jug', price: 120, quantity: 2 },
            { id: 4, name: '500ml Water Bottle', price: 15, quantity: 10 }
        ],
        subtotal: 390,
        deliveryFee: 50,
        total: 440,
        deliveryType: 'same-day',
        status: 'confirmed',
        date: new Date('2024-01-15').toISOString()
    },
    {
        id: 'ORD1701234568',
        customerId: 2,
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        items: [
            { id: 2, name: '3 Gallon Water Jug', price: 85, quantity: 3 }
        ],
        subtotal: 255,
        deliveryFee: 0,
        total: 255,
        deliveryType: 'scheduled',
        status: 'delivered',
        date: new Date('2024-01-14').toISOString()
    }
];

let adminCustomers = [
    {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+63 123 456 7890',
        address: '123 Main St, Manila',
        totalOrders: 5,
        totalSpent: 2200
    },
    {
        id: 2,
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+63 987 654 3210',
        address: '456 Oak Ave, Quezon City',
        totalOrders: 3,
        totalSpent: 765
    }
];

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminProducts();
    loadOrdersFromStorage();
    updateDashboardStats();
    loadProductsTable();
    loadOrdersTable();
    loadCustomersTable();
    setupProductForm();
    setDefaultDates();
});

// Load orders from localStorage to sync with user orders
function loadOrdersFromStorage() {
    const storedOrders = JSON.parse(localStorage.getItem('bigze-orders') || '[]');
    if (storedOrders.length > 0) {
        // Merge stored orders with default admin orders, avoiding duplicates
        storedOrders.forEach(storedOrder => {
            const existingIndex = adminOrders.findIndex(order => order.id === storedOrder.id);
            if (existingIndex > -1) {
                // Update existing order
                adminOrders[existingIndex] = storedOrder;
            } else {
                // Add new order
                adminOrders.push(storedOrder);
            }
        });
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
    document.getElementById('product-form').addEventListener('submit', function(e) {
        e.preventDefault();

        const name = document.getElementById('product-name').value;
        const price = parseFloat(document.getElementById('product-price').value);
        const size = document.getElementById('product-size').value;
        const stock = parseInt(document.getElementById('product-stock').value);
        const fileInput = document.getElementById('product-image-file');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;

        const newId = adminProducts.length ? Math.max(...adminProducts.map(p => p.id)) + 1 : 1;

        const finalizeSave = (imageValue) => {
            const newProduct = {
                id: newId,
                name,
                price,
                size,
                stock,
                image: imageValue || ''
            };
            adminProducts.push(newProduct);
            saveAdminProductsToStorage(); // Save to localStorage
            loadProductsTable();
            updateDashboardStats();
            hideAddProductForm();
            showNotification('Product added successfully!');
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = () => finalizeSave(reader.result);
            reader.onerror = () => {
                console.error('Image load failed');
                finalizeSave('');
            };
            reader.readAsDataURL(file);
        } else {
            finalizeSave('');
        }
    });
}

function editProduct(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;
    
    const newName = prompt('Enter new product name:', product.name);
    if (newName && newName !== product.name) {
        product.name = newName;
    }
    
    const newPrice = prompt('Enter new price:', product.price);
    if (newPrice && !isNaN(newPrice)) {
        product.price = parseFloat(newPrice);
    }
    
    const newSize = prompt('Enter new size:', product.size);
    if (newSize && newSize !== product.size) {
        product.size = newSize;
    }
    
    saveAdminProductsToStorage(); // Save to localStorage
    loadProductsTable();
    updateDashboardStats();
    showNotification('Product updated successfully!');
}

function updateStock(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;
    
    const newStock = prompt(`Current stock: ${product.stock}\nEnter new stock quantity:`, product.stock);
    if (newStock !== null && !isNaN(newStock)) {
        product.stock = parseInt(newStock);
        saveAdminProductsToStorage(); // Save to localStorage
        loadProductsTable();
        updateDashboardStats();
        showNotification('Stock updated successfully!');
    }
}

function updateProductImage(productId) {
    const product = adminProducts.find(p => p.id === productId);
    if (!product) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            product.image = reader.result; // Save as Data URL
            saveAdminProductsToStorage();
            loadProductsTable();
            updateDashboardStats();
            showNotification('Product image updated successfully!');
        };
        reader.onerror = () => showNotification('Failed to upload image. Please try again.');
        reader.readAsDataURL(file);
    };
    input.click();
}

function deleteProduct(productId) {
    if (confirm('Are you sure you want to delete this product?')) {
        const index = adminProducts.findIndex(p => p.id === productId);
        if (index > -1) {
            adminProducts.splice(index, 1);
            saveAdminProductsToStorage(); // Save to localStorage
            loadProductsTable();
            updateDashboardStats();
            showNotification('Product deleted successfully!');
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
            <td>${order.id}</td>
            <td>${order.customerName}<br><small>${order.customerEmail}</small></td>
            <td>${order.items.length} items</td>
            <td>₱${order.total}</td>
            <td>${order.deliveryType}</td>
            <td>
                <select onchange="updateOrderStatus('${order.id}', this.value)">
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
                    <option value="out-for-delivery" ${order.status === 'out-for-delivery' ? 'selected' : ''}>Out for Delivery</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
            <td>
                <button class="action-btn" onclick="viewOrderDetails('${order.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn danger" onclick="deleteOrder('${order.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        </tr>
    `).join('');
}

function updateOrderStatus(orderId, newStatus) {
    const order = adminOrders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        
        // Update the order in user's localStorage as well
        let allOrders = JSON.parse(localStorage.getItem('bigze-orders') || '[]');
        const userOrderIndex = allOrders.findIndex(o => o.id === orderId);
        if (userOrderIndex > -1) {
            allOrders[userOrderIndex].status = newStatus;
            localStorage.setItem('bigze-orders', JSON.stringify(allOrders));
        }
        
        showNotification(`Order ${orderId} status updated to ${newStatus}`);
        updateDashboardStats();
    }
}

function viewOrderDetails(orderId) {
    const order = adminOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const itemsList = order.items.map(item => 
        `${item.name} x${item.quantity} = ₱${item.price * item.quantity}`
    ).join('\n');
    
    alert(`Order Details: ${orderId}
    
Customer: ${order.customerName}
Email: ${order.customerEmail}
Date: ${new Date(order.date).toLocaleString()}

Items:
${itemsList}

Subtotal: ₱${order.subtotal}
Delivery Fee: ₱${order.deliveryFee}
Total: ₱${order.total}

Delivery Type: ${order.deliveryType}
Status: ${order.status}`);
}

function deleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        const index = adminOrders.findIndex(o => o.id === orderId);
        if (index > -1) {
            adminOrders.splice(index, 1);
            loadOrdersTable();
            updateDashboardStats();
            showNotification('Order deleted successfully!');
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

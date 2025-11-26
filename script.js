
// Global variables
let products = [];

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

// Initialize products from localStorage or use default data
async function initializeProducts() {
    const fallbackProducts = [
        { id: 1, name: "Round Water Container", price: 120, size: "25L", stock: 50, image: "pics/Round_water_container.jpg" },
        { id: 2, name: "Slim Water Gallon", price: 85, size: "20L", stock: 75, image: "pics/Slim_Gallon_Container.jpg" },
        { id: 3, name: "Water Bottle", price: 35, size: "350mL", stock: 100, image: "pics/Water_bottle.png" },
    ];

    try {
        const remote = await apiGet('/products');
        // map server shape to front-end shape (image_url -> image)
        products = remote.map(p => ({ id: p.id, name: p.name, price: p.price, size: p.size || '', stock: p.stock ?? 0, image: p.image_url || '' }));
        saveProductsToStorage();
    } catch (e) {
        // fallback to localStorage or defaults
        const storedProducts = localStorage.getItem('bigze-products');
        if (storedProducts) {
            products = JSON.parse(storedProducts);
        } else {
            products = fallbackProducts;
            saveProductsToStorage();
        }
    }
}

// Save products to localStorage
function saveProductsToStorage() {
    localStorage.setItem('bigze-products', JSON.stringify(products));
}

//
// Image helpers for rendering product photos or fallbacks
//
function isImageSource(value) {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    if (v.startsWith('data:') || v.startsWith('blob:')) return true;
    if (/^https?:\/\//i.test(v) || /^\/\//.test(v)) {
        return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(v);
    }
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(v)) return true;
    return false;
}

function productImageTag(src, alt, options = {}) {
    const width = options.width || '100%';
    const height = options.height || '100%';
    const objectFit = options.objectFit || 'cover';
    return `<img src="${src}" alt="${alt}" style="width:${width};height:${height};object-fit:${objectFit};display:block;">`;
}

let cart = [];
let currentUser = null;
let orders = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', async function() {
    try { const saved = localStorage.getItem('bigze-current-user'); if (saved) currentUser = JSON.parse(saved); } catch {}
    await initializeProducts();
    setupEventListeners();
    loadCartFromStorage();
    updateCartDisplay();
    if (document.getElementById('products-grid')) {
        loadProducts();
    }
});

// Setup Event Listeners
function setupEventListeners() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
        // Close menu when a link is clicked (mobile UX)
        navMenu.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => navMenu.classList.remove('active'));
        });
    }

    // Search functionality
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    
    if (searchInput) searchInput.addEventListener('input', filterProducts);
    if (sortSelect) sortSelect.addEventListener('change', sortProducts);

    // Modal functionality
    setupModals();

    // Contact form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactForm);
    }

    // Auth forms
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    
    loginForm.addEventListener('submit', handleLogin);
    signupForm.addEventListener('submit', handleSignup);

    // Delivery options
    const deliveryOptions = document.querySelectorAll('input[name="delivery"]');
    deliveryOptions.forEach(option => {
        option.addEventListener('change', handleDeliveryChange);
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('Service Worker registered successfully'))
            .catch((error) => console.log('Service Worker registration failed:', error));
    }
}

// Modal Setup
function setupModals() {
    const modals = document.querySelectorAll('.modal');
    const closeBtns = document.querySelectorAll('.close');
    
    // Cart modal
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('cart-modal');
            updateCartModal();
        });
    }

    // Login modal
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentUser) {
                // If logged in, show logout option
                if (confirm('Do you want to logout?')) {
                    logout();
                }
            } else {
                openModal('login-modal');
            }
        });
    }

    // Order history modal
    const orderHistoryBtn = document.getElementById('order-history-btn');
    if (orderHistoryBtn) {
        orderHistoryBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal('order-history-modal');
            loadOrderHistory();
        });
    }

    // Close modals
    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal').id);
        });
    });

    // Click outside to close
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// Product Functions
function loadProducts() {
    const productsGrid = document.getElementById('products-grid');
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    products.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
    document.getElementById('loading-spinner').style.display = 'block';
    // ... load products ...
    document.getElementById('loading-spinner').style.display = 'none';
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card fade-in';
    
    const stockStatus = getStockStatus(product.stock);
    const isOutOfStock = product.stock === 0;
    
    const hasImage = isImageSource(product.image);
    const imageHtml = hasImage
        ? productImageTag(product.image, product.name, {})
        : `<span style="font-size:64px;display:block;text-align:center;">${product.image || '🚰'}</span>`;
    
    card.innerHTML = `
        <div class="product-image">${imageHtml}</div>
        <div class="product-info">
            <h3>${product.name}</h3>
            <p class="product-price">₱${product.price}</p>
            <p>Size: ${product.size}</p>
            <span class="stock-status ${stockStatus.class}">${stockStatus.text}</span>
            <div class="quantity-controls">
                <button class="quantity-btn" onclick="changeQuantity(${product.id}, -1)" ${isOutOfStock ? 'disabled' : ''}>-</button>
                <input type="number" class="quantity-input" id="quantity-${product.id}" value="1" min="1" max="${product.stock}" ${isOutOfStock ? 'disabled' : ''}>
                <button class="quantity-btn" onclick="changeQuantity(${product.id}, 1)" ${isOutOfStock ? 'disabled' : ''}>+</button>
            </div>
            <button class="add-to-cart" onclick="addToCart(${product.id})" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
            </button>
        </div>
    `;
    
    return card;
}

function getStockStatus(stock) {
    if (stock === 0) {
        return { class: 'out-of-stock', text: 'Out of Stock' };
    } else if (stock <= 10) {
        return { class: 'low-stock', text: `Low Stock (${stock} left)` };
    } else {
        return { class: 'in-stock', text: `In Stock (${stock} available)` };
    }
}

function changeQuantity(productId, change) {
    const quantityInput = document.getElementById(`quantity-${productId}`);
    const product = products.find(p => p.id === productId);
    const newQuantity = parseInt(quantityInput.value) + change;
    
    if (newQuantity >= 1 && newQuantity <= product.stock) {
        quantityInput.value = newQuantity;
    }
}

// Cart Functions
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const quantity = parseInt(document.getElementById(`quantity-${productId}`).value);
    
    if (product.stock < quantity) {
        alert('Not enough stock available!');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: product.image
        });
    }
    
    // Update product stock (simulation)
    product.stock -= quantity;
    
    updateCartDisplay();
    saveCartToStorage();
    saveProductsToStorage(); // Save updated stock to localStorage
    showNotification(`${product.name} added to cart!`);
    
    // Refresh product display
    loadProducts();
}

function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const product = products.find(p => p.id === productId);
        
        // Restore stock
        product.stock += item.quantity;
        
        cart.splice(itemIndex, 1);
        updateCartDisplay();
        updateCartModal();
        saveCartToStorage();
        saveProductsToStorage(); // Save updated stock to localStorage
        loadProducts();
    }
}

function updateCartQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    const product = products.find(p => p.id === productId);
    
    if (item && newQuantity > 0) {
        const quantityDiff = newQuantity - item.quantity;
        
        if (product.stock >= quantityDiff) {
            product.stock -= quantityDiff;
            item.quantity = newQuantity;
            updateCartDisplay();
            updateCartModal();
            saveCartToStorage();
            saveProductsToStorage(); // Save updated stock to localStorage
            loadProducts();
        } else {
            alert('Not enough stock available!');
        }
    }
}

function updateCartDisplay() {
    const cartCount = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

function updateCartModal() {
    const cartItems = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('subtotal');
    const totalEl = document.getElementById('total');
    const deliveryFeeEl = document.getElementById('delivery-fee');
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p>Your cart is empty</p>';
        subtotalEl.textContent = '0';
        totalEl.textContent = '0';
        return;
    }
    
    let subtotal = 0;
    
    cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    
    const cartItem = document.createElement('div');
    cartItem.className = 'cart-item';
    cartItem.innerHTML = `
    <div class="cart-item-info">
    <h4>${isImageSource(item.image) ? ('<img src="' + item.image + '" alt="' + item.name + '" style="width:24px;height:24px;object-fit:cover;border-radius:3px;margin-right:6px;vertical-align:middle;">') : (item.image ? (item.image + ' ') : '')}${item.name}</h4>
    <p>₱${item.price} x ${item.quantity} = ₱${itemTotal}</p>
    </div>
    <div class="cart-item-quantity">
    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
    <span>${item.quantity}</span>
    <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
    </div>
    <button class="cart-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
    `;
    cartItems.appendChild(cartItem);
    });
    
    const deliveryFee = getDeliveryFee();
    const total = subtotal + deliveryFee;
    
    subtotalEl.textContent = subtotal;
    deliveryFeeEl.textContent = deliveryFee;
    totalEl.textContent = total;
}

function getDeliveryFee() {
    const deliveryType = document.querySelector('input[name="delivery"]:checked')?.value;
    return deliveryType === 'same-day' ? 50 : 0;
}

// Search and Filter Functions
function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm) ||
        product.size.toLowerCase().includes(searchTerm)
    );
    
    displayFilteredProducts(filteredProducts);
}

function sortProducts() {
    const sortValue = document.getElementById('sort-select').value;
    let sortedProducts = [...products];
    
    switch(sortValue) {
        case 'name':
            sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-low':
            sortedProducts.sort((a, b) => a.price - b.price);
            break;
        case 'price-high':
            sortedProducts.sort((a, b) => b.price - a.price);
            break;
        case 'size':
            sortedProducts.sort((a, b) => a.size.localeCompare(b.size));
            break;
    }
    
    displayFilteredProducts(sortedProducts);
}

function displayFilteredProducts(productList) {
    const productsGrid = document.getElementById('products-grid');
    productsGrid.innerHTML = '';
    
    productList.forEach(product => {
        const productCard = createProductCard(product);
        productsGrid.appendChild(productCard);
    });
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Authentication Functions
function showTab(tabName) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    if (tabName === 'login') {
        loginForm.style.display = 'flex';
        signupForm.style.display = 'none';
        tabBtns[0].classList.add('active');
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'flex';
        tabBtns[1].classList.add('active');
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector('input[type="email"]').value;
    const password = form.querySelector('input[type="password"]').value;

    // Admin shortcut
    if (email === 'admin@gmail.com' && password === 'admin123') {
        localStorage.setItem('admin-session', 'true');
        window.location.href = 'admin.html';
        return;
    }

    try {
        const { user } = await apiPost('/auth/login', { email, password });
        currentUser = { id: user.id, name: user.full_name, email: user.email, phone: user.phone, address: user.address };
        localStorage.setItem('bigze-current-user', JSON.stringify(currentUser));
        closeModal('login-modal');
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) loginBtn.textContent = `Welcome, ${currentUser.name}`;
        showNotification('Login successful!');
    } catch (err) {
        showNotification('Login failed. Please check your credentials.');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const form = e.target;
    const fullName = form.querySelector('input[placeholder="Full Name"]').value.trim();
    const email = form.querySelector('input[type="email"]').value.trim();
    const password = form.querySelector('input[type="password"]').value;
    const phone = form.querySelector('input[type="tel"]').value.trim();
    const address = form.querySelector('textarea').value.trim();

    if (!fullName) {
        alert('Please enter your full name');
        return;
    }

    try {
        const { user } = await apiPost('/auth/signup', { fullName, email, password, phone, address });
        currentUser = { id: user.id, name: user.full_name, email: user.email, phone: user.phone, address: user.address };
        localStorage.setItem('bigze-current-user', JSON.stringify(currentUser));
        closeModal('login-modal');
        document.getElementById('login-btn').textContent = `Welcome, ${currentUser.name}`;
        showNotification(`Account created successfully! Welcome ${currentUser.name}!`);
    } catch (err) {
        const msg = ('' + err).includes('409') ? 'Email already registered' : 'Signup failed';
        showNotification(msg);
    }
}

// Checkout Functions
function handleDeliveryChange() {
    const deliveryType = document.querySelector('input[name="delivery"]:checked').value;
    const deliveryTimeInput = document.getElementById('delivery-time');
    
    if (deliveryType === 'scheduled') {
        deliveryTimeInput.style.display = 'block';
        deliveryTimeInput.required = true;
    } else {
        deliveryTimeInput.style.display = 'none';
        deliveryTimeInput.required = false;
    }
    
    updateCartModal();
}

async function checkout() {
    if (cart.length === 0) {
        alert('Your cart is empty!');
        return;
    }

    if (!currentUser) {
        alert('Please login to place an order!');
        openModal('login-modal');
        closeModal('cart-modal');
        return;
    }

    const deliveryType = document.querySelector('input[name="delivery"]:checked').value;
    const deliveryTime = document.getElementById('delivery-time').value;

    if (deliveryType === 'scheduled' && !deliveryTime) {
        alert('Please select a delivery time!');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const deliveryFee = getDeliveryFee();
    const total = subtotal + deliveryFee;

    try {
        const payload = {
            customer_id: currentUser.id,
            items: cart.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
            total,
            delivery: deliveryType === 'same-day' ? `same-day` : `scheduled:${deliveryTime || ''}`,
            status: 'confirmed'
        };
        const created = await apiPost('/orders', payload);

        const order = {
            id: created.order_id || ('ORD' + Date.now()),
            customerId: currentUser.id,
            items: [...cart],
            subtotal,
            deliveryFee,
            total,
            deliveryType,
            deliveryTime: deliveryTime || 'Same day',
            status: 'confirmed',
            date: new Date().toISOString()
        };
        orders.push(order);
        saveOrderToStorage(order);

        cart = [];
        updateCartDisplay();
        saveCartToStorage();

        closeModal('cart-modal');
        document.getElementById('order-id').textContent = order.id;
        openModal('success-modal');
        setTimeout(() => showNotification('Order confirmation sent via SMS and Email!'), 1500);
    } catch (err) {
        showNotification('Checkout failed. Please try again.');
    }
}

// Utility Functions
function scrollToProducts() {
    const el = document.getElementById('products');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
    } else {
        window.location.href = 'products.html';
    }
}

function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--primary-color);
        color: white;
        padding: 1rem 2rem;
        border-radius: 25px;
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function handleContactForm(e) {
    e.preventDefault();
    showNotification('Message sent! We will get back to you soon.');
    e.target.reset();
}

// Local Storage Functions
function saveCartToStorage() {
    localStorage.setItem('bigze-cart', JSON.stringify(cart));
}

function loadCartFromStorage() {
    const savedCart = localStorage.getItem('bigze-cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
}

function saveOrderToStorage(order) {
    let allOrders = JSON.parse(localStorage.getItem('bigze-orders') || '[]');
    allOrders.push(order);
    localStorage.setItem('bigze-orders', JSON.stringify(allOrders));
}

function getUserOrders() {
    if (!currentUser) return [];
    
    let allOrders = JSON.parse(localStorage.getItem('bigze-orders') || '[]');
    return allOrders.filter(order => order.customerId === currentUser.id);
}

function loadOrderHistory() {
    const orderHistoryContent = document.getElementById('order-history-content');
    
    if (!currentUser) {
        orderHistoryContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-user-lock" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                <h3>Login Required</h3>
                <p>Please login to view your order history.</p>
                <button class="cta-button" onclick="closeModal('order-history-modal'); openModal('login-modal');">
                    Login Now
                </button>
            </div>
        `;
        return;
    }
    
    const userOrders = getUserOrders();
    
    if (userOrders.length === 0) {
        orderHistoryContent.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--primary-color); margin-bottom: 1rem;"></i>
                <h3>No Orders Yet</h3>
                <p>You haven't placed any orders yet. Start shopping to see your order history here!</p>
                <button class="cta-button" onclick="closeModal('order-history-modal'); scrollToProducts()">
                    Start Shopping
                </button>
            </div>
        `;
        return;
    }
    
    // Sort orders by date (newest first)
    userOrders.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    orderHistoryContent.innerHTML = `
        <div class="order-history-list">
            ${userOrders.map(order => `
                <div class="order-item" style="border: 2px solid var(--light-blue); border-radius: 10px; padding: 1.5rem; margin-bottom: 1rem; background: white;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 style="color: var(--primary-color);">Order #${order.id}</h3>
                        <span class="status-badge ${order.status}" style="padding: 0.5rem 1rem; border-radius: 15px; font-weight: bold; color: white; background: ${getStatusColor(order.status)};">
                            ${getStatusText(order.status)}
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <strong>Order Date:</strong><br>
                            ${new Date(order.date).toLocaleDateString()} at ${new Date(order.date).toLocaleTimeString()}
                        </div>
                        <div>
                            <strong>Total Amount:</strong><br>
                            ₱${order.total}
                        </div>
                        <div>
                            <strong>Delivery Type:</strong><br>
                            ${order.deliveryType === 'same-day' ? 'Same Day Delivery' : 'Scheduled Delivery'}
                        </div>
                        <div>
                            <strong>Delivery Time:</strong><br>
                            ${order.deliveryTime}
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid var(--light-blue); padding-top: 1rem;">
                        <strong>Items Ordered:</strong>
                        <ul style="margin-top: 0.5rem;">
                            ${order.items.map(item => `
                                <li>${isImageSource(item.image) ? ('<img src="' + item.image + '" alt="' + item.name + '" style="width:18px;height:18px;object-fit:cover;border-radius:3px;margin-right:6px;vertical-align:middle;">') : (item.image ? (item.image + ' ') : '')}${item.name} x${item.quantity} = ₱${item.price * item.quantity}</li>
                            `).join('')}
                        </ul>
                    </div>
                    
                    <div style="text-align: right; margin-top: 1rem; font-size: 0.9rem; color: var(--dark-gray);">
                        Subtotal: ₱${order.subtotal} | Delivery: ₱${order.deliveryFee} | <strong>Total: ₱${order.total}</strong>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getStatusColor(status) {
    switch(status) {
        case 'confirmed': return '#ffc107';
        case 'preparing': return '#17a2b8';
        case 'out-for-delivery': return '#fd7e14';
        case 'delivered': return '#28a745';
        case 'cancelled': return '#dc3545';
        default: return '#6c757d';
    }
}

function getStatusText(status) {
    switch(status) {
        case 'confirmed': return 'Confirmed';
        case 'preparing': return 'Preparing';
        case 'out-for-delivery': return 'Out for Delivery';
        case 'delivered': return 'Delivered';
        case 'cancelled': return 'Cancelled';
        default: return 'Unknown';
    }
}

function logout() {
    currentUser = null;
    document.getElementById('login-btn').textContent = 'Login';
    showNotification('Logged out successfully!');
}

// Admin Functions (for demonstration)
function generateSalesReport() {
    console.log('Sales Report:', orders);
    return orders;
}

function updateProductStock(productId, newStock) {
    const product = products.find(p => p.id === productId);
    if (product) {
        product.stock = newStock;
        loadProducts();
    }
}

// Initialize
console.log('Bigze H2O M Ordering System Loaded Successfully!');
console.log('Available admin functions: generateSalesReport(), updateProductStock(id, stock)');

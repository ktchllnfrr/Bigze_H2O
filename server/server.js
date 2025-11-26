import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: '*'}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

// Auth
app.post('/api/auth/signup', (req, res) => {
  const { fullName, email, password, phone, address } = req.body || {};
  if (!fullName || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const info = db.prepare(`INSERT INTO users (full_name, email, password_hash, phone, address) VALUES (?, ?, ?, ?, ?)`)
      .run(fullName, email.toLowerCase(), hash, phone || null, address || null);
    const user = db.prepare(`SELECT id, full_name, email, phone, address, created_at FROM users WHERE id = ?`).get(info.lastInsertRowid);
    res.json({ user });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ user: { id: user.id, full_name: user.full_name, email: user.email, phone: user.phone, address: user.address } });
});

// Products CRUD
app.get('/api/products', (req, res) => {
  const rows = db.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();
  res.json(rows);
});

app.post('/api/products', (req, res) => {
  const { name, price, size, stock, image_url } = req.body || {};
  if (!name || price == null) return res.status(400).json({ error: 'Missing required fields' });
  const info = db.prepare(`INSERT INTO products (name, price, size, stock, image_url) VALUES (?, ?, ?, ?, ?)`)
    .run(name, Number(price), size || null, Number(stock || 0), image_url || null);
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(info.lastInsertRowid);
  res.json(row);
});

app.put('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name = existing.name, price = existing.price, size = existing.size, stock = existing.stock, image_url = existing.image_url } = req.body || {};
  db.prepare(`UPDATE products SET name=?, price=?, size=?, stock=?, image_url=? WHERE id=?`).run(name, Number(price), size, Number(stock), image_url, id);
  const row = db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
  res.json(row);
});

app.delete('/api/products/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  res.json({ ok: true });
});

// Orders CRUD
app.get('/api/orders', (req, res) => {
  const rows = db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  res.json(rows.map(r => ({ ...r, items: JSON.parse(r.items) })));
});

app.post('/api/orders', (req, res) => {
  const { customer_id, items, total, delivery, status } = req.body || {};
  if (!items || !Array.isArray(items)) return res.status(400).json({ error: 'Items must be an array' });
  const orderId = 'ORD-' + uuidv4();
  const info = db.prepare(`INSERT INTO orders (order_id, customer_id, items, total, delivery, status) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(orderId, customer_id || null, JSON.stringify(items), Number(total || 0), delivery || null, status || 'pending');
  const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(info.lastInsertRowid);
  res.json({ ...row, items });
});

app.put('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { customer_id = existing.customer_id, items = JSON.parse(existing.items), total = existing.total, delivery = existing.delivery, status = existing.status } = req.body || {};
  db.prepare(`UPDATE orders SET customer_id=?, items=?, total=?, delivery=?, status=? WHERE id=?`).run(customer_id, JSON.stringify(items), Number(total), delivery, status, id);
  const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id);
  res.json({ ...row, items: JSON.parse(row.items) });
});

app.delete('/api/orders/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM orders WHERE id = ?`).run(id);
  res.json({ ok: true });
});

// Customers CRUD
app.get('/api/customers', (req, res) => {
  const rows = db.prepare(`SELECT * FROM customers ORDER BY created_at DESC`).all();
  res.json(rows);
});

app.post('/api/customers', (req, res) => {
  const { name, email, phone, orders = 0, total_spent = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Name required' });
  const info = db.prepare(`INSERT INTO customers (name, email, phone, orders, total_spent) VALUES (?, ?, ?, ?, ?)`)
    .run(name, email || null, phone || null, Number(orders), Number(total_spent));
  const row = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(info.lastInsertRowid);
  res.json(row);
});

app.put('/api/customers/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
  if (!existing) return res.status(404).json({ error: 'Not found' });
  const { name = existing.name, email = existing.email, phone = existing.phone, orders = existing.orders, total_spent = existing.total_spent } = req.body || {};
  db.prepare(`UPDATE customers SET name=?, email=?, phone=?, orders=?, total_spent=? WHERE id=?`).run(name, email, phone, Number(orders), Number(total_spent), id);
  const row = db.prepare(`SELECT * FROM customers WHERE id = ?`).get(id);
  res.json(row);
});

app.delete('/api/customers/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare(`DELETE FROM customers WHERE id = ?`).run(id);
  res.json({ ok: true });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});

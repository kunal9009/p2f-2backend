require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const connectDB = require('./src/config/db');
const { apiLimiter } = require('./src/middleware/rateLimiter');
const { startScheduler } = require('./src/utils/taskScheduler');

// ─── PUBLIC ROUTES ───
const publicTrackingRoutes = require('./src/routes/public/trackingRoutes');

// ─── ADMIN ROUTES ───
const adminAuthRoutes = require('./src/routes/admin/authRoutes');
const adminDashboardRoutes = require('./src/routes/admin/dashboardRoutes');
const adminProductRoutes = require('./src/routes/admin/productRoutes');
const adminOrderRoutes = require('./src/routes/admin/orderRoutes');
const adminCustomerRoutes = require('./src/routes/admin/customerRoutes');
const adminVendorRoutes = require('./src/routes/admin/vendorRoutes');
const adminInvoiceRoutes = require('./src/routes/admin/invoiceRoutes');
const adminUserRoutes = require('./src/routes/admin/userRoutes');
const adminPricingRoutes = require('./src/routes/admin/pricingRoutes');
const adminReportRoutes = require('./src/routes/admin/reportRoutes');
const adminTaskRoutes  = require('./src/routes/admin/taskRoutes');
const adminAiRoutes    = require('./src/routes/admin/aiRoutes');

// ─── VENDOR ROUTES ───
const vendorAuthRoutes = require('./src/routes/vendor/authRoutes');
const vendorOrderRoutes = require('./src/routes/vendor/orderRoutes');
const vendorShipmentRoutes = require('./src/routes/vendor/shipmentRoutes');
const vendorProductRoutes = require('./src/routes/vendor/productRoutes');

const app = express();

// ─── DEBUG ENV CHECK ───
console.log("ENV CHECK → MONGODB_URI:", process.env.MONGODB_URI ? "[set]" : "NOT SET ← deploy will fail");
console.log("ENV CHECK → PORT:", process.env.PORT || "(using default 3000)");

// ─── ENSURE UPLOAD DIRECTORY EXISTS ───
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─── MIDDLEWARE ───
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api', apiLimiter);

// ─── STATIC ───
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// Vanilla UI
app.use('/tasks-ui', express.static(path.join(__dirname, 'public')));
app.get('/tasks-ui', (req, res) => res.redirect('/tasks-ui/index.html'));

// React UI
const reactDist = path.join(__dirname, 'client-dist');
// Only files under /assets/ are fingerprinted by Vite; everything else
// (index.html, favicon, manifest, service workers) must revalidate so a
// new deploy is picked up without a hard refresh.
app.use('/app', express.static(reactDist, {
  setHeaders(res, filePath) {
    const rel = path.relative(reactDist, filePath);
    if (rel === 'assets' || rel.startsWith('assets' + path.sep)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));
app.get('/app/*', (req, res) => {
  const indexPath = path.join(reactDist, 'index.html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(indexPath, err => {
    if (err) res.status(404).json({
      success: false,
      message: 'React build not found'
    });
  });
});

// ─── HEALTH CHECK ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ ROOT CHECK
app.get('/', (req, res) => {
  res.send('MahattaART Backend is running ✅');
});

// ✅ ADMIN CREATE ROUTE (IMPORTANT FIX)
app.get('/create-admin', async (req, res) => {
  try {
    const User = require('./src/models/User');
    const bcrypt = require('bcryptjs');

    const email = 'admin@mahattaart.com';
    const password = 'admin@1234';

    const existing = await User.findOne({ email });
    if (existing) {
      return res.send('Admin already exists ✅');
    }

    const user = new User({
      name: 'Admin',
      email,
      password,
      role: 'admin'
    });

    await user.save();

    res.send('Admin created successfully ✅');
  } catch (err) {
    res.send('Error: ' + err.message);
  }
});

// ─── PUBLIC API ───
app.use('/api/public', publicTrackingRoutes);

// ─── ADMIN API ───
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/products', adminProductRoutes);
app.use('/api/admin/orders', adminOrderRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/vendors', adminVendorRoutes);
app.use('/api/admin/invoices', adminInvoiceRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/pricing', adminPricingRoutes);
app.use('/api/admin/reports', adminReportRoutes);
app.use('/api/admin/tasks', adminTaskRoutes);
app.use('/api/admin/ai',    adminAiRoutes);

// ─── VENDOR API ───
app.use('/api/vendor/auth', vendorAuthRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/vendor/shipments', vendorShipmentRoutes);
app.use('/api/vendor/products', vendorProductRoutes);

// ─── 404 ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    startScheduler();
    app.listen(PORT, () => {
      console.log(`MahattaART backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

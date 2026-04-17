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

// ─── VENDOR ROUTES ───
const vendorAuthRoutes = require('./src/routes/vendor/authRoutes');
const vendorOrderRoutes = require('./src/routes/vendor/orderRoutes');
const vendorShipmentRoutes = require('./src/routes/vendor/shipmentRoutes');
const vendorProductRoutes = require('./src/routes/vendor/productRoutes');

const app = express();

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

// Rate limiter
app.use('/api', apiLimiter);

// Static folders
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// Task UI (simple)
app.use('/tasks-ui', express.static(path.join(__dirname, 'public')));
app.get('/tasks-ui', (req, res) => res.redirect('/tasks-ui/index.html'));

// React app
const reactDist = path.join(__dirname, 'client-dist');
app.use('/app', express.static(reactDist));
app.get('/app/*', (req, res) => {
  const indexPath = path.join(reactDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) res.status(404).json({
      success: false,
      message: 'React build not found. Run: cd client && npm run build'
    });
  });
});

// ─── HEALTH CHECK ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ✅ ROOT ROUTE (FIX ADDED)
app.get('/', (req, res) => {
  res.send('MahattaART Backend is running ✅');
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

// ─── VENDOR API ───
app.use('/api/vendor/auth', vendorAuthRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/vendor/shipments', vendorShipmentRoutes);
app.use('/api/vendor/products', vendorProductRoutes);

// ─── 404 HANDLER ───
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`
  });
});

// ─── ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
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
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

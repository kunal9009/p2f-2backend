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

// ─── VENDOR (VIKAS) ROUTES ───
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

// General rate limit on all /api routes
app.use('/api', apiLimiter);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, uploadDir)));

// ─── HEALTH CHECK ───
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── PUBLIC API (/api/public/*) — no auth required ───
app.use('/api/public', publicTrackingRoutes);

// ─── ADMIN API (/api/admin/*) ───
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
app.use('/api/admin/tasks',  adminTaskRoutes);

// ─── VENDOR API (/api/vendor/*) ───
app.use('/api/vendor/auth', vendorAuthRoutes);
app.use('/api/vendor/orders', vendorOrderRoutes);
app.use('/api/vendor/shipments', vendorShipmentRoutes);
app.use('/api/vendor/products', vendorProductRoutes);

// ─── 404 HANDLER ───
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found` });
});

// ─── GLOBAL ERROR HANDLER ───
app.use((err, req, res, next) => {
  console.error(err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    startScheduler();
    app.listen(PORT, () => {
      console.log(`MahattaART backend running on port ${PORT}`);
      console.log(`  Admin API : http://localhost:${PORT}/api/admin`);
      console.log(`  Vendor API: http://localhost:${PORT}/api/vendor`);
      console.log(`  Task API  : http://localhost:${PORT}/api/admin/tasks`);
    });
  })
  .catch((err) => {
    console.error('DB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;

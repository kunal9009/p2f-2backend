import { adminApi } from './axios';

// ── Auth ──────────────────────────────────────────────────────────────────────
export const adminLogin = (data) => adminApi.post('/admin/auth/login', data);
export const adminGetMe = () => adminApi.get('/admin/auth/me');
export const adminRefresh = () => adminApi.post('/admin/auth/refresh');
export const adminChangePassword = (data) => adminApi.patch('/admin/auth/change-password', data);
export const adminRegisterUser = (data) => adminApi.post('/admin/auth/register', data);

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboardStats = () => adminApi.get('/admin/dashboard/stats');
export const getRecentOrders = (limit = 10) => adminApi.get(`/admin/dashboard/recent-orders?limit=${limit}`);
export const getPipeline = () => adminApi.get('/admin/dashboard/pipeline');

// ── Orders ────────────────────────────────────────────────────────────────────
export const getOrders = (params) => adminApi.get('/admin/orders', { params });
export const getOrder = (id) => adminApi.get(`/admin/orders/${id}`);
export const createOrder = (data) => adminApi.post('/admin/orders', data);
export const updateOrder = (id, data) => adminApi.put(`/admin/orders/${id}`, data);
export const updateOrderStatus = (id, data) => adminApi.patch(`/admin/orders/${id}/status`, data);
export const getOrderHistory = (id) => adminApi.get(`/admin/orders/${id}/history`);
export const assignVendor = (id, vendorId) => adminApi.patch(`/admin/orders/${id}/assign-vendor`, { vendorId });
export const bulkAssignVendor = (orderIds, vendorId) => adminApi.patch('/admin/orders/bulk-assign-vendor', { orderIds, vendorId });
export const updatePayment = (id, data) => adminApi.patch(`/admin/orders/${id}/payment`, data);
export const updateAddress = (id, data) => adminApi.patch(`/admin/orders/${id}/address`, data);
export const updateNotes = (id, notes) => adminApi.patch(`/admin/orders/${id}/notes`, { adminNotes: notes });

// ── Products ──────────────────────────────────────────────────────────────────
export const getProducts = (type, params) => adminApi.get(`/admin/products/${type}`, { params });
export const getProduct = (type, id) => adminApi.get(`/admin/products/${type}/${id}`);
export const createProduct = (type, data) => adminApi.post(`/admin/products/${type}`, data);
export const updateProduct = (type, id, data) => adminApi.put(`/admin/products/${type}/${id}`, data);
export const deleteProduct = (type, id) => adminApi.delete(`/admin/products/${type}/${id}`);
export const reactivateProduct = (type, id) => adminApi.patch(`/admin/products/${type}/${id}/reactivate`);

// ── Customers ─────────────────────────────────────────────────────────────────
export const getCustomers = (params) => adminApi.get('/admin/customers', { params });
export const getCustomer = (id) => adminApi.get(`/admin/customers/${id}`);
export const createCustomer = (data) => adminApi.post('/admin/customers', data);
export const updateCustomer = (id, data) => adminApi.put(`/admin/customers/${id}`, data);
export const deleteCustomer = (id) => adminApi.delete(`/admin/customers/${id}`);
export const reactivateCustomer = (id) => adminApi.patch(`/admin/customers/${id}/reactivate`);
export const getCustomerOrders = (id, params) => adminApi.get(`/admin/customers/${id}/orders`, { params });

// ── Vendors ───────────────────────────────────────────────────────────────────
export const getVendors = (params) => adminApi.get('/admin/vendors', { params });
export const getVendor = (id) => adminApi.get(`/admin/vendors/${id}`);
export const createVendor = (data) => adminApi.post('/admin/vendors', data);
export const updateVendor = (id, data) => adminApi.put(`/admin/vendors/${id}`, data);
export const deleteVendor = (id) => adminApi.delete(`/admin/vendors/${id}`);
export const reactivateVendor = (id) => adminApi.patch(`/admin/vendors/${id}/reactivate`);
export const getVendorOrders = (id, params) => adminApi.get(`/admin/vendors/${id}/orders`, { params });

// ── Invoices ──────────────────────────────────────────────────────────────────
export const getInvoices = (params) => adminApi.get('/admin/invoices', { params });
export const getInvoice = (id) => adminApi.get(`/admin/invoices/${id}`);
export const generateInvoice = (orderId, data) => adminApi.post(`/admin/invoices/generate/${orderId}`, data);

// ── Reports ───────────────────────────────────────────────────────────────────
export const getRevenueReport = (params) => adminApi.get('/admin/reports/revenue', { params });
export const getOrdersReport = (params) => adminApi.get('/admin/reports/orders', { params });
export const getGstReport = (params) => adminApi.get('/admin/reports/gst', { params });
export const getVendorPerformance = (params) => adminApi.get('/admin/reports/vendor-performance', { params });

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers = (params) => adminApi.get('/admin/users', { params });
export const getUser = (id) => adminApi.get(`/admin/users/${id}`);
export const updateUser = (id, data) => adminApi.put(`/admin/users/${id}`, data);
export const resetPassword = (id, data) => adminApi.patch(`/admin/users/${id}/reset-password`, data);
export const deleteUser = (id) => adminApi.delete(`/admin/users/${id}`);
export const reactivateUser = (id) => adminApi.patch(`/admin/users/${id}/reactivate`);

// ── Pricing ───────────────────────────────────────────────────────────────────
export const calculatePricing = (data) => adminApi.post('/admin/pricing/calculate', data);
export const calculatePaperCost = (data) => adminApi.post('/admin/pricing/paper-cost', data);
export const calculateSizeGrid = (data) => adminApi.post('/admin/pricing/size-grid', data);

// ── Vendor Payments ───────────────────────────────────────────────────────────
export const getVendorPayments = (params) => adminApi.get('/admin/vendor-payments', { params });
export const getVendorPayment = (id) => adminApi.get(`/admin/vendor-payments/${id}`);
export const getVendorLedger = (vendorId) => adminApi.get(`/admin/vendor-payments/ledger/${vendorId}`);
export const createVendorPayment = (data) => adminApi.post('/admin/vendor-payments', data);
export const updateVendorPaymentStatus = (id, data) => adminApi.patch(`/admin/vendor-payments/${id}/status`, data);

// ── Catalog ───────────────────────────────────────────────────────────────────
export const getCatalog = (type, params) => adminApi.get(`/admin/catalog/${type}`, { params });

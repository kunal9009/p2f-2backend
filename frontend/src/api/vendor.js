import { vendorApi } from './axios';

export const vendorLogin = (data) => vendorApi.post('/vendor/auth/login', data);
export const vendorGetMe = () => vendorApi.get('/vendor/auth/me');
export const vendorRefresh = () => vendorApi.post('/vendor/auth/refresh');
export const vendorChangePassword = (data) => vendorApi.patch('/vendor/auth/change-password', data);

export const getVendorStats = () => vendorApi.get('/vendor/orders/stats');
export const getVendorOrders = (params) => vendorApi.get('/vendor/orders', { params });
export const getVendorOrder = (id) => vendorApi.get(`/vendor/orders/${id}`);
export const updateVendorOrderStatus = (id, data) => vendorApi.patch(`/vendor/orders/${id}/status`, data);
export const updateProductionCost = (id, data) => vendorApi.patch(`/vendor/orders/${id}/production-cost`, data);

export const getVendorShipments = (params) => vendorApi.get('/vendor/shipments', { params });
export const createShipment = (data) => vendorApi.post('/vendor/shipments', data);
export const updateShipment = (id, data) => vendorApi.patch(`/vendor/shipments/${id}`, data);

export const getVendorPaymentSummary = () => vendorApi.get('/vendor/payments/summary');
export const getVendorPaymentList = (params) => vendorApi.get('/vendor/payments', { params });

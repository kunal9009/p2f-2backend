const { STATUS_TRANSITIONS } = require('../config/constants');
const Counter = require('../models/Counter');

/**
 * Generate MA-prefixed customer ID: MA0028409
 * Uses atomic DB counter to prevent duplicates under concurrent requests.
 */
const generateCustomerId = async () => {
  const seq = await Counter.nextSeq('customer');
  return `MA${String(seq).padStart(7, '0')}`;
};

/**
 * Generate atomic sequential order ID: ORD-YYYYMMDD-NNN
 */
const generateOrderIdAtomic = async () => {
  const seq = await Counter.nextSeq('order');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${dateStr}-${String(seq).padStart(4, '0')}`;
};

/**
 * Generate atomic invoice number: INV-YYYY-NNNN
 */
const generateInvoiceNumberAtomic = async () => {
  const seq = await Counter.nextSeq('invoice');
  return `INV-${new Date().getFullYear()}-${String(seq).padStart(4, '0')}`;
};

/**
 * Check if a status transition is valid
 */
const isValidTransition = (currentStatus, newStatus) => {
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(newStatus);
};

/**
 * Generate sequential order ID: ORD-YYYYMMDD-NNN
 */
const generateOrderId = (sequenceNum) => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequenceNum).padStart(3, '0');
  return `ORD-${dateStr}-${seq}`;
};

/**
 * Generate invoice number: INV-YYYY-NNNN
 */
const generateInvoiceNumber = (sequenceNum) => {
  const year = new Date().getFullYear();
  const seq = String(sequenceNum).padStart(4, '0');
  return `INV-${year}-${seq}`;
};

/**
 * Calculate GST amounts
 */
const calculateGST = (taxableAmount, isInterState = false, cgstRate = 9, sgstRate = 9, igstRate = 18) => {
  if (isInterState) {
    const igstAmount = Math.round((taxableAmount * igstRate) / 100 * 100) / 100;
    return { cgstAmount: 0, sgstAmount: 0, igstAmount, totalTax: igstAmount };
  }
  const cgstAmount = Math.round((taxableAmount * cgstRate) / 100 * 100) / 100;
  const sgstAmount = Math.round((taxableAmount * sgstRate) / 100 * 100) / 100;
  return { cgstAmount, sgstAmount, igstAmount: 0, totalTax: cgstAmount + sgstAmount };
};

/**
 * Build a pagination response
 */
const paginate = (query, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return query.skip(skip).limit(limit);
};

module.exports = {
  isValidTransition,
  generateCustomerId,
  generateOrderId,
  generateOrderIdAtomic,
  generateInvoiceNumber,
  generateInvoiceNumberAtomic,
  calculateGST,
  paginate,
};

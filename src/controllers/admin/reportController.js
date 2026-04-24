const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');
const { ORDER_STATUS } = require('../../config/constants');
const { sendCsv } = require('../../utils/csvExport');

/**
 * Helper: parse ?from and ?to query params into Date range filter.
 * Defaults: from = start of current month, to = now.
 */
const getDateRange = (query) => {
  const now = new Date();
  const from = query.from
    ? new Date(query.from)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = query.to ? new Date(query.to) : now;
  to.setHours(23, 59, 59, 999);
  return { from, to };
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/revenue
// Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD&groupBy=day|week|month
// Returns daily/weekly/monthly revenue and production cost
// ─────────────────────────────────────────────
exports.revenue = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const groupBy = req.query.groupBy || 'day';

    const groupExpr = {
      day:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } },
      week:  { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } },
      month: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
    }[groupBy] || { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };

    const [timeSeries, totals] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lte: to },
            status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] },
          },
        },
        {
          $group: {
            _id: groupExpr,
            orderCount: { $sum: 1 },
            revenue: { $sum: '$totalAmount' },
            productionCost: { $sum: '$totalProductionCost' },
            profit: { $sum: { $subtract: ['$totalAmount', '$totalProductionCost'] } },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: from, $lte: to },
            status: { $nin: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] },
          },
        },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalRevenue: { $sum: '$totalAmount' },
            totalProductionCost: { $sum: '$totalProductionCost' },
            totalProfit: { $sum: { $subtract: ['$totalAmount', '$totalProductionCost'] } },
            avgOrderValue: { $avg: '$totalAmount' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to, groupBy },
        summary: totals[0] || { totalOrders: 0, totalRevenue: 0, totalProductionCost: 0, totalProfit: 0, avgOrderValue: 0 },
        timeSeries,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/orders
// Query: ?from=&to=
// Returns order count breakdown by status, source, and payment status
// ─────────────────────────────────────────────
exports.orders = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const [byStatus, bySource, byPayment, daily] = await Promise.all([
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$paymentStatus', count: { $sum: 1 }, total: { $sum: '$paidAmount' } } },
      ]),
      Order.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to },
        byStatus,
        bySource,
        byPayment,
        dailyOrders: daily,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/gst
// Query: ?from=&to=
// Returns GST summary for filing: total taxable, CGST, SGST, IGST per month
// ─────────────────────────────────────────────
exports.gst = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);

    const [monthly, totals] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } },
            invoiceCount: { $sum: 1 },
            taxableAmount: { $sum: '$subtotal' },
            totalCgst: { $sum: '$totalCgst' },
            totalSgst: { $sum: '$totalSgst' },
            totalIgst: { $sum: '$totalIgst' },
            grandTotal: { $sum: '$grandTotal' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: from, $lte: to } } },
        {
          $group: {
            _id: null,
            invoiceCount: { $sum: 1 },
            taxableAmount: { $sum: '$subtotal' },
            totalCgst: { $sum: '$totalCgst' },
            totalSgst: { $sum: '$totalSgst' },
            totalIgst: { $sum: '$totalIgst' },
            totalTax: { $sum: { $add: ['$totalCgst', '$totalSgst', '$totalIgst'] } },
            grandTotal: { $sum: '$grandTotal' },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to },
        summary: totals[0] || { invoiceCount: 0, taxableAmount: 0, totalCgst: 0, totalSgst: 0, totalIgst: 0, totalTax: 0, grandTotal: 0 },
        monthly,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/vendor-performance
// Query: ?from=&to=&vendorId=
// Returns Vikas's output: orders completed, production cost, avg turnaround
// ─────────────────────────────────────────────
exports.vendorPerformance = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const matchBase = { createdAt: { $gte: from, $lte: to } };
    if (req.query.vendorId) matchBase.assignedVendorId = require('mongoose').Types.ObjectId.createFromHexString(req.query.vendorId);

    const [byVendor, pipeline] = await Promise.all([
      Order.aggregate([
        { $match: { ...matchBase, assignedVendorId: { $exists: true } } },
        {
          $group: {
            _id: '$assignedVendorId',
            totalAssigned: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.ORDER_COMPLETED] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', ORDER_STATUS.CANCEL_BY_PRODUCTION] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $not: [{ $in: ['$status', [ORDER_STATUS.ORDER_COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION]] }] }, 1, 0] } },
            totalProductionCost: { $sum: '$totalProductionCost' },
            totalRevenue: { $sum: '$totalAmount' },
          },
        },
        {
          $lookup: { from: 'vendors', localField: '_id', foreignField: '_id', as: 'vendor' },
        },
        { $unwind: { path: '$vendor', preserveNullAndEmpty: true } },
        {
          $project: {
            vendorName: '$vendor.name',
            totalAssigned: 1, completed: 1, cancelled: 1, inProgress: 1,
            totalProductionCost: 1, totalRevenue: 1,
            completionRate: { $cond: ['$totalAssigned', { $divide: ['$completed', '$totalAssigned'] }, 0] },
          },
        },
      ]),
      Order.aggregate([
        { $match: matchBase },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        period: { from, to },
        byVendor,
        pipelineBreakdown: pipeline,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/export/orders
// Query: ?from=&to=&status=&source=
// Streams a CSV file download of all matching orders
// ─────────────────────────────────────────────
exports.exportOrders = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const filter = { createdAt: { $gte: from, $lte: to } };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;

    const orders = await Order.find(filter)
      .populate('customerId', 'name email phone customerId')
      .populate('assignedVendorId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Order ID', 'Date', 'Source', 'Customer ID', 'Customer Name',
      'Customer Email', 'Customer Phone', 'Status', 'Payment Status',
      'Paid Amount', 'Subtotal', 'Discount', 'Shipping Charge',
      'Tax Amount', 'Total Amount', 'Production Cost', 'Profit',
      'Assigned Vendor', 'Shipping City', 'Shipping State', 'Shipping Pincode',
      'Admin Notes',
    ];

    const rows = orders.map((o) => [
      o.orderId,
      new Date(o.createdAt).toISOString().slice(0, 10),
      o.source,
      o.customerId?.customerId || '',
      o.customerName || o.customerId?.name || '',
      o.customerEmail || o.customerId?.email || '',
      o.customerPhone || o.customerId?.phone || '',
      o.status,
      o.paymentStatus,
      o.paidAmount || 0,
      o.subtotal || 0,
      o.discount || 0,
      o.shippingCharge || 0,
      o.taxAmount || 0,
      o.totalAmount || 0,
      o.totalProductionCost || 0,
      (o.totalAmount || 0) - (o.totalProductionCost || 0),
      o.assignedVendorId?.name || '',
      o.shippingAddress?.city || '',
      o.shippingAddress?.state || '',
      o.shippingAddress?.pincode || '',
      o.adminNotes || '',
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    sendCsv(res, `orders-export-${dateStr}`, headers, rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /api/admin/reports/export/gst
// Streams a CSV of all invoices in the period — for GST filing
// ─────────────────────────────────────────────
exports.exportGst = async (req, res) => {
  try {
    const { from, to } = getDateRange(req.query);
    const invoices = await Invoice.find({ invoiceDate: { $gte: from, $lte: to } })
      .populate('orderId', 'orderId')
      .sort({ invoiceDate: 1 })
      .lean();

    const headers = [
      'Invoice No', 'Invoice Date', 'Order ID', 'Customer Name', 'Customer GST',
      'Shipping State', 'Inter-State', 'Taxable Amount',
      'CGST Rate', 'CGST Amount', 'SGST Rate', 'SGST Amount',
      'IGST Rate', 'IGST Amount', 'Total Tax', 'Grand Total',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      new Date(inv.invoiceDate).toISOString().slice(0, 10),
      inv.orderId?.orderId || '',
      inv.customerName || '',
      inv.customerGst || '',
      inv.shippingAddress?.state || '',
      inv.isInterState ? 'Yes' : 'No',
      inv.subtotal || 0,
      inv.isInterState ? 0 : 9,
      inv.totalCgst || 0,
      inv.isInterState ? 0 : 9,
      inv.totalSgst || 0,
      inv.isInterState ? 18 : 0,
      inv.totalIgst || 0,
      (inv.totalCgst || 0) + (inv.totalSgst || 0) + (inv.totalIgst || 0),
      inv.grandTotal || 0,
    ]);

    const dateStr = new Date().toISOString().slice(0, 10);
    sendCsv(res, `gst-export-${dateStr}`, headers, rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const Order = require('../../models/Order');
const Invoice = require('../../models/Invoice');
const { ORDER_STATUS } = require('../../config/constants');

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

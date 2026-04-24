const Order = require('../../models/Order');
const Customer = require('../../models/Customer');
const Vendor = require('../../models/Vendor');
const Invoice = require('../../models/Invoice');
const { ORDER_STATUS } = require('../../config/constants');

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// GET /api/admin/dashboard/stats
exports.getStats = async (req, res) => {
  try {
    const { start, end } = todayRange();

    const [
      totalOrders,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      totalVendors,
      revenueAgg,
      statusCounts,
      todayOrders,
      todayRevenue,
      todayNewCustomers,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: { $nin: [ORDER_STATUS.ORDER_COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] } }),
      Order.countDocuments({ status: ORDER_STATUS.ORDER_COMPLETED }),
      Order.countDocuments({ status: { $in: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] } }),
      Customer.countDocuments({ isActive: true }),
      Vendor.countDocuments({ isActive: true }),
      Order.aggregate([
        { $match: { status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' }, totalCost: { $sum: '$totalProductionCost' } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Today's stats
      Order.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: ORDER_STATUS.CANCELLED } } },
        { $group: { _id: null, revenue: { $sum: '$totalAmount' } } },
      ]),
      Customer.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    ]);

    const revenue = revenueAgg[0] || { totalRevenue: 0, totalCost: 0 };
    const statusMap = {};
    statusCounts.forEach((s) => { statusMap[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        // All-time totals
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        totalCustomers,
        totalVendors,
        totalRevenue: revenue.totalRevenue,
        totalProductionCost: revenue.totalCost,
        profit: revenue.totalRevenue - revenue.totalCost,
        ordersByStatus: statusMap,
        // Today
        today: {
          orders: todayOrders,
          revenue: todayRevenue[0]?.revenue || 0,
          newCustomers: todayNewCustomers,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/dashboard/recent-orders
exports.recentOrders = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const orders = await Order.find()
      .populate('customerId', 'name')
      .populate('assignedVendorId', 'name')
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/dashboard/pipeline
// Counts orders at each production stage — for Vikas pipeline view
exports.pipeline = async (req, res) => {
  try {
    const stages = await Order.aggregate([
      {
        $match: {
          status: {
            $nin: [ORDER_STATUS.ORDER_COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION],
          },
        },
      },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ success: true, data: stages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

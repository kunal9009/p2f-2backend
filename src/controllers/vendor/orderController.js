const Order = require('../../models/Order');
const { isValidTransition } = require('../../utils/helpers');
const { ORDER_STATUS } = require('../../config/constants');

// GET /api/vendor/orders — only orders assigned to this vendor
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { assignedVendorId: req.user.vendorId };
    if (req.query.status) filter.status = req.query.status;
    if (req.query.from || req.query.to) {
      filter.createdAt = {};
      if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const to = new Date(req.query.to);
        to.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = to;
      }
    }
    if (req.query.search) {
      filter.$or = [
        { orderId: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/vendor/orders/:id
exports.getById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedVendorId: req.user.vendorId,
    })
      .populate('customerId')
      .populate('shipmentId');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/vendor/orders/:id/status — Vikas updates production pipeline
exports.updateStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      assignedVendorId: req.user.vendorId,
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!isValidTransition(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${order.status}' to '${status}'`,
      });
    }

    // Vendor can only move forward in production pipeline (not skip steps)
    // Also allowed: Cancel by Production
    const vendorAllowedStatuses = [
      ORDER_STATUS.CONFIRMED,
      ORDER_STATUS.UNDER_PRINTING,
      ORDER_STATUS.PRINTING_DONE,
      ORDER_STATUS.UNDER_FRAMING,
      ORDER_STATUS.FRAMING_DONE,
      ORDER_STATUS.UNDER_PACKAGING,
      ORDER_STATUS.PACKAGING_DONE,
      ORDER_STATUS.READY_TO_SHIP,
      ORDER_STATUS.ORDER_SHIPPED,
      ORDER_STATUS.CANCEL_BY_PRODUCTION,
    ];

    if (!vendorAllowedStatuses.includes(status)) {
      return res.status(403).json({
        success: false,
        message: `Vendor cannot set status to '${status}'`,
      });
    }

    const fromStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      fromStatus,
      toStatus: status,
      changedBy: req.user.id,
      changedByRole: 'vendor',
      remark: remark || '',
    });

    if (status === ORDER_STATUS.CANCEL_BY_PRODUCTION) {
      order.cancelReason = remark;
      order.cancelledBy = req.user.id;
      order.cancelledAt = new Date();
    }

    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/vendor/orders/:id/production-cost — Vikas logs production cost
exports.updateProductionCost = async (req, res) => {
  try {
    const { productionCost, itemCosts } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      assignedVendorId: req.user.vendorId,
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Update item-level production costs if provided
    if (itemCosts && Array.isArray(itemCosts)) {
      itemCosts.forEach(({ itemId, cost }) => {
        const item = order.items.id(itemId);
        if (item) item.productionCost = cost;
      });
    }

    // Update total production cost
    if (productionCost !== undefined) {
      order.totalProductionCost = productionCost;
    } else {
      // Auto-sum from items
      order.totalProductionCost = order.items.reduce((sum, item) => sum + (item.productionCost || 0), 0);
    }

    order.vendorNotes = req.body.notes || order.vendorNotes;
    await order.save();
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/vendor/orders/stats — vendor dashboard stats
exports.getStats = async (req, res) => {
  try {
    const vendorId = req.user.vendorId;
    const [total, pipeline, completed, cancelled] = await Promise.all([
      Order.countDocuments({ assignedVendorId: vendorId }),
      Order.countDocuments({
        assignedVendorId: vendorId,
        status: { $nin: [ORDER_STATUS.ORDER_COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] },
      }),
      Order.countDocuments({ assignedVendorId: vendorId, status: ORDER_STATUS.ORDER_COMPLETED }),
      Order.countDocuments({
        assignedVendorId: vendorId,
        status: { $in: [ORDER_STATUS.CANCELLED, ORDER_STATUS.CANCEL_BY_PRODUCTION] },
      }),
    ]);

    const statusBreakdown = await Order.aggregate([
      { $match: { assignedVendorId: vendorId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = {};
    statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

    res.json({
      success: true,
      data: { total, inPipeline: pipeline, completed, cancelled, ordersByStatus: statusMap },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/vendor/orders/:id/items/:itemId/design
exports.uploadDesignImage = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      assignedVendorId: req.user.vendorId,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Order item not found' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    item.designImage = req.file.path;
    await order.save();

    res.json({ success: true, data: { itemId: item._id, designImage: item.designImage } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

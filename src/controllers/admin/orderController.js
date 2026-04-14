const Order = require('../../models/Order');
const { isValidTransition, generateOrderId } = require('../../utils/helpers');

// GET /api/admin/orders
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.search) {
      filter.$or = [
        { orderId: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email phone')
        .populate('assignedVendorId', 'name')
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

// GET /api/admin/orders/:id
exports.getById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customerId')
      .populate('assignedVendorId')
      .populate('shipmentId')
      .populate('invoiceId');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/orders
exports.create = async (req, res) => {
  try {
    // Generate next order ID
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = await Order.countDocuments({ createdAt: { $gte: todayStart } });
    const orderId = generateOrderId(todayCount + 1);

    const order = await Order.create({
      ...req.body,
      orderId,
      statusHistory: [{
        toStatus: req.body.status || 'Order Received',
        changedBy: req.user.id,
        changedByRole: req.user.role,
        remark: 'Order created',
      }],
    });

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/orders/:id
exports.update = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/orders/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status, remark } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (!isValidTransition(order.status, status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from '${order.status}' to '${status}'`,
      });
    }

    const fromStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      fromStatus,
      toStatus: status,
      changedBy: req.user.id,
      changedByRole: req.user.role,
      remark: remark || '',
    });

    // Handle cancellation
    if (status === 'Cancelled' || status === 'Cancel by Production') {
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

// PATCH /api/admin/orders/:id/assign-vendor
exports.assignVendor = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedVendorId: vendorId },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/orders/:id/payment
exports.updatePayment = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paidAmount } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { paymentStatus, paymentMethod, paidAmount },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

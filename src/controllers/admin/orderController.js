const Order = require('../../models/Order');
const { isValidTransition, generateOrderIdAtomic } = require('../../utils/helpers');

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
    const orderId = await generateOrderIdAtomic();

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

// PATCH /api/admin/orders/bulk-assign-vendor
// Body: { orderIds: [...], vendorId: '...' }
exports.bulkAssignVendor = async (req, res) => {
  try {
    const { orderIds, vendorId } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: '`orderIds` must be a non-empty array' });
    }
    if (!vendorId) {
      return res.status(400).json({ success: false, message: '`vendorId` is required' });
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { assignedVendorId: vendorId }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} order(s) assigned to vendor`,
      data: { matched: result.matchedCount, modified: result.modifiedCount },
    });
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

// POST /api/admin/orders/:id/items/:itemId/design
// Upload the print-ready design image for a specific order line item
exports.uploadDesignImage = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
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

// PATCH /api/admin/orders/:id/address
// Update shipping address after order is placed (before dispatch)
exports.updateAddress = async (req, res) => {
  try {
    const { shippingAddress, billingAddress } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Prevent address change after shipping
    const lockedStatuses = ['Ready To Ship', 'Order Shipped', 'Order Completed'];
    if (lockedStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change address when order is '${order.status}'`,
      });
    }

    if (shippingAddress) order.shippingAddress = shippingAddress;
    if (billingAddress) order.billingAddress = billingAddress;
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── ORDER ITEM MANAGEMENT ───
// Items can only be modified before production starts (before Under Printing)

const PRE_PRODUCTION_STATUSES = ['Order Received', 'Confirmed'];

const assertPreProduction = (order) => {
  if (!PRE_PRODUCTION_STATUSES.includes(order.status)) {
    throw Object.assign(new Error(`Cannot modify items when order is '${order.status}'`), { statusCode: 400 });
  }
};

const recalcOrderTotals = (order) => {
  order.subtotal = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  order.totalAmount = order.subtotal + (order.shippingCharge || 0) + (order.taxAmount || 0) - (order.discount || 0);
};

// POST /api/admin/orders/:id/items
exports.addItem = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    assertPreProduction(order);

    const item = req.body;
    if (item.unitPrice && item.quantity) {
      item.totalPrice = item.unitPrice * item.quantity;
    }
    order.items.push(item);
    recalcOrderTotals(order);
    await order.save();

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/orders/:id/items/:itemId
exports.updateItem = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    assertPreProduction(order);

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    Object.assign(item, req.body);
    // Recalc line total
    if (item.unitPrice && item.quantity) {
      item.totalPrice = item.unitPrice * item.quantity;
    }
    recalcOrderTotals(order);
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/orders/:id/items/:itemId
exports.removeItem = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    assertPreProduction(order);

    const item = order.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

    item.deleteOne();
    recalcOrderTotals(order);
    await order.save();

    res.json({ success: true, data: order });
  } catch (err) {
    res.status(err.statusCode || 400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/orders/:id/notes
exports.updateNotes = async (req, res) => {
  try {
    const { adminNotes } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { adminNotes },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const Shipment = require('../../models/Shipment');
const Order = require('../../models/Order');
const { SHIPPING_STATUS, ORDER_STATUS } = require('../../config/constants');

// GET /api/vendor/shipments
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Only shipments for orders assigned to this vendor
    const vendorOrders = await Order.find({ assignedVendorId: req.user.vendorId }).select('_id');
    const orderIds = vendorOrders.map((o) => o._id);

    const filter = { orderId: { $in: orderIds } };
    if (req.query.status) filter.status = req.query.status;

    const [shipments, total] = await Promise.all([
      Shipment.find(filter)
        .populate('orderId', 'orderId customerName status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shipment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: shipments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/vendor/shipments — Vikas creates a shipment
exports.create = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.body.orderId,
      assignedVendorId: req.user.vendorId,
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found or not assigned to you' });
    }

    // Order must be at Ready To Ship or later
    if (order.status !== ORDER_STATUS.READY_TO_SHIP && order.status !== ORDER_STATUS.PACKAGING_DONE) {
      return res.status(400).json({
        success: false,
        message: `Order must be at 'Packaging Done' or 'Ready To Ship' to create shipment`,
      });
    }

    // Calculate volumetric weight
    const { packageLength, packageWidth, packageHeight } = req.body;
    let volumetricWeight = 0;
    if (packageLength && packageWidth && packageHeight) {
      volumetricWeight = (packageLength * packageWidth * packageHeight) / 5000; // standard formula
    }

    const shipment = await Shipment.create({
      ...req.body,
      volumetricWeight,
      createdBy: req.user.id,
    });

    // Link shipment to order and update shipping status
    order.shipmentId = shipment._id;
    order.shippingStatus = SHIPPING_STATUS.READY;
    await order.save();

    res.status(201).json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/vendor/shipments/:id — update shipment details (AWB, status)
exports.update = async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    // Verify this shipment belongs to vendor's order
    const order = await Order.findOne({
      _id: shipment.orderId,
      assignedVendorId: req.user.vendorId,
    });
    if (!order) {
      return res.status(403).json({ success: false, message: 'Not authorized for this shipment' });
    }

    const allowedFields = [
      'provider', 'mode', 'awbNumber', 'trackingUrl',
      'packageWeight', 'packageLength', 'packageWidth', 'packageHeight',
      'courierRate', 'codCharges', 'insuranceCharges', 'totalShippingCost',
      'status', 'shippedAt', 'estimatedDelivery', 'remarks',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) shipment[field] = req.body[field];
    });

    // Recalculate volumetric weight
    if (shipment.packageLength && shipment.packageWidth && shipment.packageHeight) {
      shipment.volumetricWeight = (shipment.packageLength * shipment.packageWidth * shipment.packageHeight) / 5000;
    }

    await shipment.save();

    // Sync shipping status to order
    if (req.body.status) {
      order.shippingStatus = req.body.status;
      if (req.body.status === SHIPPING_STATUS.SHIPPED) {
        order.status = ORDER_STATUS.ORDER_SHIPPED;
        order.statusHistory.push({
          fromStatus: order.status,
          toStatus: ORDER_STATUS.ORDER_SHIPPED,
          changedBy: req.user.id,
          changedByRole: 'vendor',
          remark: `Shipped via ${shipment.provider}, AWB: ${shipment.awbNumber}`,
        });
      }
      await order.save();
    }

    res.json({ success: true, data: shipment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const Shipment = require('../../models/Shipment');
const Order = require('../../models/Order');

/**
 * GET /api/public/track/:awb
 * No authentication required.
 * Returns safe subset of shipment + order info for customer-facing tracking.
 */
exports.trackByAwb = async (req, res) => {
  try {
    const awb = req.params.awb.trim();
    if (!awb) return res.status(400).json({ success: false, message: 'AWB number required' });

    const shipment = await Shipment.findOne({ awbNumber: awb });
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'No shipment found for this AWB number' });
    }

    const order = await Order.findById(shipment.orderId)
      .select('orderId status customerName shippingAddress items createdAt');

    // Only expose safe fields — no pricing, no internal notes
    res.json({
      success: true,
      data: {
        awbNumber: shipment.awbNumber,
        trackingUrl: shipment.trackingUrl,
        provider: shipment.provider,
        mode: shipment.mode,
        status: shipment.status,
        shippedAt: shipment.shippedAt,
        estimatedDelivery: shipment.estimatedDelivery,
        deliveredAt: shipment.deliveredAt,
        order: order ? {
          orderId: order.orderId,
          status: order.status,
          customerName: order.customerName,
          shippingAddress: order.shippingAddress,
          itemCount: order.items?.length || 0,
          placedAt: order.createdAt,
        } : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/public/track/order/:orderId
 * Look up tracking info by order ID (e.g. ORD-20260414-0001)
 */
exports.trackByOrderId = async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() })
      .select('orderId status customerName shippingAddress items createdAt shipmentId');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let shipmentData = null;
    if (order.shipmentId) {
      const shipment = await Shipment.findById(order.shipmentId)
        .select('awbNumber trackingUrl provider mode status shippedAt estimatedDelivery deliveredAt');
      if (shipment) {
        shipmentData = shipment;
      }
    }

    res.json({
      success: true,
      data: {
        orderId: order.orderId,
        orderStatus: order.status,
        customerName: order.customerName,
        shippingAddress: order.shippingAddress,
        itemCount: order.items?.length || 0,
        placedAt: order.createdAt,
        shipment: shipmentData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

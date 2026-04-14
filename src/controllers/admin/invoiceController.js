const Invoice = require('../../models/Invoice');
const Order = require('../../models/Order');
const { generateInvoiceNumber, calculateGST } = require('../../utils/helpers');

// GET /api/admin/invoices
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { invoiceNumber: { $regex: req.query.search, $options: 'i' } },
        { customerName: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .populate('orderId', 'orderId status')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/invoices/:id
exports.getById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('orderId')
      .populate('customerId');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, data: invoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/invoices/generate/:orderId
exports.generate = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('customerId');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (order.invoiceId) {
      const existingInvoice = await Invoice.findById(order.invoiceId);
      if (existingInvoice) {
        return res.status(400).json({ success: false, message: 'Invoice already exists for this order' });
      }
    }

    // Determine inter-state based on seller state vs shipping state
    const sellerState = req.body.sellerState || 'Delhi';
    const shippingState = order.shippingAddress?.state || '';
    const isInterState = sellerState.toLowerCase() !== shippingState.toLowerCase();

    // Build invoice items from order items
    const invoiceItems = order.items.map((item) => {
      const taxableAmount = item.totalPrice || item.unitPrice * item.quantity;
      const gst = calculateGST(taxableAmount, isInterState);
      return {
        description: item.productName || `${item.productType} - ${item.size}`,
        hsnCode: '4911',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxableAmount,
        cgstRate: isInterState ? 0 : 9,
        cgstAmount: gst.cgstAmount,
        sgstRate: isInterState ? 0 : 9,
        sgstAmount: gst.sgstAmount,
        igstRate: isInterState ? 18 : 0,
        igstAmount: gst.igstAmount,
        totalAmount: taxableAmount + gst.totalTax,
      };
    });

    // Calculate totals
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.taxableAmount, 0);
    const totalCgst = invoiceItems.reduce((sum, item) => sum + item.cgstAmount, 0);
    const totalSgst = invoiceItems.reduce((sum, item) => sum + item.sgstAmount, 0);
    const totalIgst = invoiceItems.reduce((sum, item) => sum + item.igstAmount, 0);
    const grandTotal = subtotal + totalCgst + totalSgst + totalIgst + (order.shippingCharge || 0) - (order.discount || 0);

    // Generate invoice number
    const invoiceCount = await Invoice.countDocuments();
    const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);

    const customer = order.customerId;

    const invoice = await Invoice.create({
      invoiceNumber,
      orderId: order._id,
      customerId: customer?._id,
      customerName: customer?.name || order.customerName,
      customerGst: customer?.gstNo,
      billingAddress: order.billingAddress,
      shippingAddress: order.shippingAddress,
      sellerGst: req.body.sellerGst,
      sellerAddress: req.body.sellerAddress,
      items: invoiceItems,
      subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      discount: order.discount || 0,
      shippingCharge: order.shippingCharge || 0,
      roundOff: Math.round(grandTotal) - grandTotal,
      grandTotal: Math.round(grandTotal),
      isInterState,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      generatedBy: req.user.id,
    });

    // Link invoice to order
    order.invoiceId = invoice._id;
    await order.save();

    res.status(201).json({ success: true, data: invoice });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

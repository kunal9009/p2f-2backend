const VendorPayment = require('../../models/VendorPayment');
const Order = require('../../models/Order');

// GET /api/admin/vendor-payments
// Query: ?vendorId= &status= &page= &limit=
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.vendorId) filter.vendorId = req.query.vendorId;
    if (req.query.status) filter.status = req.query.status;

    const [payments, total] = await Promise.all([
      VendorPayment.find(filter)
        .populate('vendorId', 'name contactPerson email')
        .populate('orderIds', 'orderId totalAmount totalProductionCost status')
        .sort({ paymentDate: -1 })
        .skip(skip)
        .limit(limit),
      VendorPayment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/vendor-payments/ledger/:vendorId
// Returns outstanding (unpaid production cost) vs total paid for this vendor
exports.ledger = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // Sum all production costs on completed/shipped orders assigned to vendor
    const [costAgg, paidAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            assignedVendorId: require('mongoose').Types.ObjectId.createFromHexString(vendorId),
            totalProductionCost: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            totalProductionCost: { $sum: '$totalProductionCost' },
            orderCount: { $sum: 1 },
          },
        },
      ]),
      VendorPayment.aggregate([
        {
          $match: {
            vendorId: require('mongoose').Types.ObjectId.createFromHexString(vendorId),
            status: 'Paid',
          },
        },
        { $group: { _id: null, totalPaid: { $sum: '$amount' }, paymentCount: { $sum: 1 } } },
      ]),
    ]);

    const totalCost = costAgg[0]?.totalProductionCost || 0;
    const totalPaid = paidAgg[0]?.totalPaid || 0;

    res.json({
      success: true,
      data: {
        vendorId,
        totalProductionCost: totalCost,
        totalPaid,
        outstanding: totalCost - totalPaid,
        orderCount: costAgg[0]?.orderCount || 0,
        paymentCount: paidAgg[0]?.paymentCount || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/vendor-payments
// Create a payment record (admin marks that they've paid Vikas)
exports.create = async (req, res) => {
  try {
    const payment = await VendorPayment.create({
      ...req.body,
      createdBy: req.user.id,
    });
    res.status(201).json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/vendor-payments/:id/status
// Mark a payment as Paid or Disputed
exports.updateStatus = async (req, res) => {
  try {
    const { status, referenceNumber, notes } = req.body;
    const update = { status };
    if (referenceNumber) update.referenceNumber = referenceNumber;
    if (notes) update.notes = notes;
    if (status === 'Paid') update.paymentDate = new Date();

    const payment = await VendorPayment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/admin/vendor-payments/:id
exports.getById = async (req, res) => {
  try {
    const payment = await VendorPayment.findById(req.params.id)
      .populate('vendorId', 'name contactPerson email')
      .populate('orderIds', 'orderId totalProductionCost status createdAt');
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, data: payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

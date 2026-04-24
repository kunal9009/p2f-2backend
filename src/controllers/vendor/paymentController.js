const VendorPayment = require('../../models/VendorPayment');

// GET /api/vendor/payments — Vikas views his own payment records
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { vendorId: req.user.vendorId };
    if (req.query.status) filter.status = req.query.status;

    const [payments, total] = await Promise.all([
      VendorPayment.find(filter)
        .populate('orderIds', 'orderId totalProductionCost status')
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

// GET /api/vendor/payments/summary — outstanding vs paid totals
exports.summary = async (req, res) => {
  try {
    const agg = await VendorPayment.aggregate([
      { $match: { vendorId: req.user.vendorId } },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = { Pending: { total: 0, count: 0 }, Paid: { total: 0, count: 0 }, Disputed: { total: 0, count: 0 } };
    agg.forEach((row) => { summary[row._id] = { total: row.total, count: row.count }; });

    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

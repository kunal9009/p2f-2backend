const Vendor = require('../../models/Vendor');
const User = require('../../models/User');
const Order = require('../../models/Order');

// GET /api/admin/vendors
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { contactPerson: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [vendors, total] = await Promise.all([
      Vendor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Vendor.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: vendors,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/vendors/:id
exports.getById = async (req, res) => {
  try {
    const vendor = await Vendor.findById(req.params.id).populate('userId', 'name email role');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/vendors
// If `email` + `password` are supplied a vendor User login account is created atomically.
exports.create = async (req, res) => {
  let vendor = null;
  try {
    const { password, ...vendorBody } = req.body;

    vendor = await Vendor.create(vendorBody);

    let userRecord = null;
    if (vendorBody.email && password) {
      // Create the login account for this vendor
      userRecord = await User.create({
        name: vendorBody.contactPerson || vendorBody.name,
        email: vendorBody.email,
        password,
        phone: vendorBody.phone,
        role: 'vendor',
        vendorId: vendor._id,
      });

      // Back-link the user to the vendor document
      vendor.userId = userRecord._id;
      await vendor.save();
    }

    res.status(201).json({
      success: true,
      data: {
        vendor,
        user: userRecord
          ? { id: userRecord._id, name: userRecord.name, email: userRecord.email, role: userRecord.role }
          : null,
      },
    });
  } catch (err) {
    // Roll back vendor if user creation failed after vendor was saved
    if (vendor && vendor._id && err.name !== 'ValidationError') {
      await Vendor.findByIdAndDelete(vendor._id).catch(() => {});
    }
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/vendors/:id
exports.update = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, data: vendor });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/vendors/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/vendors/:id/reactivate
exports.reactivate = async (req, res) => {
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor reactivated', data: vendor });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/vendors/:id/orders
exports.getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { assignedVendorId: req.params.id };
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .select('orderId status paymentStatus totalAmount totalProductionCost createdAt customerId')
        .populate('customerId', 'name customerId')
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

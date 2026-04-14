const Vendor = require('../../models/Vendor');

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
exports.create = async (req, res) => {
  try {
    const vendor = await Vendor.create(req.body);
    res.status(201).json({ success: true, data: vendor });
  } catch (err) {
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

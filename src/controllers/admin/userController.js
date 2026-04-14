const User = require('../../models/User');
const Vendor = require('../../models/Vendor');

// GET /api/admin/users
exports.list = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate('vendorId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users/:id
exports.getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('vendorId');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id  — update name, phone, role, vendorId, isActive
exports.update = async (req, res) => {
  try {
    const { name, phone, role, vendorId, isActive } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Prevent admin from demoting their own account
    if (String(user._id) === String(req.user.id) && isActive === false) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined) user.role = role;
    if (vendorId !== undefined) user.vendorId = vendorId;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Keep vendor profile linked if role changed to vendor
    if (role === 'vendor' && vendorId) {
      await Vendor.findByIdAndUpdate(vendorId, { userId: user._id });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/users/:id/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findById(req.params.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.password = newPassword; // pre-save hook hashes it
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/users/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

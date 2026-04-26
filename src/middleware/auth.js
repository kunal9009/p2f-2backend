const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLES } = require('../config/constants');

// ─── VERIFY JWT TOKEN ───
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Allow token as query param for browser download links (e.g. CSV export)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or deactivated' });
    }

    // Attach user to request (without password)
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      vendorId: user.vendorId,
      permissionsRestricted: !!user.permissionsRestricted,
      permissions: user.permissions || [],
    };

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
  }
};

// ─── ROLE-BASED ACCESS ───
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Convenience guards
const adminOnly = authorize(ROLES.ADMIN);
const vendorOnly = authorize(ROLES.VENDOR);
const adminOrWarehouse = authorize(ROLES.ADMIN, ROLES.WAREHOUSE);
const adminOrVendor = authorize(ROLES.ADMIN, ROLES.VENDOR);

module.exports = {
  protect,
  authorize,
  adminOnly,
  vendorOnly,
  adminOrWarehouse,
  adminOrVendor,
};

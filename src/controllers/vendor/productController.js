const Paper = require('../../models/Paper');
const Frame = require('../../models/Frame');
const Canvas = require('../../models/Canvas');
const Glass = require('../../models/Glass');
const Mount = require('../../models/Mount');
const FrameMaterial = require('../../models/FrameMaterial');
const Moulding = require('../../models/Moulding');

const modelMap = {
  paper: Paper,
  frame: Frame,
  canvas: Canvas,
  glass: Glass,
  mount: Mount,
  framematerial: FrameMaterial,
  moulding: Moulding,
};

const getModel = (type) => {
  const model = modelMap[type.toLowerCase()];
  if (!model) throw new Error(`Unknown product type: ${type}`);
  return model;
};

// GET /api/vendor/products/:type — Vikas can view products (admin's output → Vikas's input)
exports.list = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const filter = { isActive: true };
    if (req.query.search) {
      filter.name = { $regex: req.query.search, $options: 'i' };
    }
    // Optionally filter by vendor's own products
    if (req.query.mine === 'true' && req.user.vendorId) {
      filter.vendorId = req.user.vendorId;
    }

    const [items, total] = await Promise.all([
      Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Model.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/vendor/products/:type/:id
exports.getById = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/vendor/products/:type — Vikas uploads products (Phase 1)
exports.create = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.create({
      ...req.body,
      vendorId: req.user.vendorId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/vendor/products/:type/:id — Vikas updates own products
exports.update = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findOne({ _id: req.params.id, vendorId: req.user.vendorId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Not found or not your product' });
    }

    Object.assign(item, req.body);
    await item.save();
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/vendor/products/:type/:id/images — Vikas uploads product images
exports.uploadImages = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findOne({ _id: req.params.id, vendorId: req.user.vendorId });
    if (!item) {
      return res.status(404).json({ success: false, message: 'Not found or not your product' });
    }

    const newImages = req.files ? req.files.map((f) => f.path) : [];
    item.images = [...(item.images || []), ...newImages].slice(0, 5);
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

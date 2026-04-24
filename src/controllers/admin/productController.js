const Paper = require('../../models/Paper');
const Frame = require('../../models/Frame');
const Canvas = require('../../models/Canvas');
const Glass = require('../../models/Glass');
const Mount = require('../../models/Mount');
const FrameMaterial = require('../../models/FrameMaterial');
const Moulding = require('../../models/Moulding');

// Map product type to model
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

// GET /api/admin/products/:type
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

// GET /api/admin/products/:type/:id
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

// POST /api/admin/products/:type
exports.create = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/products/:type/:id
exports.update = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/products/:type/:id (soft delete)
exports.remove = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deactivated successfully' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// PATCH /api/admin/products/:type/:id/reactivate
exports.reactivate = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Reactivated successfully', data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/admin/products/:type/:id/images
exports.uploadImages = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    const newImages = req.files ? req.files.map((f) => f.path) : [];
    item.images = [...(item.images || []), ...newImages].slice(0, 5); // Max 5 images
    await item.save();

    res.json({ success: true, data: item });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/products/:type/:id/images/:index
// Remove image at a specific position (0-based index)
exports.removeImage = async (req, res) => {
  try {
    const Model = getModel(req.params.type);
    const item = await Model.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });

    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= (item.images || []).length) {
      return res.status(400).json({ success: false, message: `Invalid image index: ${req.params.index}` });
    }

    item.images.splice(index, 1);
    await item.save();

    res.json({ success: true, message: 'Image removed', data: { images: item.images } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

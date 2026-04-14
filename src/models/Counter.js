const mongoose = require('mongoose');

/**
 * Atomic counter for sequential ID generation.
 * Used for: customer IDs (MA format), invoice numbers, etc.
 */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },  // e.g. 'customer', 'invoice'
  seq: { type: Number, default: 0 },
});

counterSchema.statics.nextSeq = async function (name) {
  const doc = await this.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

module.exports = mongoose.model('Counter', counterSchema);

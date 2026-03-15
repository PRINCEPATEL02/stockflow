const mongoose = require('mongoose');

const productMaterialSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String },
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, trim: true },
  sellingPrice: { type: Number, required: true, min: 0 },
  category: { type: String, trim: true },
  description: { type: String },
  materials: [productMaterialSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);

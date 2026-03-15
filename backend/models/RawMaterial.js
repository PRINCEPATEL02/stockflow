const mongoose = require('mongoose');

const rawMaterialSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, unique: true, trim: true },
  unit: { type: String, required: true, enum: ['kg', 'gram', 'liter', 'ml', 'piece', 'meter', 'box'] },
  currentStock: { type: Number, default: 0, min: 0 },
  minimumStock: { type: Number, default: 0, min: 0 },
  costPerUnit: { type: Number, default: 0 },
  supplier: { type: String, trim: true },
  description: { type: String },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

rawMaterialSchema.virtual('isLowStock').get(function () {
  return this.currentStock <= this.minimumStock;
});

rawMaterialSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('RawMaterial', rawMaterialSchema);

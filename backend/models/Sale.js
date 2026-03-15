const mongoose = require('mongoose');

const materialConsumedSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial' },
  materialName: { type: String },
  quantity: { type: Number },
  unit: { type: String },
});

const saleSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true, min: 1 },
  sellingPrice: { type: Number, required: true },
  totalAmount: { type: Number },
  customer: { type: String, trim: true },
  invoiceNumber: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  materialsConsumed: [materialConsumedSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

saleSchema.pre('save', function (next) {
  this.totalAmount = this.quantity * this.sellingPrice;
  next();
});

module.exports = mongoose.model('Sale', saleSchema);

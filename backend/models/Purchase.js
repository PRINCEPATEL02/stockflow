const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  material: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMaterial', required: true },
  quantity: { type: Number, required: true, min: 0.001 },
  purchasePrice: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number },
  supplier: { type: String, trim: true },
  invoiceNumber: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  notes: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

purchaseSchema.pre('save', function (next) {
  this.totalAmount = this.quantity * this.purchasePrice;
  next();
});

module.exports = mongoose.model('Purchase', purchaseSchema);

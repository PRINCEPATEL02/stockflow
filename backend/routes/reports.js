const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');
const RawMaterial = require('../models/RawMaterial');

// Export purchases as CSV data
router.get('/purchases/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.date.$lte = end; }
    }

    const purchases = await Purchase.find(query).populate('material', 'name unit').sort({ date: -1 });

    const headers = ['Date', 'Material', 'Unit', 'Quantity', 'Price/Unit', 'Total', 'Supplier', 'Invoice#'];
    const rows = purchases.map(p => [
      new Date(p.date).toLocaleDateString(),
      p.material?.name || '',
      p.material?.unit || '',
      p.quantity,
      p.purchasePrice,
      p.totalAmount,
      p.supplier || '',
      p.invoiceNumber || '',
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=purchases.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Export sales as CSV data
router.get('/sales/csv', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.date.$lte = end; }
    }

    const sales = await Sale.find(query).populate('product', 'name code').sort({ date: -1 });

    const headers = ['Date', 'Product', 'Code', 'Quantity', 'Price/Unit', 'Total', 'Customer', 'Invoice#'];
    const rows = sales.map(s => [
      new Date(s.date).toLocaleDateString(),
      s.product?.name || '',
      s.product?.code || '',
      s.quantity,
      s.sellingPrice,
      s.totalAmount,
      s.customer || '',
      s.invoiceNumber || '',
    ]);

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=sales.csv');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Stock report
router.get('/stock', auth, async (req, res) => {
  try {
    const materials = await RawMaterial.find({ isActive: true }).sort({ name: 1 });
    res.json(materials.map(m => ({
      name: m.name,
      code: m.code,
      unit: m.unit,
      currentStock: m.currentStock,
      minimumStock: m.minimumStock,
      status: m.currentStock <= m.minimumStock ? 'LOW' : m.currentStock <= m.minimumStock * 1.5 ? 'WARNING' : 'OK',
    })));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

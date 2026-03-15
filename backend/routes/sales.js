const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const RawMaterial = require('../models/RawMaterial');

// GET all with filters
router.get('/', auth, async (req, res) => {
  try {
    const { search, startDate, endDate, productId } = req.query;
    let query = {};

    if (productId) query.product = productId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) { const end = new Date(endDate); end.setHours(23, 59, 59, 999); query.date.$lte = end; }
    }

    let sales = await Sale.find(query)
      .populate('product', 'name code')
      .populate('materialsConsumed.material', 'name unit')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    if (search) {
      const s = search.toLowerCase();
      sales = sales.filter(sale =>
        sale.product?.name?.toLowerCase().includes(s) ||
        sale.customer?.toLowerCase().includes(s) ||
        sale.invoiceNumber?.toLowerCase().includes(s)
      );
    }

    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE — auto deduct raw materials based on BOM
router.post('/', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { product: productId, quantity, sellingPrice, customer, invoiceNumber, date, notes } = req.body;
    if (!productId || !quantity) return res.status(400).json({ message: 'Product and quantity required.' });

    const product = await Product.findById(productId).populate('materials.material').session(session);
    if (!product) { await session.abortTransaction(); return res.status(404).json({ message: 'Product not found.' }); }

    const materialsConsumed = [];
    const stockUpdates = [];

    // Check stock & calculate deductions
    for (const bom of product.materials) {
      const needed = bom.quantity * quantity;
      const mat = await RawMaterial.findById(bom.material._id).session(session);
      if (!mat) { await session.abortTransaction(); return res.status(400).json({ message: `Material ${bom.material.name} not found.` }); }
      if (mat.currentStock < needed) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for ${mat.name}. Available: ${mat.currentStock} ${mat.unit}, Required: ${needed} ${mat.unit}` });
      }
      stockUpdates.push({ mat, needed });
      materialsConsumed.push({ material: mat._id, materialName: mat.name, quantity: needed, unit: mat.unit });
    }

    // Deduct stock
    for (const { mat, needed } of stockUpdates) {
      mat.currentStock -= needed;
      await mat.save({ session });
    }

    const sale = new Sale({
      product: productId,
      quantity,
      sellingPrice: sellingPrice || product.sellingPrice,
      customer,
      invoiceNumber,
      date: date || Date.now(),
      notes,
      materialsConsumed,
      createdBy: req.user.id,
    });
    await sale.save({ session });

    await session.commitTransaction();
    const populated = await sale.populate('product', 'name code');
    res.status(201).json({ sale: populated, materialsConsumed });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// UPDATE sale — restore old stock, deduct new
router.put('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const existing = await Sale.findById(req.params.id).session(session);
    if (!existing) { await session.abortTransaction(); return res.status(404).json({ message: 'Sale not found.' }); }

    const { quantity, sellingPrice, customer, invoiceNumber, date, notes } = req.body;

    // Restore old stock consumption
    for (const consumed of existing.materialsConsumed) {
      const mat = await RawMaterial.findById(consumed.material).session(session);
      if (mat) { mat.currentStock += consumed.quantity; await mat.save({ session }); }
    }

    // Recalculate with new quantity
    const product = await Product.findById(existing.product).populate('materials.material').session(session);
    const materialsConsumed = [];
    const stockUpdates = [];

    for (const bom of product.materials) {
      const needed = bom.quantity * quantity;
      const mat = await RawMaterial.findById(bom.material._id).session(session);
      if (!mat) { await session.abortTransaction(); return res.status(400).json({ message: `Material not found.` }); }
      if (mat.currentStock < needed) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Insufficient stock for ${mat.name}. Available: ${mat.currentStock} ${mat.unit}` });
      }
      stockUpdates.push({ mat, needed });
      materialsConsumed.push({ material: mat._id, materialName: mat.name, quantity: needed, unit: mat.unit });
    }

    for (const { mat, needed } of stockUpdates) {
      mat.currentStock -= needed;
      await mat.save({ session });
    }

    existing.quantity = quantity;
    existing.sellingPrice = sellingPrice;
    existing.totalAmount = quantity * sellingPrice;
    existing.customer = customer;
    existing.invoiceNumber = invoiceNumber;
    if (date) existing.date = date;
    existing.notes = notes;
    existing.materialsConsumed = materialsConsumed;
    await existing.save({ session });

    await session.commitTransaction();
    const populated = await existing.populate('product', 'name code');
    res.json(populated);
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// DELETE — restore stock
router.delete('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const sale = await Sale.findById(req.params.id).session(session);
    if (!sale) { await session.abortTransaction(); return res.status(404).json({ message: 'Sale not found.' }); }

    // Restore consumed materials
    for (const consumed of sale.materialsConsumed) {
      const mat = await RawMaterial.findById(consumed.material).session(session);
      if (mat) { mat.currentStock += consumed.quantity; await mat.save({ session }); }
    }

    await Sale.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();
    res.json({ message: 'Sale deleted and stock restored.' });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Purchase = require('../models/Purchase');
const RawMaterial = require('../models/RawMaterial');

// GET all with filters
router.get('/', auth, async (req, res) => {
  try {
    const { search, startDate, endDate, materialId } = req.query;
    let query = {};

    if (materialId) query.material = materialId;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    let purchases = await Purchase.find(query)
      .populate('material', 'name unit')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    if (search) {
      const s = search.toLowerCase();
      purchases = purchases.filter(p =>
        p.material?.name?.toLowerCase().includes(s) ||
        p.supplier?.toLowerCase().includes(s) ||
        p.invoiceNumber?.toLowerCase().includes(s)
      );
    }

    res.json(purchases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// BULK STOCK-IN — add stock for many materials at once
router.post('/bulk', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { items, supplier, invoiceNumber, date, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: 'No items provided.' });

    const validItems = items.filter(i => i.material && Number(i.quantity) > 0);
    if (validItems.length === 0)
      return res.status(400).json({ message: 'Enter quantity for at least one material.' });

    const results = [];

    for (const item of validItems) {
      const mat = await RawMaterial.findById(item.material).session(session);
      if (!mat) {
        await session.abortTransaction();
        return res.status(404).json({ message: `Material not found.` });
      }

      const purchase = new Purchase({
        material: item.material,
        quantity: Number(item.quantity),
        purchasePrice: 0,
        supplier: supplier || '',
        invoiceNumber: invoiceNumber || '',
        date: date ? new Date(date) : new Date(),
        notes: notes || '',
        createdBy: req.user.id,
      });
      await purchase.save({ session });

      mat.currentStock += Number(item.quantity);
      await mat.save({ session });

      results.push({ materialName: mat.name, unit: mat.unit, added: item.quantity, newStock: mat.currentStock });
    }

    await session.commitTransaction();
    res.status(201).json({ message: `Stock updated for ${results.length} material(s).`, results });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// CREATE single — auto increase stock
router.post('/', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { material, quantity, supplier, invoiceNumber, date, notes } = req.body;
    if (!material || !quantity)
      return res.status(400).json({ message: 'Material and quantity are required.' });

    const mat = await RawMaterial.findById(material).session(session);
    if (!mat) { await session.abortTransaction(); return res.status(404).json({ message: 'Material not found.' }); }

    const purchase = new Purchase({
      material, quantity, purchasePrice: 0,
      supplier, invoiceNumber,
      date: date || Date.now(), notes,
      createdBy: req.user.id,
    });
    await purchase.save({ session });

    mat.currentStock += Number(quantity);
    await mat.save({ session });

    await session.commitTransaction();
    const populated = await purchase.populate('material', 'name unit');
    res.status(201).json({ purchase: populated, updatedStock: mat.currentStock });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

// DELETE — auto decrease stock
router.delete('/:id', auth, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) { await session.abortTransaction(); return res.status(404).json({ message: 'Purchase not found.' }); }

    const mat = await RawMaterial.findById(purchase.material).session(session);
    if (mat) {
      mat.currentStock -= purchase.quantity;
      if (mat.currentStock < 0) mat.currentStock = 0;
      await mat.save({ session });
    }

    await Purchase.findByIdAndDelete(req.params.id).session(session);
    await session.commitTransaction();
    res.json({ message: 'Stock entry deleted and stock adjusted.', updatedStock: mat?.currentStock });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ message: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;

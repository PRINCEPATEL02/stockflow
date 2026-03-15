const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RawMaterial = require('../models/RawMaterial');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    const { search, lowStock } = req.query;
    let query = { isActive: true };
    if (search) query.name = { $regex: search, $options: 'i' };

    const materials = await RawMaterial.find(query).sort({ name: 1 });
    const result = lowStock === 'true' ? materials.filter(m => m.currentStock <= m.minimumStock) : materials;
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', auth, async (req, res) => {
  try {
    const material = await RawMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post('/', auth, async (req, res) => {
  try {
    const { name, unit, currentStock, minimumStock, costPerUnit, supplier, description } = req.body;
    if (!name || !unit) return res.status(400).json({ message: 'Name and unit are required.' });

    // Auto-generate code
    const code = 'RM' + Date.now().toString().slice(-6);
    const material = await RawMaterial.create({ name, code, unit, currentStock: currentStock || 0, minimumStock: minimumStock || 0, costPerUnit, supplier, description });
    res.status(201).json(material);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: 'Material with this code already exists.' });
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, unit, minimumStock, costPerUnit, supplier, description } = req.body;
    const material = await RawMaterial.findByIdAndUpdate(
      req.params.id,
      { name, unit, minimumStock, costPerUnit, supplier, description },
      { new: true, runValidators: true }
    );
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE (soft)
router.delete('/:id', auth, async (req, res) => {
  try {
    const material = await RawMaterial.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!material) return res.status(404).json({ message: 'Material not found.' });
    res.json({ message: 'Material deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

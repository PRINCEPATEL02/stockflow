const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// GET all
router.get('/', auth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { isActive: true };
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { code: { $regex: search, $options: 'i' } }];

    const products = await Product.find(query).populate('materials.material', 'name unit currentStock').sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single
router.get('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('materials.material', 'name unit currentStock minimumStock');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// CREATE
router.post('/', auth, async (req, res) => {
  try {
    const { name, sellingPrice, category, description, materials } = req.body;
    if (!name || sellingPrice === undefined) return res.status(400).json({ message: 'Name and selling price are required.' });

    const code = 'PRD' + Date.now().toString().slice(-6);
    const product = await Product.create({ name, code, sellingPrice, category, description, materials: materials || [] });
    const populated = await product.populate('materials.material', 'name unit');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, sellingPrice, category, description, materials } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, sellingPrice, category, description, materials },
      { new: true, runValidators: true }
    ).populate('materials.material', 'name unit');
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE (soft)
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found.' });
    res.json({ message: 'Product deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RawMaterial = require('../models/RawMaterial');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Sale = require('../models/Sale');

router.get('/', auth, async (req, res) => {
  try {
    const [totalMaterials, totalProducts, totalPurchases, totalSales, lowStockItems, recentPurchases, recentSales] = await Promise.all([
      RawMaterial.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true }),
      Purchase.countDocuments(),
      Sale.countDocuments(),
      RawMaterial.find({ isActive: true }).then(mats => mats.filter(m => m.currentStock <= m.minimumStock)),
      Purchase.find().sort({ date: -1 }).limit(5).populate('material', 'name unit'),
      Sale.find().sort({ date: -1 }).limit(5).populate('product', 'name code'),
    ]);

    const purchaseTotal = await Purchase.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);
    const salesTotal = await Sale.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]);

    // Last 6 months sales trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesTrend = await Sale.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$date' }, year: { $year: '$date' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const purchaseTrend = await Purchase.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { month: { $month: '$date' }, year: { $year: '$date' } }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top selling products
    const topProducts = await Sale.aggregate([
      { $group: { _id: '$product', totalQty: { $sum: '$quantity' }, totalRevenue: { $sum: '$totalAmount' } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { name: '$product.name', totalQty: 1, totalRevenue: 1 } }
    ]);

    res.json({
      stats: {
        totalMaterials,
        totalProducts,
        totalPurchases,
        totalSales,
        totalPurchaseValue: purchaseTotal[0]?.total || 0,
        totalSalesValue: salesTotal[0]?.total || 0,
        lowStockCount: lowStockItems.length,
      },
      lowStockItems: lowStockItems.map(m => ({ id: m._id, name: m.name, unit: m.unit, currentStock: m.currentStock, minimumStock: m.minimumStock })),
      recentPurchases,
      recentSales,
      salesTrend,
      purchaseTrend,
      topProducts,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

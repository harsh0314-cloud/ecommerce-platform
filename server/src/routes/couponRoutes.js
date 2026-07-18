const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');
const {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCoupon
} = require('../controllers/couponController');

// Public route (requires login)
router.post('/validate', authenticate, validateCoupon);

// Admin routes
router.get('/', authenticate, requireAdmin, getAllCoupons);
router.post('/', authenticate, requireAdmin, createCoupon);
router.patch('/:id', authenticate, requireAdmin, updateCoupon);
router.delete('/:id', authenticate, requireAdmin, deleteCoupon);
router.patch('/:id/toggle', authenticate, requireAdmin, toggleCoupon);

module.exports = router;
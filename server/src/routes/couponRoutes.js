const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/rbac');

// Debug: Log what we're importing
const couponController = require('../controllers/couponController');
console.log('Coupon Controller exports:', Object.keys(couponController));

// Public route (requires login)
router.post('/validate', authenticate, couponController.validateCoupon);

// Admin routes
router.get('/', authenticate, requireAdmin, couponController.getAllCoupons);
router.post('/', authenticate, requireAdmin, couponController.createCoupon);
router.patch('/:id', authenticate, requireAdmin, couponController.updateCoupon);
router.delete('/:id', authenticate, requireAdmin, couponController.deleteCoupon);
router.patch('/:id/toggle', authenticate, requireAdmin, couponController.toggleCoupon);

module.exports = router;
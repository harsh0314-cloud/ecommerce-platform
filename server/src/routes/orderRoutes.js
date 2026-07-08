const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const couponController = require('../controllers/couponController');

router.use(authenticate);

router.get('/my-orders', orderController.getMyOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.post('/validate-coupon', couponController.validateCoupon); 

module.exports = router;
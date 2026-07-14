const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Normal routes use standard JSON parsing
router.post('/create-razorpay-order', authenticate, paymentController.createRazorpayOrder);

// WEBHOOK ROUTE MUST USE RAW BODY PARSER
router.post('/verify-razorpay', express.raw({ type: 'application/json' }), paymentController.verifyRazorpayPayment);

module.exports = router;
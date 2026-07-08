const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');

// Normal routes use standard JSON parsing
router.post('/create-checkout-session', authenticate, paymentController.createCheckoutSession);

// WEBHOOK ROUTE MUST USE RAW BODY PARSER
// This overrides the global express.json() middleware just for this specific route
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;
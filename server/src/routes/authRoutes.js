const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { registerSchema, loginSchema } = require('../validators/authValidator');

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.getCurrentUser);

// Newsletter Subscription (Mock)
router.post('/newsletter', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });
  // In production, you would save this to a database or send to Mailchimp
  console.log(`📩 New newsletter signup: ${email}`);
  res.status(200).json({ status: 'success', message: 'Subscribed successfully!' });
});

module.exports = router;
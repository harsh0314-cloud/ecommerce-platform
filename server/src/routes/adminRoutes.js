const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac'); 

// User MUST be logged in AND must have the 'ADMIN' role
router.use(authenticate);
router.use(authorize('ADMIN', 'SUPER_ADMIN')); 

// --- STATS ROUTE (Must be here) ---
router.get('/stats', adminController.getDashboardStats);
// -----------------------------------

router.post('/products', adminController.createProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.get('/orders', adminController.getAllOrders);
router.get('/customers', adminController.getAllCustomers);


router.get('/categories', async (req, res) => {
   const data = await req.prisma.category.findMany();
   res.status(200).json({ status: 'success', data: { categories: data } });
});

router.get('/brands', async (req, res) => {
   const data = await req.prisma.brand.findMany();
   res.status(200).json({ status: 'success', data: { brands: data } });
});

module.exports = router;

module.exports = router;
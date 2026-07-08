const { AppError } = require('../utils/AppError');

// GET DASHBOARD STATS
exports.getDashboardStats = async (req, res, next) => {
  try {
    // 1. Get all orders (safe select)
    const orders = await req.prisma.order.findMany({
      select: { total: true }
    });

    // 2. Force convert Prisma Decimal to Number safely
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => {
      // Convert Prisma Decimal to String, then to Float
      const num = parseFloat(String(order.total)); 
      return sum + (isNaN(num) ? 0 : num);
    }, 0);

    // 3. Count ALL users temporarily (remove the role filter so you show up!)
    const totalCustomers = await req.prisma.user.count(); 

    res.status(200).json({
      status: 'success',
      data: {
        totalOrders,
        totalRevenue,
        totalCustomers
      }
    });
  } catch (error) {
    console.error("STATS ERROR:", error); // Log the exact error to your Node terminal!
    next(error);
  }
};

// GET ALL ORDERS (For Revenue & Orders tabs)
exports.getAllOrders = async (req, res, next) => {
  try {
    const orders = await req.prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { 
        items: true, 
        user: { select: { firstName: true, lastName: true, email: true } } 
      }
    });
    res.status(200).json({ status: 'success', data: { orders } });
  } catch (error) { next(error); }
};

// GET ALL CUSTOMERS (For Customers tab)
exports.getAllCustomers = async (req, res, next) => {
  try {
    const customers = await req.prisma.user.findMany({
      // where: { role: { in: ['USER', 'CUSTOMER'] } }, // Temporarily commented out so YOU show up as a customer while testing!
      orderBy: { createdAt: 'desc' },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, isActive: true, createdAt: true }
    });
    res.status(200).json({ status: 'success', data: { customers } });
  } catch (error) { next(error); }
};

// CREATE PRODUCT
exports.createProduct = async (req, res, next) => {
  try {
    const { name, slug, price, description, categoryId, brandId } = req.body;
    
    const product = await req.prisma.product.create({
      data: {
        name,
        slug,
        sku: `SKU-${Date.now()}`,
        price: parseFloat(price),
        description: description || 'No description provided',
        categoryId: categoryId, 
        brandId: brandId, 
        inventory: { create: { quantity: 50 } },
        images: { create: { 
          url: `https://picsum.photos/seed/${Date.now()}/800/800`, 
          isPrimary: true 
        }}
      },
    });

    res.status(201).json({ status: 'success', data: { product } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

// DELETE PRODUCT
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await req.prisma.product.delete({
      where: { id }
    });

    res.status(200).json({ status: 'success', message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};
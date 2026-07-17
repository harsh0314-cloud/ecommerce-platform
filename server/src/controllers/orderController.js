const { calculateOrderTotals } = require('../utils/pricing');
const { AppError } = require('../utils/AppError');

exports.createOrder = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country } = req.body;

    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    
    // USE THE CENTRALIZED PRICING LOGIC
    const pricing = calculateOrderTotals(subtotal);

    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    const order = await req.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: 'ORD-' + Date.now(),
          userId: req.user.id,
          addressId: address.id,
          subtotal: pricing.subtotal, 
          discount: "0.00", 
          shippingCost: pricing.shippingCost, 
          tax: pricing.tax, 
          total: pricing.total,
          status: 'CONFIRMED', // COD is confirmed immediately
          items: {
              create: cart.items.map(item => ({
              productId: item.productId,
              name: item.product.name,
              image: item.product.images[0]?.url || null,
              price: parseFloat(item.product.price).toFixed(2),
              quantity: item.quantity,
              subtotal: (parseFloat(item.product.price) * item.quantity).toFixed(2)
            }))
          }
        }
      });

      // ==========================================
      // THE "SAME THING" -> DECREMENT INVENTORY
      // ==========================================
      for (const item of cart.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      return newOrder;
    });

    res.status(201).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
};

exports.getMyOrders = async (req, res, next) => {
  try {
    // 1. Get page and limit from query, set defaults
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. Run queries in parallel for speed
    const [orders, total] = await Promise.all([
      req.prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { items: true }
      }),
      req.prisma.order.count({ where: { userId: req.user.id } })
    ]);

    res.status(200).json({ 
      status: 'success', 
      data: { 
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOrderById = async (req, res, next) => {
  try {
    const order = await req.prisma.order.findUnique({
      where: { id: req.params.id, userId: req.user.id }, // Ensure it belongs to user
      include: {
        items: true,
        address: true,
      }
    });

    if (!order) return next(new AppError('Order not found', 404));

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
};
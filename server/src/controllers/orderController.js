const { calculateOrderTotals } = require('../utils/pricing');
const { AppError } = require('../utils/AppError');

exports.createOrder = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country, couponCode } = req.body;

    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);

    let discount = 0;
    let appliedCouponId = null;

    if (couponCode) {
      const coupon = await req.prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() }
      });

      if (coupon && coupon.isActive) {
        const now = new Date();
        const start = new Date(coupon.startDate);
        const end = new Date(coupon.endDate);

        if (now >= start && now <= end) {
          if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
            if (!coupon.minOrderAmount || subtotal >= parseFloat(coupon.minOrderAmount)) {
              if (coupon.type === 'PERCENTAGE') {
                discount = (subtotal * parseFloat(coupon.value)) / 100;
              } else {
                discount = parseFloat(coupon.value);
              }
              if (coupon.maxDiscount && discount > parseFloat(coupon.maxDiscount)) {
                discount = parseFloat(coupon.maxDiscount);
              }
              if (discount > subtotal) discount = subtotal;
              appliedCouponId = coupon.id;
            }
          }
        }
      }
    }

    const pricing = calculateOrderTotals(subtotal, discount);

    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    const order = await req.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber: 'ORD-' + Date.now(),
          userId: req.user.id,
          addressId: address.id,
          couponId: appliedCouponId,
          subtotal: pricing.subtotal, 
          discount: pricing.discount, 
          shippingCost: pricing.shippingCost, 
          tax: pricing.tax, 
          total: pricing.total,
          status: 'CONFIRMED',
          paymentMethod: req.body.paymentMethod || 'CASH_ON_DELIVERY',
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

      if (appliedCouponId) {
        await tx.coupon.update({
          where: { id: appliedCouponId },
          data: { usedCount: { increment: 1 } }
        });
      }

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      req.prisma.order.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { 
          items: true,
          address: true,
          coupon: { select: { code: true, type: true, value: true } }
        }
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
    const whereClause = req.user.role === 'ADMIN' 
      ? { id: req.params.id } 
      : { id: req.params.id, userId: req.user.id };

    const order = await req.prisma.order.findUnique({
      where: whereClause,
      include: {
        items: true,
        address: true,
        coupon: { select: { code: true, type: true, value: true } }
      }
    });

    if (!order) return next(new AppError('Order not found', 404));

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    next(error);
  }
};
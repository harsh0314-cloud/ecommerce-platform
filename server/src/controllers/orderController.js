const { AppError } = require('../utils/AppError');

exports.createOrder = async (req, res) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country } = req.body;

    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Your cart is empty' });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.10).toFixed(2)); 
    const shippingCost = subtotal > 50 ? 0 : 10; 
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));

    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    const order = await req.prisma.$transaction(async (prisma) => {
      const newOrder = await prisma.order.create({
        data: {
          orderNumber: 'ORD-' + Date.now(),
          userId: req.user.id,
          addressId: address.id,
          subtotal: subtotal.toFixed(2), 
          discount: "0.00", 
          shippingCost: shippingCost.toFixed(2), 
          tax: tax.toFixed(2), 
          total: total.toFixed(2),
          status: 'CONFIRMED',
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
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
      return newOrder;
    });

    res.status(201).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

exports.getMyOrders = async (req, res) => {
  try {
    const orders = await req.prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    res.status(200).json({ status: 'success', data: { orders } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
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
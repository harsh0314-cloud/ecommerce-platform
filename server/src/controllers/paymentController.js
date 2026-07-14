const razorpay = require('razorpay');
const crypto = require('crypto');
const { AppError } = require('../utils/AppError');

// 1. Create Razorpay Order ID
exports.createRazorpayOrder = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country } = req.body;

    // 1. Fetch Cart
    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    // 2. Calculate Totals (Exactly like your order controller)
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.18).toFixed(2);
    const shippingCost = subtotal > 500 ? 0 : 40;
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));

    // 3. Create Address
    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    // 4. Create Order in DB as PENDING
    const order = await req.prisma.order.create({
      data: {
        orderNumber: 'ORD-' + Date.now(),
        userId: req.user.id,
        addressId: address.id,
        subtotal: subtotal.toFixed(2),
        discount: "0.00",
        shippingCost: shippingCost.toFixed(2),
        tax: tax.toFixed(2),
        total: total.toFixed(2),
        status: 'PENDING',
        paymentMethod: 'RAZORPAY',
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

    // 5. Create Razorpay Backend Order
    const instance = new razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const razorpayOrder = await instance.orders.create({
      amount: Math.round(total * 100), // Converts ₹ to paise
      currency: "INR",
      receipt: order.orderNumber,
      notes: { name: `${firstName} ${lastName}`, email: req.user.email },
    });

    // 6. Clear the user's cart
    await req.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // 7. Send details to frontend
    res.status(200).json({
      status: 'success',
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: "INR",
        name: "StoreX Purchase",
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrder.id,
        orderId: order.id,
        prefill: {
          name: `${firstName} ${lastName}`,
          contact: phone,
        },
        theme: { color: "#111111" }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 2. Webhook to verify payment
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id } = req.body;
    const secret = process.env.RAZORPAY_KEY_SECRET;

    const body = razorpay_order_id + "|" + req.headers['x-razorpay-signature'];
    const expectedSignature = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expectedSignature === req.headers['x-razorpay-signature']) {
      const order = await req.prisma.order.findFirst({ where: { orderNumber: razorpay_order_id.replace('pay_', '') } });
      if (order) {
        await req.prisma.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });
      }
      res.status(200).json({ status: 'success', message: 'Payment verified' });
    } else {
      return next(new AppError('Invalid payment signature', 400));
    }
  } catch (error) {
    next(error);
  }
};
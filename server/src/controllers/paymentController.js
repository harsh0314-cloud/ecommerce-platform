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

    // 2. Calculate Totals
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.18).toFixed(2));
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
      notes: { orderId: order.id }, // Pass DB order ID in notes for easy lookup
    });

    // NOTICE: We DO NOT clear the cart here. We wait for verification.

    // 6. Send details to frontend
    res.status(200).json({
      status: 'success',
      data: {
        key: process.env.RAZORPAY_KEY_ID,
        amount: razorpayOrder.amount,
        currency: "INR",
        name: "StoreX Purchase",
        description: `Order ${order.orderNumber}`,
        order_id: razorpayOrder.id,
        orderId: order.id, // Send DB order ID to frontend
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

// 2. Verify Payment (Called by Frontend after checkout)
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    // 1. Get data from FRONTEND BODY (not headers)
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return next(new AppError('Missing payment verification details', 400));
    }

    // 2. Create the expected signature correctly
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    // 3. Compare signatures securely
    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature', 400));
    }

    // 4. Find the order using the DB ID passed from frontend
    const order = await req.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // 5. Use a Transaction to ensure all DB updates happen together safely
    await req.prisma.$transaction(async (tx) => {
      // Update Order Status
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CONFIRMED' }
      });

      // Create Payment Record (CRITICAL: Was missing entirely!)
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'RAZORPAY',
          status: 'COMPLETED',
          amount: order.total,
          currency: 'inr',
          transactionId: razorpay_payment_id,
          stripePaymentIntentId: razorpay_order_id, // Re-using this column for razorpay_order_id to avoid schema change
        }
      });

      // CLEAR CART ONLY AFTER PAYMENT IS VERIFIED
      const cart = await tx.cart.findUnique({ where: { userId: req.user.id } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }
    });

    res.status(200).json({ status: 'success', message: 'Payment verified successfully' });
  } catch (error) {
    next(error);
  }
}; 
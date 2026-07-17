const { calculateOrderTotals } = require('../utils/pricing');
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

    // 2. Calculate Totals using Centralized Logic
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const pricing = calculateOrderTotals(subtotal);

    // 3. Create Address
    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    // 4. Create Order in DB as PENDING (FIXED VARIABLES HERE)
    const order = await req.prisma.order.create({
      data: {
        orderNumber: 'ORD-' + Date.now(),
        userId: req.user.id,
        addressId: address.id,
        subtotal: pricing.subtotal,
        discount: "0.00",
        shippingCost: pricing.shippingCost, // FIXED: was shippingCost.toFixed(2)
        tax: pricing.tax,                  // FIXED: was tax.toFixed(2)
        total: pricing.total,              // FIXED: was total.toFixed(2)
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

    // 5. Create Razorpay Backend Order (FIXED VARIABLE HERE)
    const instance = new razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const razorpayOrder = await instance.orders.create({
      amount: Math.round(parseFloat(pricing.total) * 100), // FIXED: was total * 100
      currency: "INR",
      receipt: order.orderNumber,
      notes: { 
        name: `${firstName} ${lastName}`, 
        email: req.user.email,
        orderId: order.id // CRITICAL for Webhook
      },
    });

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

// 2. Verify Payment (Called by Frontend after checkout)
exports.verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return next(new AppError('Missing payment verification details', 400));
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return next(new AppError('Invalid payment signature', 400));
    }

    const order = await req.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return next(new AppError('Order not found', 404));

    await req.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });

      await tx.payment.create({
        data: {
          orderId: order.id,
          method: 'RAZORPAY',
          status: 'COMPLETED',
          amount: order.total,
          currency: 'inr',
          transactionId: razorpay_payment_id,
          stripePaymentIntentId: razorpay_order_id,
        }
      });

      // Decrement Inventory
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } }
        });
      }

      // Clear Cart
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

// 3. Razorpay Webhook (Called directly by Razorpay Server)
exports.handleWebhook = async (req, res, next) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    
    if (!secret || !signature) {
      return res.status(400).json({ status: 'error', message: 'Missing webhook signature' });
    }

    // 1. Convert raw buffer to string and verify signature
    const bodyString = req.body.toString();
    const expectedSignature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({ status: 'error', message: 'Invalid signature' });
    }

    // 2. Parse the string into JSON
    const event = JSON.parse(bodyString);
    
    // 3. Only process successful payments
    if (event.event === 'payment.captured') {
      const payload = event.payload?.payment?.entity;
      const orderId = payload.notes?.orderId;
      
      if (!orderId) return res.status(200).json({ status: 'success' });

      const order = await req.prisma.order.findUnique({ where: { id: orderId } });
      
      // Idempotency: If frontend already verified it, do nothing
      if (!order || order.status === 'CONFIRMED') {
        return res.status(200).json({ status: 'success' });
      }

      // 4. Update DB safely
      await req.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'CONFIRMED' } });
        
        // Create payment record if it doesn't exist
        if (!await tx.payment.findUnique({ where: { transactionId: payload.id } })) {
          await tx.payment.create({
            data: {
              orderId: order.id,
              method: 'RAZORPAY',
              status: 'COMPLETED',
              amount: order.total,
              currency: 'inr',
              transactionId: payload.id,
              stripePaymentIntentId: payload.order_id,
            }
          });
        }
        
        // Decrement Inventory
        const orderItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of orderItems) {
          await tx.inventory.update({
            where: { productId: item.productId },
            data: { quantity: { decrement: item.quantity } }
          });
        }

        // Clear Cart
        const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      });
    }

    // Always return 200 to Razorpay so they don't retry the webhook
    res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('WEBHOOK ERROR:', error);
    // Still return 200 to prevent Razorpay from spamming retries on a code error
    res.status(200).json({ status: 'success' });
  }
};
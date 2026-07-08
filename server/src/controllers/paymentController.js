const stripe = require('../config/stripe');
const { AppError } = require('../utils/AppError');

// 1. Create Stripe Checkout Session
exports.createCheckoutSession = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, addressLine1, city, state, postalCode, country } = req.body;

    // Get user's cart
    const cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: { items: { include: { product: { include: { images: true } } } } }
    });

    if (!cart || cart.items.length === 0) {
      return next(new AppError('Your cart is empty', 400));
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => sum + (parseFloat(item.product.price) * item.quantity), 0);
    const tax = parseFloat((subtotal * 0.10).toFixed(2));
    const shippingCost = subtotal > 50 ? 0 : 10;
    const total = parseFloat((subtotal + tax + shippingCost).toFixed(2));

    // Create Address
    const address = await req.prisma.address.create({
      data: { userId: req.user.id, firstName, lastName, phone, addressLine1, city, state, postalCode, country, isDefault: false }
    });

    // Create the Order in the database as PENDING
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

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: cart.items.map(item => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.product.name,
            images: [item.product.images[0]?.url],
          },
          unit_amount: Math.round(parseFloat(item.product.price) * 100), // Stripe wants cents!
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/payment/success?orderId=${order.id}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
      // Pass the orderId so the webhook knows which order to update
      metadata: { orderId: order.id }, 
    });

    // Clear the user's cart after creating the session
    await req.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    res.status(200).json({ status: 'success', data: { url: session.url } });
  } catch (error) {
    next(error);
  }
};

// 2. Handle Stripe Webhook (The most important function)
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the webhook signature to ensure it's actually from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log(`Webhook Signature Verification Failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the successful payment event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const orderId = session.metadata.orderId;

    try {
      // 1. Update Order Status to CONFIRMED
      await req.prisma.order.update({
        where: { id: orderId },
        data: { status: 'CONFIRMED' }
      });

      // 2. Create the Payment Record
      await req.prisma.payment.create({
        data: {
          orderId: orderId,
          method: 'STRIPE',
          status: 'COMPLETED',
          amount: parseFloat(session.amount_total) / 100,
          currency: session.currency,
          transactionId: session.payment_intent,
          stripePaymentIntentId: session.payment_intent,
        }
      });

      console.log(`✅ Order ${orderId} paid successfully!`);
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId}:`, error.message);
    }
  }

  // Always return 200 to Stripe so they know we received it
  res.status(200).json({ received: true });
};
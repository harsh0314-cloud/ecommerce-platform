const { AppError } = require('../utils/AppError');

// Get the user's cart
exports.getCart = async (req, res, next) => {
  try {
    let cart = await req.prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          include: {
            product: { include: { images: { where: { isPrimary: true }, take: 1 } } }
          }
        }
      }
    });

    if (!cart) {
      cart = await req.prisma.cart.create({
        data: { userId: req.user.id },
        include: { items: { include: { product: { include: { images: { where: { isPrimary: true }, take: 1 } } } } } }
      });
    }

    res.status(200).json({ status: 'success', data: { cart } });
  } catch (error) {
    next(error);
  }
};

// Add item to cart
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    let cart = await req.prisma.cart.upsert({
      where: { userId: req.user.id },
      update: {},
      create: { userId: req.user.id },
    });

    const existingItem = await req.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: productId,
        variantId: null
      }
    });

    if (existingItem) {
      await req.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity }
      });
    } else {
      await req.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity: quantity
        }
      });
    }

    res.status(200).json({ status: 'success', message: 'Item added to cart' });
  } catch (error) {
    next(error);
  }
};

// Update Item Quantity
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity < 1) {
      return res.status(400).json({ status: 'error', message: 'Quantity must be at least 1' });
    }

    await req.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity }
    });

    res.status(200).json({ status: 'success', message: 'Quantity updated' });
  } catch (error) {
    next(error);
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res, next) => {
  try {
    await req.prisma.cartItem.delete({
      where: { id: req.params.itemId }
    });
    res.status(200).json({ status: 'success', message: 'Item removed' });
  } catch (error) {
    next(error);
  }
};

// Clear entire cart
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await req.prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (cart) {
      await req.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    res.status(200).json({ status: 'success', message: 'Cart cleared' });
  } catch (error) {
    next(error);
  }
};
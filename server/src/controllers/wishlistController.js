const { AppError } = require('../utils/AppError');
const { Prisma } = require('@prisma/client');

// 1. Get User's Wishlist
exports.getWishlist = async (req, res, next) => {
  try {
    const items = await req.prisma.wishlist.findMany({
      where: { userId: req.user.id },
      include: { 
        product: { 
          include: { images: true } // Include product images so frontend can display them
        } 
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ status: 'success', items });
  } catch (error) {
    next(error);
  }
};

// 2. Add Item to Wishlist
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;
    
    if (!productId) return next(new AppError('Product ID is required', 400));

    // Use upsert to prevent "Unique constraint failed" error if user clicks twice
    await req.prisma.wishlist.upsert({
      where: {
        userId_productId: {
          userId: req.user.id,
          productId: productId
        }
      },
      update: {}, // No update needed if it exists
      create: {
        userId: req.user.id,
        productId: productId
      }
    });

    res.status(200).json({ status: 'success', message: 'Added to wishlist' });
  } catch (error) {
    next(error);
  }
};

// 3. Remove Item from Wishlist
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    await req.prisma.wishlist.deleteMany({
      where: {
        productId: productId,
        userId: req.user.id
      }
    });

    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    next(error);
  }
};
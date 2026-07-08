const { AppError } = require('../utils/AppError');

exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, subtotal } = req.body;

    const coupon = await req.prisma.coupon.findUnique({
      where: { code: code.toUpperCase(), isActive: true }
    });

    if (!coupon) return next(new AppError('Invalid coupon code', 404));
    if (new Date() > new Date(coupon.endDate)) return next(new AppError('Coupon has expired', 400));
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return next(new AppError('Coupon usage limit reached', 400));
    if (coupon.minOrderAmount && parseFloat(subtotal) < parseFloat(coupon.minOrderAmount)) {
      return next(new AppError(`Minimum order amount for this coupon is $${coupon.minOrderAmount}`, 400));
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (parseFloat(subtotal) * parseFloat(coupon.value)) / 100;
    } else {
      discountAmount = parseFloat(coupon.value);
    }

    if (coupon.maxDiscount && discountAmount > parseFloat(coupon.maxDiscount)) {
      discountAmount = parseFloat(coupon.maxDiscount);
    }

    res.status(200).json({
      status: 'success',
      data: {
        discount: discountAmount.toFixed(2),
        type: coupon.type,
        message: `Coupon applied! You saved $${discountAmount.toFixed(2)}`
      }
    });
  } catch (error) {
    next(error);
  }
};
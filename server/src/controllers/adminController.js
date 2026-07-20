  const { AppError } = require('../utils/AppError');

  // ==========================================
  // DASHBOARD STATS
  // ==========================================
  exports.getDashboardStats = async (req, res, next) => {
    try {
      const [totalProducts, totalOrders, totalCustomers, totalRevenue] = await Promise.all([
        req.prisma.product.count(),
        req.prisma.order.count(),
        req.prisma.user.count({ where: { role: 'USER' } }),
        req.prisma.order.aggregate({ _sum: { total: true } })
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          totalProducts,
          totalOrders,
          totalCustomers,
          totalRevenue: totalRevenue._sum.total || 0
        }
      });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // PRODUCT MANAGEMENT
  // ==========================================
  exports.createProduct = async (req, res, next) => {
  try {
    const { name, slug, price, comparePrice, description, categoryId, brandId, inventory, images } = req.body;

    console.log('createProduct called with:', { name, slug, price, categoryId, brandId, description });

    if (!name || !slug || !price || !categoryId || !brandId) {
      return next(new AppError('Name, slug, price, categoryId, brandId are required', 400));
    }

    let product;
    try {
      product = await req.prisma.$transaction(async (tx) => {
              const newProduct = await tx.product.create({
        data: {
          name,
          slug,
          sku: req.body.sku || slug.toUpperCase().replace(/-/g, '_'),
          price: price.toString(),
          comparePrice: comparePrice ? comparePrice.toString() : null,
          description,
          categoryId,
          brandId,
          isActive: true,
          isNewArrival: req.body.isNewArrival || false,
          isBestSeller: req.body.isBestSeller || false,
        }
      });

        // Create inventory
        if (inventory !== undefined) {
          await tx.inventory.create({
            data: {
              productId: newProduct.id,
              quantity: parseInt(inventory) || 0,
              lowStockThreshold: req.body.lowStockThreshold || 5
            }
          });
        }

        // Create images
        if (images && images.length > 0) {
          await tx.productImage.createMany({
            data: images.map((img, idx) => ({
              productId: newProduct.id,
              url: img.url,
              isPrimary: idx === 0,
              position: idx
            }))
          });
        }

        return newProduct;
      });
    } catch (txError) {
      console.error('Transaction error:', txError);
      throw txError;
    }

    res.status(201).json({ status: 'success', data: product });
  } catch (error) {
    console.error('createProduct error:', error);
    if (error.code === 'P2002') {
      return next(new AppError('Product with this slug already exists', 400));
    }
    next(error);
  }
};

  exports.updateProduct = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, slug, price, comparePrice, description, categoryId, brandId, isActive, isNewArrival, isBestSeller, inventory } = req.body;

      const updateData = {};
      if (name) updateData.name = name;
      if (slug) updateData.slug = slug;
      if (price !== undefined) updateData.price = price.toString();
      if (comparePrice !== undefined) updateData.comparePrice = comparePrice ? comparePrice.toString() : null;
      if (description !== undefined) updateData.description = description;
      if (categoryId) updateData.categoryId = categoryId;
      if (brandId) updateData.brandId = brandId;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isNewArrival !== undefined) updateData.isNewArrival = isNewArrival;
      if (isBestSeller !== undefined) updateData.isBestSeller = isBestSeller;

      const product = await req.prisma.product.update({
        where: { id },
        data: updateData
      });

      // Update inventory if provided
      if (inventory !== undefined) {
        await req.prisma.inventory.upsert({
          where: { productId: id },
          update: { quantity: parseInt(inventory) },
          create: { productId: id, quantity: parseInt(inventory), lowStockThreshold: 5 }
        });
      }

      res.status(200).json({ status: 'success', data: product });
    } catch (error) {
      if (error.code === 'P2025') {
        return next(new AppError('Product not found', 404));
      }
      next(error);
    }
  };

  exports.deleteProduct = async (req, res, next) => {
    try {
      const { id } = req.params;
      await req.prisma.product.delete({ where: { id } });
      res.status(200).json({ status: 'success', message: 'Product deleted' });
    } catch (error) {
      if (error.code === 'P2025') {
        return next(new AppError('Product not found', 404));
      }
      next(error);
    }
  };

  // ==========================================
  // INVENTORY MANAGEMENT
  // ==========================================
  exports.getAllInventory = async (req, res, next) => {
    try {
      const inventory = await req.prisma.inventory.findMany({
        include: {
          product: {
            select: { name: true, slug: true, price: true, images: { where: { isPrimary: true }, take: 1 } }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.status(200).json({ status: 'success', data: inventory });
    } catch (error) {
      next(error);
    }
  };

  exports.updateInventory = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { quantity, lowStockThreshold } = req.body;

      const updateData = {};
      if (quantity !== undefined) updateData.quantity = parseInt(quantity);
      if (lowStockThreshold !== undefined) updateData.lowStockThreshold = parseInt(lowStockThreshold);

      const inventory = await req.prisma.inventory.update({
        where: { id },
        data: updateData
      });

      res.status(200).json({ status: 'success', data: inventory });
    } catch (error) {
      if (error.code === 'P2025') {
        return next(new AppError('Inventory record not found', 404));
      }
      next(error);
    }
  };

  exports.bulkUpdateInventory = async (req, res, next) => {
    try {
      const { updates } = req.body; // Array of { productId, quantity }

      if (!Array.isArray(updates)) {
        return next(new AppError('Updates must be an array', 400));
      }

      await req.prisma.$transaction(
        updates.map(u =>
          req.prisma.inventory.upsert({
            where: { productId: u.productId },
            update: { quantity: parseInt(u.quantity) },
            create: { productId: u.productId, quantity: parseInt(u.quantity), lowStockThreshold: 5 }
          })
        )
      );

      res.status(200).json({ status: 'success', message: 'Inventory updated' });
    } catch (error) {
      next(error);
    }
  };

  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================
  exports.getAllOrders = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [orders, total] = await Promise.all([
        req.prisma.order.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            user: { select: { firstName: true, lastName: true, email: true } },
            items: true,
            address: true,
            coupon: { select: { code: true } }
          }
        }),
        req.prisma.order.count()
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          orders,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        }
      });
    } catch (error) {
      next(error);
    }
  };

  exports.updateOrderStatus = async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (!validStatuses.includes(status)) {
        return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400));
      }

      const order = await req.prisma.order.update({
        where: { id },
        data: { status }
      });

      res.status(200).json({ status: 'success', data: order });
    } catch (error) {
      if (error.code === 'P2025') {
        return next(new AppError('Order not found', 404));
      }
      next(error);
    }
  };

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================
  exports.getAllCustomers = async (req, res, next) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const [customers, total] = await Promise.all([
        req.prisma.user.findMany({
          where: { role: 'USER' },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
            _count: { select: { orders: true } }
          }
        }),
        req.prisma.user.count({ where: { role: 'USER' } })
      ]);

      res.status(200).json({
        status: 'success',
        data: {
          customers,
          pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        }
      });
    } catch (error) {
      next(error);
    }
  };
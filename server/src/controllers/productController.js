exports.getProducts = async (req, res, next) => {
  try {
    // 1. Extract query params and convert empty strings to null/undefined
    const search = req.query.search || undefined;
    const category = req.query.category || undefined;
    const brand = req.query.brand || undefined;
    const sort = req.query.sort || 'newest';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;

    // 2. Build the Where Clause safely
    const where = { isActive: true };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (category) {
      where.category = { slug: category };
    }
    if (brand) {
      where.brand = { name: brand };
    }

    // 3. Build Order By safely
    let orderBy = { createdAt: 'desc' }; // Default to newest
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    else if (sort === 'price-desc') orderBy = { price: 'desc' };

    // 4. Fetch Data and Total Count in parallel
    const [products, total] = await req.prisma.$transaction([
      req.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          category: { select: { name: true, slug: true } },
          brand: { select: { name: true } },
          images: { where: { isPrimary: true }, take: 1 },
          inventory: { select: { quantity: true } },
        },
      }),
      req.prisma.product.count({ where }),
    ]);

    // 5. Send Response
    res.status(200).json({
      status: 'success',
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
    });
  } catch (error) {
    // Print the EXACT error to the terminal if it still fails
    console.error("Product Fetch Error:", error);
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await req.prisma.product.findUnique({
      where: { slug: req.params.slug, isActive: true },
      include: {
        category: { select: { name: true, slug: true } },
        brand: { select: { name: true } },
        images: { orderBy: { position: 'asc' } },
        variants: { where: { isActive: true } },
        inventory: true,
        reviews: { where: { isActive: true }, include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    if (!product) return next(new AppError('Product not found.', 404));
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    next(error);
  }
};
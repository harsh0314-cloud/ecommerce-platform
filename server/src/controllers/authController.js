const bcrypt = require('bcryptjs');
const { AppError } = require('../utils/AppError');
const { generateToken } = require('../middleware/auth');

exports.register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await req.prisma.user.findUnique({ where: { email } });
    if (existingUser) return next(new AppError('Email already exists.', 409));

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await req.prisma.user.create({
      data: { email, password: hashedPassword, firstName, lastName },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });

    const token = generateToken(user.id, user.role);
    res.status(201).json({ status: 'success', data: { user, token } });
  } catch (error) { next(error); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await req.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return next(new AppError('Invalid email or password.', 401));

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return next(new AppError('Invalid email or password.', 401));

    const token = generateToken(user.id, user.role);
    res.status(200).json({
      status: 'success',
      data: {
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
        token,
      },
    });
  } catch (error) { next(error); }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await req.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatar: true, role: true },
    });
    res.status(200).json({ status: 'success', data: { user } });
  } catch (error) { next(error); }
};
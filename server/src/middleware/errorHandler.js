const { logger } = require('../utils/logger');
const { AppError } = require('../utils/AppError');
const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      err = new AppError('A record with this value already exists.', 409);
    } else if (err.code === 'P2025') {
      err = new AppError('Record not found.', 404);
    } else {
      err = new AppError('Database error occurred.', 500);
    }
  }

  if (err.name === 'JsonWebTokenError') {
    err = new AppError('Invalid token.', 401);
  }

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
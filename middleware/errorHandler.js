const mongoose = require('mongoose');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

// Error response formatter
const formatErrorResponse = (error, req) => {
  const response = {
    success: false,
    message: error.message || 'Internal server error',
    error: error.errorCode || 'INTERNAL_SERVER_ERROR',
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.id || 'unknown',
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add validation errors if present
  if (error.errors && Array.isArray(error.errors)) {
    response.errors = error.errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  return response;
};

// Global error handler middleware
const globalErrorHandler = (error, req, res, next) => {
  let err = { ...error };
  err.message = error.message;

  // Log error details
  console.error('Error Details:', {
    message: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.email : 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    err = new ValidationError('Validation failed', errors);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    const value = error.keyValue[field];
    
    err = new ConflictError(`${field} '${value}' already exists`);
  }

  // Mongoose cast error (invalid ObjectId)
  if (error.name === 'CastError') {
    err = new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    err = new UnauthorizedError('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    err = new UnauthorizedError('Token expired');
  }

  // Syntax errors (invalid JSON)
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    err = new ValidationError('Invalid JSON format');
  }

  // Rate limiting errors
  if (error.name === 'RateLimitError') {
    err = new AppError('Too many requests, please try again later', 429, 'RATE_LIMIT_EXCEEDED');
  }

  // Default to 500 if no status code
  const statusCode = err.statusCode || 500;
  
  // Don't leak error details in production for 500 errors
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    err.message = 'Internal server error';
    err.errorCode = 'INTERNAL_SERVER_ERROR';
  }

  res.status(statusCode).json(formatErrorResponse(err, req));
};

// Async error wrapper
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};

// Request ID middleware
const requestId = (req, res, next) => {
  req.id = require('crypto').randomUUID().substring(0, 8);
  res.set('X-Request-ID', req.id);
  next();
};

// Development error handler (for debugging)
const developmentErrors = (err, req, res, next) => {
  err.stack = err.stack || '';
  const errorDetails = {
    message: err.message,
    error: err,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    user: req.user
  };

  console.error('Development Error Details:', JSON.stringify(errorDetails, null, 2));
  
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    error: err.errorCode || 'INTERNAL_SERVER_ERROR',
    details: errorDetails,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
};

// Production error handler
const productionErrors = (err, req, res, next) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json(formatErrorResponse(err, req));
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥:', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
      error: 'INTERNAL_SERVER_ERROR',
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
};

// Error monitoring and alerting
const errorMonitor = (error, req, res, next) => {
  // Log critical errors
  if (error.statusCode >= 500) {
    console.error('Critical Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      user: req.user ? req.user.email : 'anonymous',
      url: req.originalUrl,
      method: req.method
    });
    
    // Here you could integrate with external monitoring services
    // like Sentry, Bugsnag, or custom logging solutions
  }
  
  next(error);
};

// Validation error helper
const createValidationError = (field, message, value = null) => {
  return new ValidationError('Validation failed', [{
    field,
    message,
    value
  }]);
};

// Business logic errors
const businessErrors = {
  // Record related errors
  recordNotFound: new NotFoundError('Record'),
  recordAccessDenied: new ForbiddenError('You can only access your own records'),
  invalidRecordType: new ValidationError('Invalid record type'),
  
  // User related errors
  userNotFound: new NotFoundError('User'),
  userAccessDenied: new ForbiddenError('Access denied'),
  userAlreadyExists: new ConflictError('User already exists'),
  selfOperationForbidden: new ForbiddenError('Cannot perform this operation on your own account'),
  
  // Authentication errors
  invalidCredentials: new UnauthorizedError('Invalid email or password'),
  tokenRequired: new UnauthorizedError('Authentication token required'),
  tokenInvalid: new UnauthorizedError('Invalid authentication token'),
  tokenExpired: new UnauthorizedError('Authentication token expired'),
  
  // Permission errors
  insufficientPermissions: new ForbiddenError('Insufficient permissions'),
  adminRequired: new ForbiddenError('Admin access required'),
  
  // Resource errors
  resourceNotFound: new NotFoundError('Resource'),
  resourceConflict: new ConflictError('Resource conflict'),
  resourceLocked: new AppError('Resource is temporarily locked', 423, 'RESOURCE_LOCKED')
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  DatabaseError,
  
  // Middleware
  globalErrorHandler,
  notFoundHandler,
  requestId,
  errorMonitor,
  asyncHandler,
  
  // Environment-specific handlers
  developmentErrors,
  productionErrors,
  
  // Helpers
  formatErrorResponse,
  createValidationError,
  businessErrors
};

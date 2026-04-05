require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const rateLimit = require('express-rate-limit');

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes',
    error: 'RATE_LIMIT_EXCEEDED'
  }
});

// Apply rate limiter to all routes
app.use(limiter);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom middleware
app.use(require('./middleware/errorHandler').requestId);
app.use(require('./middleware/validation').sanitizeInput);

// Routes
app.use('/api', require('./routes'));

// Root route for Render health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'FinTech Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      documentation: '/api/docs'
    }
  });
});

// Error handling middleware (must be after routes)
app.use(require('./middleware/errorHandler').notFoundHandler);
app.use(require('./middleware/errorHandler').errorMonitor);
app.use(require('./middleware/errorHandler').globalErrorHandler);

const PORT = process.env.PORT || 3000;

module.exports = app;

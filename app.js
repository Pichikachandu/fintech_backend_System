require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();

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

// Error handling middleware (must be after routes)
app.use(require('./middleware/errorHandler').notFoundHandler);
app.use(require('./middleware/errorHandler').errorMonitor);
app.use(require('./middleware/errorHandler').globalErrorHandler);

const PORT = process.env.PORT || 3000;

module.exports = app;

// index.js (main application)
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./config/database');
const routes = require('./routes');
const EmailService = require('./utils/email');

const app = express();

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Request logging

// Connect to MongoDB
connectDB();

// Routes
app.use('/api', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
            status: err.status || 500
        }
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Initialize email service (optional: warm up connection)
EmailService.transporter.verify((error, success) => {
    if (error) {
        console.error('Email service verification failed:', error);
    } else {
        console.log('Email service ready');
    }
});

module.exports = app;
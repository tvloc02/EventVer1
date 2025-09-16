// backend/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/StudentEventManagement')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB error:', err));

// Simple User Schema
const UserSchema = new mongoose.Schema({
    email: String,
    username: String,
    firstName: String,
    lastName: String,
    role: { type: String, default: 'student' }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server running',
        time: new Date().toISOString()
    });
});

// Get users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Create user
app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
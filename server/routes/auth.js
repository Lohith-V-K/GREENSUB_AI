const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
    return jwt.sign(
        { id: user._id, email: user.email, fullName: user.fullName },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post('/signup', async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validate input
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists.' });
        }

        // Create user
        const user = await User.create({ fullName, email, password });
        const token = generateToken(user);

        res.status(201).json({
            message: 'Account created successfully!',
            token,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Signup error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(e => e.message);
            return res.status(400).json({ error: messages[0] });
        }
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        // Verify password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }

        const token = generateToken(user);

        res.json({
            message: 'Login successful!',
            token,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
});

/**
 * GET /api/auth/me
 * Get current user info (protected route)
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
});

module.exports = router;

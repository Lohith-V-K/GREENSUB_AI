require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const analyzeRoutes = require('./routes/analyze');

const app = express();
const PORT = process.env.PORT || 5500;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (HTML, CSS, JS) from project root
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analyzeRoutes);

// Fallback: serve auth.html for root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'auth.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 GreenSub AI Server running at http://localhost:${PORT}`);
    console.log(`   📄 Auth page:  http://localhost:${PORT}/auth.html`);
    console.log(`   📊 Dashboard:  http://localhost:${PORT}/index.html\n`);
});

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Analysis = require('../models/Analysis');

/**
 * GET /api/history
 * Get all analysis history for the authenticated user
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const analyses = await Analysis.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({ analyses });
    } catch (error) {
        console.error('History fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch history.' });
    }
});

/**
 * DELETE /api/history/:id
 * Delete a specific analysis record
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const analysis = await Analysis.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.id
        });

        if (!analysis) {
            return res.status(404).json({ error: 'Analysis not found.' });
        }

        res.json({ message: 'Analysis deleted.' });
    } catch (error) {
        console.error('History delete error:', error);
        res.status(500).json({ error: 'Failed to delete analysis.' });
    }
});

module.exports = router;

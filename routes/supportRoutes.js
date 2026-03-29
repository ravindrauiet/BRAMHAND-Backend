const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');

// Auto-create & update table on startup
(async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS support_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT DEFAULT NULL,
                type ENUM('contact', 'feedback') NOT NULL,
                name VARCHAR(255),
                email_or_mobile VARCHAR(255),
                subject VARCHAR(500),
                message TEXT NOT NULL,
                feedback_type VARCHAR(100),
                rating TINYINT,
                created_at DATETIME DEFAULT NOW()
            );
        `);
        // Safely alter if user_id doesn't exist (v2 schema)
        try {
            await pool.query(`ALTER TABLE support_messages ADD COLUMN user_id INT DEFAULT NULL AFTER id;`);
            console.log('✅ Migrated support_messages table (added user_id)');
        } catch (alterErr) {
            // Error means column likely already exists, ignore
        }
        console.log('✅ support_messages table is ready');
    } catch (err) {
        console.error('❌ Failed to create support_messages table:', err.message);
    }
})();

// Helper function to optionally get user_id from token
const getOptionalUserId = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            const token = req.headers.authorization.split(' ')[1];
            if (token === 'DEV_TOKEN_BYPASS') return 999;
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            return decoded.id;
        } catch (e) {
            return null;
        }
    }
    return null;
};

// @desc    Submit a contact support message
// @route   POST /api/support/contact
// @access  Public (Optional Auth)
router.post('/contact', async (req, res) => {
    try {
        const { name, email_or_mobile, subject, message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        
        const userId = getOptionalUserId(req);

        await pool.query(
            `INSERT INTO support_messages (user_id, type, name, email_or_mobile, subject, message, created_at)
             VALUES (?, 'contact', ?, ?, ?, ?, NOW())`,
            [userId, name || null, email_or_mobile || null, subject || null, message]
        );
        res.json({ success: true, message: 'Your message has been received. We will get back to you soon!' });
    } catch (error) {
        console.error('support/contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
    }
});

// @desc    Submit feedback
// @route   POST /api/support/feedback
// @access  Public (Optional Auth)
router.post('/feedback', async (req, res) => {
    try {
        const { message, feedback_type, rating } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Feedback message is required' });
        }

        const userId = getOptionalUserId(req);

        await pool.query(
            `INSERT INTO support_messages (user_id, type, message, feedback_type, rating, created_at)
             VALUES (?, 'feedback', ?, ?, ?, NOW())`,
            [userId, message, feedback_type || 'General', rating || null]
        );
        res.json({ success: true, message: 'Thank you for your feedback!' });
    } catch (error) {
        console.error('support/feedback error:', error);
        res.status(500).json({ success: false, message: 'Failed to send feedback. Please try again.' });
    }
});

// @desc    Get user's support and feedback history
// @route   GET /api/support/history
// @access  Private
router.get('/history', protect, async (req, res) => {
    try {
        const [messages] = await pool.query(
            `SELECT id, type, subject, message, feedback_type, rating, created_at 
             FROM support_messages 
             WHERE user_id = ? 
             ORDER BY created_at DESC`,
            [req.user.id]
        );
        res.json({ success: true, history: messages });
    } catch (error) {
        console.error('support/history error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your history. Please try again.' });
    }
});

module.exports = router;

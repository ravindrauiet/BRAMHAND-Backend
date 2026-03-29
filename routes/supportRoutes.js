const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// One-time setup: create table if not exists
// Run this SQL once on your MySQL server:
//
// CREATE TABLE IF NOT EXISTS support_messages (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   type ENUM('contact', 'feedback') NOT NULL,
//   name VARCHAR(255),
//   email_or_mobile VARCHAR(255),
//   subject VARCHAR(500),
//   message TEXT NOT NULL,
//   feedback_type VARCHAR(100),
//   rating TINYINT,
//   created_at DATETIME DEFAULT NOW()
// );

// @desc    Submit a contact support message
// @route   POST /api/support/contact
// @access  Public
router.post('/contact', async (req, res) => {
    try {
        const { name, email_or_mobile, subject, message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }
        await pool.query(
            `INSERT INTO support_messages (type, name, email_or_mobile, subject, message, created_at)
             VALUES ('contact', ?, ?, ?, ?, NOW())`,
            [name || null, email_or_mobile || null, subject || null, message]
        );
        res.json({ success: true, message: 'Your message has been received. We will get back to you soon!' });
    } catch (error) {
        console.error('support/contact error:', error);
        res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
    }
});

// @desc    Submit feedback
// @route   POST /api/support/feedback
// @access  Public
router.post('/feedback', async (req, res) => {
    try {
        const { message, feedback_type, rating } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Feedback message is required' });
        }
        await pool.query(
            `INSERT INTO support_messages (type, message, feedback_type, rating, created_at)
             VALUES ('feedback', ?, ?, ?, NOW())`,
            [message, feedback_type || 'General', rating || null]
        );
        res.json({ success: true, message: 'Thank you for your feedback!' });
    } catch (error) {
        console.error('support/feedback error:', error);
        res.status(500).json({ success: false, message: 'Failed to send feedback. Please try again.' });
    }
});

module.exports = router;

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Get user from the token
            // note: pool.query returns [rows, fields]
            const [users] = await pool.query('SELECT id, full_name, email, mobile_number, is_creator, is_verified, profile_image FROM users WHERE id = ?', [decoded.id]);

            if (users.length === 0) {
                return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
            }

            req.user = users[0];
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ success: false, message: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && (req.user.email === process.env.ADMIN_EMAIL || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
};

module.exports = { protect, adminOnly };

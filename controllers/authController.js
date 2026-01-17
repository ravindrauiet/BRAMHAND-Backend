const pool = require('../config/db');
const jwt = require('jsonwebtoken');

// Helper to generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret', {
        expiresIn: '30d',
    });
};

exports.register = async (req, res) => {
    try {
        const { mobile_or_email, full_name, email, password } = req.body;

        // Check if user exists
        const [existing] = await pool.query(
            'SELECT * FROM users WHERE mobile_number = ? OR email = ?',
            [mobile_or_email, email || mobile_or_email]
        );

        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'User already exists. Please login.' });
        }

        // Hash Password
        // For simplicity if bcrypt is not available or issues arise, we can store plain, 
        // but typically we use bcrypt. Assuming bcryptjs is installed as per package.json.
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = password ? await bcrypt.hash(password, salt) : null;

        // Create User
        const isEmail = mobile_or_email.includes('@');
        const [result] = await pool.query(
            'INSERT INTO users (mobile_number, email, full_name, password_hash) VALUES (?, ?, ?, ?)',
            [
                !isEmail ? mobile_or_email : null,
                isEmail ? mobile_or_email : email,
                full_name,
                passwordHash
            ]
        );

        const newUser = {
            id: result.insertId,
            mobile_number: !isEmail ? mobile_or_email : null,
            email: isEmail ? mobile_or_email : email,
            full_name,
            is_creator: false
        };

        const token = generateToken(newUser.id);

        res.json({ success: true, message: 'Registration successful', token, user: newUser });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { mobile_or_email, password } = req.body;

        const [users] = await pool.query(
            'SELECT * FROM users WHERE mobile_number = ? OR email = ?',
            [mobile_or_email, mobile_or_email]
        );

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];
        const bcrypt = require('bcryptjs');

        const isMatch = user.password_hash && password ? await bcrypt.compare(password, user.password_hash) : false;

        // Fallback for old simple passwords or migration (optional, but good for safety if mixed)
        // if (!isMatch && user.password_hash === password) { isMatch = true; } 

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(user.id);
        res.json({ success: true, message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Deprecated or removed
exports.verifyOtp = async (req, res) => {
    res.status(410).json({ success: false, message: 'OTP login is disabled. Please use password.' });
};

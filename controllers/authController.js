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
            'INSERT INTO users (mobile_number, email, full_name, password_hash, updated_at) VALUES (?, ?, ?, ?, NOW())',
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

// @desc    Request a password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
    try {
        const { mobile_or_email } = req.body;
        if (!mobile_or_email) {
            return res.status(400).json({ success: false, message: 'Email or mobile number is required' });
        }

        // Check user exists
        const [users] = await pool.query(
            'SELECT id FROM users WHERE mobile_number = ? OR email = ?',
            [mobile_or_email, mobile_or_email]
        );
        if (users.length === 0) {
            // Return success anyway to avoid user enumeration
            return res.json({ success: true, message: 'If an account exists, an OTP has been sent.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Delete any existing OTPs for this contact
        await pool.query('DELETE FROM otps WHERE mobile_or_email = ?', [mobile_or_email]);

        // Insert new OTP
        await pool.query(
            'INSERT INTO otps (mobile_or_email, otp, expires_at, created_at) VALUES (?, ?, ?, NOW())',
            [mobile_or_email, otp, expiresAt]
        );

        // TODO: Integrate real SMS/email provider (Twilio, SendGrid, etc.)
        // For now, return OTP in response (development only)
        console.log(`[Password Reset] OTP for ${mobile_or_email}: ${otp}`);

        res.json({
            success: true,
            message: 'OTP sent successfully',
            // Remove `otp` from response in production!
            ...(process.env.NODE_ENV === 'development' ? { otp } : {})
        });
    } catch (error) {
        console.error('forgotPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
    try {
        const { mobile_or_email, otp, new_password } = req.body;

        if (!mobile_or_email || !otp || !new_password) {
            return res.status(400).json({ success: false, message: 'mobile_or_email, otp, and new_password are required' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
        }

        // Find OTP
        const [otps] = await pool.query(
            'SELECT * FROM otps WHERE mobile_or_email = ? AND otp = ? AND expires_at > NOW()',
            [mobile_or_email, otp]
        );

        if (otps.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
        }

        // Hash new password
        const bcrypt = require('bcryptjs');
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(new_password, salt);

        // Update user password
        await pool.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE mobile_number = ? OR email = ?',
            [passwordHash, mobile_or_email, mobile_or_email]
        );

        // Delete used OTP
        await pool.query('DELETE FROM otps WHERE mobile_or_email = ?', [mobile_or_email]);

        res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
        console.error('resetPassword error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


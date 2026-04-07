const pool = require('../config/db');

// @route POST /api/creator/profile
exports.createProfile = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: was incorrectly using req.headers['x-user-id']
        const { popular_name } = req.body;

        if (!popular_name) {
            return res.status(400).json({ success: false, error: 'popular_name is required' });
        }

        // Check if profile already exists
        const [existing] = await pool.query('SELECT id FROM creator_profiles WHERE user_id = ?', [userId]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, error: 'Creator profile already exists' });
        }

        await pool.query(
            'INSERT INTO creator_profiles (user_id, popular_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
            [userId, popular_name]
        );

        await pool.query('UPDATE users SET is_creator = TRUE WHERE id = ?', [userId]);

        res.json({ success: true, message: 'Creator profile created' });
    } catch (error) {
        console.error('createProfile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @route GET /api/creator/profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const [profiles] = await pool.query('SELECT * FROM creator_profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) {
            return res.status(404).json({ success: false, error: 'Creator profile not found' });
        }
        res.json({ success: true, profile: profiles[0] });
    } catch (error) {
        console.error('getProfile error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @route GET /api/creator/monetization
exports.getMonetization = async (req, res) => {
    try {
        const userId = req.user.id; // Fixed: was incorrectly using req.headers['x-user-id']
        const [profiles] = await pool.query('SELECT * FROM creator_profiles WHERE user_id = ?', [userId]);
        if (profiles.length === 0) {
            return res.status(404).json({ success: false, error: 'Creator profile not found' });
        }
        res.json({ success: true, profile: profiles[0] });
    } catch (error) {
        console.error('getMonetization error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @route PUT /api/creator/monetization
exports.updateMonetization = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            bank_name,
            account_number,
            ifsc_code,
            account_holder_name,
            upi_id,
            monetization_percentage,
        } = req.body;

        const [existing] = await pool.query('SELECT id FROM creator_profiles WHERE user_id = ?', [userId]);
        if (existing.length === 0) {
            return res.status(404).json({ success: false, error: 'Creator profile not found. Create one first.' });
        }

        const updates = [];
        const values = [];

        if (bank_name !== undefined) { updates.push('bank_name = ?'); values.push(bank_name); }
        if (account_number !== undefined) { updates.push('account_number = ?'); values.push(account_number); }
        if (ifsc_code !== undefined) { updates.push('ifsc_code = ?'); values.push(ifsc_code); }
        if (account_holder_name !== undefined) { updates.push('account_holder_name = ?'); values.push(account_holder_name); }
        if (upi_id !== undefined) { updates.push('upi_id = ?'); values.push(upi_id); }
        if (monetization_percentage !== undefined) { updates.push('monetization_percentage = ?'); values.push(monetization_percentage); }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, error: 'No fields to update' });
        }

        updates.push('updated_at = NOW()');
        values.push(userId);

        await pool.query(
            `UPDATE creator_profiles SET ${updates.join(', ')} WHERE user_id = ?`,
            values
        );

        res.json({ success: true, message: 'Monetization details updated' });
    } catch (error) {
        console.error('updateMonetization error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

// @route GET /api/creator/top
exports.getTopCreators = async (req, res) => {
    try {
        const [creators] = await pool.query(`
            SELECT cp.*, u.profile_image, u.full_name
            FROM creator_profiles cp
            JOIN users u ON cp.user_id = u.id
            ORDER BY cp.created_at DESC
            LIMIT 10
        `);
        res.json({ success: true, creators });
    } catch (error) {
        console.error('getTopCreators error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
    }
};

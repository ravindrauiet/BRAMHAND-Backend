const pool = require('../config/db');

// @desc    Get all creators
// @route   GET /api/admin/creators
const getAllCreators = async (req, res) => {
    try {
        // Fetch creator profiles joined with stats
        const [creators] = await pool.query(`
            SELECT c.id, c.bio, c.total_earnings as totalEarnings, c.is_monetization_enabled as isMonetizationEnabled, 
                   c.created_at as createdAt,
                   u.full_name as fullName, u.email, u.profile_image as profileImage, u.is_verified as isVerified
            FROM creator_profiles c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);

        res.json({ success: true, creators });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Toggle Monetization
// @route   PATCH /api/admin/creators/:id/monetization
const toggleMonetization = async (req, res) => {
    try {
        const { enabled } = req.body;
        await pool.query('UPDATE creator_profiles SET is_monetization_enabled = ? WHERE id = ?', [enabled, req.params.id]);
        res.json({ success: true, message: 'Monetization updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllCreators,
    toggleMonetization
};

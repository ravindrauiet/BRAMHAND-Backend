const pool = require('../config/db');

// @desc    Get all creators
// @route   GET /api/admin/creators
const getAllCreators = async (req, res) => {
    try {
        // Fetch creator profiles joined with stats
        const [creators] = await pool.query(`
            SELECT c.id, c.user_id as userId, c.popular_name as popularName, 
                   c.bank_name as bankName, c.account_number as accountNumber, c.pan_card as panCard,
                   CAST(c.total_earnings AS CHAR) as totalEarnings, 
                   CAST(c.monetization_percentage AS CHAR) as monetizationPercentage,
                   c.is_monetization_enabled as isMonetizationEnabled, 
                   c.created_at as createdAt,
                   u.full_name as fullName, u.email, u.profile_image as profileImage, u.is_verified as isVerified
            FROM creator_profiles c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.created_at DESC
        `);

        // Transform to include nested user object for frontend compatibility
        const transformedCreators = creators.map(c => ({
            id: c.id,
            userId: c.userId,
            popularName: c.popularName,
            bankName: c.bankName,
            accountNumber: c.accountNumber,
            panCard: c.panCard,
            totalEarnings: c.totalEarnings,
            monetizationPercentage: c.monetizationPercentage,
            isMonetizationEnabled: c.isMonetizationEnabled,
            createdAt: c.createdAt,
            user: {
                fullName: c.fullName,
                email: c.email,
                profileImage: c.profileImage,
                isVerified: c.isVerified
            }
        }));

        res.json({ success: true, creators: transformedCreators });
    } catch (error) {
        console.error('Get creators error:', error);
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

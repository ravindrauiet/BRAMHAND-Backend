const pool = require('../config/db');

exports.createProfile = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 1;
        const { popular_name } = req.body;

        await pool.query(
            'INSERT INTO creator_profiles (user_id, popular_name) VALUES (?, ?)',
            [userId, popular_name]
        );

        await pool.query('UPDATE users SET is_creator = TRUE WHERE id = ?', [userId]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getMonetization = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 1;
        const [profile] = await pool.query('SELECT * FROM creator_profiles WHERE user_id = ?', [userId]);
        if (profile.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json({ profile: profile[0] });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getTopCreators = async (req, res) => {
    try {
        // Fetch creators with their profile images from Users table
        const [creators] = await pool.query(`
            SELECT cp.*, u.profile_image 
            FROM creator_profiles cp 
            JOIN users u ON cp.user_id = u.id 
            ORDER BY cp.created_at DESC 
            LIMIT 10
        `);
        res.json({ creators });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch top creators' });
    }
};

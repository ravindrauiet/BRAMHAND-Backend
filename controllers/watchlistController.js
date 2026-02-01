const pool = require('../config/db');

// @desc    Add video to watchlist
// @route   POST /api/user/watchlist
exports.addToWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({ success: false, message: 'Video ID is required' });
        }

        // Check if already in watchlist
        const [existing] = await pool.query(
            'SELECT * FROM watchlist WHERE user_id = ? AND video_id = ?',
            [userId, videoId]
        );

        if (existing.length > 0) {
            return res.json({ success: true, message: 'Video already in watchlist' });
        }

        await pool.query(
            'INSERT INTO watchlist (user_id, video_id, created_at) VALUES (?, ?, NOW())',
            [userId, videoId]
        );

        res.status(201).json({ success: true, message: 'Added to watchlist' });
    } catch (error) {
        console.error('Add to Watchlist Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Remove video from watchlist
// @route   DELETE /api/user/watchlist/:id
exports.removeFromWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const videoId = req.params.id;

        await pool.query(
            'DELETE FROM watchlist WHERE user_id = ? AND video_id = ?',
            [userId, videoId]
        );

        res.json({ success: true, message: 'Removed from watchlist' });
    } catch (error) {
        console.error('Remove from Watchlist Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get user's watchlist
// @route   GET /api/user/watchlist
exports.getWatchlist = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [videos] = await pool.query(
            `SELECT v.*, u.full_name as creator_name, u.profile_image as creator_image, 
                    c.name as category_name, w.created_at as added_at
             FROM watchlist w
             JOIN videos v ON w.video_id = v.id
             JOIN users u ON v.creator_id = u.id
             LEFT JOIN video_categories c ON v.category_id = c.id
             WHERE w.user_id = ?
             ORDER BY w.created_at DESC
             LIMIT ? OFFSET ?`,
            [userId, limit, offset]
        );

        res.json({ success: true, watchlist: videos });
    } catch (error) {
        console.error('Get Watchlist Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

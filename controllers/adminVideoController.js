const pool = require('../config/db');

// @desc    Get all videos
// @route   GET /api/admin/videos
const getAllVideos = async (req, res) => {
    try {
        const type = req.query.type || 'VIDEO';
        const [videos] = await pool.query(`
            SELECT v.id, v.title, v.description, v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl,
                   v.views_count as viewsCount, v.is_active as isActive, v.created_at as createdAt,
                   c.name as categoryName, u.full_name as creatorName
            FROM videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            LEFT JOIN users u ON v.creator_id = u.id
            WHERE v.type = ?
            ORDER BY v.created_at DESC
        `, [type]);

        res.json({ success: true, videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Video
// @route   DELETE /api/admin/videos/:id
const deleteVideo = async (req, res) => {
    try {
        await pool.query('DELETE FROM videos WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Video deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Toggle Video Status
// @route   PATCH /api/admin/videos/:id/status
const toggleVideoStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        await pool.query('UPDATE videos SET is_active = ? WHERE id = ?', [isActive, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Single Video
// @route   GET /api/admin/videos/:id
const getVideoById = async (req, res) => {
    try {
        const [videos] = await pool.query('SELECT * FROM videos WHERE id = ?', [req.params.id]);
        if (videos.length === 0) return res.status(404).json({ success: false, message: 'Video not found' });
        res.json({ success: true, video: videos[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllVideos,
    getVideoById,
    deleteVideo,
    toggleVideoStatus
};

const pool = require('../config/db');

// @desc    Get all videos
// @route   GET /api/admin/videos
const getAllVideos = async (req, res) => {
    try {
        const type = req.query.type || 'VIDEO';
        const [videos] = await pool.query(`
            SELECT v.id, v.title, v.description, v.video_url as videoUrl, v.thumbnail_url as thumbnailUrl,
                   v.views_count as viewsCount, v.likes_count as likesCount, v.comments_count as commentsCount, v.shares_count as sharesCount, 
                   v.is_active as isActive, v.is_trending as isTrending, v.is_featured as isFeatured, v.content_rating as contentRating,
                   v.created_at as createdAt,
                   c.name as categoryName, u.full_name as creatorName, u.profile_image as creatorImage
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
        const [videos] = await pool.query(`
            SELECT *, CAST(file_size AS CHAR) as file_size FROM videos WHERE id = ?
        `, [req.params.id]);
        if (videos.length === 0) return res.status(404).json({ success: false, message: 'Video not found' });
        res.json({ success: true, video: videos[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Upload New Video
// @route   POST /api/admin/videos
const uploadVideo = async (req, res) => {
    try {
        const {
            title,
            description,
            categoryId,
            creatorId,
            language = 'Hindi',
            contentRating = 'U',
            type = 'VIDEO',
            isActive = 'true',
            isTrending = 'false',
            isFeatured = 'false'
        } = req.body;

        let videoUrl = null;
        let thumbnailUrl = null;

        // Get uploaded file URLs from multer-s3
        if (req.files) {
            if (req.files.video && req.files.video[0]) {
                videoUrl = req.files.video[0].location; // S3 URL
            }
            if (req.files.thumbnail && req.files.thumbnail[0]) {
                thumbnailUrl = req.files.thumbnail[0].location; // S3 URL
            }
        }

        if (!videoUrl) {
            return res.status(400).json({ success: false, message: 'Video file is required' });
        }

        // Insert video into database
        const [result] = await pool.query(
            `INSERT INTO videos (
                title, description, video_url, thumbnail_url, 
                category_id, creator_id, language, content_rating, type,
                is_active, is_trending, is_featured,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                title,
                description || null,
                videoUrl,
                thumbnailUrl || null,
                categoryId,
                creatorId,
                language,
                contentRating,
                type,
                isActive === 'true' || isActive === true ? 1 : 0,
                isTrending === 'true' || isTrending === true ? 1 : 0,
                isFeatured === 'true' || isFeatured === true ? 1 : 0
            ]
        );

        res.json({
            success: true,
            id: result.insertId,
            videoUrl,
            thumbnailUrl,
            message: 'Video uploaded successfully'
        });
    } catch (error) {
        console.error('Upload video error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            files: req.files ? Object.keys(req.files) : 'no files'
        });
        res.status(500).json({
            success: false,
            message: error.message || 'Server Error',
            detail: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

module.exports = {
    getAllVideos,
    getVideoById,
    deleteVideo,
    toggleVideoStatus,
    uploadVideo
};

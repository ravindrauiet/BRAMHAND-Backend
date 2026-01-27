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
                   v.created_at as createdAt, v.category_id as categoryId, v.creator_id as creatorId,
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
        await pool.query('UPDATE videos SET is_active = ? WHERE id = ?', [isActive === true || isActive === 'true' ? 1 : 0, req.params.id]);
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
            isFeatured = 'false',
            seriesId = null,
            episodeNumber = null,
            seasonNumber = 1
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

        if (!videoUrl && req.body.video_url) videoUrl = req.body.video_url; // Allow body URL for testing

        if (!videoUrl) {
            return res.status(400).json({ success: false, message: 'Video file is required' });
        }

        // Insert video into database
        const [result] = await pool.query(
            `INSERT INTO videos (
                title, description, video_url, thumbnail_url, 
                category_id, creator_id, language, content_rating, type,
                is_active, is_trending, is_featured,
                series_id, episode_number, season_number,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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
                isFeatured === 'true' || isFeatured === true ? 1 : 0,
                seriesId || null,
                episodeNumber || null,
                seasonNumber || 1
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

// @desc    Update Video Details (Admin)
// @route   PATCH /api/admin/videos/:id
const updateVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, description, categoryId, creatorId, language,
            contentRating, type, isActive, isTrending, isFeatured,
            seriesId, episodeNumber, seasonNumber
        } = req.body;

        const updates = [];
        const values = [];

        // Build dynamic update query
        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (description !== undefined) { updates.push('description = ?'); values.push(description); }
        if (categoryId !== undefined) { updates.push('category_id = ?'); values.push(categoryId); }
        if (creatorId !== undefined) { updates.push('creator_id = ?'); values.push(creatorId); }
        if (language !== undefined) { updates.push('language = ?'); values.push(language); }
        if (contentRating !== undefined) { updates.push('content_rating = ?'); values.push(contentRating); }
        if (type !== undefined) { updates.push('type = ?'); values.push(type); }
        if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive === 'true' || isActive === true ? 1 : 0); }
        if (isTrending !== undefined) { updates.push('is_trending = ?'); values.push(isTrending === 'true' || isTrending === true ? 1 : 0); }
        if (isFeatured !== undefined) { updates.push('is_featured = ?'); values.push(isFeatured === 'true' || isFeatured === true ? 1 : 0); }

        // Series fields
        if (seriesId !== undefined) { updates.push('series_id = ?'); values.push(seriesId || null); }
        if (episodeNumber !== undefined) { updates.push('episode_number = ?'); values.push(episodeNumber || null); }
        if (seasonNumber !== undefined) { updates.push('season_number = ?'); values.push(seasonNumber || 1); }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await pool.query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Video updated successfully' });
    } catch (error) {
        console.error('❌ Update video error:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Request body:', req.body);
        console.error('Request params:', req.params);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllVideos,
    getVideoById,
    deleteVideo,
    toggleVideoStatus,
    uploadVideo,
    updateVideo
};

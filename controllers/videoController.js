const pool = require('../config/db');

exports.getVideos = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            category_id,
            genre_id,
            search,
            type = 'VIDEO'
        } = req.query;

        console.log('DEBUG: getVideos Request:', {
            query: req.query,
            parsedType: type,
            excludeSeries: req.query.exclude_series
        });

        let userId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const jwt = require('jsonwebtoken');
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                userId = decoded.id;
            } catch (e) {
                // Ignore invalid token
            }
        }

        const offset = (page - 1) * limit;

        // Base query
        let query = `
            SELECT v.*, u.full_name as creator_name, u.profile_image as creator_image, c.name as category_name 
            ${userId ? `, EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = ?) as is_liked` : ', FALSE as is_liked'}
            ${userId ? `, EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.following_id = v.creator_id) as is_following` : ', FALSE as is_following'}
            FROM videos v 
            LEFT JOIN users u ON v.creator_id = u.id 
            LEFT JOIN video_categories c ON v.category_id = c.id 
            WHERE v.is_active = TRUE AND v.type = ?
        `;

        const params = [];
        if (userId) {
            params.push(userId); // for is_liked
            params.push(userId); // for is_following
        }
        params.push(type);

        if (category_id) {
            query += ' AND v.category_id = ?';
            params.push(category_id);
        }
        if (genre_id) {
            query += ' AND v.genre_id = ?';
            params.push(genre_id);
        }
        if (req.query.series_id) {
            query += ' AND v.series_id = ?';
            params.push(req.query.series_id);
        }
        if (req.query.exclude_series === 'true' || req.query.exclude_series === '1') {
            query += ' AND (v.series_id IS NULL OR v.series_id = 0)';
        }
        if (search) {
            query += ' AND (v.title LIKE ? OR v.description LIKE ? OR u.full_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (req.query.is_featured) {
            query += ' AND v.is_featured = ?';
            params.push(req.query.is_featured === 'true' || req.query.is_featured === '1' ? 1 : 0);
        }
        if (req.query.is_trending) {
            query += ' AND v.is_trending = ?';
            params.push(req.query.is_trending === 'true' || req.query.is_trending === '1' ? 1 : 0);
        }

        // Language Filtering based on user preference
        if (userId && !category_id && !genre_id && !search && !req.query.is_featured && !req.query.is_trending) {
            const [prefs] = await pool.query('SELECT content_language FROM user_preferences WHERE user_id = ?', [userId]);
            if (prefs.length > 0 && prefs[0].content_language) {
                query += ' AND v.language = ?';
                params.push(prefs[0].content_language);
            }
        }


        query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

        console.log('DEBUG: Final Query:', query);
        console.log('DEBUG: Query Params:', params);

        const [videos] = await pool.query(query, params);

        // Convert is_liked from 1/0 to boolean
        videos.forEach(v => {
            v.is_liked = !!v.is_liked;
            v.is_following = !!v.is_following;
        });

        res.json({ videos });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch videos' });
    }
};

exports.getTrending = async (req, res) => {
    try {
        const { type = 'VIDEO' } = req.query;
        // Simplified trending doesn't check is_liked for now to save complexity, or we can copy logic
        const [videos] = await pool.query(
            'SELECT v.*, u.full_name as creator_name FROM videos v JOIN users u ON v.creator_id = u.id WHERE v.is_active = TRUE AND v.is_trending = TRUE AND v.type = ? LIMIT 20',
            [type]
        );
        res.json({ videos });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getPublicCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM video_categories WHERE is_active = TRUE ORDER BY name ASC');
        res.json({ categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getVideoById = async (req, res) => {
    try {
        const { id } = req.params;
        let userId = null;

        // Check for auth token to get userId
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const jwt = require('jsonwebtoken');
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                userId = decoded.id;
            } catch (e) {
                // Ignore invalid token
            }
        }

        let query = `
            SELECT v.*, u.full_name as creator_name, u.profile_image as creator_image 
            FROM videos v 
            JOIN users u ON v.creator_id = u.id 
            WHERE v.id = ?
        `;
        const params = [id];

        if (userId) {
            query = `
                SELECT v.*, u.full_name as creator_name, u.profile_image as creator_image,
                EXISTS(SELECT 1 FROM video_likes vl WHERE vl.video_id = v.id AND vl.user_id = ?) as is_liked
                FROM videos v 
                JOIN users u ON v.creator_id = u.id 
                WHERE v.id = ?
            `;
            params.unshift(userId);
        }

        const [videos] = await pool.query(query, params);

        if (videos.length === 0) return res.status(404).json({ error: 'Not found' });

        // Convert is_liked to boolean boolean
        const video = videos[0];
        if (userId) {
            video.is_liked = !!video.is_liked;

            // Check Watchlist
            const [watchlist] = await pool.query('SELECT 1 FROM watchlist WHERE user_id = ? AND video_id = ?', [userId, id]);
            video.is_in_watchlist = watchlist.length > 0;

            // Get last watch position
            const [progress] = await pool.query('SELECT last_position FROM video_views WHERE user_id = ? AND video_id = ? ORDER BY created_at DESC LIMIT 1', [userId, id]);
            video.last_position = progress.length > 0 ? progress[0].last_position : 0;
        } else {
            video.is_liked = false;
            video.is_in_watchlist = false;
            video.last_position = 0;
        }

        // Auto-Play: Get Next Episode if part of series
        if (video.series_id && video.episode_number) {
            const [next] = await pool.query(
                'SELECT id FROM videos WHERE series_id = ? AND episode_number = ? AND is_active = TRUE LIMIT 1',
                [video.series_id, video.episode_number + 1]
            );
            if (next.length > 0) {
                video.next_video_id = next[0].id;
            }
        }

        res.json({ video });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.uploadVideo = async (req, res) => {
    try {
        const {
            title,
            category_id,
            type = 'VIDEO',
            description,
            language = 'Hindi',
            content_rating = 'U',
            is_active = true,
            is_featured = false,
            is_trending = false
        } = req.body;

        // Get creator_id from authenticated user (NOT from request body for security)
        const creator_id = req.user ? req.user.id : null;

        console.log('Upload Video - Authentication check:', {
            hasUser: !!req.user,
            creator_id,
            title,
            type
        });

        if (!creator_id) {
            console.error('Upload failed: No creator_id found');
            return res.status(401).json({ error: 'Authentication required' });
        }

        let video_url = req.body.video_url; // Allow URL if provided (legacy support)
        let thumbnail_url = req.body.thumbnail_url;

        // If files are uploaded via Multer S3
        console.log('🔍 req.files:', JSON.stringify(req.files, null, 2));
        if (req.files) {
            if (req.files.video && req.files.video[0]) {
                video_url = req.files.video[0].location; // S3 URL
            }
            if (req.files.thumbnail && req.files.thumbnail[0]) {
                thumbnail_url = req.files.thumbnail[0].location; // S3 URL
            }
        }

        if (!video_url) {
            return res.status(400).json({ error: 'Video file or URL is required' });
        }

        // Insert with all required fields and proper defaults
        const [result] = await pool.query(
            `INSERT INTO videos (
                title, description, video_url, thumbnail_url, 
                category_id, creator_id, type, language, content_rating,
                is_active, is_featured, is_trending, 
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                title,
                description || null,
                video_url,
                thumbnail_url || null,
                category_id,
                creator_id,
                type,
                language,
                content_rating,
                is_active ? 1 : 0,
                is_featured ? 1 : 0,
                is_trending ? 1 : 0
            ]
        );

        console.log('Video uploaded successfully:', {
            id: result.insertId,
            creator_id,
            type,
            title
        });

        res.json({ success: true, id: result.insertId, video_url, thumbnail_url });
    } catch (error) {
        console.error('Upload video error:', error);
        res.status(500).json({ error: 'Failed to upload' });
    }
};

exports.deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM videos WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete' });
    }
};

exports.updateVideoStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        await pool.query('UPDATE videos SET is_active = ?, updated_at = NOW() WHERE id = ?', [isActive, id]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.recordView = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.headers['x-user-id'];

        let authenticatedUserId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const jwt = require('jsonwebtoken');
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                authenticatedUserId = decoded.id;
            } catch (e) {
                console.error('recordView Auth Error:', e.message);
            }
        }

        // Fallback for dev/dashboard which often passes x-user-id
        if (!authenticatedUserId && req.headers['x-user-id']) {
            authenticatedUserId = parseInt(req.headers['x-user-id']);
        }

        // 1. Increment View Count
        await pool.query('UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [id]);

        // 2. Log History if User is Authenticated
        if (authenticatedUserId) {
            // Update or Create view record
            const [existing] = await pool.query('SELECT id FROM video_views WHERE user_id = ? AND video_id = ?', [authenticatedUserId, id]);
            if (existing.length > 0) {
                await pool.query('UPDATE video_views SET created_at = NOW() WHERE id = ?', [existing[0].id]);
            } else {
                await pool.query('INSERT INTO video_views (user_id, video_id, created_at) VALUES (?, ?, NOW())', [authenticatedUserId, id]);
            }
        }

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.likeVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id; // From authMiddleware

        // Check if already liked
        const [existing] = await pool.query('SELECT 1 FROM video_likes WHERE user_id = ? AND video_id = ?', [userId, id]);

        if (existing.length === 0) {
            await pool.query('INSERT INTO video_likes (user_id, video_id) VALUES (?, ?)', [userId, id]);
            await pool.query('UPDATE videos SET likes_count = likes_count + 1 WHERE id = ?', [id]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Like error:", error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.unlikeVideo = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const [existing] = await pool.query('SELECT 1 FROM video_likes WHERE user_id = ? AND video_id = ?', [userId, id]);

        if (existing.length > 0) {
            await pool.query('DELETE FROM video_likes WHERE user_id = ? AND video_id = ?', [userId, id]);
            await pool.query('UPDATE videos SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [id]);
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Unlike error:", error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.shareVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE videos SET shares_count = shares_count + 1 WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const [comments] = await pool.query(
            `SELECT c.*, u.full_name as user_name, u.profile_image as user_avatar 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.video_id = ? 
             ORDER BY c.created_at DESC`,
            [id]
        );

        // Transform for frontend
        const formattedComments = comments.map(c => ({
            id: c.id,
            parentId: c.parent_id,
            user_name: c.user_name,
            user_avatar: c.user_avatar,
            comment: c.text,
            created_at: c.created_at,
            likes_count: 0, // TODO: Implement comment likes table if needed
            is_liked: false
        }));

        res.json({ comments: formattedComments });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text, parent_id } = req.body;
        const userId = req.user.id; // From authMiddleware

        const [result] = await pool.query(
            'INSERT INTO comments (video_id, user_id, text, parent_id, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
            [id, userId, text, parent_id || null]
        );

        // Increment comments count
        await pool.query('UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?', [id]);

        // Fetch the created comment to return it
        const [newComment] = await pool.query(
            `SELECT c.*, u.full_name as user_name, u.profile_image as user_avatar 
             FROM comments c 
             JOIN users u ON c.user_id = u.id 
             WHERE c.id = ?`,
            [result.insertId]
        );

        if (newComment.length > 0) {
            const c = newComment[0];
            res.json({
                success: true,
                comment: {
                    id: c.id,
                    parentId: c.parent_id,
                    user_name: c.user_name,
                    user_avatar: c.user_avatar,
                    comment: c.text,
                    created_at: c.created_at,
                    likes_count: 0,
                    is_liked: false
                }
            });
        } else {
            res.json({ success: true });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};
// @desc    Get current user's content (videos/reels)
// @route   GET /api/videos/my-content
// @access  Private
exports.getMyContent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query; // 'VIDEO' or 'REEL' or undefined for all

        let query = `
            SELECT v.*, c.name as categoryName,
                   (SELECT COUNT(*) FROM video_likes WHERE video_id = v.id) as likesCount,
                  (SELECT COUNT(*) FROM video_shares WHERE video_id = v.id) as sharesCount
            FROM videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            WHERE v.creator_id = ?
        `;

        const params = [userId];

        if (type) {
            query += ' AND v.type = ?';
            params.push(type);
        }

        query += ' ORDER BY v.created_at DESC';

        const [videos] = await pool.query(query, params);

        res.json({ success: true, videos });
    } catch (error) {
        console.error('Get my content error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update video details
// @route   PATCH /api/videos/:id
// @access  Private (owner only)
exports.updateVideoDetails = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user.id;

        // Check ownership
        const [videos] = await pool.query('SELECT creator_id FROM videos WHERE id = ?', [videoId]);
        if (videos.length === 0) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        if (videos[0].creator_id !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this video' });
        }

        const { title, description, categoryId, isActive } = req.body;
        const updates = [];
        const values = [];

        if (title !== undefined) {
            updates.push('title = ?');
            values.push(title);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }
        if (categoryId !== undefined) {
            updates.push('category_id = ?');
            values.push(categoryId);
        }
        if (isActive !== undefined) {
            updates.push('is_active = ?');
            values.push(isActive ? 1 : 0);
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(videoId);
            await pool.query(`UPDATE videos SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Video updated successfully' });
    } catch (error) {
        console.error('Update video error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete video (owner only)
// @route   DELETE /api/videos/:id
// @access  Private
exports.deleteVideoByOwner = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user.id;

        // Check ownership
        const [videos] = await pool.query('SELECT creator_id FROM videos WHERE id = ?', [videoId]);
        if (videos.length === 0) {
            return res.status(404).json({ success: false, message: 'Video not found' });
        }

        if (videos[0].creator_id !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this video' });
        }

        // Delete video and related data (cascade should handle this, but explicit is better)
        await pool.query('DELETE FROM video_likes WHERE video_id = ?', [videoId]);
        await pool.query('DELETE FROM video_views WHERE video_id = ?', [videoId]);
        await pool.query('DELETE FROM video_comments WHERE video_id = ?', [videoId]);
        await pool.query('DELETE FROM video_shares WHERE video_id = ?', [videoId]);
        await pool.query('DELETE FROM videos WHERE id = ?', [videoId]);

        res.json({ success: true, message: 'Video deleted successfully' });
    } catch (error) {
        console.error('Delete video error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get current user's content (videos/reels)
// @route   GET /api/videos/my-content
// @access  Private
exports.getMyContent = async (req, res) => {
    try {
        const userId = req.user.id;
        const { type } = req.query; // 'VIDEO' or 'REEL' or undefined for all

        let query = `
            SELECT v.*, 
                   v.video_url as videoUrl,
                   v.thumbnail_url as thumbnailUrl,
                   v.is_active as isActive,
                   v.views_count as viewsCount,
                   v.likes_count as likesCount,
                   v.shares_count as sharesCount,
                   c.name as categoryName
            FROM videos v
            LEFT JOIN video_categories c ON v.category_id = c.id
            WHERE v.creator_id = ?
        `;

        const params = [userId];

        if (type) {
            query += ' AND v.type = ?';
            params.push(type);
        }

        query += ' ORDER BY v.created_at DESC';

        const [videos] = await pool.query(query, params);

        res.json({ success: true, videos });
    } catch (error) {
        console.error('Get my content error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update watch progress
// @route   POST /api/videos/:id/progress
exports.updateWatchProgress = async (req, res) => {
    try {
        const videoId = req.params.id;
        const userId = req.user.id;
        const { position } = req.body; // In seconds or milliseconds

        if (position === undefined) {
            return res.status(400).json({ success: false, message: 'Position is required' });
        }

        // Update last_position in video_views
        // We look for the most recent view entry for this user and video
        await pool.query(
            'UPDATE video_views SET last_position = ?, created_at = NOW() WHERE user_id = ? AND video_id = ? ORDER BY created_at DESC LIMIT 1',
            [position, userId, videoId]
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Update Progress Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/videos/comments/:commentId
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.id;

        // Verify ownership
        const [comment] = await pool.query('SELECT user_id, video_id FROM comments WHERE id = ?', [commentId]);

        if (comment.length === 0) {
            return res.status(404).json({ success: false, message: 'Comment not found' });
        }

        if (comment[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

        // Decrement count
        await pool.query('UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [comment[0].video_id]);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete Comment Error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

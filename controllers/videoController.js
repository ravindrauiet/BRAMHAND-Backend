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

        query += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));

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
        } else {
            video.is_liked = false;
        }

        res.json({ video });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.uploadVideo = async (req, res) => {
    try {
        const { title, video_url, category_id, creator_id, type = 'VIDEO' } = req.body;
        // Basic insert
        const [result] = await pool.query(
            'INSERT INTO videos (title, video_url, category_id, creator_id, type) VALUES (?, ?, ?, ?, ?)',
            [title, video_url, category_id, creator_id, type]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to upload' });
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
            }
        }

        // 1. Increment View Count
        await pool.query('UPDATE videos SET views_count = views_count + 1 WHERE id = ?', [id]);

        // 2. Log History if User is Authenticated
        if (authenticatedUserId) {
            // Check existence logic could be better but insert is fine for history log
            await pool.query('INSERT INTO video_views (user_id, video_id, created_at) VALUES (?, ?, NOW())', [authenticatedUserId, id]);
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

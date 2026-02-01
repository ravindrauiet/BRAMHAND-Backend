const pool = require('../config/db');

exports.getProfile = async (req, res) => {
    try {
        // Use user ID from authenticated token (set by protect middleware)
        const userId = req.user.id;
        console.log('getProfile: Fetching profile for userId:', userId);

        // DEV BYPASS HANDLE
        if (userId === 999 || userId === '999') {
            console.log('getProfile: Serving Mock Profile for Dev Admin');
            return res.json({
                user: {
                    id: 999,
                    full_name: 'Ravindra Admin',
                    email: 'ravindra@gmail.com',
                    mobile_number: '0000000000',
                    profile_image: null,
                    is_creator: 1,
                    preferences: {},
                    creatorProfile: { bio: 'Dev Admin' },
                    _count: { followers: 1250, following: 156, total_views: 45800, total_likes: 12400, playlists: 12 }
                }
            });
        }

        // Get User
        const [users] = await pool.query('SELECT id, full_name, email, mobile_number, profile_image, is_creator FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            console.error('getProfile: User not found in DB for ID:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        // Get Prefs
        const [prefs] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);

        // Get Creator Profile
        const [creator] = await pool.query('SELECT * FROM creator_profiles WHERE user_id = ?', [userId]);

        // Get Counts
        const [followers] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userId]);
        const [following] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userId]);

        // Stats for Creator Dashboard
        const [videoStats] = await pool.query('SELECT SUM(views_count) as total_views, SUM(likes_count) as total_likes FROM videos WHERE creator_id = ?', [userId]);
        const [playlistCount] = await pool.query('SELECT COUNT(*) as count FROM playlists WHERE user_id = ?', [userId]);
        const [actualPlaylists] = await pool.query('SELECT id, name, is_public FROM playlists WHERE user_id = ?', [userId]);

        const user = users[0];
        user.preferences = prefs[0] || {};
        user.creatorProfile = creator[0] || null;
        user.playlists = actualPlaylists;
        user._count = {
            followers: followers[0].count || 0,
            following: following[0].count || 0,
            total_views: parseInt(videoStats[0].total_views || 0),
            total_likes: parseInt(videoStats[0].total_likes || 0),
            playlists: playlistCount[0].count || 0
        };

        res.json({ user });
    } catch (error) {
        console.error('getProfile Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.updatePreferences = async (req, res) => {
    try {
        const userId = req.user.id;
        const { content_language, app_language, notification_enabled, auto_play, video_quality } = req.body;

        // Check if exists
        const [existing] = await pool.query('SELECT id FROM user_preferences WHERE user_id = ?', [userId]);

        if (existing.length > 0) {
            await pool.query(
                'UPDATE user_preferences SET content_language=?, app_language=?, notification_enabled=?, auto_play=?, video_quality=? WHERE user_id=?',
                [content_language, app_language, notification_enabled, auto_play, video_quality, userId]
            );
        } else {
            await pool.query(
                'INSERT INTO user_preferences (user_id, content_language, app_language, notification_enabled, auto_play, video_quality) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, content_language, app_language, notification_enabled, auto_play, video_quality]
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Update Prefs Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getWatchHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const [history] = await pool.query(`
            SELECT vv.id as view_id, v.*, u.full_name as creator_name, vv.created_at as viewed_at, vv.last_position
            FROM video_views vv
            JOIN videos v ON vv.video_id = v.id
            JOIN users u ON v.creator_id = u.id
            WHERE vv.user_id = ?
            ORDER BY vv.created_at DESC
            LIMIT ? OFFSET ?
        `, [userId, limit, offset]);

        res.json({ history });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.removeFromWatchHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { viewId } = req.params;

        await pool.query('DELETE FROM video_views WHERE id = ? AND user_id = ?', [viewId, userId]);
        res.json({ success: true, message: 'Removed from history' });
    } catch (error) {
        console.error('Remove from history error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

exports.followUser = async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        if (followerId == followingId) {
            return res.status(400).json({ error: 'Cannot follow yourself' });
        }

        // Check if user to follow exists
        const [target] = await pool.query('SELECT id FROM users WHERE id = ?', [followingId]);
        if (target.length === 0) return res.status(404).json({ error: 'User not found' });

        // Check if already following
        const [exists] = await pool.query('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
        if (exists.length > 0) {
            return res.status(400).json({ error: 'Already following' });
        }

        await pool.query('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.unfollowUser = async (req, res) => {
    try {
        const followerId = req.user.id;
        const followingId = req.params.id;

        await pool.query('DELETE FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getFollowers = async (req, res) => {
    try {
        const userId = req.params.id;
        const [followers] = await pool.query(`
            SELECT u.id, u.full_name, u.profile_image, u.is_creator 
            FROM follows f 
            JOIN users u ON f.follower_id = u.id 
            WHERE f.following_id = ?`,
            [userId]
        );
        res.json({ followers });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getFollowing = async (req, res) => {
    try {
        const userId = req.params.id;
        const [following] = await pool.query(`
            SELECT u.id, u.full_name, u.profile_image, u.is_creator 
            FROM follows f 
            JOIN users u ON f.following_id = u.id 
            WHERE f.follower_id = ?`,
            [userId]
        );
        res.json({ following });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

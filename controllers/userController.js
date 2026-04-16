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

// @desc    Update profile info (name, email, mobile)
// @route   PUT /api/users/profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { full_name, email, mobile_number } = req.body;

        if (!full_name || full_name.trim() === '') {
            return res.status(400).json({ success: false, error: 'Full name is required' });
        }

        await pool.query(
            'UPDATE users SET full_name = ?, email = ?, mobile_number = ? WHERE id = ?',
            [full_name.trim(), email || null, mobile_number || null, userId]
        );

        // Return updated user
        const [users] = await pool.query(
            'SELECT id, full_name, email, mobile_number, profile_image, is_creator FROM users WHERE id = ?',
            [userId]
        );
        const [prefs] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
        const [followers] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [userId]);
        const [following] = await pool.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [userId]);

        const user = users[0];
        user.preferences = prefs[0] || {};
        user._count = { followers: followers[0].count || 0, following: following[0].count || 0 };

        console.log(`Updated profile for user ${userId}: name=${full_name}`);
        res.json({ success: true, message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile' });
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
        const { viewId } = req.params; // viewId can be a video_id or view row id

        // Delete all view records for this video by this user (cleaner UX than single-row delete)
        await pool.query('DELETE FROM video_views WHERE video_id = ? AND user_id = ?', [viewId, userId]);
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
        const [target] = await pool.query('SELECT id, fcm_token, full_name FROM users WHERE id = ?', [followingId]);
        if (target.length === 0) return res.status(404).json({ error: 'User not found' });

        // Check if already following
        const [exists] = await pool.query('SELECT * FROM follows WHERE follower_id = ? AND following_id = ?', [followerId, followingId]);
        if (exists.length > 0) {
            return res.status(400).json({ error: 'Already following' });
        }

        await pool.query('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)', [followerId, followingId]);
        res.json({ success: true });

        // ── Notify the followed user (fire-and-forget) ───────────────────────
        if (target[0].fcm_token) {
            const { sendToToken } = require('../services/fcmService');
            const followerName = req.user.full_name || 'Someone';
            sendToToken(target[0].fcm_token, {
                title: 'New Follower',
                body: `${followerName} started following you`,
                data: { type: 'follow', userId: String(followerId) },
            }).catch(() => {});
        }
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

// @desc    Update profile image
// @route   PUT /api/users/profile/image
exports.updateProfileImage = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No image file provided' });
        }

        // Get the S3 URL from multer-s3
        const profileImageUrl = req.file.location;

        // Update user's profile_image in database
        await pool.query('UPDATE users SET profile_image = ? WHERE id = ?', [profileImageUrl, userId]);

        console.log(`Updated profile image for user ${userId}: ${profileImageUrl}`);

        res.json({
            success: true,
            message: 'Profile image updated successfully',
            profileImage: profileImageUrl
        });
    } catch (error) {
        console.error('Update profile image error:', error);
        res.status(500).json({ success: false, error: 'Failed to update profile image' });
    }
};

// @desc    Save FCM token for push notifications
// @route   PUT /api/user/fcm-token
// @desc    Get public profile of a user/creator
// @route   GET /api/users/:id/profile
exports.getPublicProfile = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if requesting user is logged in (to show is_following)
        let viewerId = null;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            const jwt = require('jsonwebtoken');
            try {
                const token = req.headers.authorization.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
                viewerId = decoded.id;
            } catch (e) {}
        }

        const [users] = await pool.query(
            `SELECT u.id, u.full_name, u.bio, u.profile_image,
                (SELECT COUNT(*) FROM follows WHERE following_id = u.id) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = u.id) as following_count,
                (SELECT COALESCE(SUM(views_count), 0) FROM videos WHERE creator_id = u.id AND is_active = TRUE) as total_views
                ${viewerId ? `, EXISTS(SELECT 1 FROM follows WHERE follower_id = ? AND following_id = u.id) as is_following` : ', FALSE as is_following'}
            FROM users u WHERE u.id = ?`,
            viewerId ? [viewerId, id] : [id]
        );

        if (!users.length) return res.status(404).json({ error: 'User not found' });

        res.json(users[0]);
    } catch (error) {
        console.error('getPublicProfile error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

// @access  Private
exports.saveFcmToken = async (req, res) => {
    try {
        const userId = req.user.id;
        const { fcm_token } = req.body;

        if (!fcm_token) {
            return res.status(400).json({ success: false, message: 'FCM token is required' });
        }

        await pool.query('UPDATE users SET fcm_token = ? WHERE id = ?', [fcm_token, userId]);

        res.json({ success: true, message: 'FCM token saved' });
    } catch (error) {
        console.error('Save FCM token error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

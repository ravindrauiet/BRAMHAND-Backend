const pool = require('../config/db');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
    try {
        // Helper: safe query that returns a fallback row on error
        const safeQuery = async (sql, params, fallback) => {
            try {
                const [rows] = await pool.query(sql, params);
                return rows;
            } catch (_) { return fallback; }
        };
        const safeCount = async (sql, params) => {
            const rows = await safeQuery(sql, params, [{ count: 0 }]);
            return rows[0] || { count: 0 };
        };
        const safeSum = async (sql, params) => {
            const rows = await safeQuery(sql, params, [{ total: 0 }]);
            return rows[0] || { total: 0 };
        };

        // ── Core counts ──────────────────────────────────────────────────────
        const [userRow, videoRow, reelRow, songRow, creatorRow, viewRow, likeRow, earningRow, songPlayRow, songLikeRow] = await Promise.all([
            safeCount('SELECT COUNT(*) as count FROM users'),
            safeCount("SELECT COUNT(*) as count FROM videos WHERE type = 'VIDEO'"),
            safeCount("SELECT COUNT(*) as count FROM videos WHERE type = 'REEL'"),
            safeCount('SELECT COUNT(*) as count FROM songs'),
            safeCount('SELECT COUNT(*) as count FROM creator_profiles'),
            safeSum('SELECT COALESCE(SUM(views_count),0) as total FROM videos'),
            safeSum('SELECT COALESCE(SUM(likes_count),0) as total FROM videos'),
            safeSum('SELECT COALESCE(SUM(total_earnings),0) as total FROM creator_profiles'),
            safeSum('SELECT COALESCE(SUM(plays_count),0) as total FROM songs'),
            safeSum('SELECT COALESCE(SUM(likes_count),0) as total FROM songs'),
        ]);
        // comments: use comments table if it exists, else fall back to sum of comments_count on videos
        const commentCount = (await safeCount('SELECT COUNT(*) as count FROM comments')).count
            || (await safeSum('SELECT COALESCE(SUM(comments_count),0) as total FROM videos')).total
            || 0;

        // ── New users in last 7 days vs 7 days before (growth) ───────────────
        const [newUsersWeek, prevUsersWeek, newVideosWeek, newSongsWeek] = await Promise.all([
            safeCount("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
            safeCount("SELECT COUNT(*) as count FROM users WHERE created_at BETWEEN DATE_SUB(NOW(), INTERVAL 14 DAY) AND DATE_SUB(NOW(), INTERVAL 7 DAY)"),
            safeCount("SELECT COUNT(*) as count FROM videos WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
            safeCount("SELECT COUNT(*) as count FROM songs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"),
        ]);

        // ── Daily user signups — last 14 days ────────────────────────────────
        const userGrowth = await safeQuery(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM users
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [], []);

        // ── Daily video uploads — last 14 days ───────────────────────────────
        const videoGrowth = await safeQuery(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM videos
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `, [], []);

        // ── Daily views — last 14 days (approximation via watch history) ─────
        const viewsGrowth = await safeQuery(`
            SELECT DATE(watched_at) as date, COUNT(*) as count
            FROM watch_history
            WHERE watched_at >= DATE_SUB(NOW(), INTERVAL 14 DAY)
            GROUP BY DATE(watched_at)
            ORDER BY date ASC
        `, [], []);

        // ── Content type breakdown ────────────────────────────────────────────
        const contentTypes = await safeQuery(`
            SELECT type, COUNT(*) as count
            FROM videos
            WHERE is_active = TRUE
            GROUP BY type
        `, [], []);

        // ── Top 10 videos by views ────────────────────────────────────────────
        const topVideos = await safeQuery(`
            SELECT v.id, v.title, v.thumbnail_url as thumbnailUrl,
                   v.views_count as views, v.likes_count as likes,
                   v.comments_count as comments, v.type,
                   u.full_name as creatorName, u.profile_image as creatorImage
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            WHERE v.is_active = TRUE
            ORDER BY v.views_count DESC
            LIMIT 10
        `, [], []);

        // ── Top 10 songs by plays ─────────────────────────────────────────────
        const topSongs = await safeQuery(`
            SELECT s.id, s.title, s.artist, s.cover_image_url as coverImageUrl,
                   s.plays_count as plays, s.likes_count as likes,
                   g.name as genre
            FROM songs s
            LEFT JOIN music_genres g ON s.genre_id = g.id
            ORDER BY s.plays_count DESC
            LIMIT 10
        `, [], []);

        // ── Top 10 creators by views ──────────────────────────────────────────
        const topCreators = await safeQuery(`
            SELECT u.id, u.full_name as name, u.profile_image as avatar,
                   u.email,
                   COALESCE(cp.total_earnings, 0) as earnings,
                   COALESCE(SUM(v.views_count),0) as totalViews,
                   COUNT(v.id) as videoCount
            FROM users u
            JOIN creator_profiles cp ON cp.user_id = u.id
            LEFT JOIN videos v ON v.creator_id = u.id AND v.is_active = TRUE
            GROUP BY u.id, u.full_name, u.profile_image, u.email, cp.total_earnings
            ORDER BY totalViews DESC
            LIMIT 10
        `, [], []);

        // ── Genre breakdown for videos ────────────────────────────────────────
        const videoGenres = await safeQuery(`
            SELECT g.name, COUNT(v.id) as count
            FROM videos v
            LEFT JOIN video_genres g ON v.genre_id = g.id
            WHERE v.is_active = TRUE AND g.name IS NOT NULL
            GROUP BY g.name
            ORDER BY count DESC
            LIMIT 8
        `, [], []);

        // ── Genre breakdown for music ─────────────────────────────────────────
        const musicGenres = await safeQuery(`
            SELECT g.name, COUNT(s.id) as count
            FROM songs s
            LEFT JOIN music_genres g ON s.genre_id = g.id
            WHERE s.is_active = TRUE AND g.name IS NOT NULL
            GROUP BY g.name
            ORDER BY count DESC
            LIMIT 8
        `, [], []);

        // ── Recent 10 users ───────────────────────────────────────────────────
        const recentUsers = await safeQuery(`
            SELECT u.id, u.full_name as fullName, u.email,
                   u.profile_image as profileImage,
                   u.is_creator as isCreator, u.is_verified as isVerified,
                   u.created_at as createdAt
            FROM users u
            ORDER BY u.created_at DESC LIMIT 10
        `, [], []);

        // ── Recent 10 videos ──────────────────────────────────────────────────
        const recentVideos = await safeQuery(`
            SELECT v.id, v.title, v.thumbnail_url as thumbnailUrl,
                   v.views_count as views, v.likes_count as likes,
                   v.type, v.created_at as createdAt,
                   u.full_name as creatorName
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            ORDER BY v.created_at DESC LIMIT 10
        `, [], []);

        // ── Recent 10 songs ───────────────────────────────────────────────────
        const recentSongs = await safeQuery(`
            SELECT s.id, s.title, s.artist, s.cover_image_url as coverImageUrl,
                   s.plays_count as plays, s.likes_count as likes,
                   s.created_at as createdAt
            FROM songs s
            ORDER BY s.created_at DESC LIMIT 10
        `, [], []);

        // ── Support summary ───────────────────────────────────────────────────
        const [supportTotal, supportPending, supportResolved] = await Promise.all([
            safeCount('SELECT COUNT(*) as count FROM support_messages'),
            safeCount("SELECT COUNT(*) as count FROM support_messages WHERE status = 'pending'"),
            safeCount("SELECT COUNT(*) as count FROM support_messages WHERE status = 'resolved'"),
        ]);

        // ── Notification summary ──────────────────────────────────────────────
        const [notifTotal, notifRead, fcmUsers] = await Promise.all([
            safeCount('SELECT COUNT(*) as count FROM notifications'),
            safeCount('SELECT COUNT(*) as count FROM notifications WHERE is_read = TRUE'),
            safeCount('SELECT COUNT(*) as count FROM users WHERE fcm_token IS NOT NULL'),
        ]);

        // ── Language distribution ─────────────────────────────────────────────
        const languageDist = await safeQuery(`
            SELECT language, COUNT(*) as count
            FROM videos
            WHERE is_active = TRUE AND language IS NOT NULL
            GROUP BY language
            ORDER BY count DESC
        `, [], []);

        res.json({
            success: true,
            // Core metrics
            userCount:     userRow.count,
            videoCount:    videoRow.count,
            reelCount:     reelRow.count,
            songCount:     songRow.count,
            creatorCount:  creatorRow.count,
            totalViews:    Number(viewRow.total)    || 0,
            totalLikes:    Number(likeRow.total)    || 0,
            totalComments: Number(commentCount)     || 0,
            totalEarnings: Number(earningRow.total) || 0,
            totalSongPlays:Number(songPlayRow.total)|| 0,
            totalSongLikes:Number(songLikeRow.total)|| 0,

            // Growth (last 7 days)
            newUsersThisWeek:  newUsersWeek.count,
            prevUsersLastWeek: prevUsersWeek.count,
            newVideosThisWeek: newVideosWeek.count,
            newSongsThisWeek:  newSongsWeek.count,

            // Time series (14-day)
            userGrowth:  (userGrowth  || []).map(r => ({ date: r.date, count: Number(r.count) })),
            videoGrowth: (videoGrowth || []).map(r => ({ date: r.date, count: Number(r.count) })),
            viewsGrowth: (viewsGrowth || []).map(r => ({ date: r.date, count: Number(r.count) })),

            // Breakdowns
            contentTypes: (contentTypes || []).map(r => ({ type: r.type, count: Number(r.count) })),
            videoGenres:  (videoGenres  || []).map(r => ({ name: r.name, count: Number(r.count) })),
            musicGenres:  (musicGenres  || []).map(r => ({ name: r.name, count: Number(r.count) })),
            languageDist: (languageDist || []).map(r => ({ language: r.language, count: Number(r.count) })),

            // Top performers
            topVideos:   (topVideos   || []).map(v => ({ ...v, views: Number(v.views), likes: Number(v.likes) })),
            topSongs:    (topSongs    || []).map(s => ({ ...s, plays: Number(s.plays), likes: Number(s.likes) })),
            topCreators: (topCreators || []).map(c => ({ ...c, totalViews: Number(c.totalViews), videoCount: Number(c.videoCount), earnings: Number(c.earnings)||0, subscribers: 0 })),

            // Recent activity
            recentUsers:  recentUsers || [],
            recentVideos: (recentVideos || []).map(v => ({ ...v, views: Number(v.views), likes: Number(v.likes), creator: { fullName: v.creatorName } })),
            recentSongs:  (recentSongs  || []).map(s => ({ ...s, plays: Number(s.plays), likes: Number(s.likes) })),

            // Support & notifications
            support:       { total: supportTotal.count, pending: supportPending.count, resolved: supportResolved.count },
            notifications: { total: notifTotal.count, read: notifRead.count, fcmUsers: fcmUsers.count },
        });
    } catch (error) {
        console.error('getStats error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        let query = `
            SELECT id, full_name, email, mobile_number, is_creator, is_verified, role, created_at, profile_image 
            FROM users 
        `;
        let countQuery = 'SELECT COUNT(*) as count FROM users';
        let queryParams = [];
        let countParams = [];

        if (search) {
            const searchCreate = `%${search}%`;
            const whereClause = ' WHERE full_name LIKE ? OR email LIKE ? OR mobile_number LIKE ?';
            query += whereClause;
            countQuery += whereClause;
            queryParams.push(searchCreate, searchCreate, searchCreate);
            countParams.push(searchCreate, searchCreate, searchCreate);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        const [users] = await pool.query(query, queryParams);
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            success: true,
            users,
            total: countResult[0].count,
            page,
            pages: Math.ceil(countResult[0].count / limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete User
// @route   DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update User Status (Creator/Verified)
// @route   PATCH /api/admin/users/:id/status
const updateUserStatus = async (req, res) => {
    try {
        const { isCreator, isVerified, fullName, email, mobileNumber, role } = req.body;
        const updates = [];
        const values = [];

        if (isCreator !== undefined) {
            updates.push('is_creator = ?');
            values.push(isCreator);
        }
        if (isVerified !== undefined) {
            updates.push('is_verified = ?');
            values.push(isVerified);
        }
        if (role !== undefined) {
            updates.push('role = ?');
            values.push(role);
        }
        if (fullName !== undefined) {
            updates.push('full_name = ?');
            values.push(fullName);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            values.push(email);
        }
        if (mobileNumber !== undefined) {
            updates.push('mobile_number = ?');
            values.push(mobileNumber);
        }

        if (updates.length > 0) {
            values.push(req.params.id);
            await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        // If marking as creator, ensure creator profile exists
        if (isCreator === true || isCreator === 1) {
            // Check if creator profile already exists
            const [existing] = await pool.query('SELECT id FROM creator_profiles WHERE user_id = ?', [req.params.id]);

            if (existing.length === 0) {
                // Get user info for creating profile
                const [users] = await pool.query('SELECT full_name FROM users WHERE id = ?', [req.params.id]);
                const userName = users[0]?.full_name || 'Creator';

                // Create creator profile with defaults
                await pool.query(`
                    INSERT INTO creator_profiles 
                    (user_id, popular_name, monetization_percentage, total_earnings, is_monetization_enabled, created_at, updated_at)
                    VALUES (?, ?, 70, 0, 0, NOW(), NOW())
                `, [req.params.id, userName]);

                console.log(`Created creator profile for user ${req.params.id}`);
            }
        }

        res.json({ success: true, message: 'User updated' });
    } catch (error) {
        console.error('Update user status error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get User Details with Stats
// @route   GET /api/admin/users/:id
const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;

        // 1. User Basic Info
        const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
        const user = users[0];

        // 2. Creator Profile
        const [profiles] = await pool.query(`
            SELECT id, user_id, popular_name, pan_card, bank_name, account_number, ifsc_code, account_holder_name, upi_id,
                   CAST(monetization_percentage AS CHAR) as monetization_percentage,
                   CAST(total_earnings AS CHAR) as total_earnings,
                   is_monetization_enabled, created_at, updated_at
            FROM creator_profiles WHERE user_id = ?
        `, [userId]);
        user.creatorProfile = profiles[0] || null;

        // 3. Videos
        const [videos] = await pool.query('SELECT * FROM videos WHERE creator_id = ? ORDER BY created_at DESC LIMIT 20', [userId]);
        user.videos = videos;

        // 4. Stats Counts (Approximate for _count)
        const [playlistCount] = await pool.query('SELECT COUNT(*) as c FROM playlists WHERE user_id = ?', [userId]);
        const [videoCount] = await pool.query('SELECT COUNT(*) as c FROM videos WHERE creator_id = ?', [userId]);

        user._count = {
            playlists: playlistCount[0].c,
            videos: videoCount[0].c,
            songLikes: 0,
            videoLikes: 0
        };

        res.json({ success: true, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getStats,
    getAllUsers,
    getUserById,
    deleteUser,
    updateUserStatus
};

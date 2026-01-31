const pool = require('../config/db');

// @desc    Get dashboard statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getStats = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
        const [videos] = await pool.query('SELECT COUNT(*) as count FROM videos');
        const [songs] = await pool.query('SELECT COUNT(*) as count FROM songs');
        const [creators] = await pool.query('SELECT COUNT(*) as count FROM creator_profiles');
        const [views] = await pool.query('SELECT CAST(SUM(views_count) AS UNSIGNED) as total FROM videos');
        const [earnings] = await pool.query('SELECT CAST(SUM(total_earnings) AS CHAR) as total FROM creator_profiles');

        // Recent Users
        const [recentUsers] = await pool.query(`
            SELECT u.id, u.full_name as fullName, u.email, u.profile_image as profileImage, 
                   u.is_creator as isCreator, u.is_verified as isVerified, u.created_at as createdAt 
            FROM users u
            ORDER BY u.created_at DESC LIMIT 5
        `);

        // Recent Videos (with Creator name)
        const [recentVideos] = await pool.query(`
            SELECT v.id, v.title, v.thumbnail_url as thumbnailUrl, u.full_name as creatorName 
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            ORDER BY v.created_at DESC LIMIT 5
        `);

        res.json({
            success: true,
            userCount: users[0].count,
            videoCount: videos[0].count,
            songCount: songs[0].count,
            creatorCount: creators[0].count,
            totalViews: views[0].total || 0,
            totalEarnings: earnings[0].total || 0,
            recentUsers,
            recentVideos: recentVideos.map(v => ({
                id: v.id,
                title: v.title,
                thumbnailUrl: v.thumbnailUrl,
                creator: { fullName: v.creatorName }
            }))
        });
    } catch (error) {
        console.error(error);
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
        const { isCreator, isVerified } = req.body;
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
        if (req.body.role !== undefined) {
            updates.push('role = ?');
            values.push(req.body.role);
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

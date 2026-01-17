const pool = require('../config/db');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.headers['x-user-id'] || 1;
        const [notifs] = await pool.query(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        res.json({ notifications: notifs });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.registerToken = async (req, res) => {
    try {
        const userId = req.user.id; // From auth middleware protection
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

        // Update user with new FCM token
        // Using raw query as project seems slightly mixed, but Prisma usage suggests direct update if converted
        // Assuming we are sticking to the existing pattern, let's look at getNotifications... 
        // It uses pool.query. So I will use pool.query here too for consistency with this file.

        await pool.query(
            'UPDATE users SET fcm_token = ? WHERE id = ?',
            [token, userId]
        );

        res.json({ success: true, message: 'FCM Token registered' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to register token' });
    }
};

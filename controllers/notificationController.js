const pool = require('../config/db');
const { sendToToken, sendToTokens } = require('../services/fcmService');

exports.getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id || req.headers['x-user-id'] || 1;
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
        const userId = req.user.id;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }

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

exports.broadcastNotification = async (req, res) => {
    try {
        const { title, message } = req.body;
        const [users] = await pool.query('SELECT id FROM users LIMIT 5');

        for (const user of users) {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [user.id, title, message, 'SYSTEM']
            );
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getSystemNotifications = async (req, res) => {
    try {
        const [notifs] = await pool.query(
            'SELECT DISTINCT title, message, created_at, type FROM notifications WHERE type = "SYSTEM" ORDER BY created_at DESC LIMIT 20'
        );
        res.json({ notifications: notifs });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

// ── Admin: Analytics ─────────────────────────────────────────────────────────

/**
 * GET /api/admin/notifications/analytics
 * Returns summary stats + per-broadcast history with read rates.
 */
exports.adminGetAnalytics = async (req, res) => {
    try {
        // Summary stats
        const [[summary]] = await pool.query(`
            SELECT
                COUNT(*)                          AS total_sent,
                SUM(is_read)                      AS total_read,
                COUNT(DISTINCT user_id)           AS unique_recipients,
                SUM(DATE(created_at) = CURDATE()) AS sent_today
            FROM notifications
        `);

        const [[{ fcm_users }]] = await pool.query(
            'SELECT COUNT(*) AS fcm_users FROM users WHERE fcm_token IS NOT NULL'
        );

        // Per-broadcast history (group admin/system broadcasts by title + day)
        const [history] = await pool.query(`
            SELECT
                title,
                type,
                DATE(created_at)    AS sent_date,
                MIN(created_at)     AS sent_at,
                COUNT(*)            AS recipients,
                SUM(is_read)        AS read_count
            FROM notifications
            WHERE type IN ('ADMIN','SYSTEM')
            GROUP BY title, type, DATE(created_at)
            ORDER BY sent_at DESC
            LIMIT 50
        `);

        // Automated notification stats (comment, follow, new_episode)
        const [autoStats] = await pool.query(`
            SELECT
                type,
                COUNT(*)     AS total,
                SUM(is_read) AS read_count
            FROM notifications
            WHERE type NOT IN ('ADMIN','SYSTEM')
            GROUP BY type
        `);

        res.json({
            success: true,
            summary: {
                total_sent: Number(summary.total_sent),
                total_read: Number(summary.total_read),
                unique_recipients: Number(summary.unique_recipients),
                sent_today: Number(summary.sent_today),
                fcm_users: Number(fcm_users),
                read_rate: summary.total_sent > 0
                    ? ((summary.total_read / summary.total_sent) * 100).toFixed(1)
                    : '0.0',
            },
            history,
            auto_stats: autoStats,
        });
    } catch (error) {
        console.error('[adminGetAnalytics] error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Admin: Send push notification ────────────────────────────────────────────

/**
 * POST /api/admin/notifications/push
 * Body: { user_id?, title, body, data? }
 * If user_id is omitted, sends to ALL users with a token.
 */
exports.adminSendPush = async (req, res) => {
    try {
        const { user_id, title, body, data = {} } = req.body;
        if (!title || !body) {
            return res.status(400).json({ success: false, message: 'title and body are required' });
        }

        if (user_id) {
            // Single user
            const [rows] = await pool.query('SELECT fcm_token FROM users WHERE id = ?', [user_id]);
            if (!rows.length || !rows[0].fcm_token) {
                return res.status(404).json({ success: false, message: 'User not found or no FCM token registered' });
            }
            await sendToToken(rows[0].fcm_token, { title, body, data });

            // Record in-app notification
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                [user_id, title, body, 'ADMIN']
            );

            return res.json({ success: true, message: 'Push notification sent to user' });
        }

        // Broadcast to all users with tokens
        const [rows] = await pool.query('SELECT id, fcm_token FROM users WHERE fcm_token IS NOT NULL');
        const tokens = rows.map(r => r.fcm_token);

        await sendToTokens(tokens, { title, body, data });

        // Record in-app notification for all users
        const values = rows.map(r => [r.id, title, body, 'ADMIN']);
        if (values.length > 0) {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES ?',
                [values]
            );
        }

        res.json({ success: true, message: `Push sent to ${tokens.length} devices` });
    } catch (error) {
        console.error('[adminSendPush] error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// ── Admin: Send email ─────────────────────────────────────────────────────────

/**
 * POST /api/admin/notifications/email
 * Body: { user_id?, subject, message }
 * If user_id is omitted, sends to ALL users with an email address.
 */
exports.adminSendEmail = async (req, res) => {
    try {
        const { sendAdminEmail } = require('../utils/emailService');
        const { user_id, subject, message } = req.body;
        if (!subject || !message) {
            return res.status(400).json({ success: false, message: 'subject and message are required' });
        }

        if (user_id) {
            const [rows] = await pool.query('SELECT email, full_name FROM users WHERE id = ?', [user_id]);
            if (!rows.length || !rows[0].email) {
                return res.status(404).json({ success: false, message: 'User not found or no email address' });
            }
            await sendAdminEmail(rows[0].email, { subject, message, userName: rows[0].full_name });
            return res.json({ success: true, message: 'Email sent to user' });
        }

        // Broadcast
        const [rows] = await pool.query('SELECT email, full_name FROM users WHERE email IS NOT NULL');
        let sent = 0;
        for (const row of rows) {
            try {
                await sendAdminEmail(row.email, { subject, message, userName: row.full_name });
                sent++;
            } catch (err) {
                console.error(`[adminSendEmail] Failed for ${row.email}:`, err.message);
            }
        }
        res.json({ success: true, message: `Email sent to ${sent}/${rows.length} users` });
    } catch (error) {
        console.error('[adminSendEmail] error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

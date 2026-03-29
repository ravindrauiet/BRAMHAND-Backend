const pool = require('../config/db');

// @desc    Get all support messages (contact + feedback)
// @route   GET /api/admin/support
// @access  Private/Admin
const getSupportMessages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        const type = req.query.type || null; // 'contact' | 'feedback' | null (all)

        let whereClause = type ? 'WHERE type = ?' : '';
        let params = type ? [type, limit, offset] : [limit, offset];

        const [messages] = await pool.query(`
            SELECT id, type, name, email_or_mobile, subject, message, feedback_type, rating, created_at
            FROM support_messages
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, params);

        const [countResult] = await pool.query(
            `SELECT COUNT(*) as count FROM support_messages ${whereClause}`,
            type ? [type] : []
        );

        res.json({
            success: true,
            messages,
            total: countResult[0].count,
            page,
            pages: Math.ceil(countResult[0].count / limit)
        });
    } catch (error) {
        console.error('getSupportMessages error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete support message
// @route   DELETE /api/admin/support/:id
// @access  Private/Admin
const deleteSupportMessage = async (req, res) => {
    try {
        await pool.query('DELETE FROM support_messages WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Message deleted' });
    } catch (error) {
        console.error('deleteSupportMessage error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = { getSupportMessages, deleteSupportMessage };

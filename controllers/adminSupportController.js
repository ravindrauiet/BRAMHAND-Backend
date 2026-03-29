const pool = require('../config/db');

// @desc    Get all support messages (contact + feedback)
// @route   GET /api/admin/support
// @access  Private/Admin
const getSupportMessages = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const type = req.query.type || null;

        let whereClause = type ? 'WHERE sm.type = ?' : '';
        let params = type ? [type, limit, offset] : [limit, offset];

        const [messages] = await pool.query(`
            SELECT sm.id, sm.type, sm.name, sm.email_or_mobile, sm.subject, sm.message,
                   sm.feedback_type, sm.rating, sm.status, sm.admin_notes, sm.created_at,
                   u.full_name as user_name, u.email as user_email, u.mobile_number as user_mobile
            FROM support_messages sm
            LEFT JOIN users u ON sm.user_id = u.id
            ${whereClause}
            ORDER BY sm.created_at DESC
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

// @desc    Update support message status/notes
// @route   PATCH /api/admin/support/:id
// @access  Private/Admin
const updateSupportMessage = async (req, res) => {
    try {
        const { status, admin_notes } = req.body;
        await pool.query(
            `UPDATE support_messages SET status = ?, admin_notes = ? WHERE id = ?`,
            [status, admin_notes || null, req.params.id]
        );
        res.json({ success: true, message: 'Updated successfully' });
    } catch (error) {
        console.error('updateSupportMessage error:', error);
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

module.exports = { getSupportMessages, updateSupportMessage, deleteSupportMessage };


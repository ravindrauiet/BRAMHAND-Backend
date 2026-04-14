const pool = require('../config/db');
const { sendToToken } = require('../services/fcmService');

exports.addComment = async (req, res) => {
    try {
        const userId = req.user.id;
        const videoId = req.params.videoId;
        const { text } = req.body;

        if (!text) return res.status(400).json({ error: 'Comment text is required' });

        const [result] = await pool.query(
            'INSERT INTO comments (user_id, video_id, text) VALUES (?, ?, ?)',
            [userId, videoId, text]
        );

        // Update comment count on video
        await pool.query('UPDATE videos SET comments_count = comments_count + 1 WHERE id = ?', [videoId]);

        const newComment = {
            id: result.insertId,
            user_id: userId,
            video_id: videoId,
            text,
            created_at: new Date(),
            user: {
                id: req.user.id,
                full_name: req.user.full_name,
                profile_image: req.user.profile_image
            }
        };

        res.json({ success: true, comment: newComment });

        // ── Notify video owner (fire-and-forget) ────────────────────────────
        // Don't notify if the commenter IS the owner
        pool.query(
            'SELECT u.fcm_token, v.title FROM videos v JOIN users u ON v.creator_id = u.id WHERE v.id = ? AND v.creator_id != ?',
            [videoId, userId]
        ).then(([rows]) => {
            if (rows.length && rows[0].fcm_token) {
                const commenterName = req.user.full_name || 'Someone';
                sendToToken(rows[0].fcm_token, {
                    title: `New comment on "${rows[0].title}"`,
                    body: `${commenterName}: ${text.substring(0, 80)}`,
                    data: { type: 'comment', videoId: String(videoId) },
                }).catch(() => {});
            }
        }).catch(() => {});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

exports.getComments = async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const [comments] = await pool.query(`
            SELECT c.*, u.full_name, u.profile_image 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.video_id = ? 
            ORDER BY c.created_at DESC`,
            [videoId]
        );
        res.json({ comments });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch comments' });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const commentId = req.params.commentId;
        const userId = req.user.id;

        // Check ownership
        const [existing] = await pool.query('SELECT * FROM comments WHERE id = ?', [commentId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Comment not found' });

        if (existing[0].user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query('DELETE FROM comments WHERE id = ?', [commentId]);

        // Decrement count
        await pool.query('UPDATE videos SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = ?', [existing[0].video_id]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

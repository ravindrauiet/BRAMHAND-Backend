const pool = require('../config/db');

// @desc    Get all songs
// @route   GET /api/admin/songs
const getAllSongs = async (req, res) => {
    try {
        const [songs] = await pool.query(`
            SELECT s.id, s.title, s.artist, s.album, s.audio_url as audioUrl, s.cover_image_url as coverImageUrl,
                   s.is_active as isActive, s.is_trending as isTrending, s.is_featured as isFeatured,
                   s.created_at as createdAt,
                   g.name as genreName
            FROM songs s
            LEFT JOIN music_genres g ON s.genre_id = g.id
            ORDER BY s.created_at DESC
        `);

        res.json({ success: true, songs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Song
// @route   DELETE /api/admin/songs/:id
const deleteSong = async (req, res) => {
    try {
        await pool.query('DELETE FROM songs WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Song deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Toggle Song Status
// @route   PATCH /api/admin/songs/:id/status
const toggleSongStatus = async (req, res) => {
    try {
        const { isActive } = req.body;
        await pool.query('UPDATE songs SET is_active = ? WHERE id = ?', [isActive, req.params.id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Single Song
// @route   GET /api/admin/songs/:id
const getSongById = async (req, res) => {
    try {
        const [songs] = await pool.query('SELECT * FROM songs WHERE id = ?', [req.params.id]);
        if (songs.length === 0) return res.status(404).json({ success: false, message: 'Song not found' });
        res.json({ success: true, song: songs[0] });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all Playlists
// @route   GET /api/admin/playlists
const getAllPlaylists = async (req, res) => {
    try {
        const [playlists] = await pool.query(`
            SELECT p.id, p.name, p.description, p.cover_image as coverImage, p.created_at as createdAt,
                   u.full_name as creatorName, u.profile_image as creatorImage,
                   (SELECT COUNT(*) FROM playlist_songs ps WHERE ps.playlist_id = p.id) as songCount
            FROM playlists p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, playlists });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllSongs,
    getSongById,
    deleteSong,
    toggleSongStatus,
    getAllPlaylists
};

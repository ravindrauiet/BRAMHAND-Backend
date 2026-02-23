const pool = require('../config/db');

// @desc    Search videos by title, description, or creator name
// @route   GET /api/search/videos?q=...
// @access  Public
exports.searchVideos = async (req, res) => {
    try {
        const { q, page = 1, limit = 20, type = 'VIDEO' } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
        }

        const offset = (page - 1) * limit;
        const searchTerm = `%${q.trim()}%`;

        const [videos] = await pool.query(`
            SELECT v.*, u.full_name as creator_name, u.profile_image as creator_image, c.name as category_name
            FROM videos v
            LEFT JOIN users u ON v.creator_id = u.id
            LEFT JOIN video_categories c ON v.category_id = c.id
            WHERE v.is_active = TRUE AND v.type = ?
              AND (v.title LIKE ? OR v.description LIKE ? OR u.full_name LIKE ? OR v.tags LIKE ?)
            ORDER BY v.views_count DESC, v.created_at DESC
            LIMIT ? OFFSET ?
        `, [type, searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit), parseInt(offset)]);

        res.json({ success: true, videos, query: q });
    } catch (error) {
        console.error('searchVideos error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};

// @desc    Search songs by title, artist, or album
// @route   GET /api/search/songs?q=...
// @access  Public
exports.searchSongs = async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
        }

        const searchTerm = `%${q.trim()}%`;

        const [songs] = await pool.query(`
            SELECT s.*, g.name as genre_name
            FROM songs s
            LEFT JOIN music_genres g ON s.genre_id = g.id
            WHERE s.is_active = TRUE
              AND (s.title LIKE ? OR s.artist LIKE ? OR s.album LIKE ?)
            ORDER BY s.plays_count DESC, s.created_at DESC
            LIMIT ?
        `, [searchTerm, searchTerm, searchTerm, parseInt(limit)]);

        res.json({ success: true, songs, query: q });
    } catch (error) {
        console.error('searchSongs error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};

// @desc    Combined search (videos + series + songs)
// @route   GET /api/search?q=...
// @access  Public
exports.search = async (req, res) => {
    try {
        const { q, limit = 10 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Query must be at least 2 characters' });
        }

        const searchTerm = `%${q.trim()}%`;
        const lim = parseInt(limit);

        // Parallel queries for speed
        const [videosResult, seriesResult, songsResult] = await Promise.all([
            pool.query(`
                SELECT v.id, v.title, v.thumbnail_url, v.type, v.views_count,
                       u.full_name as creator_name, 'video' as result_type
                FROM videos v
                LEFT JOIN users u ON v.creator_id = u.id
                WHERE v.is_active = TRUE AND v.type = 'VIDEO'
                  AND (v.title LIKE ? OR v.description LIKE ?)
                ORDER BY v.views_count DESC LIMIT ?
            `, [searchTerm, searchTerm, lim]),

            pool.query(`
                SELECT s.id, s.title, s.thumbnail_url, 'series' as type,
                       u.full_name as creator_name, 'series' as result_type
                FROM series s
                LEFT JOIN users u ON s.creator_id = u.id
                WHERE s.is_active = TRUE AND s.title LIKE ?
                LIMIT ?
            `, [searchTerm, lim]),

            pool.query(`
                SELECT s.id, s.title, s.cover_image_url as thumbnail_url, s.artist,
                       'song' as result_type
                FROM songs s
                WHERE s.is_active = TRUE
                  AND (s.title LIKE ? OR s.artist LIKE ?)
                ORDER BY s.plays_count DESC LIMIT ?
            `, [searchTerm, searchTerm, lim]),
        ]);

        res.json({
            success: true,
            query: q,
            videos: videosResult[0],
            series: seriesResult[0],
            songs: songsResult[0],
        });
    } catch (error) {
        console.error('search error:', error);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
};

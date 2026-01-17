const pool = require('../config/db');
const https = require('https');
const http = require('http');

exports.getSongs = async (req, res) => {
    try {
        const { genre_id, search, is_trending, is_featured, limit = 50 } = req.query;
        let query = 'SELECT s.*, g.name as genre_name FROM songs s LEFT JOIN music_genres g ON s.genre_id = g.id WHERE s.is_active = TRUE';
        const params = [];

        if (genre_id) {
            query += ' AND s.genre_id = ?';
            params.push(genre_id);
        }
        if (search) {
            query += ' AND s.title LIKE ?';
            params.push(`%${search}%`);
        }
        if (is_trending === 'true') {
            query += ' AND s.is_trending = TRUE';
        }
        if (is_featured === 'true') {
            query += ' AND s.is_featured = TRUE';
        }

        query += ' ORDER BY s.created_at DESC LIMIT ?';
        params.push(parseInt(limit));

        const [songs] = await pool.query(query, params);
        res.json({ songs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getGenres = async (req, res) => {
    try {
        const [genres] = await pool.query('SELECT * FROM music_genres WHERE is_active = TRUE');
        res.json({ genres });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getPlaylists = async (req, res) => {
    try {
        const { user_id } = req.query;
        let query = 'SELECT * FROM playlists WHERE is_public = TRUE';
        const params = [];

        if (user_id) {
            query += ' OR user_id = ?'; // Public OR owned
            params.push(user_id);
        }

        const [playlists] = await pool.query(query, params);
        res.json({ playlists });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.streamAudio = async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send('Missing url');

    const client = url.startsWith('https') ? https : http;

    client.get(url, (stream) => {
        res.set('Content-Type', stream.headers['content-type']);
        if (stream.headers['content-length']) {
            res.set('Content-Length', stream.headers['content-length']);
        }
        res.set('Access-Control-Allow-Origin', '*');
        stream.pipe(res);
    }).on('error', (err) => {
        console.error('Stream error:', err);
        res.status(500).send('Stream failed');
    });
};

// --- Interactions ---

exports.likeSong = async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;

        await pool.query('INSERT IGNORE INTO song_likes (user_id, song_id) VALUES (?, ?)', [userId, songId]);
        await pool.query('UPDATE songs SET likes_count = likes_count + 1 WHERE id = ?', [songId]);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.unlikeSong = async (req, res) => {
    try {
        const userId = req.user.id;
        const songId = req.params.id;

        const [result] = await pool.query('DELETE FROM song_likes WHERE user_id = ? AND song_id = ?', [userId, songId]);
        if (result.affectedRows > 0) {
            await pool.query('UPDATE songs SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?', [songId]);
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.createPlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, is_public } = req.body;

        const [result] = await pool.query(
            'INSERT INTO playlists (user_id, name, is_public) VALUES (?, ?, ?)',
            [userId, name, is_public ? 1 : 0]
        );
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.addToPlaylist = async (req, res) => {
    try {
        const userId = req.user.id;
        const { playlistId, songId } = req.body;

        // Verify ownership
        const [playlist] = await pool.query('SELECT user_id FROM playlists WHERE id = ?', [playlistId]);
        if (playlist.length === 0 || playlist[0].user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        await pool.query('INSERT IGNORE INTO playlist_songs (playlist_id, song_id) VALUES (?, ?)', [playlistId, songId]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

exports.getMyPlaylists = async (req, res) => {
    try {
        const userId = req.user.id;
        const [playlists] = await pool.query('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC', [userId]);
        res.json({ playlists });
    } catch (error) {
        res.status(500).json({ error: 'Failed' });
    }
};

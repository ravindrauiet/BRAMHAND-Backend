const pool = require('../config/db');

// @desc    Get all songs
// @route   GET /api/admin/songs
const getAllSongs = async (req, res) => {
    try {
        const [songs] = await pool.query(`
            SELECT s.id, s.title, s.artist, s.album, s.audio_url as audioUrl, s.cover_image_url as coverImageUrl,
                   s.is_active as isActive, s.is_trending as isTrending, s.is_featured as isFeatured,
                   s.plays_count as playsCount, s.likes_count as likesCount,
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
        const [songs] = await pool.query('SELECT *, CAST(file_size AS CHAR) as file_size FROM songs WHERE id = ?', [req.params.id]);
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

// @desc    Upload New Song
// @route   POST /api/admin/songs
const createSong = async (req, res) => {
    try {
        const {
            title,
            artist,
            album,
            genreId,
            isActive = 'true',
            isTrending = 'false',
            isFeatured = 'false',
            duration
        } = req.body;

        let audioUrl = null;
        let coverImageUrl = null;
        let fileSize = null;

        // Get uploaded file URLs from multer-s3
        if (req.files) {
            if (req.files.audio && req.files.audio[0]) {
                audioUrl = req.files.audio[0].location; // S3 URL
                fileSize = req.files.audio[0].size;
            }
            if (req.files.coverImage && req.files.coverImage[0]) {
                coverImageUrl = req.files.coverImage[0].location; // S3 URL
            }
        }

        // Allow URL bodies for testing/manual override
        if (!audioUrl && req.body.audioUrl) audioUrl = req.body.audioUrl;
        if (!coverImageUrl && req.body.coverImageUrl) coverImageUrl = req.body.coverImageUrl;

        if (!audioUrl) {
            return res.status(400).json({ success: false, message: 'Audio file is required' });
        }

        const [result] = await pool.query(
            `INSERT INTO songs (
                title, artist, album, genre_id, 
                audio_url, cover_image_url, 
                is_active, is_trending, is_featured, 
                duration, file_size,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                title,
                artist,
                album || null,
                genreId || null,
                audioUrl,
                coverImageUrl || null,
                isActive === 'true' || isActive === true ? 1 : 0,
                isTrending === 'true' || isTrending === true ? 1 : 0,
                isFeatured === 'true' || isFeatured === true ? 1 : 0,
                duration || null,
                fileSize || null
            ]
        );

        res.json({
            success: true,
            id: result.insertId,
            audioUrl,
            coverImageUrl,
            message: 'Song uploaded successfully'
        });
    } catch (error) {
        console.error('Upload song error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update Song Details
// @route   PATCH /api/admin/songs/:id
const updateSong = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            title, artist, album, genreId,
            isActive, isTrending, isFeatured, duration
        } = req.body;

        const updates = [];
        const values = [];

        if (title !== undefined) { updates.push('title = ?'); values.push(title); }
        if (artist !== undefined) { updates.push('artist = ?'); values.push(artist); }
        if (album !== undefined) { updates.push('album = ?'); values.push(album); }
        if (genreId !== undefined) { updates.push('genre_id = ?'); values.push(genreId); }
        if (isActive !== undefined) { updates.push('is_active = ?'); values.push(isActive === 'true' || isActive === true ? 1 : 0); }
        if (isTrending !== undefined) { updates.push('is_trending = ?'); values.push(isTrending === 'true' || isTrending === true ? 1 : 0); }
        if (isFeatured !== undefined) { updates.push('is_featured = ?'); values.push(isFeatured === 'true' || isFeatured === true ? 1 : 0); }
        if (duration !== undefined) { updates.push('duration = ?'); values.push(duration); }

        // Handle file uploads
        if (req.files) {
            if (req.files.audio && req.files.audio[0]) {
                updates.push('audio_url = ?');
                values.push(req.files.audio[0].location);
                updates.push('file_size = ?');
                values.push(req.files.audio[0].size);
            }
            if (req.files.coverImage && req.files.coverImage[0]) {
                updates.push('cover_image_url = ?');
                values.push(req.files.coverImage[0].location);
            }
        }

        if (updates.length > 0) {
            updates.push('updated_at = NOW()');
            values.push(id);
            await pool.query(`UPDATE songs SET ${updates.join(', ')} WHERE id = ?`, values);
        }

        res.json({ success: true, message: 'Song updated successfully' });
    } catch (error) {
        console.error('Update song error:', error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllSongs,
    getSongById,
    createSong,
    updateSong,
    deleteSong,
    toggleSongStatus,
    getAllPlaylists
};

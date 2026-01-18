const pool = require('../config/db');

// @desc    Get all Video Categories
// @route   GET /api/admin/categories
const getVideoCategories = async (req, res) => {
    try {
        const [categories] = await pool.query('SELECT * FROM video_categories ORDER BY id DESC');
        res.json({ success: true, categories });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get all Music Genres
// @route   GET /api/admin/genres
const getMusicGenres = async (req, res) => {
    try {
        const [genres] = await pool.query('SELECT * FROM music_genres ORDER BY id DESC');
        res.json({ success: true, genres });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create Video Category
// @route   POST /api/admin/categories
const createVideoCategory = async (req, res) => {
    try {
        const { name, icon } = req.body;
        await pool.query('INSERT INTO video_categories (name, icon) VALUES (?, ?)', [name, icon]);
        res.json({ success: true, message: 'Category created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Video Category
// @route   DELETE /api/admin/categories/:id
const deleteVideoCategory = async (req, res) => {
    try {
        await pool.query('DELETE FROM video_categories WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Category deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create Music Genre
// @route   POST /api/admin/genres
const createMusicGenre = async (req, res) => {
    try {
        const { name } = req.body;
        await pool.query('INSERT INTO music_genres (name) VALUES (?)', [name]);
        res.json({ success: true, message: 'Genre created' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Music Genre
// @route   DELETE /api/admin/genres/:id
const deleteMusicGenre = async (req, res) => {
    try {
        await pool.query('DELETE FROM music_genres WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Genre deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getVideoCategories,
    getMusicGenres,
    createVideoCategory,
    deleteVideoCategory,
    createMusicGenre,
    deleteMusicGenre
};

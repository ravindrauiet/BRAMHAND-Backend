const pool = require('../config/db');

// @desc    Get All Series
// @route   GET /api/series
const getAllSeries = async (req, res) => {
    try {
        const { category_id, is_featured, is_active } = req.query;
        let query = `
            SELECT s.*, c.name as categoryName, u.full_name as creatorName,
                   (SELECT COUNT(*) FROM videos WHERE series_id = s.id) as episodeCount,
                   (SELECT COALESCE(SUM(views_count), 0) FROM videos WHERE series_id = s.id) as totalViews
            FROM series s
            LEFT JOIN video_categories c ON s.category_id = c.id
            LEFT JOIN users u ON s.creator_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (category_id) {
            query += ' AND s.category_id = ?';
            params.push(category_id);
        }
        if (is_active) {
            query += ' AND s.is_active = ?';
            params.push(is_active === 'true' ? 1 : 0);
        }
        if (is_featured) {
            query += ' AND s.is_featured = ?';
            params.push(is_featured === 'true' ? 1 : 0);
        }

        query += ' ORDER BY s.created_at DESC';

        const [series] = await pool.query(query, params);
        res.json({ success: true, series });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get Single Series by ID (with Episodes)
// @route   GET /api/series/:id
const getSeriesById = async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch Series Details
        const [seriesList] = await pool.query(`
            SELECT s.*, c.name as categoryName, u.full_name as creatorName, u.profile_image as creatorImage
            FROM series s
            LEFT JOIN video_categories c ON s.category_id = c.id
            LEFT JOIN users u ON s.creator_id = u.id
            WHERE s.id = ?
        `, [id]);

        if (seriesList.length === 0) {
            return res.status(404).json({ success: false, message: 'Series not found' });
        }

        const series = seriesList[0];

        // Fetch Episodes (Videos linked to this series)
        const [episodes] = await pool.query(`
            SELECT id, title, description, thumbnail_url as thumbnailUrl, video_url as videoUrl, duration,
                   episode_number as episodeNumber, season_number as seasonNumber, views_count as viewsCount,
                   created_at as createdAt
            FROM videos 
            WHERE series_id = ? AND is_active = TRUE
            ORDER BY season_number ASC, episode_number ASC, created_at ASC
        `, [id]);

        series.episodes = episodes;

        res.json({ success: true, series });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create New Series
// @route   POST /api/series
const createSeries = async (req, res) => {
    try {
        const { title, description, categoryId, creatorId, isActive, isFeatured } = req.body;

        let thumbnailUrl = null;
        let coverImageUrl = null;

        if (req.files) {
            if (req.files.thumbnail && req.files.thumbnail[0]) thumbnailUrl = req.files.thumbnail[0].location;
            if (req.files.coverImage && req.files.coverImage[0]) coverImageUrl = req.files.coverImage[0].location;
        }

        const [result] = await pool.query(`
            INSERT INTO series (
                title, description, thumbnail_url, cover_image_url, category_id, creator_id,
                is_active, is_featured, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            title, description, thumbnailUrl, coverImageUrl, categoryId, creatorId,
            isActive ? 1 : 1, isFeatured ? 1 : 0
        ]);

        res.json({ success: true, id: result.insertId, message: 'Series created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update Series
// @route   PATCH /api/series/:id
const updateSeries = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body; // Expects fields like title, description

        // Handle file uploads if any (logic omitted for brevity, similar to create)

        // Simple update logic
        const allowedFields = ['title', 'description', 'isActive', 'isFeatured', 'categoryId'];
        const setClause = [];
        const values = [];

        for (const key of Object.keys(updates)) {
            if (allowedFields.includes(key)) {
                setClause.push(`${key === 'isActive' ? 'is_active' : key === 'isFeatured' ? 'is_featured' : key === 'categoryId' ? 'category_id' : key} = ?`);
                values.push(key === 'isActive' || key === 'isFeatured' ? (updates[key] ? 1 : 0) : updates[key]);
            }
        }

        if (setClause.length === 0) return res.json({ success: true, message: 'No changes' });

        setClause.push('updated_at = NOW()');
        values.push(id);

        await pool.query(`UPDATE series SET ${setClause.join(', ')} WHERE id = ?`, values);

        res.json({ success: true, message: 'Series updated' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete Series
// @route   DELETE /api/series/:id
const deleteSeries = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM series WHERE id = ?', [id]);
        // Note: Videos linked to series will have series_id set to NULL (if ON DELETE SET NULL) or stay as is.
        // Usually we might want to unlink them or delete them. Prisma relations suggest SET NULL or Cascade.
        // Manually:
        await pool.query('UPDATE videos SET series_id = NULL WHERE series_id = ?', [id]);

        res.json({ success: true, message: 'Series deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

module.exports = {
    getAllSeries,
    getSeriesById,
    createSeries,
    updateSeries,
    deleteSeries
};

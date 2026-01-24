const express = require('express');
const router = express.Router();
const { getAllSeries, getSeriesById, createSeries, updateSeries, deleteSeries } = require('../controllers/seriesController');
const { protect, admin } = require('../middleware/authMiddleware'); // Assuming these exist
const upload = require('../middleware/upload'); // Assuming multer setup

router.get('/', getAllSeries);
router.get('/:id', getSeriesById);

// Admin/Creator Routes
router.post('/', protect, upload.fields([{ name: 'thumbnail', maxCount: 1 }, { name: 'coverImage', maxCount: 1 }]), createSeries);
router.patch('/:id', protect, updateSeries);
router.delete('/:id', protect, deleteSeries);

module.exports = router;

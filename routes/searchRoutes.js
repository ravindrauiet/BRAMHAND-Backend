const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Combined search (videos + series + songs)
router.get('/', searchController.search);

// Specific searches
router.get('/videos', searchController.searchVideos);
router.get('/songs', searchController.searchSongs);

module.exports = router;

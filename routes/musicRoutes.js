const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { protect } = require('../middleware/authMiddleware');

router.get('/songs', musicController.getSongs);
router.get('/playlists', musicController.getPlaylists);
router.get('/genres', musicController.getGenres);
router.get('/stream', musicController.streamAudio);

// Interactions
router.post('/songs/:id/like', protect, musicController.likeSong);
router.delete('/songs/:id/like', protect, musicController.unlikeSong);

// Playlists
router.post('/playlists', protect, musicController.createPlaylist);
router.get('/my-playlists', protect, musicController.getMyPlaylists);
router.post('/playlists/add', protect, musicController.addToPlaylist);


module.exports = router;

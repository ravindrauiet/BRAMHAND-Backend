const express = require('express');
const router = express.Router();
const { getStats, getAllUsers, getUserById, deleteUser, updateUserStatus } = require('../controllers/adminController');
const { getAllVideos, getVideoById, deleteVideo: deleteAdminVideo, toggleVideoStatus } = require('../controllers/adminVideoController');
const { getAllSongs, getSongById, deleteSong: deleteAdminSong, toggleSongStatus: toggleSongStatusAdmin, getAllPlaylists } = require('../controllers/adminMusicController');
const { getAllCreators, toggleMonetization } = require('../controllers/adminCreatorController');
const {
    getVideoCategories, getMusicGenres,
    createVideoCategory, deleteVideoCategory,
    createMusicGenre, deleteMusicGenre
} = require('../controllers/adminCategoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/stats', protect, adminOnly, getStats);
// User Routes
router.get('/users', protect, adminOnly, getAllUsers);
router.get('/users/:id', protect, adminOnly, getUserById);
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.patch('/users/:id/status', protect, adminOnly, updateUserStatus);

// Video Routes
router.get('/videos', protect, adminOnly, getAllVideos);
router.get('/videos/:id', protect, adminOnly, getVideoById);
router.delete('/videos/:id', protect, adminOnly, deleteAdminVideo);
router.patch('/videos/:id/status', protect, adminOnly, toggleVideoStatus);

// Song Routes
router.get('/songs', protect, adminOnly, getAllSongs);
router.get('/songs/:id', protect, adminOnly, getSongById);
router.delete('/songs/:id', protect, adminOnly, deleteAdminSong);
router.patch('/songs/:id/status', protect, adminOnly, toggleSongStatusAdmin);

router.get('/playlists', protect, adminOnly, getAllPlaylists);

// Creator Routes
router.get('/creators', protect, adminOnly, getAllCreators);
router.patch('/creators/:id/monetization', protect, adminOnly, toggleMonetization);

// Category & Genre Routes
router.get('/categories', protect, adminOnly, getVideoCategories);
router.post('/categories', protect, adminOnly, createVideoCategory);
router.delete('/categories/:id', protect, adminOnly, deleteVideoCategory);

router.get('/genres', protect, adminOnly, getMusicGenres);
router.post('/genres', protect, adminOnly, createMusicGenre);
router.delete('/genres/:id', protect, adminOnly, deleteMusicGenre);

module.exports = router;

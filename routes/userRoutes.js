const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const watchlistController = require('../controllers/watchlistController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

router.get('/profile', protect, userController.getProfile);
router.put('/profile/image', protect, upload.single('profileImage'), userController.updateProfileImage);
router.put('/preferences', protect, userController.updatePreferences);

router.get('/history', protect, userController.getWatchHistory);
router.delete('/history/:viewId', protect, userController.removeFromWatchHistory);

// Social Graph
router.post('/:id/follow', protect, userController.followUser);
router.delete('/:id/follow', protect, userController.unfollowUser);
router.get('/:id/followers', userController.getFollowers);
router.get('/:id/following', userController.getFollowing);

// Watchlist
router.get('/watchlist', protect, watchlistController.getWatchlist);
router.post('/watchlist', protect, watchlistController.addToWatchlist);
router.delete('/watchlist/:id', protect, watchlistController.removeFromWatchlist);


module.exports = router;

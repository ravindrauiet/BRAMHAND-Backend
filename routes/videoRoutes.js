const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Public routes - SPECIFIC ROUTES MUST COME BEFORE /:id
router.get('/', videoController.getVideos);
router.get('/categories', videoController.getPublicCategories);
router.get('/trending', videoController.getTrending);

// Content Management (Protected) - MUST BE BEFORE /:id
router.get('/my-content', protect, videoController.getMyContent); // Get user's videos/reels
router.post('/', protect, upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]), videoController.uploadVideo);

// Generic /:id routes AFTER specific routes
router.get('/:id', videoController.getVideoById);
router.patch('/:id', protect, videoController.updateVideoDetails); // Update video details
router.delete('/:id', protect, videoController.deleteVideoByOwner); // Delete own video
router.patch('/:id/status', protect, videoController.updateVideoStatus);

// Video Interactions
router.post('/:id/view', videoController.recordView); // Public but tracks auth if present
router.post('/:id/progress', protect, videoController.updateWatchProgress);
router.post('/:id/like', protect, videoController.likeVideo);
router.delete('/:id/like', protect, videoController.unlikeVideo);
router.post('/:id/share', protect, videoController.shareVideo);
router.get('/:id/comments', videoController.getComments);
router.post('/:id/comments', protect, videoController.addComment);

module.exports = router;

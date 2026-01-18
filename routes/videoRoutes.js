const express = require('express');
const router = express.Router();
const videoController = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', videoController.getVideos);
router.get('/categories', videoController.getPublicCategories);
router.get('/trending', videoController.getTrending);
router.get('/:id', videoController.getVideoById);
// Video Interactions
router.post('/:id/view', videoController.recordView); // Public but tracks auth if present
router.post('/:id/like', protect, videoController.likeVideo);
router.delete('/:id/like', protect, videoController.unlikeVideo);
router.post('/:id/share', protect, videoController.shareVideo);
router.get('/:id/comments', videoController.getComments);
router.post('/:id/comments', protect, videoController.addComment);
router.post('/', protect, videoController.uploadVideo);

module.exports = router;

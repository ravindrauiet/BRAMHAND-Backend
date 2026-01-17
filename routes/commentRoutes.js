const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/:videoId', protect, commentController.addComment);
router.get('/:videoId', commentController.getComments);
router.delete('/:commentId', protect, commentController.deleteComment);

module.exports = router;

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.post('/register-token', protect, notificationController.registerToken);

module.exports = router;

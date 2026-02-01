const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, notificationController.getNotifications);
router.post('/register-token', protect, notificationController.registerToken);
router.post('/broadcast', protect, notificationController.broadcastNotification);
router.get('/system', protect, notificationController.getSystemNotifications);

module.exports = router;

const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/profile', protect, creatorController.createProfile);
router.get('/profile', protect, creatorController.getProfile);
router.get('/monetization', protect, creatorController.getMonetization);
router.put('/monetization', protect, creatorController.updateMonetization);
router.get('/top', creatorController.getTopCreators);

module.exports = router;

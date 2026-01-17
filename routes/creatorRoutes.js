const express = require('express');
const router = express.Router();
const creatorController = require('../controllers/creatorController');
const { protect } = require('../middleware/authMiddleware');

router.post('/profile', protect, creatorController.createProfile);
router.get('/monetization', protect, creatorController.getMonetization);
router.get('/top', creatorController.getTopCreators);

module.exports = router;

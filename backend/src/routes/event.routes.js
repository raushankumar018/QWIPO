// routes/event.routes.js
const express = require('express');
const { logEvent } = require('../controllers/event.controller');
const authenticateToken = require('../middleware/auth.middleware');

const router = express.Router();

// A single endpoint for all user behavior tracking
router.post('/log', authenticateToken, logEvent);

module.exports = router;
const express = require('express');
const {
  getUserRecommendations,
  generateRecommendations, // <-- fix: use this name
  createRecommendation,
  deleteRecommendation
} = require('../controllers/recommendation.controller');
const { gptRecommendation } = require('../controllers/gptRecommendation.controller');
const { chatbot } = require('../controllers/chatbot.controller');
const authenticateToken = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/recommendations/ - Get recommendations for logged-in user
router.get('/', authenticateToken, getUserRecommendations);

// GPT recommendation system
router.get('/gpt-recommendation', authenticateToken, gptRecommendation);

// Chatbot / AI Assistant
router.post('/chatbot', authenticateToken, chatbot);

// POST /api/recommendations/generate - Generate new recommendations for the user
router.post('/generate', authenticateToken, generateRecommendations); // ✅ Use destructured function

// POST /api/recommendations/ - Create a manual recommendation (admin)
router.post('/', authenticateToken, createRecommendation); // Add admin check middleware if needed

// DELETE /api/recommendations/:id - Delete a recommendation
router.delete('/:id', authenticateToken, deleteRecommendation);

module.exports = router;

const Recommendation = require('../models/recommendation.model');
const View = require('../models/view.model');
const Product = require('../models/product.model'); // 🎯 IMPORTED Product MODEL
const axios = require('axios');

const RECO_API_BASE = process.env.RECO_API_BASE || 'http://localhost:8000';

async function generateRecommendations(req, res) {
    try {
        const userId = req.user.userId;

        // STEP 1: Fetch Recent User Behavior
        const recentViews = await View.find({ user: userId, product: { $exists: true } })
            .sort({ timestamp: -1 })
            .limit(20)
            .distinct('product');

        const recentProductIds = recentViews.map(id => id.toString());

        // STEP 2: Call Python API with Behavior Data
        const requestBody = {
            recent_behavior_ids: recentProductIds
        };

        const { data } = await axios.post(
            `${RECO_API_BASE}/recommendations/${userId}?top_k=10`,
            requestBody,
            { headers: { 'Content-Type': 'application/json' } }
        );

        // --- 🎯 STEP 3: Enrich Recommendations with Full Product Details (Price, Image, Stock) ---
        const recommendedIds = (data.recommendations || []).map(r => r.product_id);

        // Fetch full details for all recommended products at once
        const fullProducts = await Product.find({
            _id: { $in: recommendedIds }
        })
            .populate('distributor', 'name') // 🎯 CRITICAL FIX: POPULATE distributor to get the name
            .lean(); // Use .lean() for faster object retrieval

        const productDetailsMap = new Map();
        fullProducts.forEach(p => {
            // Map the Mongoose object to a simple structure, converting ID to string
            productDetailsMap.set(p._id.toString(), {
                name: p.name,
                description: p.description,
                category: p.category,
                price: p.price,
                stock: p.stock,
                image: p.image, // Actual image URL
                // distributor will now be an object: { _id: '...', name: '...' }
                distributor: p.distributor,
            });
        });

        // Merge Python scores/titles with MongoDB details
        const enrichedRecommendations = (data.recommendations || []).map(r => {
            const details = productDetailsMap.get(r.product_id) || {};
            return {
                ...r, // product_id, title, score (from Python)
                ...details, // price, stock, image, distributor: {name, _id}, etc. (from MongoDB)
            };
        });

        res.json({
            message: 'Recommendations generated successfully',
            recommendations: enrichedRecommendations, // 🎯 Use the enriched list
            explanation: data.explanation || {},
        });

    } catch (err) {
        console.error('Error fetching recommendations from Python API:', err.message);
        const status = err.response?.status || 500;
        const detail = err.response?.data?.detail || 'Failed to connect to recommendation service.';
        res.status(status).json({ message: 'Failed to generate recommendations.', detail });
    }
}

// 🎯 FIX: Define placeholder functions to allow them to be exported without error
async function getUserRecommendations(req, res) {
    // This is the controller logic for fetching *pre-calculated* recommendations (if any).
    try {
        const userId = req.user.userId;
        const limit = parseInt(req.query.limit) || 10;
        const recommendations = await Recommendation.getRecommendationsForUser(userId, limit);
        res.json({
            message: 'Recommendations retrieved successfully',
            count: recommendations.length,
            recommendations,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

async function createRecommendation(req, res) {
    res.status(501).json({ message: 'Not Implemented: Manual recommendation creation.' });
}

async function deleteRecommendation(req, res) {
    res.status(501).json({ message: 'Not Implemented: Deleting recommendation.' });
}

module.exports = {
    getUserRecommendations,
    generateRecommendations,
    createRecommendation,
    deleteRecommendation,
};

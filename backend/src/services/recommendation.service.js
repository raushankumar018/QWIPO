// services/recommendation.service.js
const mongoose = require('mongoose');
const Order = require('../models/order.model');
const Product = require('../models/product.model');
const UserEvent = require('../models/userEvent.model');
const Recommendation = require('../models/recommendation.model');
// const Cart = require('../models/cart.model'); // Assuming you have a Cart model

// Define weights for different recommendation strategies
const WEIGHTS = {
    CONTENT_BASED: 1.2, // Based on similar categories/products
    RECENTLY_VIEWED: 0.9,
    REORDER: 1.5, // High priority for re-orders
    CROSS_SELL: 1.3,
    TRENDING: 0.8,
};

async function generateRecommendationsForUser(userId) {
    console.log(`Starting recommendation generation for user: ${userId}`);
    const productScores = new Map();

    // --- 1. Get User's Past Purchases (Order History) ---
    const orders = await Order.find({ retailer: userId })
        .populate('products.product')
        .sort({ createdAt: -1 })
        .limit(50); // Look at a larger history

    const purchasedProductIds = new Set();
    const categoryFrequency = {};
    if (orders.length > 0) {
        orders.forEach(order => {
            order.products.forEach(item => {
                if (item.product) {
                    purchasedProductIds.add(item.product._id.toString());
                    const cat = item.product.category.toString();
                    categoryFrequency[cat] = (categoryFrequency[cat] || 0) + item.quantity;
                }
            });
        });
    }

    // --- 2. Get User's Recent Activity (Events) ---
    const recentEvents = await UserEvent.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(100);

    const viewedProductIds = new Set(
        recentEvents
            .filter(e => e.eventType === 'product_view' && e.details.productId)
            .map(e => e.details.productId.toString())
    );

    // --- Strategy: Content-Based Filtering (Similar Categories) ---
    const preferredCategories = Object.keys(categoryFrequency)
        .sort((a, b) => categoryFrequency[b] - categoryFrequency[a])
        .slice(0, 3);

    if (preferredCategories.length > 0) {
        const similarProducts = await Product.find({
            category: { $in: preferredCategories },
            _id: { $nin: Array.from(purchasedProductIds) }, // Exclude already bought items
            stock: { $gt: 0 },
        }).limit(10);

        for (const product of similarProducts) {
            const score = (productScores.get(product._id.toString())?.score || 0) + WEIGHTS.CONTENT_BASED;
            productScores.set(product._id.toString(), { product, score, reason: 'similar_category' });
        }
    }

    // --- Strategy: Recently Viewed Items ---
    if (viewedProductIds.size > 0) {
        const recentlyViewedProducts = await Product.find({
            _id: { $in: Array.from(viewedProductIds), $nin: Array.from(purchasedProductIds) },
            stock: { $gt: 0 },
        });
        for (const product of recentlyViewedProducts) {
            const score = (productScores.get(product._id.toString())?.score || 0) + WEIGHTS.RECENTLY_VIEWED;
            productScores.set(product._id.toString(), { product, score, reason: 'recently_viewed' });
        }
    }

    // --- Strategy: Cross-Sell (Items frequently bought with user's top products) ---
    // A simplified cross-sell: find items in different categories than their top ones
    if (preferredCategories.length > 0) {
        const crossSellProducts = await Product.find({
            category: { $nin: preferredCategories },
            _id: { $nin: Array.from(purchasedProductIds) },
            stock: { $gt: 0 }
        }).limit(5); // You can make this logic smarter later

        for (const product of crossSellProducts) {
            const score = (productScores.get(product._id.toString())?.score || 0) + WEIGHTS.CROSS_SELL;
            productScores.set(product._id.toString(), { product, score, reason: 'cross_sell' });
        }
    }

    // --- Fallback: Trending Products for new users or if no other recommendations found ---
    if (productScores.size < 5) {
        const trendingProducts = await Product.find({ stock: { $gt: 50 } }) // Define "trending" as high stock
            .sort({ /* add a popularity field later */ stock: -1 })
            .limit(10);

        for (const product of trendingProducts) {
            if (!purchasedProductIds.has(product._id.toString())) {
                const score = (productScores.get(product._id.toString())?.score || 0) + WEIGHTS.TRENDING;
                productScores.set(product._id.toString(), { product, score, reason: 'trending' });
            }
        }
    }


    // --- 3. Rank and Save Recommendations ---
    const rankedRecommendations = Array.from(productScores.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 20); // Generate top 20 potential recommendations

    // Clear old recommendations before saving new ones
    await Recommendation.deleteMany({ user: userId });

    for (const item of rankedRecommendations) {
        // Normalize score to be between 0 and 1
        const normalizedScore = Math.min(item.score / 5, 1); // Adjust '5' based on max possible score

        await Recommendation.createRecommendation(
            userId,
            item.product._id,
            normalizedScore,
            item.reason,
            { /* Add any relevant metadata here */ }
        );
    }

    console.log(`Generated ${rankedRecommendations} recommendations for user: ${userId}`);
}

module.exports = { generateRecommendationsForUser };
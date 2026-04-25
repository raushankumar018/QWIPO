// models/userEvent.model.js
const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        eventType: {
            type: String,
            required: true,
            enum: [
                'search',
                'product_view',
                'add_to_cart',
                'remove_from_cart',
                'category_view',
            ],
        },
        details: {
            // Flexible object to store event-specific data
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
            categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
            searchQuery: String,
            // You can add more fields like device, location etc.
        },
    },
    {
        timestamps: true,
    }
);

// Expire documents after 90 days to keep the collection clean
userEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('UserEvent', userEventSchema);
const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', index: true, default: null }, // Nullable for searches/category views
    category: { type: String, trim: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    type: { type: String, enum: ['product_view', 'category_view', 'search', 'cart_add', 'cart_remove', 'wishlist_add'], required: true, index: true },
    metadata: {
        searchQuery: { type: String },
        device: String,
        location: String,
        price: Number,
        quantity: Number,
    }
}, { timestamps: true });

// TTL Index: Automatically remove documents older than 90 days (you can adjust this)
// This ensures the real-time behavior data stays relevant and doesn't grow infinitely.
viewSchema.index({ "timestamp": 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('View', viewSchema);
// src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron'); // Required for scheduled jobs

// --- Import all routes ---
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes = require('./routes/order.routes');
const cartRoutes = require('./routes/cart.routes');
const recommendationRoutes = require('./routes/recommendation.routes');
const couponRoutes = require('./routes/coupon.routes');
const eventRoutes = require('./routes/event.routes'); // For tracking user behavior

// --- Import services and models needed for the cron job ---
const User = require('./models/user.model');
const { generateRecommendationsForUser } = require('./services/recommendation.service');
// const recommendationRoutesAi = require('./routes/recommendationAi.routes');

// --- Initialize app ---
const app = express();

// --- Core Middleware ---
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"], // your frontend URLs
  credentials: true
}));
app.use(express.json()); // Parse JSON body
app.use(morgan("dev")); // Logger for development
app.use(helmet()); // Basic security headers

// --- Rate Limiting Middleware ---
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api', apiLimiter);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/events', eventRoutes); // Route for logging user events
// app.use('/api/recommendationsAi', recommendationRoutesAi);
// --- Base route ---
app.get('/', (req, res) => {
  res.send('Welcome to the Qwipo B2B API');
});

// --- Automated Recommendation Generation Job ---
// This job runs automatically every 10 minutes.
cron.schedule('*/1 * * * *', async () => { // <<-- THIS LINE WAS CHANGED
  console.log('Running scheduled 10-minute recommendation generation job...');
  try {
    const users = await User.find({}, '_id').lean();
    for (const user of users) {
      await generateRecommendationsForUser(user._id);
      // Optional: add a small delay to not overload the database
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log('10-minute recommendation job completed successfully.');
  } catch (err) {
    console.error('Error during scheduled recommendation generation:', err);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata"
});

// --- Error Handling Middleware ---
// Handle 404 Not Found errors
app.use((req, res, next) => {
  res.status(404).json({ message: "Sorry, the requested resource was not found." });
});

// Central error handler for all other errors
app.use((err, req, res, next) => {
  console.error(err.stack); // Log the full error for debugging
  res.status(500).json({ message: "Something went wrong on our end. Please try again later." });
});

module.exports = app;

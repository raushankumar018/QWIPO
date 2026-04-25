const mongoose = require('mongoose');
const Product = require('../../src/models/product.model');
const Order = require('../../src/models/order.model');
const Coupon = require('../../src/models/coupon.model')
const Cart = require('../../src/models/cart.model')
const { GoogleGenAI } = require("@google/genai");

async function chatbot (req, res){

    const data = req.body;
    const userId = req.user.userId;
    const allProducts = await Product.find()
    const allOrders = await Order.find({ retailer: userId }).populate('retailer');
    const allCartItems = await Cart.findOne({ user: userId }).populate('items.product');
    const allCoupons = await Coupon.find()

    const prompt =`
        You are an intelligent e-commerce assistant. Your task is to answer the user's query using the following data:

        - ChatHistory: 
            ${JSON.stringify(data.data.history)}  

        - Products: 
            ${JSON.stringify(allProducts)}  

        - User Orders: 
            ${JSON.stringify(allOrders)} 

        - User Cart Items: 
            ${JSON.stringify(allCartItems)} 

        - Available Coupons: 
            ${JSON.stringify(allCoupons)}  

    
        IMPORTANT RULES:

        - ONLY answer based on the data provided above.
        - If the user's question is not related to the data or cannot be answered from it, respond with: "⚠️ Sorry, the data does not support this query."
        - Be concise and clear in your response. 
        - Be sort, crisp, concise and clear in your response.
        - don't add extra character to the response and answer the query to the point.`


    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{
                    role : "model",
                    parts : [{
                        text : prompt
                    }]
            },{
                    role : "user", 
                    parts : [{
                        text : data.data.query
                    }]
                }
            ],
    });

    res.json({
        items : response.text
    })
}

module.exports = {
    chatbot
}
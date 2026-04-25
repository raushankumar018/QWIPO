// controllers/event.controller.js
const UserEvent = require('../models/userEvent.model');

// This function will handle all event logging
async function logEvent(req, res) {
    try {
        const { eventType, details } = req.body;
        const userId = req.user.userId;

        if (!eventType || !details) {
            return res.status(400).json({ message: 'eventType and details are required' });
        }

        await UserEvent.create({
            user: userId,
            eventType,
            details,
        });

        res.status(200).json({ message: 'Event logged successfully' });
    } catch (err) {
        // Don't block the user for this, just log it on the server
        console.error('Failed to log event:', err.message);
        res.status(200).json({ message: 'Event logging acknowledged' }); // Still send 200 OK
    }
}

module.exports = { logEvent };
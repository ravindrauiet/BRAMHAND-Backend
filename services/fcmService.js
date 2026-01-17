const admin = require('firebase-admin');
const path = require('path');

let fcmInitialized = false;

try {
    // Check if service account file exists or if env vars are set
    // You should place serviceAccountKey.json in the backend root or config folder
    const serviceAccount = require('../serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    fcmInitialized = true;
    console.log('FCM Initialized successfully');
} catch (error) {
    console.warn('FCM Setup Skipped: serviceAccountKey.json not found or invalid.');
    console.warn('Push notifications will be logged but not sent.');
}

/**
 * Send a push notification to a specific device token
 * @param {string} token - The FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
exports.sendPushNotification = async (token, title, body, data = {}) => {
    if (!token) return;

    if (!fcmInitialized) {
        console.log(`[MOCK FCM] To: ${token} | Title: ${title} | Body: ${body}`);
        return;
    }

    const message = {
        notification: {
            title,
            body
        },
        data: {
            ...data,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        token: token
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('Successfully sent message:', response);
        return response;
    } catch (error) {
        console.error('Error sending message:', error);
        // If token is invalid (NotRegistered), we might want to remove it from DB eventually
    }
};

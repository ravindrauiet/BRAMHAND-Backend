const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK once
let _initialized = false;
function ensureInit() {
    if (_initialized) return;
    const serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    _initialized = true;
    console.log('[FCM] Firebase Admin SDK initialized.');
}

/**
 * Send push notification to a single FCM token.
 */
async function sendToToken(token, { title, body, data = {} }) {
    if (!token) return;
    try {
        ensureInit();
        await admin.messaging().send({
            token,
            notification: { title, body },
            data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
            android: {
                priority: 'high',
                notification: { sound: 'default', channelId: 'tirhuta_main' },
            },
        });
    } catch (err) {
        console.error('[FCM] sendToToken error:', err.message);
    }
}

/**
 * Send push notification to multiple FCM tokens (batches of 500).
 */
async function sendToTokens(tokens, { title, body, data = {} }) {
    const valid = tokens.filter(Boolean);
    if (!valid.length) return;
    ensureInit();

    const dataStr = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]));
    const CHUNK = 500;
    let totalSuccess = 0;

    for (let i = 0; i < valid.length; i += CHUNK) {
        const chunk = valid.slice(i, i + CHUNK);
        try {
            const res = await admin.messaging().sendEachForMulticast({
                tokens: chunk,
                notification: { title, body },
                data: dataStr,
                android: {
                    priority: 'high',
                    notification: { sound: 'default', channelId: 'tirhuta_main' },
                },
            });
            totalSuccess += res.successCount;
            if (res.failureCount > 0) {
                console.error(`[FCM] ${res.failureCount} failures in batch`);
            }
        } catch (err) {
            console.error('[FCM] sendToTokens batch error:', err.message);
        }
    }
    console.log(`[FCM] Delivered to ${totalSuccess}/${valid.length} devices.`);
}

module.exports = { sendToToken, sendToTokens };

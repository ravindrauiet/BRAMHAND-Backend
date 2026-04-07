/**
 * Sends a password-reset OTP via Twilio SMS.
 * @param {string} toMobile  - E.164 format preferred (+91XXXXXXXXXX), or plain 10-digit Indian number
 * @param {string} otp       - 6-digit OTP string
 * @returns {Promise<void>}
 */
async function sendOtpSms(toMobile, otp) {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
        throw new Error('SMS service not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in .env');
    }

    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    // Normalise to E.164: prepend +91 if it's a 10-digit Indian number
    let to = toMobile.trim();
    if (/^\d{10}$/.test(to)) {
        to = `+91${to}`;
    } else if (/^0\d{10}$/.test(to)) {
        to = `+91${to.slice(1)}`;
    }

    const appName = process.env.APP_NAME || 'Tirhuta';

    await client.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to,
        body: `${otp} is your ${appName} OTP for password reset. Valid for 10 minutes. Do not share this with anyone.`,
    });
}

module.exports = { sendOtpSms };

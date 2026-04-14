const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter from env variables.
 * Supports any SMTP provider (Gmail, SendGrid, Brevo, Zoho, etc.)
 */
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
}

/**
 * Sends a password-reset OTP email.
 * @param {string} toEmail  - Recipient email address
 * @param {string} otp      - 6-digit OTP string
 * @returns {Promise<void>}
 */
async function sendOtpEmail(toEmail, otp) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('Email service not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in .env');
    }

    const transporter = createTransporter();
    const appName = process.env.APP_NAME || 'Tirhuta';
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to: toEmail,
        subject: `${otp} is your ${appName} password reset OTP`,
        text: `Your OTP for password reset is: ${otp}\n\nThis OTP expires in 10 minutes. Do not share it with anyone.`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;">
    <tr>
      <td style="padding:32px 32px 24px;text-align:center;background:linear-gradient(135deg,#3969ef,#5b21b6);">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${appName}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px;">
        <p style="margin:0 0 8px;color:#9CA3AF;font-size:14px;">Password Reset OTP</p>
        <p style="margin:0 0 28px;color:#F9FAFB;font-size:15px;line-height:1.6;">
          We received a request to reset your password. Use the OTP below to proceed.
        </p>

        <!-- OTP Box -->
        <div style="background:#1F2937;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;letter-spacing:12px;border:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:36px;font-weight:800;color:#3969ef;">${otp}</span>
        </div>

        <p style="margin:0 0 8px;color:#9CA3AF;font-size:13px;text-align:center;">
          ⏱ Expires in <strong style="color:#F9FAFB;">10 minutes</strong>
        </p>
        <p style="margin:0;color:#6B7280;font-size:12px;text-align:center;">
          If you did not request this, please ignore this email. Your password will not change.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,0.05);">
        <p style="margin:0;color:#4B5563;font-size:11px;text-align:center;">
          © ${new Date().getFullYear()} ${appName}. Do not reply to this email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
}

/**
 * Sends a welcome email to a newly registered user.
 */
async function sendWelcomeEmail(toEmail, fullName) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    if (!toEmail) return;
    const transporter = createTransporter();
    const appName = process.env.APP_NAME || 'Tirhuta';
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
    const firstName = (fullName || 'there').split(' ')[0];

    await transporter.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to: toEmail,
        subject: `Welcome to ${appName}! 🎬`,
        text: `Hi ${firstName},\n\nWelcome to ${appName}! Start exploring videos, music, and exclusive content.\n\nEnjoy,\nThe ${appName} Team`,
        html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:40px 32px 32px;text-align:center;background:linear-gradient(135deg,#3969ef,#5b21b6);">
      <h1 style="margin:0 0 8px;color:#fff;font-size:28px;font-weight:800;">${appName}</h1>
      <p style="margin:0;color:rgba(255,255,255,0.8);font-size:14px;">Your world of entertainment</p>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="margin:0 0 12px;color:#F9FAFB;font-size:22px;">Welcome, ${firstName}! 👋</h2>
      <p style="margin:0 0 24px;color:#9CA3AF;font-size:15px;line-height:1.7;">
        We're thrilled to have you join the ${appName} family. Get ready to explore thousands of videos, exclusive series, and music — all in one place.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="padding:14px;background:#1F2937;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 4px;color:#3969ef;font-size:13px;font-weight:600;">🎬 Videos &amp; Series</p>
          <p style="margin:0;color:#9CA3AF;font-size:13px;">Watch trending content anytime</p>
        </td></tr>
        <tr><td style="height:10px;"></td></tr>
        <tr><td style="padding:14px;background:#1F2937;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 4px;color:#3969ef;font-size:13px;font-weight:600;">🎵 Music</p>
          <p style="margin:0;color:#9CA3AF;font-size:13px;">Stream songs &amp; create playlists</p>
        </td></tr>
        <tr><td style="height:10px;"></td></tr>
        <tr><td style="padding:14px;background:#1F2937;border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0 0 4px;color:#3969ef;font-size:13px;font-weight:600;">📱 Adaptive Streaming</p>
          <p style="margin:0;color:#9CA3AF;font-size:13px;">Best quality for your connection</p>
        </td></tr>
      </table>
      <p style="margin:0;color:#6B7280;font-size:13px;text-align:center;">If you have any questions, just reply — we're here to help!</p>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="margin:0;color:#4B5563;font-size:11px;text-align:center;">© ${new Date().getFullYear()} ${appName}. You received this because you created an account.</p>
    </td></tr>
  </table>
</body></html>`,
    });
}

/**
 * Send a custom message from admin to a specific user.
 */
async function sendAdminEmail(toEmail, { subject, message, userName = '' }) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;
    if (!toEmail) return;
    const transporter = createTransporter();
    const appName = process.env.APP_NAME || 'Tirhuta';
    const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

    await transporter.sendMail({
        from: `"${appName}" <${fromEmail}>`,
        to: toEmail,
        subject: subject || `Message from ${appName}`,
        text: message,
        html: `
<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;background:#111827;border-radius:16px;overflow:hidden;">
    <tr><td style="padding:32px;text-align:center;background:linear-gradient(135deg,#3969ef,#5b21b6);">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">${appName}</h1>
    </td></tr>
    <tr><td style="padding:32px;">
      ${userName ? `<p style="margin:0 0 16px;color:#9CA3AF;font-size:14px;">Hi ${userName},</p>` : ''}
      <div style="color:#F9FAFB;font-size:15px;line-height:1.8;">${message.replace(/\n/g, '<br>')}</div>
    </td></tr>
    <tr><td style="padding:16px 32px 24px;border-top:1px solid rgba(255,255,255,0.05);">
      <p style="margin:0;color:#4B5563;font-size:11px;text-align:center;">© ${new Date().getFullYear()} ${appName} Team</p>
    </td></tr>
  </table>
</body></html>`,
    });
}

module.exports = { sendOtpEmail, sendWelcomeEmail, sendAdminEmail };

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
async function sendWelcomeEmail(toEmail, fullName, options = {}) {
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
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <!--[if mso]>
  <style>
    body, table, td, h1, h2, h3, p { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#0D0D12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0D0D12;padding:40px 20px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#16161E;border-radius:24px;overflow:hidden;border:1px solid #2A2A35;">
          
          <!-- Hero Header -->
          <tr>
            <td style="padding:60px 30px;text-align:center;background:linear-gradient(135deg, #FF3366, #7C3AED);">
              ${options.logoUrl ? 
                `<img src="${options.logoUrl}" alt="${appName}" style="max-height:60px;display:inline-block;margin-bottom:20px;">` : ''
              }
              <h1 style="margin:0;font-size:42px;font-weight:800;letter-spacing:-1px;color:#FFFFFF;">${appName}</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,0.8);font-size:16px;font-weight:500;letter-spacing:2px;text-transform:uppercase;">The Future of Entertainment</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding:40px 32px;">
              <h2 style="margin:0 0 16px;color:#FFFFFF;font-size:24px;font-weight:600;">Welcome aboard, \${firstName}! ✨</h2>
              <p style="margin:0 0 32px;color:#A1A1AA;font-size:16px;line-height:1.6;font-weight:400;">
                We're absolutely thrilled to have you here. Step into a world where premium entertainment meets flawless design. Explore exclusive series, trending videos, and personalized music playlists curated just for you.
              </p>

              <!-- Features Grid -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:20px;background-color:#1E1E28;border-radius:16px;border:1px solid #2A2A35;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <div style="width:40px;height:40px;border-radius:12px;background-color:rgba(255,51,102,0.1);text-align:center;line-height:40px;font-size:20px;">
                            🎬
                          </div>
                        </td>
                        <td valign="middle" style="padding-left:16px;">
                          <h3 style="margin:0 0 4px;color:#FFFFFF;font-size:16px;font-weight:600;">Cinematic Experience</h3>
                          <p style="margin:0;color:#9CA3AF;font-size:14px;line-height:1.5;">Immerse yourself in stunning 4K videos, movies, and exclusive series.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr><td height="16"></td></tr>
                <tr>
                  <td style="padding:20px;background-color:#1E1E28;border-radius:16px;border:1px solid #2A2A35;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <div style="width:40px;height:40px;border-radius:12px;background-color:rgba(124,58,237,0.1);text-align:center;line-height:40px;font-size:20px;">
                            🎵
                          </div>
                        </td>
                        <td valign="middle" style="padding-left:16px;">
                          <h3 style="margin:0 0 4px;color:#FFFFFF;font-size:16px;font-weight:600;">High-Fidelity Audio</h3>
                          <p style="margin:0;color:#9CA3AF;font-size:14px;line-height:1.5;">Stream millions of ad-free tracks with adaptive bitrate technology.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${(options.videoThumbnailUrl && options.videoUrl) ? `
              <!-- Featured Video -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background-color:#1E1E28;border-radius:16px;border:1px solid #2A2A35;overflow:hidden;">
                <tr>
                  <td>
                    <a href="${options.videoUrl}" style="display:block;text-decoration:none;">
                      <!-- Ensure image is block and takes full width -->
                      <img src="${options.videoThumbnailUrl}" alt="${options.videoTitle || 'Featured Video'}" width="100%" style="width:100%;max-width:100%;display:block;border-bottom:1px solid #2A2A35;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle">
                          <h3 style="margin:0;color:#FFFFFF;font-size:16px;font-weight:600;">${options.videoTitle || 'Trending Now'}</h3>
                          <p style="margin:4px 0 0;color:#9CA3AF;font-size:14px;">Tap to watch the full video</p>
                        </td>
                        <td valign="middle" align="right" width="60">
                          <a href="${options.videoUrl}" style="display:inline-block;padding:8px 16px;background-color:#FF3366;color:#FFFFFF;text-decoration:none;font-size:12px;font-weight:600;border-radius:20px;">Play</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;">
                <tr>
                  <td align="center">
                    <a href="#" style="display:inline-block;padding:16px 40px;background-color:#FF3366;background:linear-gradient(135deg, #FF3366, #7C3AED);color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;border-radius:50px;letter-spacing:0.5px;">Start Exploring Now</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px;background-color:#12121A;border-top:1px solid #2A2A35;text-align:center;">
              <p style="margin:0 0 12px;color:#6B7280;font-size:12px;line-height:1.5;">
                You received this because you created an account on \${appName}.<br>
                If this wasn't you, simply ignore this email.
              </p>
              <p style="margin:0;color:#4B5563;font-size:12px;font-weight:600;">
                © \${new Date().getFullYear()} \${appName} Inc. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
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

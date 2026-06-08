const nodemailer = require("nodemailer");
const logger = require("./logger");

/**
 * Creates a reusable nodemailer transporter using Gmail SMTP.
 * Credentials are read from environment variables.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Sends a password reset email.
 * @param {string} toEmail  - Recipient email address
 * @param {string} resetUrl - The full reset URL including the token
 * @param {string} userName - The recipient's display name
 */
const sendPasswordResetEmail = async (toEmail, resetUrl, userName) => {
  const transporter = createTransporter();

  const mailOptions = {
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Password Reset Request – ACT HR Portal",
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 0; }
          .wrapper { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #4f46e5, #1e1b4b); padding: 32px; text-align: center; }
          .header h1 { color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.5px; }
          .header .logo { display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: 700; color: #fff; margin-bottom: 12px; }
          .body { padding: 36px 40px; }
          .body p { color: #475569; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
          .body strong { color: #1e293b; }
          .btn-wrap { text-align: center; margin: 32px 0; }
          .btn { display: inline-block; background: #4f46e5; color: #fff !important; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; letter-spacing: 0.3px; }
          .btn:hover { background: #4338ca; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
          .note { background: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 4px; padding: 12px 16px; }
          .note p { color: #92400e; font-size: 13px; margin: 0; }
          .footer { background: #f8fafc; text-align: center; padding: 20px; color: #94a3b8; font-size: 12px; }
          .url-box { background: #f1f5f9; border-radius: 6px; padding: 10px 14px; word-break: break-all; font-size: 12px; color: #64748b; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="header">
            <div class="logo">A</div>
            <h1>ACT Business Solution – HR Portal</h1>
          </div>
          <div class="body">
            <p>Hello <strong>${userName}</strong>,</p>
            <p>We received a request to reset the password for your ACT HR account. Click the button below to proceed.</p>
            <div class="btn-wrap">
              <a href="${resetUrl}" class="btn">Reset My Password</a>
            </div>
            <div class="note">
              <p>⏱ This link expires in <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email — your account remains secure.</p>
            </div>
            <hr class="divider" />
            <p style="font-size:13px; color:#94a3b8;">If the button does not work, copy and paste the link below into your browser:</p>
            <div class="url-box">${resetUrl}</div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} ACT Business Solution &nbsp;|&nbsp; This is an automated message, do not reply.
          </div>
        </div>
      </body>
      </html>
    `,
  };

  const info = await transporter.sendMail(mailOptions);

  return info;
};

/**
 * Verifies SMTP credentials on startup (optional check).
 */
const verifyEmailTransport = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
  } catch (err) {
    logger.warn(`SMTP verification failed: ${err.message}`);
  }
};

module.exports = { sendPasswordResetEmail, verifyEmailTransport };

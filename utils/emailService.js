const nodemailer = require("nodemailer");

// ── Transporter factory with timeouts ─────────────────────────────────────────
const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });

// ── Shared send wrapper with logging ──────────────────────────────────────────
const sendMail = async (options) => {
  const transporter = createTransporter();
  try {
    const info = await transporter.sendMail(options);
    console.log(
      `[Email] ✓ Sent "${options.subject}" → ${options.to} | msgId: ${info.messageId}`,
    );
    if (info.rejected?.length)
      console.warn(`[Email] ⚠ Rejected:`, info.rejected);
    return info;
  } catch (err) {
    console.error(
      `[Email] ✗ FAILED "${options.subject}" → ${options.to}: ${err.message}`,
    );
    throw err; // re-throw so callers can handle
  }
};

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
const baseStyles = `
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
  .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .hd{background:linear-gradient(135deg,#4f46e5,#1e1b4b);padding:32px;text-align:center}
  .hd .logo{display:inline-block;width:48px;height:48px;background:rgba(255,255,255,.15);border-radius:12px;line-height:48px;font-size:24px;font-weight:700;color:#fff;margin-bottom:12px}
  .hd h1{color:#fff;margin:0;font-size:22px}
  .bd{padding:36px 40px}
  .bd p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px}
  .bd strong{color:#1e293b}
  .badge{display:inline-block;background:#ede9fe;color:#4f46e5;padding:4px 12px;border-radius:999px;font-size:13px;font-weight:600;margin-bottom:20px}
  .btn-wrap{text-align:center;margin:32px 0}
  .btn{display:inline-block;background:#4f46e5;color:#fff!important;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600}
  .note{background:#f8fafc;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px}
  .note-blue{background:#f8fafc;border-left:4px solid #6366f1;border-radius:4px;padding:12px 16px}
  .note p,.note-blue p{font-size:13px;margin:0}
  .note p{color:#92400e} .note-blue p{color:#3730a3}
  .ft{background:#f8fafc;text-align:center;padding:20px;color:#94a3b8;font-size:12px}
  .url-box{background:#f1f5f9;border-radius:6px;padding:10px 14px;word-break:break-all;font-size:12px;color:#64748b;margin-top:8px}
  .otp-box{background:#f8fafc;border:2px dashed #e2e8f0;border-radius:16px;padding:28px 20px;margin:0 auto 24px;display:inline-block;width:100%;box-sizing:border-box}
  .otp-digits{font-size:48px;font-weight:800;letter-spacing:18px;color:#1e293b;font-family:monospace}
`;

const emailHtml = (body) => `
  <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
  <style>${baseStyles}</style></head>
  <body><div class="wrap">
    <div class="hd"><div class="logo">A</div><h1>ACT Business Solution – HR Portal</h1></div>
    ${body}
    <div class="ft">&copy; ${new Date().getFullYear()} ACT Business Solution &nbsp;|&nbsp; Automated message, do not reply.</div>
  </div></body></html>
`;

// ── Password reset email ───────────────────────────────────────────────────────
const sendPasswordResetEmail = async (toEmail, resetUrl, userName) => {
  await sendMail({
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Password Reset Request – ACT HR Portal",
    html: emailHtml(`
      <div class="bd">
        <p>Hello <strong>${userName}</strong>,</p>
        <p>We received a request to reset your password. Click below to proceed.</p>
        <div class="btn-wrap"><a href="${resetUrl}" class="btn">Reset My Password</a></div>
        <div class="note"><p>⏱ This link expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p></div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:13px;color:#94a3b8">Or paste this link in your browser:</p>
        <div class="url-box">${resetUrl}</div>
      </div>
    `),
  });
};

// ── Invitation email ───────────────────────────────────────────────────────────
const sendInvitationEmail = async ({
  toEmail,
  inviteUrl,
  inviterName,
  organisationName,
  role,
}) => {
  const roleLabel =
    { admin: "Administrator", manager: "HR Manager", employee: "Employee" }[
      role
    ] || role;
  await sendMail({
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You're invited to join ${organisationName} on ACT HR`,
    html: emailHtml(`
      <div class="bd">
        <p>You've been invited by <strong>${inviterName}</strong> to join</p>
        <p style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 8px">${organisationName}</p>
        <span class="badge">${roleLabel}</span>
        <p>Click the button below to accept your invitation and set up your account.</p>
        <div class="btn-wrap"><a href="${inviteUrl}" class="btn">Accept Invitation</a></div>
        <div class="note-blue"><p>⏱ This invitation link expires in <strong>72 hours</strong>. If you weren't expecting this, you can ignore this email.</p></div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
        <p style="font-size:13px;color:#94a3b8">Or paste this link in your browser:</p>
        <div class="url-box">${inviteUrl}</div>
      </div>
    `),
  });
};

// ── OTP email (registration + forgot-password) ────────────────────────────────
const sendOtpEmail = async (toEmail, otp, purpose, userName = "there") => {
  const isRegister = purpose === "register";
  const subject = isRegister
    ? "Verify your ACT HR account – OTP"
    : "Your password reset OTP – ACT HR Portal";
  const heading = isRegister
    ? "Email Verification Code"
    : "Password Reset Code";
  const bodyText = isRegister
    ? "Thanks for signing up! Use the code below to verify your email address and activate your account."
    : "We received a request to reset your password. Use the code below to proceed.";

  try {
    const fs = require("fs");
    const path = require("path");
    const logsDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(logsDir, "otp.log"), `${toEmail}:${otp}\n`);
  } catch (err) {
    console.error("Failed to write OTP to log file:", err.message);
  }

  await sendMail({
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject,
    html: emailHtml(`
      <div class="bd" style="text-align:center">
        <p style="text-align:left">Hello <strong>${userName}</strong>,</p>
        <p style="text-align:left">${bodyText}</p>
        <div class="otp-box">
          <p style="font-size:12px;color:#94a3b8;margin:0 0 8px;text-align:center;text-transform:uppercase;letter-spacing:2px">${heading}</p>
          <div class="otp-digits">${otp}</div>
        </div>
        <div class="note" style="text-align:left">
          <p>⏱ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
          ${isRegister ? "" : " If you did not request a password reset, you can ignore this email."}</p>
        </div>
      </div>
    `),
  });
};

module.exports = { sendPasswordResetEmail, sendInvitationEmail, sendOtpEmail };

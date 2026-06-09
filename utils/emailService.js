const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

// ── Password reset email ───────────────────────────────────────────────────
const sendPasswordResetEmail = async (toEmail, resetUrl, userName) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Password Reset Request – ACT HR Portal",
    html: `
      <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
      <style>
        body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0}
        .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
        .hd{background:linear-gradient(135deg,#4f46e5,#1e1b4b);padding:32px;text-align:center}
        .hd .logo{display:inline-block;width:48px;height:48px;background:rgba(255,255,255,.15);border-radius:12px;line-height:48px;font-size:24px;font-weight:700;color:#fff;margin-bottom:12px}
        .hd h1{color:#fff;margin:0;font-size:22px}
        .bd{padding:36px 40px}
        .bd p{color:#475569;font-size:15px;line-height:1.7;margin:0 0 16px}
        .bd strong{color:#1e293b}
        .btn-wrap{text-align:center;margin:32px 0}
        .btn{display:inline-block;background:#4f46e5;color:#fff!important;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600}
        .note{background:#f8fafc;border-left:4px solid #f59e0b;border-radius:4px;padding:12px 16px}
        .note p{color:#92400e;font-size:13px;margin:0}
        .ft{background:#f8fafc;text-align:center;padding:20px;color:#94a3b8;font-size:12px}
        .url-box{background:#f1f5f9;border-radius:6px;padding:10px 14px;word-break:break-all;font-size:12px;color:#64748b;margin-top:8px}
      </style></head>
      <body><div class="wrap">
        <div class="hd"><div class="logo">A</div><h1>ACT Business Solution – HR Portal</h1></div>
        <div class="bd">
          <p>Hello <strong>${userName}</strong>,</p>
          <p>We received a request to reset your password. Click below to proceed.</p>
          <div class="btn-wrap"><a href="${resetUrl}" class="btn">Reset My Password</a></div>
          <div class="note"><p>⏱ This link expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p></div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:13px;color:#94a3b8">Or paste this link in your browser:</p>
          <div class="url-box">${resetUrl}</div>
        </div>
        <div class="ft">&copy; ${new Date().getFullYear()} ACT Business Solution &nbsp;|&nbsp; Automated message, do not reply.</div>
      </div></body></html>
    `,
  });
};

// ── Invitation email ───────────────────────────────────────────────────────
const sendInvitationEmail = async ({ toEmail, inviteUrl, inviterName, organisationName, role }) => {
  const transporter = createTransporter();
  const roleLabel = { admin: "Administrator", manager: "HR Manager", employee: "Employee" }[role] || role;

  await transporter.sendMail({
    from: `"ACT HR System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `You're invited to join ${organisationName} on ACT HR`,
    html: `
      <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
      <style>
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
        .note{background:#f8fafc;border-left:4px solid #6366f1;border-radius:4px;padding:12px 16px}
        .note p{color:#3730a3;font-size:13px;margin:0}
        .ft{background:#f8fafc;text-align:center;padding:20px;color:#94a3b8;font-size:12px}
        .url-box{background:#f1f5f9;border-radius:6px;padding:10px 14px;word-break:break-all;font-size:12px;color:#64748b;margin-top:8px}
      </style></head>
      <body><div class="wrap">
        <div class="hd"><div class="logo">A</div><h1>ACT Business Solution – HR Portal</h1></div>
        <div class="bd">
          <p>You've been invited by <strong>${inviterName}</strong> to join</p>
          <p style="font-size:20px;font-weight:700;color:#1e293b;margin:0 0 8px">${organisationName}</p>
          <span class="badge">${roleLabel}</span>
          <p>Click the button below to accept your invitation and set up your account.</p>
          <div class="btn-wrap"><a href="${inviteUrl}" class="btn">Accept Invitation</a></div>
          <div class="note"><p>⏱ This invitation link expires in <strong>72 hours</strong>. If you weren't expecting this, you can ignore this email.</p></div>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"/>
          <p style="font-size:13px;color:#94a3b8">Or paste this link in your browser:</p>
          <div class="url-box">${inviteUrl}</div>
        </div>
        <div class="ft">&copy; ${new Date().getFullYear()} ACT Business Solution &nbsp;|&nbsp; Automated message, do not reply.</div>
      </div></body></html>
    `,
  });
};

module.exports = { sendPasswordResetEmail, sendInvitationEmail };

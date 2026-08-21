const nodemailer = require('nodemailer');

// Dat cac bien moi truong sau trong Vercel Project Settings -> Environment Variables:
// SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_NAME
// Voi Gmail: SMTP_HOST=smtp.gmail.com, SMTP_PORT=587, SMTP_USER=<email>,
// SMTP_PASS=<App Password 16 ky tu, KHONG dung mat khau Gmail thuong>

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, body } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, error: 'Missing "to" field' });
    }

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      return res.status(503).json({
        success: false,
        error: 'SMTP chua duoc cau hinh. Hay dat SMTP_USER va SMTP_PASS trong Vercel Environment Variables.'
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const info = await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || 'Space Mail'}" <${smtpUser}>`,
      to: to,
      subject: subject || 'Email tu Space Mail',
      text: body || 'Chao ban!'
    });

    res.status(200).json({
      success: true,
      messageId: info.messageId
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

const { database, ref, push, set, get } = require('../firebase');

// Webhook nay se duoc goi boi dich vu nhan email ho (vi du: Cloudflare Email Worker,
// Mailgun Inbound Route, ImprovMX, v.v...) moi khi co thu that gui den domain cua ban.
// Can dat WEBHOOK_SECRET trong Vercel Environment Variables va cau hinh dich vu nhan mail
// gui kem header "x-webhook-secret" (hoac query ?secret=) trung khop, de tranh bi nguoi la
// gia mao goi POST tao thu rac vao hop thu cua ban.

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-webhook-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Xac thuc webhook secret (chi bat buoc neu ban da set WEBHOOK_SECRET)
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (expectedSecret) {
      const providedSecret = req.headers['x-webhook-secret'] || req.query?.secret;
      if (providedSecret !== expectedSecret) {
        return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
      }
    }

    if (!database) {
      return res.status(503).json({
        success: false,
        error: 'Service unavailable - Firebase not connected'
      });
    }

    const { to, from, subject, body, date } = req.body;

    if (!to || !from) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Tim account theo email
    const accountsRef = ref(database, 'accounts');
    const snapshot = await get(accountsRef);

    let accountId = null;

    if (snapshot.exists()) {
      const accounts = snapshot.val();
      for (const key in accounts) {
        if (accounts[key].address === to) {
          accountId = key;
          break;
        }
      }
    }

    if (!accountId) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    // Luu message
    const messagesRef = ref(database, `messages/${accountId}`);
    const newMessageRef = push(messagesRef);

    await set(newMessageRef, {
      from: from,
      to: to,
      subject: subject || '(No subject)',
      body: body || '',
      date: date || new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      read: false
    });

    console.log(`📬 New message for ${to} from ${from}`);

    res.status(200).json({
      success: true,
      message: 'Email received and stored'
    });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

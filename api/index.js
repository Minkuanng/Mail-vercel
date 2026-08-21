const { database, ref, get } = require('../firebase');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!database) {
      return res.status(503).json({ 
        success: false,
        error: 'Service unavailable - Firebase not connected' 
      });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('🔍 Validating token:', token);
    
    // Xác thực token
    const tokensRef = ref(database, 'tokens');
    const tokensSnapshot = await get(tokensRef);
    
    if (!tokensSnapshot.exists()) {
      console.log('❌ No tokens found');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token - No tokens found' 
      });
    }

    // Tìm token matching
    let accountId = null;
    let accountAddress = null;
    const tokens = tokensSnapshot.val();
    
    for (const key in tokens) {
      if (tokens[key].token === token) {
        accountId = key;
        accountAddress = tokens[key].address;
        console.log('✅ Found token for account:', { key, address: accountAddress });
        break;
      }
    }

    if (!accountId) {
      console.log('❌ Token not found');
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token - Token not found' 
      });
    }

    // Lấy messages
    const messagesRef = ref(database, `messages/${accountId}`);
    const messagesSnapshot = await get(messagesRef);

    let messages = [];
    if (messagesSnapshot.exists()) {
      const data = messagesSnapshot.val();
      if (typeof data === 'object') {
        messages = Object.values(data);
      }
    }

    console.log(`📬 Found ${messages.length} messages for ${accountAddress}`);

    res.status(200).json({ 
      success: true,
      address: accountAddress,
      messages: messages 
    });
  } catch (error) {
    console.error('❌ Error fetching messages:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
};

module.exports = async (req, res) => {
  // CORS headers
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
    const { address, password } = req.body;

    if (!address || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Address and password are required' 
      });
    }

    const { database, ref, get, set } = require('../firebase');
    
    if (!database) {
      return res.status(503).json({ 
        success: false,
        error: 'Service unavailable' 
      });
    }

    // Lấy tất cả accounts
    const accountsRef = ref(database, 'accounts');
    const snapshot = await get(accountsRef);

    if (!snapshot.exists()) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Tìm account matching
    let validAccount = null;
    let accountId = null;
    const accounts = snapshot.val();
    
    for (const key in accounts) {
      if (accounts[key].address === address && accounts[key].password === password) {
        validAccount = accounts[key];
        accountId = key;
        break;
      }
    }

    if (!validAccount) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = Buffer.from(`${address}:${Date.now()}`).toString('base64');

    // Lưu token
    const tokensRef = ref(database, `tokens/${accountId}`);
    await set(tokensRef, {
      token,
      address,
      createdAt: new Date().toISOString()
    });

    res.status(200).json({ 
      success: true,
      token,
      address 
    });
  } catch (error) {
    console.error('❌ Error generating token:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
};

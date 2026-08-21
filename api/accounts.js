module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Xử lý preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Chỉ cho phép POST
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

    // Import Firebase
    const { database, ref, set, get, push } = require('../firebase');
    
    if (!database) {
      return res.status(503).json({ 
        success: false,
        error: 'Service unavailable' 
      });
    }

    // Kiểm tra account tồn tại
    const accountsRef = ref(database, 'accounts');
    const snapshot = await get(accountsRef);
    
    let accountExists = false;
    if (snapshot.exists()) {
      const accounts = snapshot.val();
      for (const key in accounts) {
        if (accounts[key].address === address) {
          accountExists = true;
          break;
        }
      }
    }

    if (accountExists) {
      return res.status(409).json({ 
        success: false,
        error: 'Account already exists' 
      });
    }

    // Tạo account mới
    const newAccountRef = push(accountsRef);
    await set(newAccountRef, {
      address,
      password,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ 
      success: true,
      message: 'Account created successfully',
      address 
    });
  } catch (error) {
    console.error('❌ Error creating account:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: error.message 
    });
  }
};

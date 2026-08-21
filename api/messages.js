module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST - Đánh dấu đã đọc
  if (req.method === 'POST') {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false,
          error: 'Authorization token required' 
        });
      }

      const token = authHeader.split(' ')[1];
      const { messageId } = req.body;
      
      const { database, ref, get, update } = require('../firebase');
      
      // Xác thực token
      const tokensRef = ref(database, 'tokens');
      const tokensSnapshot = await get(tokensRef);
      
      if (!tokensSnapshot.exists()) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token' 
        });
      }

      let accountId = null;
      const tokens = tokensSnapshot.val();
      for (const key in tokens) {
        if (tokens[key].token === token) {
          accountId = key;
          break;
        }
      }

      if (!accountId) {
        return res.status(401).json({ 
          success: false,
          error: 'Invalid token' 
        });
      }

      // Đánh dấu đã đọc
      const messageRef = ref(database, `messages/${accountId}/${messageId}`);
      await update(messageRef, { read: true });

      return res.status(200).json({ 
        success: true,
        message: 'Message marked as read' 
      });
    } catch (error) {
      console.error('❌ Error marking message:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }

  // GET - Lấy messages
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        error: 'Authorization token required' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const { database, ref, get } = require('../firebase');
    
    if (!database) {
      return res.status(503).json({ 
        success: false,
        error: 'Service unavailable' 
      });
    }

    // Xác thực token
    const tokensRef = ref(database, 'tokens');
    const tokensSnapshot = await get(tokensRef);
    
    if (!tokensSnapshot.exists()) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    let accountId = null;
    let accountAddress = null;
    const tokens = tokensSnapshot.val();
    
    for (const key in tokens) {
      if (tokens[key].token === token) {
        accountId = key;
        accountAddress = tokens[key].address;
        break;
      }
    }

    if (!accountId) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }

    // Lấy messages
    const messagesRef = ref(database, `messages/${accountId}`);
    const messagesSnapshot = await get(messagesRef);

    let messages = [];
    if (messagesSnapshot.exists()) {
      const data = messagesSnapshot.val();
      if (typeof data === 'object') {
        // Thêm ID vào mỗi message
        messages = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sắp xếp theo thời gian nhận (mới nhất lên đầu)
        messages.sort((a, b) => {
          return new Date(b.receivedAt || b.date) - new Date(a.receivedAt || a.date);
        });
      }
    }

    res.status(200).json({ 
      success: true,
      address: accountAddress,
      messages: messages,
      total: messages.length,
      unread: messages.filter(m => !m.read).length
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

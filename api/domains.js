module.exports = async (req, res) => {
  // CORS headers
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
    const { database, ref, get } = require('../firebase');
    
    if (!database) {
      return res.status(200).json({ 
        success: true, 
        domains: ['vercel.app'],
        note: 'Using default domains'
      });
    }

    const domainsRef = ref(database, 'domains');
    const snapshot = await get(domainsRef);
    
    let domains = ['vercel.app'];
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (Array.isArray(data)) {
        domains = data;
      } else if (typeof data === 'object') {
        domains = Object.values(data);
      }
    }

    res.status(200).json({ success: true, domains });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(200).json({ 
      success: true, 
      domains: ['vercel.app'],
      note: 'Error fetching from Firebase, using default'
    });
  }
};

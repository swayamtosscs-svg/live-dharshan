// In-memory storage for demo purposes
let userRoles = new Map();

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const allUsers = Array.from(userRoles.entries()).map(([userId, userData]) => ({
      userId: userId,
      ...userData
    }));
    
    res.status(200).json({
      success: true,
      users: allUsers,
      totalUsers: allUsers.length,
      broadcasters: allUsers.filter(u => u.role === 'broadcaster').length,
      viewers: allUsers.filter(u => u.role === 'viewer').length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

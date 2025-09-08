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

  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const userId = req.query.userId || req.url.split('/')[3];
    const { role } = req.body;
    
    if (!role || !['broadcaster', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "broadcaster" or "viewer"',
        timestamp: new Date().toISOString()
      });
    }
    
    const user = userRoles.get(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User ${userId} not found`,
        timestamp: new Date().toISOString()
      });
    }
    
    const oldRole = user.role;
    user.role = role;
    user.updatedAt = new Date().toISOString();
    
    res.status(200).json({
      success: true,
      message: `User ${userId} role changed from ${oldRole} to ${role}`,
      user: {
        userId: userId,
        ...user
      },
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

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

  try {
    const userId = req.query.userId || req.url.split('/').pop();
    const user = userRoles.get(userId);
    
    if (req.method === 'GET') {
      if (user) {
        res.status(200).json({
          success: true,
          user: {
            userId: userId,
            ...user
          },
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: `User ${userId} not found`,
          timestamp: new Date().toISOString()
        });
      }
    } else if (req.method === 'DELETE') {
      if (!user) {
        return res.status(404).json({
          success: false,
          message: `User ${userId} not found`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Remove from user roles
      userRoles.delete(userId);
      
      res.status(200).json({
        success: true,
        message: `User ${userId} removed successfully`,
        removedUser: {
          userId: userId,
          ...user
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(405).json({
        success: false,
        message: 'Method not allowed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

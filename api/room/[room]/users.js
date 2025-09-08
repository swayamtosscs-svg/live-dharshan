// In-memory storage for demo purposes
let userRoles = new Map();
let roomUsers = new Map();

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
    const room = req.query.room || req.url.split('/')[3];
    const roomUserSet = roomUsers.get(room);
    
    if (roomUserSet) {
      const users = Array.from(roomUserSet).map(userId => {
        const user = userRoles.get(userId);
        return {
          userId: userId,
          ...user
        };
      });
      
      res.status(200).json({
        success: true,
        room: room,
        users: users,
        totalUsers: users.length,
        broadcasters: users.filter(u => u.role === 'broadcaster').length,
        viewers: users.filter(u => u.role === 'viewer').length,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Room ${room} not found`,
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

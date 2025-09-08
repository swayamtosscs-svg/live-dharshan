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

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { userId, role, room = 'default' } = req.body;
    
    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'userId and role are required',
        timestamp: new Date().toISOString()
      });
    }
    
    if (!['broadcaster', 'viewer'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "broadcaster" or "viewer"',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check if user already exists
    const existingUser = userRoles.get(userId);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: `User ${userId} already exists with role ${existingUser.role} in room ${existingUser.room}`,
        existingUser: existingUser,
        timestamp: new Date().toISOString()
      });
    }
    
    // Assign role
    userRoles.set(userId, {
      role: role,
      room: room,
      socketId: null, // Will be set when user connects
      joinedAt: new Date().toISOString()
    });
    
    res.status(200).json({
      success: true,
      message: `Role ${role} assigned to user ${userId} for room ${room}`,
      user: {
        userId: userId,
        role: role,
        room: room,
        assignedAt: new Date().toISOString()
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

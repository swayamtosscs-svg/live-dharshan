// In-memory storage for demo purposes
let streamStatus = new Map();

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
    const { room = 'default' } = req.body;
    
    if (!streamStatus.has(room)) {
      streamStatus.set(room, { isActive: false, broadcasterCount: 0, viewerCount: 0 });
    }
    
    const status = streamStatus.get(room);
    status.isActive = true;
    
    res.status(200).json({
      success: true,
      message: `Live stream started for room: ${room}`,
      room: room,
      status: status,
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

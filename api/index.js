export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  res.status(200).json({
    success: true,
    message: 'Live Darshan API is running',
    timestamp: new Date().toISOString(),
    availableEndpoints: [
      'GET /api/health',
      'GET /api/status',
      'GET /api/rooms',
      'POST /api/start-live',
      'POST /api/stop-live',
      'GET /api/live/[room]',
      'POST /api/assign-role',
      'GET /api/users',
      'GET /api/user/[userId]',
      'PUT /api/user/[userId]/role',
      'DELETE /api/user/[userId]',
      'GET /api/room/[room]/users'
    ]
  });
}

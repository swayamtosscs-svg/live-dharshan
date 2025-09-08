const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const { Server } = require("socket.io");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });
const io = new Server(server);

const rooms = new Map();
const streamStatus = new Map(); // Track stream status for each room
const userRoles = new Map(); // Track user roles: { userId: { role, room, socketId, joinedAt } }
const roomUsers = new Map(); // Track users in each room: { roomId: Set of userIds }

function send(ws, data) {
  try { ws.send(JSON.stringify(data)); } catch(e) {}
}

wss.on('connection', ws => {
  ws.room = null;
  ws.role = "viewer";
  ws.id = Math.random().toString(36).substr(2,9); // unique id for each socket
  ws.userId = null; // Will be set when user joins

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    if(data.type === "join"){
      ws.room = data.room || "default";
      ws.role = data.role || "viewer";
      ws.userId = data.userId || Math.random().toString(36).substr(2,9); // Generate userId if not provided

      if(!rooms.has(ws.room)) {
        rooms.set(ws.room, new Set());
        streamStatus.set(ws.room, { isActive: false, broadcasterCount: 0, viewerCount: 0 });
        roomUsers.set(ws.room, new Set());
      }
      rooms.get(ws.room).add(ws);

      // Track user role and room
      userRoles.set(ws.userId, {
        role: ws.role,
        room: ws.room,
        socketId: ws.id,
        joinedAt: new Date().toISOString()
      });
      roomUsers.get(ws.room).add(ws.userId);

      // Update stream status
      const status = streamStatus.get(ws.room);
      if(ws.role === "broadcaster") {
        status.broadcasterCount++;
        status.isActive = true;
      } else {
        status.viewerCount++;
      }

      // Send role confirmation back to client
      send(ws, { 
        type: "role-confirmed", 
        userId: ws.userId, 
        role: ws.role, 
        room: ws.room 
      });

      // notify broadcaster when a new viewer arrives
      if(ws.role === "viewer"){
        const set = rooms.get(ws.room);
        set.forEach(client=>{
          if(client.role === "broadcaster"){
            send(client,{ type:"new-peer", id:ws.id, userId: ws.userId });
          }
        });
      }
      return;
    }

    // Forward all other signals (offer/answer/ice)
    if(ws.room){
      const set = rooms.get(ws.room) || new Set();
      set.forEach(client=>{
        if(client !== ws && client.readyState === WebSocket.OPEN){
          send(client,{ ...data, from: ws.id });
        }
      });
    }
  });

  ws.on('close', ()=>{
    if(ws.room && ws.userId){
      const set = rooms.get(ws.room);
      if(set){ 
        set.delete(ws);
        
        // Remove user from tracking
        userRoles.delete(ws.userId);
        const roomUserSet = roomUsers.get(ws.room);
        if(roomUserSet) {
          roomUserSet.delete(ws.userId);
        }
        
        // Update stream status
        const status = streamStatus.get(ws.room);
        if(status) {
          if(ws.role === "broadcaster") {
            status.broadcasterCount = Math.max(0, status.broadcasterCount - 1);
            if(status.broadcasterCount === 0) {
              status.isActive = false;
            }
          } else {
            status.viewerCount = Math.max(0, status.viewerCount - 1);
          }
        }
      }
    }
  });
});

// Socket.IO connection for chat
io.on("connection", (socket) => {
  console.log("Chat user connected");

  // Listen for chat messages
  socket.on("chatMessage", (msg) => {
    // send message to all clients
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("Chat user disconnected");
  });
});

// API Routes for Live Streaming Control
app.get('/api/status', (req, res) => {
  const room = req.query.room || 'default';
  const status = streamStatus.get(room) || { isActive: false, broadcasterCount: 0, viewerCount: 0 };
  res.json({
    success: true,
    room: room,
    status: status,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/rooms', (req, res) => {
  const allRooms = Array.from(streamStatus.entries()).map(([room, status]) => ({
    room,
    ...status
  }));
  res.json({
    success: true,
    rooms: allRooms,
    totalRooms: allRooms.length,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/start-live', (req, res) => {
  const { room = 'default' } = req.body;
  
  if (!streamStatus.has(room)) {
    streamStatus.set(room, { isActive: false, broadcasterCount: 0, viewerCount: 0 });
  }
  
  const status = streamStatus.get(room);
  status.isActive = true;
  
  res.json({
    success: true,
    message: `Live stream started for room: ${room}`,
    room: room,
    status: status,
    timestamp: new Date().toISOString()
  });
});

app.post('/api/stop-live', (req, res) => {
  const { room = 'default' } = req.body;
  
  if (streamStatus.has(room)) {
    const status = streamStatus.get(room);
    status.isActive = false;
    
    res.json({
      success: true,
      message: `Live stream stopped for room: ${room}`,
      room: room,
      status: status,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Room ${room} not found`,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/live/:room', (req, res) => {
  const room = req.params.room;
  const status = streamStatus.get(room);
  
  if (status) {
    res.json({
      success: true,
      room: room,
      isLive: status.isActive,
      broadcasterCount: status.broadcasterCount,
      viewerCount: status.viewerCount,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      success: false,
      message: `Room ${room} not found`,
      timestamp: new Date().toISOString()
    });
  }
});

// Role Management API Endpoints
app.post('/api/assign-role', (req, res) => {
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
  
  res.json({
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
});

app.get('/api/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = userRoles.get(userId);
  
  if (user) {
    res.json({
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
});

app.get('/api/room/:room/users', (req, res) => {
  const room = req.params.room;
  const roomUserSet = roomUsers.get(room);
  
  if (roomUserSet) {
    const users = Array.from(roomUserSet).map(userId => {
      const user = userRoles.get(userId);
      return {
        userId: userId,
        ...user
      };
    });
    
    res.json({
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
});

app.put('/api/user/:userId/role', (req, res) => {
  const userId = req.params.userId;
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
  
  res.json({
    success: true,
    message: `User ${userId} role changed from ${oldRole} to ${role}`,
    user: {
      userId: userId,
      ...user
    },
    timestamp: new Date().toISOString()
  });
});

app.delete('/api/user/:userId', (req, res) => {
  const userId = req.params.userId;
  const user = userRoles.get(userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: `User ${userId} not found`,
      timestamp: new Date().toISOString()
    });
  }
  
  // Remove from room users
  const roomUserSet = roomUsers.get(user.room);
  if (roomUserSet) {
    roomUserSet.delete(userId);
  }
  
  // Remove from user roles
  userRoles.delete(userId);
  
  res.json({
    success: true,
    message: `User ${userId} removed successfully`,
    removedUser: {
      userId: userId,
      ...user
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (req, res) => {
  const allUsers = Array.from(userRoles.entries()).map(([userId, userData]) => ({
    userId: userId,
    ...userData
  }));
  
  res.json({
    success: true,
    users: allUsers,
    totalUsers: allUsers.length,
    broadcasters: allUsers.filter(u => u.role === 'broadcaster').length,
    viewers: allUsers.filter(u => u.role === 'viewer').length,
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Live streaming server is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

server.listen(8443, ()=>console.log('HTTPS WebRTC server with chat and API listening on port 8443'));

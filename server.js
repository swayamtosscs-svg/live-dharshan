const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const WebSocket = require('ws');
const { Server } = require("socket.io");

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

const options = {
  key: fs.readFileSync(path.join(__dirname, 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
};

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server });
const io = new Server(server);

const rooms = new Map();

function send(ws, data) {
  try { ws.send(JSON.stringify(data)); } catch(e) {}
}

wss.on('connection', ws => {
  ws.room = null;
  ws.role = "viewer";
  ws.id = Math.random().toString(36).substr(2,9); // unique id for each socket

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch(e){ return; }

    if(data.type === "join"){
      ws.room = data.room || "default";
      ws.role = data.role || "viewer";

      if(!rooms.has(ws.room)) rooms.set(ws.room,new Set());
      rooms.get(ws.room).add(ws);

      // notify broadcaster when a new viewer arrives
      if(ws.role === "viewer"){
        const set = rooms.get(ws.room);
        set.forEach(client=>{
          if(client.role === "broadcaster"){
            send(client,{ type:"new-peer", id:ws.id });
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
    if(ws.room){
      const set = rooms.get(ws.room);
      if(set){ set.delete(ws); }
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

server.listen(8443, ()=>console.log('HTTPS WebRTC server with chat listening on port 8443'));

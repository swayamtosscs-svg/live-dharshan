const localVideo = document.getElementById('localVideo');
const remoteContainer = document.getElementById('remoteContainer'); // multiple remote videos
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');
const roleSelect = document.getElementById('role'); // broadcaster or viewer
const statusSpan = document.getElementById('status');
const liveIndicator = document.getElementById('liveIndicator');

// Chat elements
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

// Zoom elements
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const refreshBtn = document.getElementById('refreshBtn');

// Stream status elements
const streamEnded = document.getElementById('streamEnded');

let ws = null;
let peers = {};   // key: socketId, value: RTCPeerConnection
let localStream = null;
let role = "viewer";
let userId = null; // User ID assigned by server
let socket = null; // Socket.IO connection for chat
let currentZoom = 1; // Zoom level for video
let isStreamActive = false;
let connectionCheckInterval = null;

const config = {
  iceServers:[
    { urls:'stun:stun.l.google.com:19302' }
  ]
};

function log(msg){ console.log(msg); statusSpan.textContent = msg; }

async function startLocalCamera(){
  localStream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
  localVideo.srcObject = localStream;
  localVideo.classList.remove('hidden');
  liveIndicator.classList.remove('hidden');
}

function createPeer(id, isInitiator){
  const pc = new RTCPeerConnection(config);

  if(role === "broadcaster" && localStream){
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
  }

  pc.ontrack = e => {
    let vid = document.getElementById("remote-"+id);
    if(!vid){
      vid = document.createElement("video");
      vid.id = "remote-"+id;
      vid.autoplay = true;
      vid.playsInline = true;
      remoteContainer.appendChild(vid);
    }
    vid.srcObject = e.streams[0];
    remoteContainer.classList.remove('hidden');
    liveIndicator.classList.remove('hidden');
    streamEnded.classList.add('hidden');
    isStreamActive = true;
    
    // Monitor connection state
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        handleStreamEnd();
      }
    };
  };

  pc.onicecandidate = e => {
    if(e.candidate) sendSignal({ type:"ice-candidate", target:id, candidate:e.candidate });
  };

  if(isInitiator){
    pc.onnegotiationneeded = async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type:"offer", target:id, sdp:pc.localDescription });
    };
  }

  return pc;
}

function sendSignal(obj){
  if(ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
}

function setupWebSocket(room){
  const protocol = location.protocol === "https:" ? "wss" : "ws";
  ws = new WebSocket(`${protocol}://${location.host}`);

  ws.onopen = ()=>{
    log("WebSocket connected. Joining "+room+" as "+role);
    ws.send(JSON.stringify({ type:"join", room, role }));
    isStreamActive = true;
    startConnectionMonitoring();
  };

  ws.onmessage = async evt => {
    const msg = JSON.parse(evt.data);

    if(msg.type === "role-confirmed"){
      // Server confirmed our role assignment
      userId = msg.userId;
      role = msg.role;
      log(`Role confirmed: ${role} (User ID: ${userId})`);
      
      // Update UI to show current role
      updateRoleDisplay();
    }
    else if(msg.type === "new-peer" && role === "broadcaster"){
      // Broadcaster creates a new peer connection for each viewer
      const id = msg.id;
      peers[id] = createPeer(id, true);
      log(`New viewer joined: ${msg.userId || id}`);
    }
    else if(msg.type === "offer" && role === "viewer"){
      const pc = createPeer(msg.from, false);
      peers[msg.from] = pc;
      await pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ type:"answer", target:msg.from, sdp:pc.localDescription });
    }
    else if(msg.type === "answer" && role === "broadcaster"){
      await peers[msg.from].setRemoteDescription(new RTCSessionDescription(msg.sdp));
    }
    else if(msg.type === "ice-candidate"){
      const pc = peers[msg.from];
      if(pc) await pc.addIceCandidate(new RTCIceCandidate(msg.candidate));
    }
  };

  ws.onclose = () => {
    log("WebSocket connection lost");
    handleStreamEnd();
  };

  ws.onerror = () => {
    log("WebSocket error");
    handleStreamEnd();
  };
}

joinBtn.onclick = async ()=>{
  role = roleSelect.value;
  joinBtn.disabled = true;
  const room = roomInput.value || "default";

  // Reset display states
  localVideo.classList.add('hidden');
  remoteContainer.classList.add('hidden');
  liveIndicator.classList.add('hidden');
  document.body.classList.remove('broadcaster-mode', 'viewer-mode');

  if(role === "broadcaster"){
    try{ 
      await startLocalCamera(); 
      document.body.classList.add('broadcaster-mode');
    } 
    catch(e){ log("Camera error: "+e.message); return; }
  } else {
    document.body.classList.add('viewer-mode');
  }

  setupWebSocket(room);
  setupChat();
};

// Function to update role display in UI
function updateRoleDisplay() {
  const statusElement = document.getElementById('status');
  if (statusElement && userId) {
    statusElement.textContent = `Connected as ${role} (ID: ${userId})`;
  }
}

// Chat functionality
function setupChat() {
  // Initialize Socket.IO connection
  socket = io();
  
  // Listen for chat messages
  socket.on('chatMessage', (msg) => {
    addChatMessage(msg);
  });
  
  // Send message
  chatSend.addEventListener('click', () => {
    sendChatMessage();
  });
  
  // Send message on Enter key
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  });
}

function addChatMessage(message) {
  const messageDiv = document.createElement('div');
  messageDiv.className = 'chat-message';
  messageDiv.textContent = message;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage() {
  const message = chatInput.value.trim();
  if (message !== '') {
    socket.emit('chatMessage', message);
    chatInput.value = '';
  }
}

// Zoom functionality
let isFullscreen = false;

zoomIn.addEventListener('click', () => {
  if (!isFullscreen) {
    enterFullscreen();
  } else {
    exitFullscreen();
  }
});

zoomOut.addEventListener('click', () => {
  if (isFullscreen) {
    exitFullscreen();
  }
});

function enterFullscreen() {
  const videoContainer = document.querySelector('.video-container');
  
  // Make video cover the whole screen
  videoContainer.style.position = 'fixed';
  videoContainer.style.top = '0';
  videoContainer.style.left = '0';
  videoContainer.style.width = '100vw';
  videoContainer.style.height = '100vh';
  videoContainer.style.zIndex = '1000';
  videoContainer.style.background = '#000';
  videoContainer.style.borderRadius = '0';
  
  // Hide other elements
  document.querySelector('.header').style.display = 'none';
  document.querySelector('.chat-section').style.display = 'none';
  document.querySelector('.video-controls').style.display = 'none';
  
  // Update button text
  zoomIn.textContent = '🔍 Exit Fullscreen';
  isFullscreen = true;
}

function exitFullscreen() {
  const videoContainer = document.querySelector('.video-container');
  
  // Return to normal size
  videoContainer.style.position = 'relative';
  videoContainer.style.top = 'auto';
  videoContainer.style.left = 'auto';
  videoContainer.style.width = 'auto';
  videoContainer.style.height = 'auto';
  videoContainer.style.zIndex = 'auto';
  videoContainer.style.background = '#000';
  videoContainer.style.borderRadius = '8px';
  
  // Show other elements
  document.querySelector('.header').style.display = 'flex';
  document.querySelector('.chat-section').style.display = 'flex';
  document.querySelector('.video-controls').style.display = 'flex';
  
  // Update button text
  zoomIn.textContent = '🔍+';
  isFullscreen = false;
}

// Add keyboard support for fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isFullscreen) {
    exitFullscreen();
  }
});

// Stream end handling
function handleStreamEnd() {
  isStreamActive = false;
  liveIndicator.classList.add('hidden');
  streamEnded.classList.remove('hidden');
  
  // Clear all video streams
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.srcObject = null;
  });
  
  // Clear remote container
  remoteContainer.innerHTML = '';
  remoteContainer.classList.add('hidden');
  
  // Stop connection monitoring
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  // Close all peer connections
  Object.values(peers).forEach(pc => pc.close());
  peers = {};
  
  log("Stream ended - connection lost");
}

// Connection monitoring
function startConnectionMonitoring() {
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
  }
  
  connectionCheckInterval = setInterval(() => {
    if (ws && ws.readyState !== WebSocket.OPEN) {
      handleStreamEnd();
    }
  }, 5000); // Check every 5 seconds
}

// Refresh functionality
refreshBtn.addEventListener('click', () => {
  // Reset all states
  isStreamActive = false;
  liveIndicator.classList.add('hidden');
  streamEnded.classList.add('hidden');
  
  // Clear videos
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    video.srcObject = null;
  });
  
  // Clear containers
  remoteContainer.innerHTML = '';
  localVideo.classList.add('hidden');
  remoteContainer.classList.add('hidden');
  
  // Close connections
  if (ws) {
    ws.close();
  }
  Object.values(peers).forEach(pc => pc.close());
  peers = {};
  
  // Reset UI
  document.body.classList.remove('broadcaster-mode', 'viewer-mode');
  joinBtn.disabled = false;
  joinBtn.textContent = 'Join Stream';
  
  // Stop monitoring
  if (connectionCheckInterval) {
    clearInterval(connectionCheckInterval);
    connectionCheckInterval = null;
  }
  
  log("Refreshed - ready to reconnect");
});

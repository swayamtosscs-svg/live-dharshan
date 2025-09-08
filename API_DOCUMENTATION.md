# Live Streaming API Documentation

This API provides simple endpoints to control and monitor your live streaming application without changing any existing code.

## Base URL
```
https://localhost:8443/api
```

## Available Endpoints

### 1. Health Check
**GET** `/api/health`

Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Live streaming server is running",
  "uptime": 123.45,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Get Stream Status
**GET** `/api/status?room=ROOM_NAME`

Get the current status of a specific room.

**Parameters:**
- `room` (optional): Room name (default: "default")

**Response:**
```json
{
  "success": true,
  "room": "demo",
  "status": {
    "isActive": true,
    "broadcasterCount": 1,
    "viewerCount": 5
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Get All Rooms
**GET** `/api/rooms`

Get status of all active rooms.

**Response:**
```json
{
  "success": true,
  "rooms": [
    {
      "room": "demo",
      "isActive": true,
      "broadcasterCount": 1,
      "viewerCount": 5
    }
  ],
  "totalRooms": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. Start Live Stream
**POST** `/api/start-live`

Start a live stream for a specific room.

**Request Body:**
```json
{
  "room": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Live stream started for room: demo",
  "room": "demo",
  "status": {
    "isActive": true,
    "broadcasterCount": 0,
    "viewerCount": 0
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 5. Stop Live Stream
**POST** `/api/stop-live`

Stop a live stream for a specific room.

**Request Body:**
```json
{
  "room": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Live stream stopped for room: demo",
  "room": "demo",
  "status": {
    "isActive": false,
    "broadcasterCount": 0,
    "viewerCount": 0
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 6. Get Live Status for Specific Room
**GET** `/api/live/:room`

Get detailed live status for a specific room.

**Parameters:**
- `room`: Room name in URL path

**Response:**
```json
{
  "success": true,
  "room": "demo",
  "isLive": true,
  "broadcasterCount": 1,
  "viewerCount": 5,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Usage Examples

### Using cURL

1. **Check server health:**
```bash
curl -k https://localhost:8443/api/health
```

2. **Get status of default room:**
```bash
curl -k https://localhost:8443/api/status
```

3. **Get status of specific room:**
```bash
curl -k https://localhost:8443/api/status?room=demo
```

4. **Start live stream:**
```bash
curl -k -X POST https://localhost:8443/api/start-live \
  -H "Content-Type: application/json" \
  -d '{"room": "demo"}'
```

5. **Stop live stream:**
```bash
curl -k -X POST https://localhost:8443/api/stop-live \
  -H "Content-Type: application/json" \
  -d '{"room": "demo"}'
```

6. **Get live status:**
```bash
curl -k https://localhost:8443/api/live/demo
```

### Using JavaScript/Fetch

```javascript
// Check health
fetch('https://localhost:8443/api/health')
  .then(response => response.json())
  .then(data => console.log(data));

// Start live stream
fetch('https://localhost:8443/api/start-live', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ room: 'demo' })
})
.then(response => response.json())
.then(data => console.log(data));

// Get status
fetch('https://localhost:8443/api/status?room=demo')
  .then(response => response.json())
  .then(data => console.log(data));
```

### Using Python

```python
import requests
import json

# Check health
response = requests.get('https://localhost:8443/api/health', verify=False)
print(response.json())

# Start live stream
response = requests.post('https://localhost:8443/api/start-live', 
                        json={'room': 'demo'}, 
                        verify=False)
print(response.json())

# Get status
response = requests.get('https://localhost:8443/api/status?room=demo', verify=False)
print(response.json())
```

## Notes

- All endpoints return JSON responses
- The API uses HTTPS on port 8443
- Use `-k` flag with cURL or `verify=False` with Python requests to ignore SSL certificate warnings
- The API tracks real-time status of rooms, broadcasters, and viewers
- No existing code was modified - this is a pure addition to your existing system

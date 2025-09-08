# Role Management API Documentation

This document explains how users and broadcasters know their roles and how they can be managed through the API in your live streaming application.

## How Roles Work

### 1. **Role Assignment Process**

**Current System:**
- Users select their role (broadcaster/viewer) in the UI dropdown
- When they join, the server assigns them a unique User ID
- The server confirms their role assignment via WebSocket
- The UI displays their confirmed role and User ID

**API-Enhanced System:**
- Roles can be pre-assigned via API before users connect
- Users can be assigned roles programmatically
- Role changes can be made dynamically
- Full user tracking and management

### 2. **How Users Know Their Role**

**In the UI:**
1. **Role Selection:** Users choose "Broadcaster" or "Viewer" from the dropdown
2. **Role Confirmation:** When they join, the server sends a `role-confirmed` message
3. **UI Display:** The status bar shows: `"Connected as [role] (ID: [userId])"`
4. **Visual Indicators:** Different UI modes for broadcaster vs viewer

**Via API:**
- Check user role: `GET /api/user/:userId`
- Check room users: `GET /api/room/:room/users`
- Get all users: `GET /api/users`

## Role Management API Endpoints

### 1. Assign Role to User
**POST** `/api/assign-role`

Assign a role to a user before they connect.

**Request Body:**
```json
{
  "userId": "user123",
  "role": "broadcaster",
  "room": "demo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Role broadcaster assigned to user user123 for room demo",
  "user": {
    "userId": "user123",
    "role": "broadcaster",
    "room": "demo",
    "assignedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Get User Information
**GET** `/api/user/:userId`

Get detailed information about a specific user.

**Response:**
```json
{
  "success": true,
  "user": {
    "userId": "user123",
    "role": "broadcaster",
    "room": "demo",
    "socketId": "abc123def",
    "joinedAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:05:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Get All Users in a Room
**GET** `/api/room/:room/users`

Get all users currently in a specific room.

**Response:**
```json
{
  "success": true,
  "room": "demo",
  "users": [
    {
      "userId": "user123",
      "role": "broadcaster",
      "room": "demo",
      "socketId": "abc123def",
      "joinedAt": "2024-01-01T12:00:00.000Z"
    },
    {
      "userId": "user456",
      "role": "viewer",
      "room": "demo",
      "socketId": "def456ghi",
      "joinedAt": "2024-01-01T12:01:00.000Z"
    }
  ],
  "totalUsers": 2,
  "broadcasters": 1,
  "viewers": 1,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. Change User Role
**PUT** `/api/user/:userId/role`

Change a user's role dynamically.

**Request Body:**
```json
{
  "role": "viewer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User user123 role changed from broadcaster to viewer",
  "user": {
    "userId": "user123",
    "role": "viewer",
    "room": "demo",
    "socketId": "abc123def",
    "joinedAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:05:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 5. Remove User
**DELETE** `/api/user/:userId`

Remove a user from the system.

**Response:**
```json
{
  "success": true,
  "message": "User user123 removed successfully",
  "removedUser": {
    "userId": "user123",
    "role": "broadcaster",
    "room": "demo",
    "socketId": "abc123def",
    "joinedAt": "2024-01-01T12:00:00.000Z"
  },
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 6. Get All Users
**GET** `/api/users`

Get all users across all rooms.

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "userId": "user123",
      "role": "broadcaster",
      "room": "demo",
      "socketId": "abc123def",
      "joinedAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "totalUsers": 1,
  "broadcasters": 1,
  "viewers": 0,
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Usage Examples

### Scenario 1: Pre-assign Roles Before Users Connect

```bash
# Assign broadcaster role to user123
curl -k -X POST https://localhost:8443/api/assign-role \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "role": "broadcaster", "room": "demo"}'

# Assign viewer role to user456
curl -k -X POST https://localhost:8443/api/assign-role \
  -H "Content-Type: application/json" \
  -d '{"userId": "user456", "role": "viewer", "room": "demo"}'
```

### Scenario 2: Check Who's in a Room

```bash
# Get all users in demo room
curl -k https://localhost:8443/api/room/demo/users
```

### Scenario 3: Change User Role Dynamically

```bash
# Change user123 from broadcaster to viewer
curl -k -X PUT https://localhost:8443/api/user/user123/role \
  -H "Content-Type: application/json" \
  -d '{"role": "viewer"}'
```

### Scenario 4: Monitor All Users

```bash
# Get all users across all rooms
curl -k https://localhost:8443/api/users
```

## JavaScript Integration Examples

### Check User Role Programmatically

```javascript
async function checkUserRole(userId) {
  try {
    const response = await fetch(`https://localhost:8443/api/user/${userId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`User ${userId} is a ${data.user.role} in room ${data.user.room}`);
      return data.user;
    } else {
      console.log(`User ${userId} not found`);
      return null;
    }
  } catch (error) {
    console.error('Error checking user role:', error);
  }
}

// Usage
checkUserRole('user123');
```

### Assign Role Before User Connects

```javascript
async function assignUserRole(userId, role, room = 'default') {
  try {
    const response = await fetch('https://localhost:8443/api/assign-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, role, room })
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`Role ${role} assigned to user ${userId}`);
      return data.user;
    } else {
      console.error('Failed to assign role:', data.message);
      return null;
    }
  } catch (error) {
    console.error('Error assigning role:', error);
  }
}

// Usage
assignUserRole('user123', 'broadcaster', 'demo');
```

### Monitor Room Users

```javascript
async function getRoomUsers(room) {
  try {
    const response = await fetch(`https://localhost:8443/api/room/${room}/users`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`Room ${room} has ${data.totalUsers} users:`);
      console.log(`- ${data.broadcasters} broadcasters`);
      console.log(`- ${data.viewers} viewers`);
      return data.users;
    } else {
      console.log(`Room ${room} not found`);
      return [];
    }
  } catch (error) {
    console.error('Error getting room users:', error);
  }
}

// Usage
getRoomUsers('demo');
```

## Role-Based Features

### 1. **Broadcaster Features**
- Can start camera and stream
- Receives notifications when viewers join
- Can see all connected viewers
- Has access to broadcaster UI controls

### 2. **Viewer Features**
- Can watch live streams
- Can participate in chat
- Cannot start their own stream
- Has access to viewer UI controls

### 3. **Role Validation**
- Server validates roles before allowing actions
- Prevents unauthorized role changes
- Tracks role changes with timestamps
- Maintains role history

## Security Considerations

1. **Role Validation:** All role changes are validated server-side
2. **User Tracking:** Each user has a unique ID and is tracked
3. **Room Isolation:** Users are isolated by rooms
4. **Permission Checks:** Actions are checked against user roles
5. **Audit Trail:** All role changes are logged with timestamps

## Integration with Existing System

- **No Breaking Changes:** All existing functionality remains unchanged
- **Backward Compatible:** UI role selection still works
- **Enhanced Tracking:** Additional user and role tracking
- **API Control:** Full programmatic control over roles
- **Real-time Updates:** Role changes are reflected immediately

This system provides complete control over user roles while maintaining the simplicity of the original interface.

// server.js - Run with: node server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Track connected users
let users = {};
let userCount = 0;

// Serve static files and HTML
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.send(getHTML());
});

// Socket.io connection handling
io.on('connection', (socket) => {
    userCount++;
    const userId = socket.id;
    users[userId] = {
        id: userId,
        socket: socket,
        username: `User${userCount}`
    };

    console.log(`✅ User connected: ${userId} (Total: ${Object.keys(users).length})`);

    // Notify all users about connection status
    io.emit('user-count', Object.keys(users).length);

    // Send connection list to all users
    io.emit('update-users', {
        count: Object.keys(users).length,
        users: Object.values(users).map(u => ({ id: u.id, username: u.username }))
    });

    // Handle incoming messages
    socket.on('send-message', (data) => {
        const message = {
            sender: userId,
            username: users[userId].username,
            text: data.text,
            timestamp: new Date().toLocaleTimeString(),
            type: 'text'
        };
        
        console.log(`📨 Message from ${users[userId].username}: ${data.text}`);
        
        // Broadcast to all OTHER users
        socket.broadcast.emit('receive-message', message);
    });

    // Handle video sending
    socket.on('send-video', (data) => {
        const message = {
            sender: userId,
            username: users[userId].username,
            video: data.video,
            timestamp: new Date().toLocaleTimeString(),
            type: 'video'
        };
        
        console.log(`🎥 Video from ${users[userId].username}`);
        
        socket.broadcast.emit('receive-message', message);
    });

    // Handle username change
    socket.on('set-username', (username) => {
        users[userId].username = username;
        io.emit('update-users', {
            count: Object.keys(users).length,
            users: Object.values(users).map(u => ({ id: u.id, username: u.username }))
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        delete users[userId];
        console.log(`❌ User disconnected: ${userId} (Total: ${Object.keys(users).length})`);
        
        io.emit('user-count', Object.keys(users).length);
        io.emit('update-users', {
            count: Object.keys(users).length,
            users: Object.values(users).map(u => ({ id: u.id, username: u.username }))
        });
    });
});

function getHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Real-Time Messaging App</title>
    <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            background-color: #000;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .container {
            width: 100%;
            max-width: 600px;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: #0a0a0a;
            border: 2px solid #00ff00;
        }

        .header {
            background-color: #1a1a1a;
            padding: 20px;
            border-bottom: 2px solid #00ff00;
            text-align: center;
        }

        .header h1 {
            color: #00ff00;
            margin-bottom: 10px;
        }

        .status {
            font-size: 12px;
            color: #00aa00;
        }

        .status.online {
            color: #00ff00;
        }

        .status.offline {
            color: #ff0000;
        }

        .user-list {
            background-color: #1a1a1a;
            padding: 10px 20px;
            border-bottom: 1px solid #00ff00;
            font-size: 12px;
            color: #00aa00;
            max-height: 80px;
            overflow-y: auto;
        }

        .user-item {
            display: inline-block;
            background-color: #0a0a0a;
            padding: 5px 10px;
            margin: 3px;
            border: 1px solid #00ff00;
            border-radius: 3px;
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .no-connections {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100%;
            color: #ff0000;
            font-size: 18px;
            font-weight: bold;
            text-align: center;
            flex-direction: column;
        }

        .message {
            display: flex;
            margin-bottom: 10px;
            animation: slideIn 0.3s ease-in;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message.sent {
            justify-content: flex-end;
        }

        .message.received {
            justify-content: flex-start;
        }

        .bubble {
            max-width: 70%;
            padding: 12px 16px;
            border-radius: 10px;
            word-wrap: break-word;
            font-size: 14px;
        }

        .sent .bubble {
            background-color: #00ff00;
            color: #000;
            border: 1px solid #00cc00;
        }

        .received .bubble {
            background-color: #1a4d1a;
            color: #00ff00;
            border: 1px solid #00ff00;
        }

        .username {
            font-size: 11px;
            margin-bottom: 4px;
            opacity: 0.7;
        }

        .video-container {
            max-width: 70%;
            margin-bottom: 10px;
            border: 2px solid #00ff00;
            border-radius: 10px;
            overflow: hidden;
        }

        .video-container video {
            width: 100%;
            height: auto;
            display: block;
        }

        .timestamp {
            font-size: 11px;
            margin-top: 4px;
            opacity: 0.7;
        }

        .input-area {
            background-color: #1a1a1a;
            border-top: 2px solid #00ff00;
            padding: 15px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        input[type="text"],
        input[type="file"] {
            flex: 1;
            min-width: 150px;
            padding: 10px;
            background-color: #0a0a0a;
            color: #00ff00;
            border: 1px solid #00ff00;
            border-radius: 5px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }

        input[type="text"]::placeholder {
            color: #00aa00;
        }

        input[type="text"]:focus,
        input[type="file"]:focus {
            outline: none;
            box-shadow: 0 0 10px #00ff00;
        }

        button {
            padding: 10px 20px;
            background-color: #00ff00;
            color: #000;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            transition: all 0.3s;
        }

        button:hover {
            background-color: #00cc00;
            box-shadow: 0 0 10px #00ff00;
        }

        button:active {
            transform: scale(0.95);
        }

        .button-group {
            display: flex;
            gap: 10px;
            width: 100%;
        }

        .button-group button {
            flex: 1;
        }

        .info-text {
            color: #00aa00;
            font-size: 12px;
            text-align: center;
            padding: 10px;
            background-color: #0a0a0a;
            border-top: 1px dashed #00ff00;
        }

        .chat-container::-webkit-scrollbar {
            width: 8px;
        }

        .chat-container::-webkit-scrollbar-track {
            background: #0a0a0a;
        }

        .chat-container::-webkit-scrollbar-thumb {
            background: #00ff00;
            border-radius: 4px;
        }

        .chat-container::-webkit-scrollbar-thumb:hover {
            background: #00cc00;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>💬 MESSAGING SYSTEM</h1>
        <div class="status" id="status">Connecting...</div>
    </div>

    <div class="user-list" id="userList"></div>

    <div class="chat-container" id="chatContainer">
        <div class="no-connections" id="noConnections">
            ⚠️ [no other connections]
        </div>
    </div>

    <div class="info-text">
        📝 Type messages or 🎥 send videos
    </div>

    <div class="input-area">
        <input 
            type="text" 
            id="messageInput" 
            placeholder="Type your message..."
            onkeypress="if(event.key==='Enter') sendMessage();"
            disabled
        />
        <button onclick="sendMessage()" id="sendBtn" disabled>Send</button>
        <input 
            type="file" 
            id="videoInput" 
            accept="video/*"
            style="display: none;"
        />
        <button onclick="document.getElementById('videoInput').click()" id="videoBtn" disabled>🎥 Video</button>
    </div>
</div>

<script>
    const socket = io();
    const chatContainer = document.getElementById('chatContainer');
    const messageInput = document.getElementById('messageInput');
    const videoInput = document.getElementById('videoInput');
    const statusDiv = document.getElementById('status');
    const userListDiv = document.getElementById('userList');
    const noConnectionsDiv = document.getElementById('noConnections');
    const sendBtn = document.getElementById('sendBtn');
    const videoBtn = document.getElementById('videoBtn');

    let isConnected = false;
    let otherUsersOnline = 0;

    // Socket events
    socket.on('connect', () => {
        console.log('Connected to server');
        isConnected = true;
        statusDiv.textContent = '✅ Connected';
        statusDiv.classList.add('online');
    });

    socket.on('user-count', (count) => {
        otherUsersOnline = count - 1; // Exclude self
        updateConnectionStatus();
    });

    socket.on('update-users', (data) => {
        otherUsersOnline = data.count - 1;
        updateUserList(data.users);
        updateConnectionStatus();
    });

    socket.on('receive-message', (message) => {
        displayReceivedMessage(message);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isConnected = false;
        statusDiv.textContent = '❌ Disconnected';
        statusDiv.classList.remove('online');
        statusDiv.classList.add('offline');
    });

    function updateConnectionStatus() {
        const enableInputs = otherUsersOnline > 0;
        messageInput.disabled = !enableInputs;
        sendBtn.disabled = !enableInputs;
        videoBtn.disabled = !enableInputs;

        if (otherUsersOnline > 0) {
            noConnectionsDiv.style.display = 'none';
            statusDiv.innerHTML = \`✅ Connected | \${otherUsersOnline} other user\${otherUsersOnline !== 1 ? 's' : ''} online\`;
            statusDiv.classList.add('online');
        } else {
            noConnectionsDiv.style.display = 'flex';
            statusDiv.innerHTML = '⚠️ [no other connections]';
            statusDiv.classList.remove('online');
        }
    }

    function updateUserList(users) {
        userListDiv.innerHTML = '';
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.classList.add('user-item');
            userItem.textContent = user.username;
            userListDiv.appendChild(userItem);
        });
    }

    function sendMessage() {
        const text = messageInput.value.trim();
        if (text && otherUsersOnline > 0) {
            displaySentMessage(text);
            socket.emit('send-message', { text: text });
            messageInput.value = '';
        }
    }

    function displaySentMessage(text) {
        clearNoConnections();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'sent');

        const bubble = document.createElement('div');
        bubble.classList.add('bubble');
        bubble.textContent = text;

        const timestamp = document.createElement('div');
        timestamp.classList.add('timestamp');
        timestamp.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(bubble);
        messageDiv.appendChild(timestamp);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function displayReceivedMessage(message) {
        clearNoConnections();
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'received');

        if (message.type === 'video') {
            const videoContainer = document.createElement('div');
            videoContainer.classList.add('video-container');
            const video = document.createElement('video');
            video.controls = true;
            video.src = message.video;
            videoContainer.appendChild(video);
            messageDiv.appendChild(videoContainer);
        } else {
            const username = document.createElement('div');
            username.classList.add('username');
            username.textContent = message.username;

            const bubble = document.createElement('div');
            bubble.classList.add('bubble');
            bubble.textContent = message.text;

            const timestamp = document.createElement('div');
            timestamp.classList.add('timestamp');
            timestamp.textContent = message.timestamp;

            messageDiv.appendChild(username);
            messageDiv.appendChild(bubble);
            messageDiv.appendChild(timestamp);
        }

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function clearNoConnections() {
        noConnectionsDiv.style.display = 'none';
    }

    // Handle video file selection
    videoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file && otherUsersOnline > 0) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const videoData = event.target.result;
                displaySentMessage('[Video sent]');
                socket.emit('send-video', { video: videoData });
                videoInput.value = '';
            };
            reader.readAsDataURL(file);
        }
    });
</script>

</body>
</html>
    `;
}

// Start server
server.listen(PORT, () => {
    console.log(\`🚀 Server running at http://localhost:\${PORT}\`);
});
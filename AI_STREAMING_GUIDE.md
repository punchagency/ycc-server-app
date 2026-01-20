# AI Chat Streaming & Socket.IO Integration

## Overview
Real-time AI chat with streaming responses via HTTP SSE and Socket.IO.

## Features

### 1. HTTP Streaming (SSE)
Server-Sent Events for streaming AI responses over HTTP.

**Endpoint:** `POST /api/v2/ai/chat/stream`

**Request:**
```json
{
  "message": "What services do you offer?",
  "sessionId": "optional-uuid"
}
```

**Response:** SSE stream
```
data: {"content":"I","sessionId":"uuid"}

data: {"content":" can","sessionId":"uuid"}

data: {"content":" help","sessionId":"uuid"}

data: {"done":true,"sessionId":"uuid"}
```

**Client Example:**
```javascript
const response = await fetch('/api/v2/ai/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer TOKEN' // optional
  },
  body: JSON.stringify({ message: 'Hello' })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.content) {
        console.log(data.content); // Stream content
      }
      if (data.done) {
        console.log('Stream complete');
      }
    }
  }
}
```

### 2. Socket.IO Real-Time Chat
WebSocket-based real-time streaming.

**Events:**

#### Client → Server
- `ai:chat` - Send message to AI

**Payload:**
```javascript
{
  message: "What services do you offer?",
  sessionId: "optional-uuid",
  token: "optional-jwt-token" // for authenticated users
}
```

#### Server → Client
- `ai:stream` - Streaming content chunks
- `ai:complete` - Full response when done
- `ai:error` - Error occurred

**Client Example:**
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:7000');

// Send message
socket.emit('ai:chat', {
  message: 'Hello',
  sessionId: 'my-session',
  token: 'jwt-token' // optional
});

// Receive streaming chunks
socket.on('ai:stream', (data) => {
  console.log(data.content); // "I", " can", " help"
  // Append to UI
});

// Receive complete response
socket.on('ai:complete', (data) => {
  console.log('Full response:', data.response);
  console.log('Session ID:', data.sessionId);
});

// Handle errors
socket.on('ai:error', (data) => {
  console.error('Error:', data.error);
});
```

## Architecture

```
Client
  ↓
┌─────────────────┬─────────────────┐
│   HTTP SSE      │   Socket.IO     │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
    AI Controller    AI Chat Handler
         ↓                 ↓
         └─────────┬───────┘
                   ↓
              AI Service
              (stream=true)
                   ↓
              OpenAI API
              (streaming)
                   ↓
         Chunk-by-chunk response
                   ↓
         Save to MongoDB
```

## Usage Examples

### HTTP SSE (Fetch API)
```javascript
async function streamChat(message) {
  const response = await fetch('/api/v2/ai/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.content) {
          fullResponse += data.content;
          updateUI(fullResponse); // Update UI in real-time
        }
      }
    }
  }
}
```

### Socket.IO (React Example)
```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function AIChat() {
  const [socket, setSocket] = useState(null);
  const [response, setResponse] = useState('');

  useEffect(() => {
    const newSocket = io('http://localhost:7000');
    setSocket(newSocket);

    newSocket.on('ai:stream', (data) => {
      setResponse(prev => prev + data.content);
    });

    newSocket.on('ai:complete', (data) => {
      console.log('Complete:', data.response);
    });

    return () => newSocket.close();
  }, []);

  const sendMessage = (message) => {
    setResponse('');
    socket.emit('ai:chat', { message, token: localStorage.getItem('token') });
  };

  return (
    <div>
      <div>{response}</div>
      <button onClick={() => sendMessage('Hello')}>Send</button>
    </div>
  );
}
```

### Socket.IO (Vue Example)
```javascript
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export default {
  setup() {
    const socket = ref(null);
    const response = ref('');

    onMounted(() => {
      socket.value = io('http://localhost:7000');

      socket.value.on('ai:stream', (data) => {
        response.value += data.content;
      });

      socket.value.on('ai:complete', (data) => {
        console.log('Complete:', data.response);
      });
    });

    onUnmounted(() => {
      socket.value?.close();
    });

    const sendMessage = (message) => {
      response.value = '';
      socket.value.emit('ai:chat', {
        message,
        token: localStorage.getItem('token')
      });
    };

    return { response, sendMessage };
  }
};
```

## Authentication

### HTTP SSE
Include JWT token in Authorization header:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

### Socket.IO
Include token in message payload:
```javascript
socket.emit('ai:chat', {
  message: 'Hello',
  token: 'YOUR_JWT_TOKEN'
});
```

## Rate Limiting
Same limits apply to streaming endpoints:
- Authenticated: 100 requests / 15 minutes
- Non-authenticated: 20 requests / 15 minutes

## Error Handling

### HTTP SSE
```javascript
data: {"error":"Failed to process message"}
```

### Socket.IO
```javascript
socket.on('ai:error', (data) => {
  console.error(data.error);
});
```

## Performance Considerations

### HTTP SSE
- ✅ Works with standard HTTP
- ✅ Automatic reconnection
- ⚠️ One-way communication
- ⚠️ Higher latency than WebSocket

### Socket.IO
- ✅ Full-duplex communication
- ✅ Lower latency
- ✅ Automatic reconnection
- ✅ Fallback to polling
- ⚠️ Requires WebSocket support

## Comparison

| Feature | HTTP SSE | Socket.IO |
|---------|----------|-----------|
| Protocol | HTTP | WebSocket |
| Direction | Server → Client | Bidirectional |
| Reconnection | Manual | Automatic |
| Latency | Higher | Lower |
| Browser Support | Modern browsers | All browsers |
| Use Case | Simple streaming | Real-time chat |

## Best Practices

1. **Use Socket.IO for chat interfaces** - Better UX with lower latency
2. **Use HTTP SSE for simple streaming** - Easier to implement
3. **Handle disconnections** - Implement reconnection logic
4. **Show loading states** - Indicate streaming in progress
5. **Buffer responses** - Accumulate chunks for display
6. **Clean up connections** - Close sockets when done

## Troubleshooting

### SSE not working
- Check CORS settings
- Verify Content-Type header
- Ensure no proxy buffering

### Socket.IO not connecting
- Check firewall settings
- Verify WebSocket support
- Check CORS configuration

### Slow streaming
- Check network latency
- Verify OpenAI API response time
- Monitor server load

## Testing

### Test HTTP SSE
```bash
curl -N -X POST http://localhost:7000/api/v2/ai/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello"}'
```

### Test Socket.IO
```javascript
// Node.js test
const io = require('socket.io-client');
const socket = io('http://localhost:7000');

socket.emit('ai:chat', { message: 'Hello' });
socket.on('ai:stream', console.log);
socket.on('ai:complete', console.log);
```

## Summary

- ✅ HTTP SSE endpoint: `/api/v2/ai/chat/stream`
- ✅ Socket.IO events: `ai:chat`, `ai:stream`, `ai:complete`, `ai:error`
- ✅ Streaming support in AI service
- ✅ Chat persistence for both methods
- ✅ Authentication support
- ✅ Rate limiting applied

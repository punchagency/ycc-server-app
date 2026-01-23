# Important: Streaming vs Function Calling

## Limitation

OpenAI's API **does not support function calling with streaming** simultaneously. You must choose one:

- **Regular mode** (`stream=false`): Function calling works ✅
- **Streaming mode** (`stream=true`): Function calling disabled ❌

## Implementation

### Regular Chat (with function calling)
```
POST /api/v2/ai/chat
- Function calling: ✅ Enabled
- Streaming: ❌ Disabled
- Use for: Authenticated users needing orders/bookings/products/services
```

### Streaming Chat (no function calling)
```
POST /api/v2/ai/chat/stream
Socket.IO: ai:chat
- Function calling: ❌ Disabled
- Streaming: ✅ Enabled
- Use for: General queries, better UX with real-time responses
```

## Recommendation

**For authenticated users:**
- Use regular endpoint for queries requiring data (orders, bookings, etc.)
- Use streaming for general questions

**For non-authenticated users:**
- Use streaming for better UX (no function calling needed anyway)

## Code Change

Changed line in `ai.service.ts`:
```typescript
// Before
const tools = userId ? [...] : [];

// After
const tools = userId && !stream ? [...] : [];
```

This ensures function calling is only enabled when:
1. User is authenticated (`userId` exists)
2. Streaming is disabled (`!stream`)

## Testing

### Test function calling (regular)
```bash
curl -X POST http://localhost:7000/api/v2/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message":"Show my orders"}'
```

### Test streaming (no function calling)
```bash
curl -N -X POST http://localhost:7000/api/v2/ai/chat/stream \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message":"What services do you offer?"}'
```

## Summary

✅ **Fixed**: Function calling now works in regular mode
⚠️ **Note**: Streaming mode doesn't support function calling (OpenAI limitation)
💡 **Solution**: Use appropriate endpoint based on query type

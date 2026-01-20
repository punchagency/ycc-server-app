# 🤖 AI Chat Service Integration

> AI-powered customer service agent with RAG and function calling for Yacht Crew Center

## ✨ Features

- **RAG (Retrieval Augmented Generation)** - Context-aware responses from ai-context.md
- **Function Calling** - Access to Orders, Bookings, Products, and Services
- **Chat Persistence** - 30-day conversation history in MongoDB
- **Rate Limiting** - 100/20 requests per 15 minutes (auth/non-auth)
- **Email Escalation** - Automatic support escalation when needed
- **Role-Based Access** - Secure data access based on user role
- **Session Management** - Conversation continuity across requests

## 🚀 Quick Start

### 1. Add Environment Variables
```bash
# Add to .env
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
PINECONE_API_KEY=your-pinecone-key
```

### 2. Setup Pinecone Index
```bash
npm run setup-pinecone
```

### 3. Start Server
```bash
npm run dev
```

### 4. Test API
```bash
curl -X POST http://localhost:7000/api/v2/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What services does Yacht Crew Center offer?"}'
```

## 🔄 Updating AI Context

When you modify `ai-context.md`, reindex it using one of these methods:

### Method 1: API Endpoint (Zero Downtime)
```bash
curl -X POST http://localhost:7000/api/v2/ai/reindex \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Method 2: Server Restart
```bash
npm run dev
```

See [AI_CONTEXT_UPDATE_GUIDE.md](AI_CONTEXT_UPDATE_GUIDE.md) for details.

## 📡 API Endpoint

**Endpoint:** `POST /api/v2/ai/chat`

**Request:**
```json
{
  "message": "What is the status of my last order?",
  "sessionId": "optional-uuid-for-continuity"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "Your most recent order #ORD-123 is being processed...",
    "sessionId": "uuid-here"
  },
  "authenticated": true
}
```

**Authentication:** Optional - Include `Authorization: Bearer <token>` for personalized features

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [AI_OVERVIEW.md](AI_OVERVIEW.md) | Executive summary and quick reference |
| [AI_QUICK_START.md](AI_QUICK_START.md) | Setup guide and testing examples |
| [AI_INTEGRATION_README.md](AI_INTEGRATION_README.md) | Comprehensive technical documentation |
| [AI_IMPLEMENTATION_SUMMARY.md](AI_IMPLEMENTATION_SUMMARY.md) | Implementation details and checklist |
| [AI_DEPLOYMENT_CHECKLIST.md](AI_DEPLOYMENT_CHECKLIST.md) | Pre-deployment verification |

## 🎯 Use Cases

### Non-Authenticated Users
- General inquiries about YCC services
- Information from knowledge base
- Service discovery

### Authenticated Users (Additional)
- Check order status and history
- View booking information
- Search products (role-based)
- Search services
- Personalized recommendations

## 🏗️ Architecture

```
Client → Optional Auth → Rate Limiter → AI Controller → AI Service
                                                           ↓
                                        ┌──────────────────┼──────────────────┐
                                        ↓                  ↓                  ↓
                                    Pinecone           OpenAI            MongoDB
                                    (Context)          (Chat)            (Storage)
                                                           ↓
                                                    Function Calls
                                                           ↓
                                        ┌──────────────────┼──────────────────┐
                                        ↓                  ↓                  ↓
                                    Orders            Bookings          Products/Services
```

## 🧪 Testing

### Automated Tests
```bash
./test-ai-integration.sh
```

### Manual Tests
```bash
# Non-authenticated
curl -X POST http://localhost:7000/api/v2/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Authenticated
curl -X POST http://localhost:7000/api/v2/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Show my orders"}'
```

## 📊 Rate Limits

| User Type | Limit | Window |
|-----------|-------|--------|
| Authenticated | 100 requests | 15 minutes |
| Non-authenticated | 20 requests | 15 minutes |

## 🔒 Security

- Optional authentication (supports both modes)
- Rate limiting to prevent abuse
- Role-based access control
- Input validation
- No sensitive data in logs
- JWT token validation

## 🛠️ Files Created

### Core Implementation
- `src/service/ai.service.ts` - Main AI logic
- `src/controller/ai.controller.ts` - HTTP handlers
- `src/routes/ai.route.ts` - API endpoint
- `src/dto/ai.dto.ts` - Type definitions
- `src/docs/ai.docs.ts` - Swagger docs

### Scripts & Config
- `src/scripts/setup-pinecone.ts` - Index setup
- `test-ai-integration.sh` - Test script
- `.env.ai.example` - Config template

### Documentation
- 5 comprehensive documentation files

## 🚨 Troubleshooting

**AI not responding?**
- Check OpenAI/Pinecone API keys in .env

**No context found?**
- Run `npm run setup-pinecone` to re-index

**Function calls not working?**
- Verify user is authenticated with valid JWT

**Rate limit errors?**
- Adjust limits in `src/routes/ai.route.ts`

## 📞 Support

- **Technical Issues:** Check system logs
- **User Issues:** support@yachtcrewcenter.com
- **Documentation:** See files listed above

## ✅ Status

**Ready for deployment** after environment setup

---

**Version:** 1.0.0  
**Last Updated:** 2025  
**Maintainer:** YCC Development Team

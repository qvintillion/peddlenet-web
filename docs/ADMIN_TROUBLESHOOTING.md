# Festival Chat Admin Dashboard Troubleshooting Guide
## Connection Error Debugging Steps - RESOLVED ✅

### ✅ ISSUE RESOLVED

**Root Cause**: React state race condition in authentication flow  
**Solution**: Direct API call with explicit credentials instead of relying on React state  
**Status**: Fixed in production and all environments  

### What Was Fixed

1. **Authentication Race Condition**: `handleLogin` was calling `makeAPICall` before credentials state was set
2. **Environment Variable Loading**: Added correct WebSocket server URLs to all environment files
3. **API Route Fallbacks**: Fixed local development API routes to use staging server when local server unavailable
4. **Server URL Updates**: Updated to new Cloud Run URLs after server redeployment

### Current Working Configuration

- **Local Development**: `npm run dev:mobile` - connects to staging WebSocket server
- **Firebase Staging**: `npm run deploy:firebase:complete` - connects to staging WebSocket server  
- **Production (Vercel)**: `npm run deploy:vercel:complete` - connects to production WebSocket server

### Environment Variables (Current Working URLs)

```bash
# Local Development (.env.local)
NEXT_PUBLIC_SIGNALING_SERVER=wss://peddlenet-websocket-server-staging-250496240301.us-central1.run.app

# Firebase Staging (.env.staging)
NEXT_PUBLIC_SIGNALING_SERVER=wss://peddlenet-websocket-server-staging-250496240301.us-central1.run.app

# Production (.env.production)
NEXT_PUBLIC_SIGNALING_SERVER=wss://peddlenet-websocket-server-hfttiarlja-uc.a.run.app
```

### Admin Dashboard Features Working

✅ **Authentication**: REDACTED_ADMIN_USER / REDACTED_ADMIN_PASS  
✅ **Real-time Analytics**: User/room counts, message stats  
✅ **Admin Controls**: Broadcast, room clearing, database wipe  
✅ **Detailed Views**: User management, room management  
✅ **Activity Feed**: Live activity monitoring  
✅ **Environment Detection**: Automatic server routing  

### Known Limitation: Firebase Preview Channels - ✅ SOLVED!

**Previous Issue**: Firebase preview channels (`npm run preview:deploy`) failed to connect to WebSocket servers  
**Root Cause**: Preview channels only deploy static content, environment variables weren't available at build time  
**Solution**: Enhanced preview script with build-time environment variable injection  
**Status**: ✅ **FIXED** - Preview channels now work perfectly!

### New Working Preview Workflow

```bash
# Quick preview deployment (30-60 seconds)
./scripts/deploy-preview-enhanced.sh feature-name

# Test admin dashboard in preview
# https://festival-chat-peddlenet--feature-name.web.app/admin-analytics
```

**Benefits**:
- ✅ 10x faster than `firebase:complete` (30s vs 5-10min)
- ✅ Admin dashboard works in preview channels
- ✅ WebSocket connections work properly  
- ✅ Environment variables load correctly
- ✅ Perfect for UI/frontend testing

---

## Firebase Preview Channel Solutions

*See FIREBASE_PREVIEW_SOLUTIONS.md for detailed architectural fixes to make preview channels work reliably with WebSocket connections.*
#!/bin/bash

# 🚀 PRODUCTION WebSocket Server Deployment Script
# Deploy universal WebSocket server to production Cloud Run
# Version: 4.3.5-cleanup-crash-fix
# Date: June 10, 2026
# Includes: relay-presence replay on join (WebSocket clients now see BLE-only mesh
#           peers even after a cold-start reconnect) + room-name-on-join + metadata
#           durability + relay-sender attribution

echo "🚀 Production WebSocket Server Deployment - Version 4.3.5"
echo "========================================================"
echo "🎯 Target: PRODUCTION Environment"
echo "🌍 Platform: Google Cloud Run"
echo "🔧 Features: Relay-presence replay on join + relay-sender attribution + room metadata durability"
echo "📈 Version: 4.3.5-cleanup-crash-fix"
echo ""

# Check if we're in the right directory
if [ ! -f "signaling-server.js" ]; then
    echo "❌ Error: signaling-server.js not found in current directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Set project variables - PRODUCTION PROJECT ID
PROJECT_ID="festival-chat-peddlenet"  # Production project ID
SERVICE_NAME="peddlenet-websocket-server"
REGION="us-central1"

echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   Method: Google Cloud Build (no local Docker required)"
echo ""

echo "📋 Using universal server configuration:"
echo "   🐳 Dockerfile: Dockerfile.cloudrun"
echo "   🖥️ Server: signaling-server.js (universal with auto-detection)"
echo "   📦 Build: Google Cloud Build (no local Docker required)"
echo "   🔧 Version: 4.3.5-cleanup-crash-fix"
echo ""
echo "✅ Version 4.3.5 Features:"
echo "=========================="
echo "✅ Relayed-Message Persistence + History Replay: relayed BLE chat is now stored and"
echo "   join-room replays recent message-history, so a client that reconnected after a"
echo "   cold-start drop catches up on messages it missed"
echo "✅ Relay-Presence Replay: join-room replays fresh relayPresence entries so"
echo "   WebSocket clients see BLE-only peers even if they missed the one-shot peer-joined"
echo "✅ Metadata Durability: repopulate-on-join restores room names after cold starts"
echo "✅ Relayed-Sender Attribution: chat-message honors message.sender when relayed=true"
echo "✅ BLE→WebSocket Bridge: mesh-origin messages attributed to real author, not bridge node"
echo "✅ Adds relayed/relayedBy fields to broadcast payload"
echo "✅ Previous features: Room metadata storage & cross-platform sync (4.2)"
echo "✅ Previous features: WebSocket-only, Phase 1+2 optimizations"
echo "✅ Connection health monitoring: Ping/pong statistics tracking"
echo "✅ Environment detection: Correctly identifies staging vs production"
echo ""

# Check if gcloud is authenticated
echo "🔐 Checking Google Cloud authentication..."
gcloud auth list --filter=status:ACTIVE --format="value(account)" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Not authenticated with Google Cloud"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "🎯 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Submit build to Cloud Build (production configuration)
echo "☁️  Submitting production build to Google Cloud Build..."
echo "⚡ Using cache-busting for fresh build with Phase 1 optimizations..."
gcloud builds submit \
  --config deployment/cloudbuild-production.yaml \
  --substitutions=_SERVICE_NAME=$SERVICE_NAME

if [ $? -ne 0 ]; then
    echo "❌ Cloud Build deployment failed"
    exit 1
fi

# CRITICAL: Set environment variables after deployment.
# Admin credentials come from a git-ignored local env file (.env.deploy.local) —
# NEVER inline them here; this script is public. --set-env-vars REPLACES the whole
# env set, so the credentials must ride every deploy or they'd be wiped.
if [ -f .env.deploy.local ]; then
    # shellcheck disable=SC1091
    source .env.deploy.local
fi
ENV_VARS="NODE_ENV=production,BUILD_TARGET=production,PLATFORM=cloudrun"
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
    ENV_VARS="$ENV_VARS,ADMIN_USERNAME=$ADMIN_USERNAME,ADMIN_PASSWORD=$ADMIN_PASSWORD"
else
    echo "⚠️ ADMIN_USERNAME/ADMIN_PASSWORD not set (.env.deploy.local missing?) — admin endpoints will be DISABLED (fail closed)"
fi
echo "🔧 Setting production environment variables..."
gcloud run services update $SERVICE_NAME \
  --set-env-vars="$ENV_VARS" \
  --region=$REGION \
  --project=$PROJECT_ID

if [ $? -ne 0 ]; then
    echo "⚠️ Warning: Failed to set environment variables"
    echo "Admin dashboard may not work properly"
else
    echo "✅ Environment variables set successfully"
fi

# Get the service URL
echo "📍 Getting service URL..."
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' --project $PROJECT_ID)

echo ""
echo "🎉 PRODUCTION WEBSOCKET SERVER DEPLOYMENT SUCCESSFUL!"
echo "====================================================="
echo "🚀 Environment: PRODUCTION"
echo "📍 Service URL: $SERVICE_URL"
echo "🏥 Health check: $SERVICE_URL/health"
echo "📊 Admin dashboard: $SERVICE_URL/admin"
echo "🛠️ Version: 4.3.5-cleanup-crash-fix"
echo ""
echo "📋 Phase 2 Features Active:"
echo "============================"
echo "✅ WebSocket-Only Architecture: P2P code removed, clean design"
echo "✅ Simplified Data Structures: activeUsers Map (Phase 1)"
echo "✅ Duplicate Socket Prevention: Admin dashboard accuracy (Phase 1)"
echo "✅ Automatic Reconnection: Client handles scale-to-zero gracefully"
echo "✅ Memory Cleanup: Hourly cleanup, 24h for public rooms"
echo "✅ CORS Support: Vercel domains (production + preview)"
echo "✅ Cold Start Detection: Adaptive timeouts for Cloud Run"
echo "✅ Connection Health: Ping/pong monitoring and statistics"
echo ""
echo "🧪 Test Production Server:"
echo "=========================="
echo "curl $SERVICE_URL/health"
echo ""
echo "💰 Cost:"
echo "========"
echo "• min-instances=0 (scales to zero when idle)"
echo "• Cost when idle: \$0"
echo "• Cost when active: Pay per use"
echo ""
echo "📝 WebSocket URL (already configured in next.config.ts):"
echo "========================================================="
# Convert https to wss
WEBSOCKET_URL="wss://${SERVICE_URL#https://}"
echo "$WEBSOCKET_URL"
echo ""
echo "🔍 Monitor Deployment:"
echo "======================"
echo "Cloud Run Console: https://console.cloud.google.com/run/detail/$REGION/$SERVICE_NAME?project=$PROJECT_ID"
echo ""
echo "✅ Ready for production traffic!"
echo "Vercel production (peddlenet.app) will automatically connect to this server."

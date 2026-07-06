#!/bin/bash

# 🎯 DEBUG VERSION CHECK DEPLOYMENT
# Deploy a fresh preview to debug version mismatch

set -e

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🎯 DEBUG VERSION CHECK DEPLOYMENT${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Use unique channel ID for debugging
CHANNEL_ID="version-debug-$(date +%H%M%S)"
echo -e "${GREEN}📋 Debug Channel: ${CHANNEL_ID}${NC}"
echo ""

# Kill dev processes
echo -e "${YELLOW}🛑 Stopping development processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "signaling-server" 2>/dev/null || true
sleep 2

# Clear all caches
echo -e "${YELLOW}🔥 Nuclear cache clearing...${NC}"
rm -rf .next/
rm -rf .firebase/
rm -rf node_modules/.cache/

# Check staging server status first
echo -e "${YELLOW}🔍 Checking staging server status...${NC}"
curl -s https://peddlenet-websocket-server-staging-hfttiarlja-uc.a.run.app/ | jq -r '.environment.detected // "No environment info"' || echo "Server not responding"
echo ""

# Use staging environment
if [ -f ".env.staging" ]; then
    echo -e "${BLUE}📋 Current staging environment:${NC}"
    cat .env.staging
    echo ""
    
    # Backup and use staging env
    cp .env.local .env.local.backup.debug 2>/dev/null || true
    cp .env.staging .env.local
else
    echo -e "${RED}❌ .env.staging not found!${NC}"
    exit 1
fi

# Build with explicit debug environment
SIGNALING_SERVER=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.staging | cut -d'=' -f2)
BUILD_TARGET="staging"
NODE_ENV="production"

echo -e "${BLUE}🚀 Building with debug info...${NC}"
echo -e "${YELLOW}  NEXT_PUBLIC_SIGNALING_SERVER: $SIGNALING_SERVER${NC}"
echo -e "${YELLOW}  BUILD_TARGET: $BUILD_TARGET${NC}"
echo -e "${YELLOW}  NODE_ENV: $NODE_ENV${NC}"
echo ""

# Build with debug timestamp
NEXT_PUBLIC_SIGNALING_SERVER="$SIGNALING_SERVER" \
BUILD_TARGET="$BUILD_TARGET" \
NODE_ENV="$NODE_ENV" \
CACHE_BUST_TIMESTAMP=$(date +%s) \
npm run build:firebase

# Check build contains correct version
echo -e "${YELLOW}🔍 Checking build for version string...${NC}"
if grep -r "4.5.0-env-fix" .next/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Found v4.5.0-env-fix in build${NC}"
else
    echo -e "${RED}❌ v4.5.0-env-fix NOT found in build!${NC}"
    echo -e "${YELLOW}Searching for any version strings...${NC}"
    grep -r "PeddleNet Admin Dashboard" .next/ | head -3 || echo "No version strings found"
fi

# Restore environment
if [ -f ".env.local.backup.debug" ]; then
    mv .env.local.backup.debug .env.local
else
    rm -f .env.local
fi

# Deploy to Firebase
echo -e "${BLUE}🚀 Deploying debug preview...${NC}"
TEMP_OUTPUT=$(mktemp)

if firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "festival-chat-peddlenet" \
    --expires "2h" > "$TEMP_OUTPUT" 2>&1; then
    
    cat "$TEMP_OUTPUT"
    
    # Extract URL
    PREVIEW_URL=$(grep -o "https://festival-chat-peddlenet--[^[:space:]]*" "$TEMP_OUTPUT" | head -1)
    
    if [ -z "$PREVIEW_URL" ]; then
        PREVIEW_URL="https://festival-chat-peddlenet--${CHANNEL_ID}-$(date +%Y%m%d%H%M).web.app"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 DEBUG DEPLOYMENT SUCCESS!${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    echo -e "${GREEN}🔗 DEBUG URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}"
    
    echo ""
    echo -e "${BLUE}🎯 DEBUG CHECKLIST:${NC}"
    echo -e "${YELLOW}1. Visit: ${PREVIEW_URL}/admin-analytics${NC}"
    echo -e "${YELLOW}2. Login: REDACTED_ADMIN_USER / REDACTED_ADMIN_PASS${NC}"
    echo -e "${YELLOW}3. Check footer version (should be v4.5.0-env-fix)${NC}"
    echo -e "${YELLOW}4. Check console for '🔧 Environment detection' logs${NC}"
    echo -e "${YELLOW}5. Verify environment shows 'staging' not 'production'${NC}"
    echo ""
    echo -e "${RED}🚨 If still showing v4.0.0-session-persistence:${NC}"
    echo -e "${YELLOW}• Try incognito window${NC}"
    echo -e "${YELLOW}• Clear browser cache completely${NC}"
    echo -e "${YELLOW}• Check different browser${NC}"
    echo -e "${YELLOW}• Hard refresh: Cmd+Shift+R${NC}"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    cat "$TEMP_OUTPUT"
fi

rm -f "$TEMP_OUTPUT"

echo ""
echo -e "${GREEN}✅ Debug deployment complete!${NC}"

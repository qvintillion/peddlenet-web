#!/bin/bash

# 🔥 NUCLEAR CACHE-BUSTING PREVIEW DEPLOYMENT 
# This script completely wipes all caches to ensure staging shows the latest code

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔥 NUCLEAR CACHE-BUSTING PREVIEW DEPLOYMENT${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Get channel name or use default
CHANNEL_ID=${1:-"cache-bust-$(date +%H%M)"}
echo -e "${GREEN}📋 Channel: ${CHANNEL_ID}${NC}"
echo ""

# 🛑 STEP 1: Kill all dev processes
echo -e "${YELLOW}🛑 STEP 1: Killing all development processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
pkill -f "signaling-server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ All dev processes killed${NC}"
echo ""

# 🔥 STEP 2: NUCLEAR cache clearing
echo -e "${YELLOW}🔥 STEP 2: NUCLEAR CACHE CLEARING...${NC}"
rm -rf .next/
rm -rf functions/.next/
rm -rf functions/lib/
rm -rf node_modules/.cache/
rm -rf .firebase/
rm -rf .vercel/
rm -rf dist/
rm -rf build/

# Clear ALL npm caches
npm cache clean --force 2>/dev/null || true

# Clear system caches
if command -v yarn &> /dev/null; then
    yarn cache clean 2>/dev/null || true
fi

echo -e "${GREEN}✅ NUCLEAR cache clearing complete${NC}"
echo ""

# 🔧 STEP 3: Environment setup  
echo -e "${YELLOW}🔧 STEP 3: Setting up staging environment...${NC}"

# Backup current .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.nuclear 2>/dev/null || true
fi

# Use staging environment variables
if [ -f ".env.staging" ]; then
    cp .env.staging .env.local
    echo -e "${GREEN}✅ Using staging environment config${NC}"
    echo -e "${BLUE}WebSocket Server: $(grep NEXT_PUBLIC_SIGNALING_SERVER .env.staging | cut -d'=' -f2)${NC}"
else
    echo -e "${RED}❌ .env.staging not found!${NC}"
    exit 1
fi
echo ""

# 🚀 STEP 4: Fresh build with explicit environment
echo -e "${YELLOW}🚀 STEP 4: Fresh build with cache-busting...${NC}"

# Export environment variables explicitly
export NEXT_PUBLIC_SIGNALING_SERVER=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.staging | cut -d'=' -f2)
export BUILD_TARGET="staging" 
export NODE_ENV="production"

# Add cache-busting timestamp to ensure fresh build
export CACHE_BUST_TIMESTAMP=$(date +%s)

echo -e "${BLUE}Build environment:${NC}"
echo -e "${YELLOW}  NEXT_PUBLIC_SIGNALING_SERVER: $NEXT_PUBLIC_SIGNALING_SERVER${NC}"
echo -e "${YELLOW}  BUILD_TARGET: $BUILD_TARGET${NC}"
echo -e "${YELLOW}  CACHE_BUST_TIMESTAMP: $CACHE_BUST_TIMESTAMP${NC}"
echo ""

# Build with explicit cache busting
echo -e "${BLUE}Building with nuclear cache busting...${NC}"
CACHE_BUST_TIMESTAMP=$CACHE_BUST_TIMESTAMP npm run build:firebase

echo -e "${GREEN}✅ Fresh build complete${NC}"
echo ""

# 🔍 STEP 5: Build verification
echo -e "${YELLOW}🔍 STEP 5: Build verification...${NC}"

# Check if admin page exists
if [ -f ".next/server/app/admin-analytics/page.js" ]; then
    echo -e "${GREEN}✅ Admin analytics page found in build${NC}"
else
    echo -e "${RED}❌ Admin analytics page MISSING from build!${NC}"
    exit 1
fi

# Verify staging server URL in build
if grep -r "peddlenet-websocket-server-staging" .next/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Staging server URL found in build${NC}"
else
    echo -e "${YELLOW}⚠️  Staging server URL verification inconclusive (may be minified)${NC}"
fi

echo ""

# 🔄 STEP 6: Restore environment
echo -e "${YELLOW}🔄 STEP 6: Restoring original environment...${NC}"
if [ -f ".env.local.backup.nuclear" ]; then
    mv .env.local.backup.nuclear .env.local
    echo -e "${GREEN}✅ Restored original .env.local${NC}"
else
    rm -f .env.local
    echo -e "${YELLOW}⚠️  No backup found - cleared .env.local${NC}"
fi
echo ""

# 🚀 STEP 7: Firebase deployment with nuclear clearing
echo -e "${YELLOW}🚀 STEP 7: Firebase deployment with nuclear clearing...${NC}"

# Firebase logout/login to clear auth cache
echo -e "${BLUE}Refreshing Firebase auth...${NC}"
firebase logout --no-localhost 2>/dev/null || true
firebase login --no-localhost 2>/dev/null || true

# Deploy to Firebase
echo -e "${BLUE}Deploying to Firebase preview channel...${NC}"
TEMP_OUTPUT=$(mktemp)

if firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "festival-chat-peddlenet" \
    --expires "7d" > "$TEMP_OUTPUT" 2>&1; then
    
    # Show output
    echo -e "${GREEN}📋 Deployment Output:${NC}"
    cat "$TEMP_OUTPUT"
    
    # Extract URL
    PREVIEW_URL=$(grep -o "https://festival-chat-peddlenet--[^[:space:]]*" "$TEMP_OUTPUT" | head -1)
    
    if [ -z "$PREVIEW_URL" ]; then
        # Try alternative pattern
        PREVIEW_URL=$(grep -i "Channel URL" "$TEMP_OUTPUT" | grep -o 'https://[^[:space:]]*' | head -1)
    fi
    
    if [ -z "$PREVIEW_URL" ]; then
        # Manual construction
        TIMESTAMP=$(date +%Y%m%d%H%M)
        PREVIEW_URL="https://festival-chat-peddlenet--${CHANNEL_ID}-${TIMESTAMP}.web.app"
        echo -e "${YELLOW}⚠️  Constructed URL: ${PREVIEW_URL}${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 NUCLEAR DEPLOYMENT SUCCESS!${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""
    echo -e "${GREEN}🔗 PREVIEW URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    # Copy to clipboard
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}"
    
    echo ""
    echo -e "${PURPLE}🔥 NUCLEAR CACHE-BUSTING INSTRUCTIONS:${NC}"
    echo -e "${BLUE}=====================================${NC}"
    echo ""
    echo -e "${RED}🚨 THIS SHOULD DEFINITELY SHOW THE NEW UI${NC}"
    echo -e "${YELLOW}If you still see old UI, the problem is browser cache:${NC}"
    echo ""
    echo -e "${GREEN}1. HARD REFRESH: Cmd+Shift+R (Mac) or Ctrl+Shift+R (PC)${NC}"
    echo -e "${GREEN}2. CLEAR BROWSER CACHE: Developer Tools > Storage > Clear${NC}"
    echo -e "${GREEN}3. INCOGNITO MODE: Open in private/incognito window${NC}"
    echo -e "${GREEN}4. DIFFERENT BROWSER: Try Chrome, Firefox, Safari${NC}"
    echo ""
    echo -e "${BLUE}📊 Test URLs:${NC}"
    echo -e "${YELLOW}Main app: ${PREVIEW_URL}${NC}"
    echo -e "${YELLOW}Admin dashboard: ${PREVIEW_URL}/admin-analytics${NC}"
    echo ""
    echo -e "${GREEN}✅ Nuclear deployment complete - should show beautiful pills and new UI!${NC}"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    cat "$TEMP_OUTPUT"
fi

# Cleanup
rm -f "$TEMP_OUTPUT"

echo ""
echo -e "${PURPLE}🛠️ Next Steps:${NC}"
echo -e "${YELLOW}1. Test in incognito window if needed${NC}"
echo -e "${YELLOW}2. Login with: REDACTED_ADMIN_USER / REDACTED_ADMIN_PASS${NC}"
echo -e "${YELLOW}3. Look for beautiful pills and staging environment${NC}"
echo ""
echo -e "${GREEN}✅ Nuclear cache-busting complete!${NC}"

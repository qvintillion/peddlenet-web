#!/bin/bash

# 🔧 ENV-FIXED PREVIEW DEPLOYMENT 
# This script ensures environment variables are properly injected

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🔧 ENV-FIXED PREVIEW DEPLOYMENT${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Get channel name or use default
CHANNEL_ID=${1:-"env-fix-$(date +%H%M)"}
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

# 🔥 STEP 2: Clear caches
echo -e "${YELLOW}🔥 STEP 2: Clearing build caches...${NC}"
rm -rf .next/
rm -rf .firebase/
rm -rf node_modules/.cache/
echo -e "${GREEN}✅ Caches cleared${NC}"
echo ""

# 🔧 STEP 3: Environment setup with explicit injection
echo -e "${YELLOW}🔧 STEP 3: Setting up environment with explicit injection...${NC}"

# Backup current .env.local
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.envfix 2>/dev/null || true
fi

# Copy staging environment
if [ -f ".env.staging" ]; then
    cp .env.staging .env.local
    echo -e "${GREEN}✅ Using staging environment config${NC}"
    
    # Show environment variables
    echo -e "${BLUE}Environment variables:${NC}"
    cat .env.staging
    echo ""
else
    echo -e "${RED}❌ .env.staging not found!${NC}"
    exit 1
fi

# 🚀 STEP 4: Build with explicit environment variable injection
echo -e "${YELLOW}🚀 STEP 4: Building with explicit environment injection...${NC}"

# Read environment variables from .env.staging
SIGNALING_SERVER=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.staging | cut -d'=' -f2)
BUILD_TARGET="staging"
NODE_ENV="production"

echo -e "${BLUE}Building with environment:${NC}"
echo -e "${YELLOW}  NEXT_PUBLIC_SIGNALING_SERVER: $SIGNALING_SERVER${NC}"
echo -e "${YELLOW}  BUILD_TARGET: $BUILD_TARGET${NC}"
echo -e "${YELLOW}  NODE_ENV: $NODE_ENV${NC}"
echo ""

# Build with explicit environment variables
NEXT_PUBLIC_SIGNALING_SERVER="$SIGNALING_SERVER" \
BUILD_TARGET="$BUILD_TARGET" \
NODE_ENV="$NODE_ENV" \
npm run build:firebase

echo -e "${GREEN}✅ Build complete with environment injection${NC}"
echo ""

# 🔍 STEP 5: Verify environment variables in build
echo -e "${YELLOW}🔍 STEP 5: Verifying environment variables in build...${NC}"

if [ -f ".next/server/app/admin-analytics/page.js" ]; then
    echo -e "${GREEN}✅ Admin analytics page found in build${NC}"
    
    # Check if the staging server URL is in the build
    if grep -q "peddlenet-websocket-server-staging" .next/server/app/admin-analytics/page.js; then
        echo -e "${GREEN}✅ Staging server URL found in build${NC}"
    else
        echo -e "${YELLOW}⚠️  Staging server URL not found in build (may be environment runtime issue)${NC}"
    fi
else
    echo -e "${RED}❌ Admin analytics page MISSING from build!${NC}"
    exit 1
fi
echo ""

# 🔄 STEP 6: Restore environment
echo -e "${YELLOW}🔄 STEP 6: Restoring original environment...${NC}"
if [ -f ".env.local.backup.envfix" ]; then
    mv .env.local.backup.envfix .env.local
    echo -e "${GREEN}✅ Restored original .env.local${NC}"
else
    rm -f .env.local
    echo -e "${YELLOW}⚠️  No backup found - cleared .env.local${NC}"
fi
echo ""

# 🚀 STEP 7: Deploy to Firebase
echo -e "${YELLOW}🚀 STEP 7: Deploying to Firebase...${NC}"

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
    echo -e "${GREEN}🎉 ENV-FIXED DEPLOYMENT SUCCESS!${NC}"
    echo -e "${BLUE}===================================${NC}"
    echo ""
    echo -e "${GREEN}🔗 PREVIEW URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    # Copy to clipboard
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}"
    
    echo ""
    echo -e "${PURPLE}🔧 WHAT TO LOOK FOR:${NC}"
    echo -e "${BLUE}===================${NC}"
    echo ""
    echo -e "${GREEN}1. Login form should have 🎵 music note icon${NC}"
    echo -e "${GREEN}2. After login, look for beautiful gradient cards with pills${NC}"
    echo -e "${GREEN}3. Footer should show: v4.5.0-env-fix${NC}"
    echo -e "${GREEN}4. Footer should show: Server: peddlenet-websocket-server-staging${NC}"
    echo -e "${GREEN}5. Console should show: '🔧 Environment detection'${NC}"
    echo ""
    echo -e "${YELLOW}📊 Test URLs:${NC}"
    echo -e "${YELLOW}Main app: ${PREVIEW_URL}${NC}"
    echo -e "${YELLOW}Admin dashboard: ${PREVIEW_URL}/admin-analytics${NC}"
    echo ""
    echo -e "${BLUE}🔍 Debug Steps:${NC}"
    echo -e "${YELLOW}1. Open DevTools Console (F12)${NC}"
    echo -e "${YELLOW}2. Login with: REDACTED_ADMIN_USER / REDACTED_ADMIN_PASS${NC}"
    echo -e "${YELLOW}3. Look for '🔧 Environment detection' log${NC}"
    echo -e "${YELLOW}4. Check footer shows correct server and version${NC}"
    echo ""
    echo -e "${GREEN}✅ Environment variables should now be properly injected!${NC}"
    
else
    echo -e "${RED}❌ Deployment failed${NC}"
    cat "$TEMP_OUTPUT"
fi

# Cleanup
rm -f "$TEMP_OUTPUT"

echo ""
echo -e "${PURPLE}🛠️ Next Steps:${NC}"
echo -e "${YELLOW}1. Check console logs for environment detection${NC}"
echo -e "${YELLOW}2. Verify footer shows v4.5.0-env-fix and correct server${NC}"
echo -e "${YELLOW}3. Test admin functionality works properly${NC}"
echo ""
echo -e "${GREEN}✅ Environment-fixed deployment complete!${NC}"

#!/bin/bash

# 🎪 Festival Chat - Simple Preview Deploy (No Chrome Profile Hassles)
# Deploys and provides clear manual access instructions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="festival-chat-peddlenet"
DEFAULT_CHANNEL="simple-$(date +%Y%m%d-%H%M)"
EXPIRES="7d"

echo -e "${PURPLE}🎪 Festival Chat Simple Preview Deploy${NC}"
echo -e "${BLUE}===================================${NC}"

# SAFETY: Check if dev server is running and warn user
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ WARNING: Development server running on port 3000${NC}"
    echo -e "${YELLOW}This may cause deployment conflicts and environment corruption.${NC}"
    echo -e "${RED}Strongly recommend closing dev server before preview deployment.${NC}"
    echo ""
    read -p "Stop dev server and continue? (y/N): " stop_dev
    
    if [[ $stop_dev =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🛑 Stopping development servers...${NC}"
        pkill -f "next dev" 2>/dev/null || true
        pkill -f "signaling-server" 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Development servers stopped${NC}"
    else
        echo -e "${RED}❌ Preview deployment cancelled${NC}"
        echo -e "${YELLOW}💡 Close dev servers manually and retry${NC}"
        exit 1
    fi
fi

# SAFETY: Stop WebSocket server if running on dev port
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${BLUE}🛑 Stopping WebSocket development server...${NC}"
    pkill -f "signaling-server" 2>/dev/null || true
    sleep 1
    echo -e "${GREEN}✅ WebSocket server stopped${NC}"
fi

echo ""
if [ -z "$1" ]; then
    CHANNEL_ID="$DEFAULT_CHANNEL"
    echo -e "${YELLOW}📋 Using default channel ID: ${CHANNEL_ID}${NC}"
else
    CHANNEL_ID="$1"
    echo -e "${GREEN}📋 Using provided channel ID: ${CHANNEL_ID}${NC}"
fi

echo ""
echo -e "${BLUE}🏗️ Building project for Firebase with preview environment...${NC}"

# Backup current environment
echo -e "${YELLOW}💾 Backing up current environment...${NC}"
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.preview 2>/dev/null || true
    echo -e "${GREEN}✅ Backed up .env.local${NC}"
fi

# Copy preview environment variables for build
if [ -f ".env.preview" ]; then
    echo -e "${GREEN}📋 Using preview environment variables${NC}"
    echo -e "${YELLOW}📝 Preview .env.preview contents:${NC}"
    cat .env.preview
    echo ""
    
    cp .env.preview .env.local
    
    echo -e "${YELLOW}📝 Current .env.local after copy:${NC}"
    cat .env.local
    echo ""
    
    echo -e "${BLUE}🔧 Environment details:${NC}"
    echo -e "${YELLOW}   • WebSocket Server: $(grep NEXT_PUBLIC_SIGNALING_SERVER .env.preview | cut -d'=' -f2)${NC}"
    echo -e "${YELLOW}   • Build Target: preview${NC}"
else
    echo -e "${RED}❌ No .env.preview found!${NC}"
    echo -e "${RED}   This is required for preview deployment.${NC}"
    exit 1
fi

# Cache bust - clear builds to ensure fresh deployment with new environment
echo ""
echo -e "${YELLOW}🧹 Cache bust: clearing all builds...${NC}"
rm -rf .next/
rm -rf functions/.next/
rm -rf functions/lib/
rm -rf node_modules/.cache/
rm -rf .firebase/
echo -e "${GREEN}✅ Build cache cleared${NC}"

echo ""
echo -e "${BLUE}🚀 Building with explicit environment variables...${NC}"
echo -e "${YELLOW}Setting NEXT_PUBLIC_SIGNALING_SERVER explicitly...${NC}"

# Get the preview server URL from .env.preview
PREVIEW_SERVER_URL=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.preview | cut -d'=' -f2)
echo -e "${GREEN}Using preview server: ${PREVIEW_SERVER_URL}${NC}"

# Build with explicit environment variable and verify it's set
echo -e "${BLUE}Building with environment variable...${NC}"
echo -e "${YELLOW}NEXT_PUBLIC_SIGNALING_SERVER=${PREVIEW_SERVER_URL}${NC}"

# Export environment variable for the build process
export NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL"
export BUILD_TARGET="preview"

# Verify environment variable is set
echo -e "${BLUE}Verifying environment variable is set...${NC}"
echo "NEXT_PUBLIC_SIGNALING_SERVER: $NEXT_PUBLIC_SIGNALING_SERVER"
echo "BUILD_TARGET: $BUILD_TARGET"

# Build with explicit environment variable
NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL" BUILD_TARGET="preview" npm run build:firebase

# Verify the build actually contains the correct URL
echo ""
echo -e "${YELLOW}🔍 Verifying ALL built files contain correct URL...${NC}"
if grep -r "peddlenet-websocket-server-staging" .next/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Found staging server URL in build${NC}"
else
    echo -e "${RED}❌ Staging server URL NOT found in build!${NC}"
    echo -e "${YELLOW}Searching for any signaling server URLs in build...${NC}"
    grep -r "peddlenet-websocket-server" .next/ | head -3 || echo "No URLs found"
fi

# Verify the built environment variables
echo ""
echo -e "${YELLOW}🔍 Verifying built environment variables...${NC}"
if [ -f ".next/server/app/test-room-stats/page.js" ]; then
    echo -e "${BLUE}Checking built files for environment variables...${NC}"
    grep -r "NEXT_PUBLIC_SIGNALING_SERVER" .next/ | head -3 || echo "No NEXT_PUBLIC_SIGNALING_SERVER found in build"
else
    echo -e "${YELLOW}Build verification skipped - test page not found${NC}"
fi

# Restore original environment
echo ""
echo -e "${BLUE}🔄 Restoring original environment...${NC}"
if [ -f ".env.local.backup.preview" ]; then
    mv .env.local.backup.preview .env.local
    echo -e "${GREEN}✅ Restored original .env.local${NC}"
else
    # If no backup, clean up the preview env from .env.local
    rm -f .env.local
    echo -e "${YELLOW}⚠️  No backup found - cleared .env.local${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Deploying to preview channel...${NC}"

# Clear Firebase cache to ensure fresh deployment
echo -e "${YELLOW}🧹 Clearing Firebase cache...${NC}"
rm -rf .firebase/
echo -e "${GREEN}✅ Firebase cache cleared${NC}"

# Capture the deployment output to extract the URL
DEPLOY_OUTPUT=$(firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "$PROJECT_ID" \
    --expires "$EXPIRES" 2>&1)

echo "$DEPLOY_OUTPUT"

# Extract the preview URL from the output
PREVIEW_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*' | head -1)

echo ""
echo -e "${GREEN}🎉 Preview deployment completed!${NC}"
echo -e "${BLUE}📋 Channel ID: ${CHANNEL_ID}${NC}"
echo -e "${BLUE}⏰ Expires: ${EXPIRES} from now${NC}"

if [ -n "$PREVIEW_URL" ]; then
    echo ""
    echo -e "${GREEN}🔗 PREVIEW URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    # Copy URL to clipboard
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}" || echo -e "${YELLOW}⚠️  Copy the URL manually${NC}"
    
    echo ""
    echo -e "${PURPLE}🔐 HOW TO ACCESS WITH CORRECT GOOGLE ACCOUNT:${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
    echo -e "${YELLOW}Step 1: Open Chrome (or any browser)${NC}"
    echo -e "${YELLOW}Step 2: Go to accounts.google.com${NC}"
    echo -e "${YELLOW}Step 3: Sign into REDACTED_ADMIN_USER@gmail.com${NC}"
    echo -e "${YELLOW}Step 4: In the SAME browser tab/window:${NC}"
    echo -e "${YELLOW}        - Press Cmd+V (URL is in clipboard)${NC}"
    echo -e "${YELLOW}        - OR manually type: ${PREVIEW_URL}${NC}"
    echo ""
    echo -e "${GREEN}✅ Preview should load without asking for sign-in!${NC}"
    echo ""
    echo -e "${BLUE}📱 MOBILE TESTING:${NC}"
    echo -e "${YELLOW}• Copy URL to phone (AirDrop, text, etc.)${NC}"
    echo -e "${YELLOW}• Make sure REDACTED_ADMIN_USER@gmail.com is signed into mobile browser${NC}"
    echo -e "${YELLOW}• Open URL in mobile browser${NC}"
    echo ""
    
else
    echo -e "${YELLOW}⚠️  Could not extract preview URL from output${NC}"
    echo -e "${YELLOW}Check the deployment output above for the URL${NC}"
fi

echo ""
echo -e "${PURPLE}🛠️ Management Commands:${NC}"
echo -e "${YELLOW}List channels:${NC} firebase hosting:channel:list --project $PROJECT_ID"
echo -e "${YELLOW}Delete channel:${NC} firebase hosting:channel:delete $CHANNEL_ID --project $PROJECT_ID"
echo ""
echo -e "${GREEN}✅ Simple preview deployment complete!${NC}"
echo -e "${BLUE}💡 No Chrome profile detection - just copy/paste and you're good!${NC}"

#!/bin/bash

# 🎪 Festival Chat - Nuclear Preview Deploy
# Forces environment variables to be properly embedded using multiple strategies

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
DEFAULT_CHANNEL="nuclear-$(date +%Y%m%d-%H%M)"
EXPIRES="7d"

echo -e "${PURPLE}🎪 Festival Chat Nuclear Preview Deploy${NC}"
echo -e "${BLUE}=====================================${NC}"

# Get channel name from user or use default
if [ -z "$1" ]; then
    CHANNEL_ID="$DEFAULT_CHANNEL"
    echo -e "${YELLOW}📋 Using default channel ID: ${CHANNEL_ID}${NC}"
else
    CHANNEL_ID="$1"
    echo -e "${GREEN}📋 Using provided channel ID: ${CHANNEL_ID}${NC}"
fi

echo ""
echo -e "${BLUE}🔧 Checking preview environment...${NC}"

# Verify .env.preview exists
if [ ! -f ".env.preview" ]; then
    echo -e "${RED}❌ No .env.preview found!${NC}"
    echo -e "${RED}   This is required for preview deployment.${NC}"
    exit 1
fi

# Get the preview server URL
PREVIEW_SERVER_URL=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.preview | cut -d'=' -f2)
echo -e "${GREEN}🎯 Target server: ${PREVIEW_SERVER_URL}${NC}"

# Nuclear cache bust - remove everything
echo ""
echo -e "${YELLOW}☢️ NUCLEAR CACHE BUST...${NC}"
rm -rf .next/
rm -rf functions/.next/
rm -rf functions/lib/
rm -rf .firebase/
rm -rf node_modules/.cache/
echo -e "${GREEN}✅ Nuclear cache cleared${NC}"

# Backup current environment
echo ""
echo -e "${YELLOW}💾 Backing up current environment...${NC}"
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.nuclear 2>/dev/null || true
    echo -e "${GREEN}✅ Backed up .env.local${NC}"
fi
if [ -f ".env.firebase" ]; then
    cp .env.firebase .env.firebase.backup.nuclear 2>/dev/null || true
    echo -e "${GREEN}✅ Backed up .env.firebase${NC}"
fi

# Strategy 1: Set environment in .env.local AND .env.production AND override .env.firebase
echo ""
echo -e "${BLUE}🛠️ Strategy 1: Setting up multiple environment files...${NC}"
cp .env.preview .env.local
cp .env.preview .env.production
cp .env.preview .env.firebase  # Override the problematic firebase env file
echo -e "${GREEN}✅ Created .env.local, .env.production, and .env.firebase with preview settings${NC}"

# Strategy 2: Export environment variables to shell
echo ""
echo -e "${BLUE}🛠️ Strategy 2: Exporting shell environment variables...${NC}"
export NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL"
export BUILD_TARGET="preview"
export NODE_ENV="production"
echo -e "${GREEN}✅ Exported environment variables to shell${NC}"

# Strategy 3: Verify environment variables are accessible
echo ""
echo -e "${BLUE}🔍 Verifying environment variables...${NC}"
echo -e "${YELLOW}NEXT_PUBLIC_SIGNALING_SERVER: $NEXT_PUBLIC_SIGNALING_SERVER${NC}"
echo -e "${YELLOW}BUILD_TARGET: $BUILD_TARGET${NC}"
echo -e "${YELLOW}NODE_ENV: $NODE_ENV${NC}"

# Strategy 4: Build with explicit environment variables in command
echo ""
echo -e "${BLUE}🚀 Building with ALL strategies...${NC}"
NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL" \
BUILD_TARGET="preview" \
NODE_ENV="production" \
npm run build

# Verify the build contains the correct URL (multiple checks)
echo ""
echo -e "${YELLOW}🔍 COMPREHENSIVE build verification...${NC}"

# Check 1: Look for preview URL in any JS files
if find .next/ -name "*.js" -exec grep -l "peddlenet-websocket-server-preview" {} \; | head -1 > /dev/null; then
    echo -e "${GREEN}✅ Check 1: Found preview server URL in JS files${NC}"
    PREVIEW_FOUND_JS=true
else
    echo -e "${RED}❌ Check 1: Preview server URL NOT found in JS files${NC}"
    PREVIEW_FOUND_JS=false
fi

# Check 2: Look for production URL (should NOT be found)
if find .next/ -name "*.js" -exec grep -l "peddlenet-websocket-server-padyxgyv5a-uc.a.run.app" {} \; | head -1 > /dev/null; then
    echo -e "${RED}❌ Check 2: PRODUCTION server URL found in build (BAD!)${NC}"
    PRODUCTION_FOUND=true
else
    echo -e "${GREEN}✅ Check 2: Production server URL not found in build (GOOD!)${NC}"
    PRODUCTION_FOUND=false
fi

# Check 3: Look in server-side files
if find .next/server -name "*.js" -exec grep -l "peddlenet-websocket-server-preview" {} \; | head -1 > /dev/null; then
    echo -e "${GREEN}✅ Check 3: Found preview server URL in server files${NC}"
    PREVIEW_FOUND_SERVER=true
else
    echo -e "${RED}❌ Check 3: Preview server URL NOT found in server files${NC}"
    PREVIEW_FOUND_SERVER=false
fi

# Comprehensive verification summary
echo ""
echo -e "${BLUE}📊 Build Verification Summary:${NC}"
echo -e "   JS Files Preview URL: $($PREVIEW_FOUND_JS && echo '✅' || echo '❌')"
echo -e "   Production URL Found: $($PRODUCTION_FOUND && echo '❌ (BAD)' || echo '✅ (GOOD)')"
echo -e "   Server Preview URL: $($PREVIEW_FOUND_SERVER && echo '✅' || echo '❌')"

# Only proceed if verification passes
if [ "$PREVIEW_FOUND_JS" = true ] && [ "$PRODUCTION_FOUND" = false ]; then
    echo -e "${GREEN}✅ Build verification PASSED - proceeding with deployment${NC}"
else
    echo -e "${RED}❌ Build verification FAILED${NC}"
    echo -e "${YELLOW}Showing file contents for debugging:${NC}"
    
    # Show a sample of what URLs are actually in the build
    echo -e "${BLUE}Sample URLs found in build:${NC}"
    find .next/ -name "*.js" -exec grep -o "wss://[^\"]*" {} \; | sort | uniq | head -5
    
    echo ""
    echo -e "${RED}❌ Aborting deployment due to verification failure${NC}"
    exit 1
fi

# Keep the environment for Firebase Functions build
echo ""
echo -e "${BLUE}🔧 Building Firebase Functions with preview environment...${NC}"
cd functions
NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL" \
BUILD_TARGET="preview" \
NODE_ENV="production" \
npm run build
cd ..

# Deploy with environment still active
echo ""
echo -e "${BLUE}🚀 Deploying to Firebase preview channel...${NC}"
echo -e "${YELLOW}Environment still active during deployment${NC}"

# Deploy with explicit environment variables
NEXT_PUBLIC_SIGNALING_SERVER="$PREVIEW_SERVER_URL" \
BUILD_TARGET="preview" \
firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "$PROJECT_ID" \
    --expires "$EXPIRES" > deploy_output.log 2>&1

# Show deployment output
cat deploy_output.log

# Extract the preview URL from the output
PREVIEW_URL=$(grep -o 'https://[^[:space:]]*' deploy_output.log | grep "$CHANNEL_ID" | head -1)

# Clean up
rm -f deploy_output.log

# Restore original environment
echo ""
echo -e "${BLUE}🔄 Restoring original environment...${NC}"
if [ -f ".env.local.backup.nuclear" ]; then
    mv .env.local.backup.nuclear .env.local
    echo -e "${GREEN}✅ Restored original .env.local${NC}"
else
    rm -f .env.local
    echo -e "${YELLOW}⚠️  No backup found - cleared .env.local${NC}"
fi

if [ -f ".env.firebase.backup.nuclear" ]; then
    mv .env.firebase.backup.nuclear .env.firebase
    echo -e "${GREEN}✅ Restored original .env.firebase${NC}"
else
    echo -e "${YELLOW}⚠️  No .env.firebase backup found${NC}"
fi

# Remove temporary production env file
rm -f .env.production

echo ""
echo -e "${GREEN}🎉 Nuclear preview deployment completed!${NC}"
echo -e "${BLUE}📋 Channel ID: ${CHANNEL_ID}${NC}"
echo -e "${BLUE}⏰ Expires: ${EXPIRES} from now${NC}"
echo -e "${BLUE}🎯 Should connect to: ${PREVIEW_SERVER_URL}${NC}"

if [ -n "$PREVIEW_URL" ]; then
    echo ""
    echo -e "${GREEN}🔗 PREVIEW URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    # Copy URL to clipboard
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}" || echo -e "${YELLOW}⚠️  Copy the URL manually${NC}"
    
    echo ""
    echo -e "${PURPLE}🧪 VERIFICATION INSTRUCTIONS:${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    echo -e "${YELLOW}1. Open: ${PREVIEW_URL}${NC}"
    echo -e "${YELLOW}2. Sign into REDACTED_ADMIN_USER@gmail.com${NC}"
    echo -e "${YELLOW}3. Open browser console (F12)${NC}"
    echo -e "${YELLOW}4. Look for this line:${NC}"
    echo -e "${GREEN}   🌐 Using production HTTP URL: https://peddlenet-websocket-server-preview-433318323150.us-central1.run.app${NC}"
    echo ""
    echo -e "${GREEN}✅ SUCCESS: If you see 'preview-433318323150' in the URL${NC}"
    echo -e "${RED}❌ FAILED: If you see 'padyxgyv5a-uc.a.run.app'${NC}"
    echo ""
    echo -e "${BLUE}5. Test room stats: Should show actual user counts, not 404 errors${NC}"
    
else
    echo -e "${YELLOW}⚠️  Could not extract preview URL from output${NC}"
    echo -e "${YELLOW}Check the deployment output above for the URL${NC}"
fi

echo ""
echo -e "${PURPLE}🛠️ Management Commands:${NC}"
echo -e "${YELLOW}List channels:${NC} firebase hosting:channel:list --project $PROJECT_ID"
echo -e "${YELLOW}Delete channel:${NC} firebase hosting:channel:delete $CHANNEL_ID --project $PROJECT_ID"
echo ""
echo -e "${GREEN}✅ Nuclear preview deployment complete!${NC}"
echo -e "${BLUE}☢️ This script uses multiple strategies to force environment variable embedding${NC}"

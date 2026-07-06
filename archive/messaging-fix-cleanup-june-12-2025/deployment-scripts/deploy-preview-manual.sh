#!/bin/bash

# 🎪 Festival Chat - Manual Preview Channel Deploy
# Creates a manual preview channel for testing

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
DEFAULT_CHANNEL="manual-$(date +%Y%m%d-%H%M)"
EXPIRES="7d"

echo -e "${PURPLE}🎪 Festival Chat Preview Channel Deploy${NC}"
echo -e "${BLUE}====================================${NC}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found. Installing...${NC}"
    npm install -g firebase-tools
fi

# Get channel name from user or use default
if [ -z "$1" ]; then
    CHANNEL_ID="$DEFAULT_CHANNEL"
    echo -e "${YELLOW}📋 Using default channel ID: ${CHANNEL_ID}${NC}"
else
    CHANNEL_ID="$1"
    echo -e "${GREEN}📋 Using provided channel ID: ${CHANNEL_ID}${NC}"
fi

echo ""
echo -e "${BLUE}🏗️ Building project for Firebase...${NC}"
npm run build:firebase

echo ""
echo -e "${BLUE}🚀 Deploying to preview channel...${NC}"

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
    echo -e "${GREEN}🔗 Preview URL: ${PREVIEW_URL}${NC}"
    echo ""
    echo -e "${YELLOW}🔭 Opening preview URL...${NC}"
    
    # Copy URL to clipboard first
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}" || true
    
    # Try automatic Chrome profile opening
    if [ -f "scripts/open-in-chrome-profile.sh" ]; then
        chmod +x scripts/open-in-chrome-profile.sh
        echo -e "${BLUE}🤖 Attempting automatic Chrome profile opening...${NC}"
        ./scripts/open-in-chrome-profile.sh "$PREVIEW_URL"
    else
        # Fallback to manual instructions
        if [ -f "scripts/manual-preview-open.sh" ]; then
            chmod +x scripts/manual-preview-open.sh
            ./scripts/manual-preview-open.sh "$PREVIEW_URL"
        else
            echo -e "${YELLOW}⚠️  Opening with default browser...${NC}"
            open "$PREVIEW_URL" 2>/dev/null || {
                echo -e "${YELLOW}⚠️  Could not auto-open browser. Please manually visit:${NC}"
                echo -e "${GREEN}${PREVIEW_URL}${NC}"
            }
        fi
    fi
    
    echo ""
    echo -e "${BLUE}💡 Manual Access Instructions:${NC}"
    echo -e "${YELLOW}1. Open Chrome with REDACTED_ADMIN_USER@gmail.com profile${NC}"
    echo -e "${YELLOW}2. Navigate to: ${PREVIEW_URL}${NC}"
    echo -e "${YELLOW}3. URL is copied to clipboard (Cmd+V to paste)${NC}"
else
    echo -e "${YELLOW}⚠️  Could not extract preview URL from output${NC}"
fi
echo ""
echo -e "${PURPLE}🛠️ Management Commands:${NC}"
echo -e "${YELLOW}List channels:${NC} firebase hosting:channel:list --project $PROJECT_ID"
echo -e "${YELLOW}Delete channel:${NC} firebase hosting:channel:delete $CHANNEL_ID --project $PROJECT_ID"
echo -e "${YELLOW}View channel:${NC} firebase hosting:channel:open $CHANNEL_ID --project $PROJECT_ID"
echo ""
echo -e "${GREEN}✅ Preview channel setup complete!${NC}"

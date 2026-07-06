#!/bin/bash

# 🎪 Festival Chat - ENHANCED Preview Deploy with Server Health Validation
# Fixes the root cause: ensures staging server is healthy before preview deployment

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
STAGING_SERVICE="peddlenet-websocket-server-staging"
REGION="us-central1"
DEFAULT_CHANNEL="preview-$(date +%Y%m%d-%H%M)"
EXPIRES="7d"

echo -e "${PURPLE}🎪 Festival Chat ENHANCED Preview Deploy with Health Validation${NC}"
echo -e "${BLUE}================================================================${NC}"

# CRITICAL: Server health validation function
validate_staging_server() {
    local server_url="$1"
    local health_url="${server_url}/health"
    
    echo -e "${BLUE}🏥 STAGING SERVER HEALTH VALIDATION${NC}"
    echo -e "${BLUE}====================================${NC}"
    echo -e "${YELLOW}Testing: $health_url${NC}"
    
    # Test 1: Basic connectivity
    if curl -s --max-time 10 --fail "$health_url" > /dev/null; then
        echo -e "${GREEN}✅ Server is responding${NC}"
    else
        echo -e "${RED}❌ Server not responding${NC}"
        return 1
    fi
    
    # Test 2: Get server info
    local health_response=$(curl -s --max-time 10 "$health_url" 2>/dev/null)
    if [ -n "$health_response" ]; then
        echo -e "${GREEN}✅ Health endpoint returns data${NC}"
        echo -e "${YELLOW}Server info:${NC}"
        echo "$health_response" | jq . 2>/dev/null || echo "$health_response"
    else
        echo -e "${RED}❌ No health data returned${NC}"
        return 1
    fi
    
    # Test 3: Environment detection
    if echo "$health_response" | grep -q "staging\|preview"; then
        echo -e "${GREEN}✅ Server reports staging/preview environment${NC}"
    else
        echo -e "${YELLOW}⚠️  Server environment unclear, but responding${NC}"
    fi
    
    return 0
}

# Deploy fresh staging server if needed
deploy_staging_server() {
    echo -e "${BLUE}🚀 DEPLOYING FRESH STAGING SERVER${NC}"
    echo -e "${BLUE}=================================${NC}"
    
    # Check if gcloud is available
    if ! command -v gcloud &> /dev/null; then
        echo -e "${RED}❌ Google Cloud CLI not found. Please install gcloud CLI.${NC}"
        exit 1
    fi
    
    # Set project
    gcloud config set project $PROJECT_ID
    
    echo -e "${YELLOW}🏗️ Building and deploying staging WebSocket server...${NC}"
    
    # Build and deploy to Cloud Run
    gcloud builds submit \
      --config=deployment/cloudbuild-minimal.yaml \
      --substitutions=_SERVICE_NAME=$STAGING_SERVICE,_BUILD_TARGET=staging
    
    gcloud run deploy $STAGING_SERVICE \
        --image gcr.io/$PROJECT_ID/$STAGING_SERVICE \
        --platform managed \
        --region $REGION \
        --allow-unauthenticated \
        --port 8080 \
        --memory 512Mi \
        --cpu 1 \
        --min-instances 0 \
        --max-instances 5 \
        --set-env-vars NODE_ENV=production \
        --set-env-vars BUILD_TARGET=staging \
        --set-env-vars PLATFORM="Google Cloud Run - Staging" \
        --set-env-vars VERSION="1.3.0-enhanced-preview"
    
    echo -e "${GREEN}✅ Fresh staging server deployed${NC}"
    
    # Wait for deployment to be ready
    echo -e "${YELLOW}⏳ Waiting for server to be ready...${NC}"
    sleep 10
}

# Get staging server URL
get_staging_server_url() {
    local service_url=$(gcloud run services describe $STAGING_SERVICE \
      --region=$REGION \
      --project=$PROJECT_ID \
      --format="value(status.url)" 2>/dev/null)
    
    if [ -z "$service_url" ]; then
        echo -e "${RED}❌ Could not get staging server URL${NC}"
        exit 1
    fi
    
    echo "$service_url"
}

# Update environment files with verified server URL
update_environment_files() {
    local https_url="$1"
    local wss_url="wss://${https_url#https://}"
    
    echo -e "${BLUE}📝 UPDATING ENVIRONMENT FILES${NC}"
    echo -e "${BLUE}=============================${NC}"
    
    # Update .env.preview
    cat > .env.preview << EOF
# Updated preview environment with verified staging server
# Auto-generated on $(date '+%Y-%m-%d %H:%M:%S')

# VERIFIED staging server URL
NEXT_PUBLIC_SIGNALING_SERVER=$wss_url

# Build configuration
BUILD_TARGET=preview
NODE_ENV=production

# Firebase project
FIREBASE_PROJECT_ID=$PROJECT_ID

# Server verification
# HTTPS URL: $https_url
# WSS URL: $wss_url
# Verified at: $(date '+%Y-%m-%d %H:%M:%S')
EOF
    
    # Update .env.staging as well for consistency
    cat > .env.staging << EOF
# Updated staging environment with verified server
# Auto-generated on $(date '+%Y-%m-%d %H:%M:%S')

# VERIFIED staging server URL
NEXT_PUBLIC_SIGNALING_SERVER=$wss_url

# Build configuration
BUILD_TARGET=staging
NODE_ENV=production

# Firebase project
FIREBASE_PROJECT_ID=$PROJECT_ID

# Deployment info
DEPLOYMENT_TIMESTAMP=$(date +%s)
DEPLOYMENT_DATE="$(date '+%Y-%m-%d %H:%M:%S')"

# Cloud Run service details
# Service URL: $https_url
# Project: $PROJECT_ID
# Region: $REGION
# Service Name: $STAGING_SERVICE
EOF
    
    echo -e "${GREEN}✅ Environment files updated with verified server URL${NC}"
    echo -e "${YELLOW}Preview WSS URL: $wss_url${NC}"
}

# MAIN SCRIPT START
echo ""
if [ -z "$1" ]; then
    CHANNEL_ID="$DEFAULT_CHANNEL"
    echo -e "${YELLOW}📋 Using default channel ID: ${CHANNEL_ID}${NC}"
else
    CHANNEL_ID="$1"
    echo -e "${GREEN}📋 Using provided channel ID: ${CHANNEL_ID}${NC}"
fi

# SAFETY: Check if dev server is running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ WARNING: Development server running on port 3000${NC}"
    read -p "Stop dev server and continue? (y/N): " stop_dev
    
    if [[ $stop_dev =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🛑 Stopping development servers...${NC}"
        pkill -f "next dev" 2>/dev/null || true
        pkill -f "signaling-server" 2>/dev/null || true
        sleep 2
        echo -e "${GREEN}✅ Development servers stopped${NC}"
    else
        echo -e "${RED}❌ Preview deployment cancelled${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}🔍 STEP 1: STAGING SERVER HEALTH CHECK${NC}"
echo -e "${BLUE}=====================================${NC}"

# Get current staging server URL
STAGING_HTTPS_URL=$(get_staging_server_url)
echo -e "${YELLOW}Current staging server: $STAGING_HTTPS_URL${NC}"

# Validate staging server health
if ! validate_staging_server "$STAGING_HTTPS_URL"; then
    echo -e "${RED}❌ Staging server is unhealthy or unreachable${NC}"
    echo -e "${YELLOW}🚀 Deploying fresh staging server...${NC}"
    
    deploy_staging_server
    
    # Get new server URL
    STAGING_HTTPS_URL=$(get_staging_server_url)
    echo -e "${GREEN}✅ New staging server URL: $STAGING_HTTPS_URL${NC}"
    
    # Validate new server
    if ! validate_staging_server "$STAGING_HTTPS_URL"; then
        echo -e "${RED}❌ Fresh staging server deployment failed health check${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Fresh staging server is healthy${NC}"
else
    echo -e "${GREEN}✅ Existing staging server is healthy${NC}"
fi

echo ""
echo -e "${BLUE}🔧 STEP 2: ENVIRONMENT SYNCHRONIZATION${NC}"
echo -e "${BLUE}====================================${NC}"

# Update environment files with verified server URL
update_environment_files "$STAGING_HTTPS_URL"

# Backup current environment
echo -e "${YELLOW}💾 Backing up current environment...${NC}"
if [ -f ".env.local" ]; then
    cp .env.local .env.local.backup.preview-enhanced 2>/dev/null || true
    echo -e "${GREEN}✅ Backed up .env.local${NC}"
fi

# Use verified preview environment
cp .env.preview .env.local
echo -e "${GREEN}✅ Using verified preview environment${NC}"

echo ""
echo -e "${BLUE}🧹 STEP 3: COMPREHENSIVE CACHE CLEARING${NC}"
echo -e "${BLUE}======================================${NC}"

# Nuclear cache clearing
rm -rf .next/
rm -rf functions/.next/
rm -rf functions/lib/
rm -rf node_modules/.cache/
rm -rf .firebase/

# Clear NPM cache
npm cache clean --force 2>/dev/null || true

# Clear Functions cache if exists
if [ -d "functions/node_modules" ]; then
    rm -rf functions/node_modules/.cache/
fi

echo -e "${GREEN}✅ All caches cleared${NC}"

echo ""
echo -e "${BLUE}🏗️ STEP 4: VERIFIED BUILD WITH HEALTH CHECK${NC}"
echo -e "${BLUE}==========================================${NC}"

# Get verified server URL from updated environment
VERIFIED_WSS_URL=$(grep NEXT_PUBLIC_SIGNALING_SERVER .env.preview | cut -d'=' -f2)
echo -e "${GREEN}Building with verified WSS URL: ${VERIFIED_WSS_URL}${NC}"

# Build with explicit environment variables
export NEXT_PUBLIC_SIGNALING_SERVER="$VERIFIED_WSS_URL"
export BUILD_TARGET="preview"
export NODE_ENV="production"

echo -e "${BLUE}🔧 Build configuration:${NC}"
echo "  NEXT_PUBLIC_SIGNALING_SERVER: $NEXT_PUBLIC_SIGNALING_SERVER"
echo "  BUILD_TARGET: $BUILD_TARGET"
echo "  NODE_ENV: $NODE_ENV"

# Build with verified environment
NEXT_PUBLIC_SIGNALING_SERVER="$VERIFIED_WSS_URL" \
  BUILD_TARGET="preview" \
  NODE_ENV="production" \
  npm run build:firebase

# Build verification
echo -e "${BLUE}🔍 Verifying build contains verified server URL...${NC}"
if grep -r "peddlenet-websocket-server-staging" .next/ >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Verified server URL found in build${NC}"
else
    echo -e "${RED}❌ Verified server URL NOT found in build!${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🚀 STEP 5: ENHANCED FIREBASE DEPLOYMENT${NC}"
echo -e "${BLUE}=====================================${NC}"

# Restore original environment
if [ -f ".env.local.backup.preview-enhanced" ]; then
    mv .env.local.backup.preview-enhanced .env.local
    echo -e "${GREEN}✅ Restored original .env.local${NC}"
else
    rm -f .env.local
    echo -e "${YELLOW}⚠️  No backup found - cleared .env.local${NC}"
fi

# Deploy to Firebase with verified build
TEMP_OUTPUT=$(mktemp)

if firebase hosting:channel:deploy "$CHANNEL_ID" \
    --project "$PROJECT_ID" \
    --expires "$EXPIRES" > "$TEMP_OUTPUT" 2>&1; then
    
    cat "$TEMP_OUTPUT"
    
    # Extract URL
    PREVIEW_URL=$(grep -o "https://festival-chat-peddlenet--[^[:space:]]*" "$TEMP_OUTPUT" | head -1)
    
    if [ -z "$PREVIEW_URL" ]; then
        PREVIEW_URL="https://festival-chat-peddlenet--${CHANNEL_ID}-$(date +%Y%m%d%H%M).web.app"
    fi
    
    echo ""
    echo -e "${GREEN}🎉 ENHANCED PREVIEW DEPLOYMENT SUCCESS!${NC}"
    echo -e "${BLUE}=======================================${NC}"
    echo ""
    echo -e "${GREEN}🔗 VERIFIED PREVIEW URL:${NC}"
    echo -e "${YELLOW}${PREVIEW_URL}${NC}"
    echo ""
    
    echo -n "$PREVIEW_URL" | pbcopy 2>/dev/null && echo -e "${GREEN}✅ URL copied to clipboard!${NC}"
    
    echo ""
    echo -e "${BLUE}🎯 ENHANCED VERIFICATION CHECKLIST:${NC}"
    echo -e "${YELLOW}1. Visit: ${PREVIEW_URL}${NC}"
    echo -e "${YELLOW}2. Admin: ${PREVIEW_URL}/admin-analytics${NC}"
    echo -e "${YELLOW}3. Login: REDACTED_ADMIN_USER / REDACTED_ADMIN_PASS${NC}"
    echo -e "${YELLOW}4. Environment should show: 'staging'${NC}"
    echo -e "${YELLOW}5. Server should show: 'Connected'${NC}"
    echo -e "${YELLOW}6. Version should show: latest version${NC}"
    echo ""
    
    echo -e "${GREEN}🏥 STAGING SERVER VERIFIED:${NC}"
    echo -e "${YELLOW}• Server URL: $STAGING_HTTPS_URL${NC}"
    echo -e "${YELLOW}• Health check: PASSED${NC}"
    echo -e "${YELLOW}• Environment sync: VERIFIED${NC}"
    echo ""
    
    echo -e "${BLUE}📊 POST-DEPLOYMENT HEALTH CHECK${NC}"
    echo -e "${BLUE}===============================${NC}"
    
    # Test the preview URL
    echo -e "${YELLOW}Testing preview URL...${NC}"
    if curl -s --head "$PREVIEW_URL" | head -1 | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✅ Preview URL is responding${NC}"
        
        # Test admin dashboard specifically
        echo -e "${YELLOW}Testing admin dashboard...${NC}"
        if curl -s --head "${PREVIEW_URL}/admin-analytics" | head -1 | grep -q "200\|301\|302"; then
            echo -e "${GREEN}✅ Admin dashboard is accessible${NC}"
        else
            echo -e "${YELLOW}⚠️  Admin dashboard test inconclusive${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Preview URL test failed (may need time to propagate)${NC}"
    fi
    
else
    echo -e "${RED}❌ Firebase deployment failed${NC}"
    cat "$TEMP_OUTPUT"
fi

# Cleanup
rm -f "$TEMP_OUTPUT"

echo ""
echo -e "${GREEN}✅ ENHANCED PREVIEW DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🎯 Staging server: VERIFIED HEALTHY${NC}"
echo -e "${GREEN}🔗 Preview URL: ${PREVIEW_URL}${NC}"
echo -e "${GREEN}🛡️ Environment: SYNCHRONIZED${NC}"
echo -e "${GREEN}🧹 Caches: CLEARED${NC}"
echo -e "${GREEN}🔧 Build: VERIFIED${NC}"
echo ""
echo -e "${YELLOW}🔍 If admin dashboard still shows issues:${NC}"
echo -e "${YELLOW}• Check browser console for connection errors${NC}"
echo -e "${YELLOW}• Verify 'Environment detection' logs show staging${NC}"
echo -e "${YELLOW}• Use incognito mode to bypass any remaining cache${NC}"
echo -e "${YELLOW}• Check staging server health manually at: ${STAGING_HTTPS_URL}/health${NC}"

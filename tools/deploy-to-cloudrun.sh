#!/bin/bash

# Deploy WebSocket Server to Google Cloud Run

set -e

echo "☁️ Deploy WebSocket Server to Google Cloud Run"
echo "==============================================="

# Configuration
PROJECT_ID="peddlenet-1749130439"
SERVICE_NAME="peddlenet-websocket-server"
REGION="us-central1"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "📋 Configuration:"
echo "   Project: $PROJECT_ID"
echo "   Service: $SERVICE_NAME"
echo "   Region: $REGION"
echo "   Image: $IMAGE_NAME"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Installing..."
    echo "📝 Please install gcloud CLI:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Authenticate and set project
echo "🔑 Setting up Google Cloud authentication..."
gcloud auth login
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# Build the container image
echo "🏗️ Building container image..."
gcloud builds submit --tag $IMAGE_NAME .

# Deploy to Cloud Run
# COST: min-instances was 1 (anti-cold-start). A pinned warm instance bills
# 24/7 even with zero traffic — it showed up as "Min Instance CPU" on the bill.
# Set to 0 for dev/beta. RESTORE TO 1 before a real festival launch if the
# cold-start delay on first WebSocket connect is unacceptable.
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image $IMAGE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 10 \
    --set-env-vars NODE_ENV=production \
    --set-env-vars PLATFORM="Google Cloud Run" \
    --set-env-vars KEEP_WARM_URL="$SERVICE_URL/health"

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")

echo ""
echo "🎉 Deployment Complete!"
echo "======================"
echo "🔗 WebSocket Server URL: $SERVICE_URL"
echo "🔍 Health Check: $SERVICE_URL/health"
echo "🌐 WebSocket Endpoint: wss://${SERVICE_URL#https://}"
echo ""
echo "📝 Next steps:"
echo "1. Test the health check: curl $SERVICE_URL/health"
echo "2. Update Firebase environment:"
echo "   NEXT_PUBLIC_SIGNALING_SERVER=wss://${SERVICE_URL#https://}"
echo "3. Rebuild and redeploy Firebase with new WebSocket URL"
echo ""
echo "🔧 Commands to update Firebase:"
echo "   echo 'NEXT_PUBLIC_SIGNALING_SERVER=wss://${SERVICE_URL#https://}' > .env.firebase"
echo "   npm run build:firebase"
echo "   firebase deploy --only hosting"

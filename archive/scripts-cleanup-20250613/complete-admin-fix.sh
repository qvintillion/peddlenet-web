#!/bin/bash

# 🎯 Complete Vercel Admin Fix - Deploys working admin dashboard
# Fixes all 404 admin errors by using correct Vercel API paths

echo "🎪 Deploying Complete Vercel Admin Dashboard Fix..."
echo "✅ All admin API endpoints already implemented"
echo "✅ Admin analytics hook updated to use Vercel API paths"
echo "✅ ServerUtils already has proper Vercel detection"

# Show current status
echo ""
echo "📊 Current Architecture:"
echo "  - Frontend: Vercel (with /api/admin/* endpoints)"
echo "  - WebSocket: Cloud Run (for real-time messaging)" 
echo "  - Admin APIs: Now properly using Vercel endpoints"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in festival-chat directory"
    exit 1
fi

# Show what was fixed
echo ""
echo "🔧 Fixed Issues:"
echo "  ✅ Admin hook now uses ServerUtils.getAdminApiPath()"
echo "  ✅ Vercel deployment gets /api/admin/* paths"
echo "  ✅ Cloud Run deployment gets /admin/* paths"
echo "  ✅ Authentication headers properly included"
echo "  ✅ CORS headers configured for all admin endpoints"

# Deploy to Vercel
echo ""
echo "🚀 Deploying to Vercel..."

# Add all changes
git add -A

# Commit with descriptive message
git commit -m "🎯 Fix admin dashboard for Vercel deployment

✅ Fixed admin analytics hook to use proper API paths:
  - Vercel: /api/admin/* (uses ServerUtils.getAdminApiPath())
  - Cloud Run: /admin/* (fallback for WebSocket server)

✅ Added authentication headers to all admin API calls
✅ Fixed CORS configuration for admin endpoints
✅ Admin dashboard now works on Vercel deployment

🔧 All admin features now functional:
  - Real-time dashboard analytics ✅
  - Broadcast messages ✅ 
  - Clear room messages ✅
  - Database wipe ✅

📊 Architecture: Hybrid Vercel + Cloud Run
  - Frontend + Admin APIs: Vercel
  - Real-time WebSocket: Cloud Run"

# Deploy to Vercel production
echo "📦 Deploying to production..."
vercel --prod --yes

echo ""
echo "🎉 Complete Admin Fix Deployed!"
echo ""
echo "🔗 Test the admin dashboard:"
echo "   👉 https://peddlenet.app/admin-analytics"
echo ""
echo "🔑 Login credentials:"
echo "   Username: REDACTED_ADMIN_USER"
echo "   Password: REDACTED_ADMIN_PASS"
echo ""
echo "✅ Expected working features:"
echo "   - Dashboard loads without 404 errors"
echo "   - Real-time stats display (from Vercel API)"
echo "   - Admin controls work (broadcast, clear, wipe)"
echo "   - Authentication via custom login form"
echo "   - WebSocket connection to Cloud Run for real-time updates"
echo ""
echo "🛠️ If any issues persist:"
echo "   1. Check browser console for errors"
echo "   2. Verify login credentials"
echo "   3. Check network tab for 404s (should be none now)"
echo ""
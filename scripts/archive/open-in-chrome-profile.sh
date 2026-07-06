#!/bin/bash

# 🎪 Festival Chat - Chrome Profile Browser Opener (Enhanced)
# Opens URLs in the correct Chrome profile for REDACTED_ADMIN_USER@gmail.com

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🌐 Chrome Profile Browser Opener${NC}"

# Get URL from command line argument
URL="$1"
if [ -z "$URL" ]; then
    echo -e "${RED}❌ Please provide a URL to open${NC}"
    echo -e "${YELLOW}Usage: $0 <url>${NC}"
    exit 1
fi

# Chrome application path on macOS
CHROME_APP="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if [ ! -f "$CHROME_APP" ]; then
    echo -e "${RED}❌ Google Chrome not found at expected location${NC}"
    echo -e "${YELLOW}📝 Falling back to default browser...${NC}"
    open "$URL"
    exit 0
fi

# Chrome profiles directory
CHROME_PROFILES_DIR="$HOME/Library/Application Support/Google/Chrome"

echo -e "${BLUE}🔍 Searching for Chrome profiles...${NC}"

# Function to find profile with REDACTED_ADMIN_USER@gmail.com
find_target_profile() {
    if [ ! -d "$CHROME_PROFILES_DIR" ]; then
        echo -e "${YELLOW}⚠️  Chrome profiles directory not found${NC}"
        return 1
    fi
    
    # Look for profiles containing REDACTED_ADMIN_USER@gmail.com references
    for profile_dir in "$CHROME_PROFILES_DIR"/*/; do
        if [ -d "$profile_dir" ]; then
            profile_name=$(basename "$profile_dir")
            
            # Skip system directories
            if [[ "$profile_name" == "Crash Reports" || "$profile_name" == "ShaderCache" || "$profile_name" == "component_crx_cache" ]]; then
                continue
            fi
            
            # Check if this profile has preferences mentioning our email
            preferences_file="$profile_dir/Preferences"
            if [ -f "$preferences_file" ]; then
                if grep -q "REDACTED_ADMIN_USER@gmail.com" "$preferences_file" 2>/dev/null; then
                    echo -e "${GREEN}✅ Found target profile: $profile_name${NC}"
                    echo "$profile_name"
                    return 0
                fi
            fi
        fi
    done
    
    return 1
}

# Function to list available profiles with more info
list_profiles_with_info() {
    echo -e "${BLUE}📋 Available Chrome profiles:${NC}"
    local profile_count=0
    
    for profile_dir in "$CHROME_PROFILES_DIR"/*/; do
        if [ -d "$profile_dir" ]; then
            profile_name=$(basename "$profile_dir")
            
            # Skip system directories
            if [[ "$profile_name" == "Crash Reports" || "$profile_name" == "ShaderCache" || "$profile_name" == "component_crx_cache" ]]; then
                continue
            fi
            
            ((profile_count++))
            
            # Get display name from Local State if available
            local_state="$CHROME_PROFILES_DIR/Local State"
            display_name=""
            if [ -f "$local_state" ]; then
                display_name=$(grep -A 10 "\"$profile_name\"" "$local_state" 2>/dev/null | grep '"name"' | cut -d'"' -f4)
            fi
            
            if [ -n "$display_name" ]; then
                echo -e "  ${YELLOW}$profile_count. $profile_name${NC} (${BLUE}$display_name${NC})"
            else
                echo -e "  ${YELLOW}$profile_count. $profile_name${NC}"
            fi
        fi
    done
    
    return $profile_count
}

# Try to find the correct profile
TARGET_PROFILE=$(find_target_profile)

if [ -n "$TARGET_PROFILE" ]; then
    echo -e "${GREEN}🎯 Opening URL in profile: $TARGET_PROFILE${NC}"
    echo -e "${BLUE}📧 Account: REDACTED_ADMIN_USER@gmail.com${NC}"
    echo -e "${BLUE}🔗 URL: $URL${NC}"
    
    # Open Chrome with specific profile
    "$CHROME_APP" --profile-directory="$TARGET_PROFILE" "$URL" 2>/dev/null &
    
    echo -e "${GREEN}✅ Chrome opened with target profile${NC}"
else
    echo -e "${YELLOW}⚠️  Could not find profile for REDACTED_ADMIN_USER@gmail.com${NC}"
    echo ""
    
    list_profiles_with_info
    profile_count=$?
    
    echo ""
    echo -e "${BLUE}🤔 Options:${NC}"
    echo -e "${YELLOW}1. Sign into REDACTED_ADMIN_USER@gmail.com in Chrome and try again${NC}"
    echo -e "${YELLOW}2. Choose a profile manually (Default is usually #1)${NC}"
    echo -e "${YELLOW}3. Let script try Default profile${NC}"
    echo ""
    
    # Interactive profile selection
    echo -e "${BLUE}Choose an option:${NC}"
    echo -e "${YELLOW}[1] Try Default profile${NC}"
    echo -e "${YELLOW}[2] List profile details for investigation${NC}"
    echo -e "${YELLOW}[3] Open in default browser instead${NC}"
    echo -n "Enter choice [1-3]: "
    
    read -r choice
    
    case $choice in
        "1"|"")
            echo -e "${YELLOW}🎯 Trying Default profile...${NC}"
            "$CHROME_APP" --profile-directory="Default" "$URL" 2>/dev/null &
            echo -e "${GREEN}✅ Chrome opened with Default profile${NC}"
            ;;
        "2")
            echo -e "${BLUE}🔍 Running profile investigation...${NC}"
            if [ -f "scripts/investigate-chrome-profiles.sh" ]; then
                chmod +x scripts/investigate-chrome-profiles.sh
                ./scripts/investigate-chrome-profiles.sh
            else
                echo -e "${RED}❌ Profile investigator not found${NC}"
            fi
            exit 0
            ;;
        "3")
            echo -e "${YELLOW}🌐 Opening in default browser...${NC}"
            open "$URL"
            ;;
        *)
            echo -e "${RED}❌ Invalid choice${NC}"
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${BLUE}💡 If you're still asked to sign in:${NC}"
echo -e "${YELLOW}1. Make sure REDACTED_ADMIN_USER@gmail.com is signed into this Chrome profile${NC}"
echo -e "${YELLOW}2. Check if you have multiple Google accounts and switch to the right one${NC}"
echo -e "${YELLOW}3. Try signing out and back in to REDACTED_ADMIN_USER@gmail.com in Chrome${NC}"
echo ""
echo -e "${PURPLE}🎪 URL opened in Chrome!${NC}"

#!/bin/bash

# 🔍 Chrome Profile Investigator
# Let's find out exactly what Chrome profiles you have and which one has REDACTED_ADMIN_USER@gmail.com

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🔍 Chrome Profile Investigator${NC}"
echo -e "${BLUE}===============================${NC}"

# Chrome profiles directory
CHROME_PROFILES_DIR="$HOME/Library/Application Support/Google/Chrome"

if [ ! -d "$CHROME_PROFILES_DIR" ]; then
    echo -e "${RED}❌ Chrome profiles directory not found at: $CHROME_PROFILES_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Chrome profiles directory: $CHROME_PROFILES_DIR${NC}"
echo ""

# Function to get profile info
get_profile_info() {
    local profile_dir="$1"
    local profile_name=$(basename "$profile_dir")
    
    echo -e "${YELLOW}📋 Profile: $profile_name${NC}"
    
    # Check Preferences file
    local preferences_file="$profile_dir/Preferences"
    if [ -f "$preferences_file" ]; then
        # Look for account info
        local account_info=$(grep -o '"account_info":\[.*\]' "$preferences_file" 2>/dev/null | head -1)
        local signin_info=$(grep -o '"signin":{[^}]*}' "$preferences_file" 2>/dev/null | head -1)
        
        # Look for email addresses
        local emails=$(grep -o '[a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]*\.[a-zA-Z]{2,}' "$preferences_file" 2>/dev/null | sort | uniq)
        
        if [ -n "$emails" ]; then
            echo -e "  ${GREEN}📧 Found emails:${NC}"
            while IFS= read -r email; do
                if [ "$email" = "REDACTED_ADMIN_USER@gmail.com" ]; then
                    echo -e "    ${GREEN}🎯 $email (TARGET FOUND!)${NC}"
                else
                    echo -e "    ${BLUE}   $email${NC}"
                fi
            done <<< "$emails"
        else
            echo -e "  ${YELLOW}📧 No emails found in preferences${NC}"
        fi
        
        # Check if signed in
        if echo "$signin_info" | grep -q '"signin_allowed":true' 2>/dev/null; then
            echo -e "  ${GREEN}🔐 Sign-in: Allowed${NC}"
        else
            echo -e "  ${YELLOW}🔐 Sign-in: Not configured${NC}"
        fi
        
    else
        echo -e "  ${RED}❌ No Preferences file found${NC}"
    fi
    
    # Check Local State for profile names
    local local_state="$CHROME_PROFILES_DIR/Local State"
    if [ -f "$local_state" ]; then
        local profile_display_name=$(grep -A 10 "\"$profile_name\"" "$local_state" 2>/dev/null | grep '"name"' | cut -d'"' -f4)
        if [ -n "$profile_display_name" ]; then
            echo -e "  ${BLUE}👤 Display Name: $profile_display_name${NC}"
        fi
    fi
    
    echo ""
}

echo -e "${BLUE}🔍 Analyzing all Chrome profiles...${NC}"
echo ""

# List all profiles
for profile_dir in "$CHROME_PROFILES_DIR"/*/; do
    if [ -d "$profile_dir" ]; then
        profile_name=$(basename "$profile_dir")
        # Skip system directories
        if [[ "$profile_name" != "Crash Reports" && "$profile_name" != "ShaderCache" && "$profile_name" != "component_crx_cache" ]]; then
            get_profile_info "$profile_dir"
        fi
    fi
done

# Also check Default profile specifically
if [ -d "$CHROME_PROFILES_DIR/Default" ]; then
    echo -e "${PURPLE}🎯 Default Profile Analysis:${NC}"
    get_profile_info "$CHROME_PROFILES_DIR/Default"
fi

echo -e "${PURPLE}💡 Recommendations:${NC}"
echo -e "${YELLOW}1. Look for the profile marked 'TARGET FOUND!' above${NC}"
echo -e "${YELLOW}2. If no target found, check which profile you actually use for REDACTED_ADMIN_USER@gmail.com${NC}"
echo -e "${YELLOW}3. You might need to sign into REDACTED_ADMIN_USER@gmail.com in Chrome first${NC}"
echo -e "${YELLOW}4. Or specify a different profile manually${NC}"

echo ""
echo -e "${BLUE}🚀 Next steps:${NC}"
echo -e "${YELLOW}• If target found: The script should work automatically${NC}"
echo -e "${YELLOW}• If not found: Sign into REDACTED_ADMIN_USER@gmail.com in Chrome, then run this again${NC}"
echo -e "${YELLOW}• Alternative: Use 'npm run preview:open <url>' to test profile opening${NC}"

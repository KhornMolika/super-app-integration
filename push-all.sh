#!/usr/bin/env bash

# ==============================================================================
# Multi-Remote Git Push Automation Script for Super App
# ==============================================================================
# Automates: git add ., commit with message, Monorepo push, Frontend subtree (fintech), and Backend subtree (fintech-backend).
# ==============================================================================

set -e

# ANSI Color codes
BOLD="\033[1m"
GREEN="\033[0;32m"
CYAN="\033[0;36m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BLUE="\033[0;34m"
RESET="\033[0m"

echo -e "${BOLD}${CYAN}======================================================${RESET}"
echo -e "${BOLD}${CYAN} 🚀 Super App - Multi-Remote Push Automation ${RESET}"
echo -e "${BOLD}${CYAN}======================================================${RESET}\n"

# Verify in Git root
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Not inside a Git repository!${RESET}"
  exit 1
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# ==============================================================================
# 1. Check for Uncommitted Changes & Prompt to Commit (git add . && git commit)
# ==============================================================================
STATUS_CHANGES=$(git status --porcelain)

if [ -n "$STATUS_CHANGES" ]; then
  echo -e "${BOLD}${YELLOW}📝 Uncommitted changes detected:${RESET}"
  git status --short
  echo ""
  
  read -r -p "Enter commit message (or leave blank to skip commit): " COMMIT_MSG
  
  if [ -n "$COMMIT_MSG" ]; then
    echo -e "\n${CYAN}➜ Running: git add .${RESET}"
    git add .
    echo -e "${CYAN}➜ Running: git commit -m \"$COMMIT_MSG\"${RESET}"
    git commit -m "$COMMIT_MSG"
    echo -e "${GREEN}✔ Changes staged and committed successfully!${RESET}\n"
  else
    echo -e "${YELLOW}ℹ Skipping commit. Proceeding with existing commits...${RESET}\n"
  fi
else
  echo -e "${GREEN}✔ Working directory clean (no uncommitted changes).${RESET}\n"
fi

# ==============================================================================
# 2. Select Source Branch
# ==============================================================================
mapfile -t LOCAL_BRANCHES < <(git for-each-ref --format='%(refname:short)' refs/heads/)

if [ ${#LOCAL_BRANCHES[@]} -eq 0 ]; then
  echo -e "${RED}❌ No local branches found!${RESET}"
  exit 1
fi

SOURCE_BRANCH=""
if [ -n "$1" ]; then
  SOURCE_BRANCH="$1"
  echo -e "${GREEN}✔ Source branch passed as argument: ${BOLD}${SOURCE_BRANCH}${RESET}"
else
  echo -e "${BOLD}Select the local branch you want to push:${RESET}"
  CURRENT_INDEX=1
  for i in "${!LOCAL_BRANCHES[@]}"; do
    BRANCH_NAME="${LOCAL_BRANCHES[$i]}"
    NUM=$((i + 1))
    if [ "$BRANCH_NAME" == "$CURRENT_BRANCH" ]; then
      echo -e "  ${CYAN}[$NUM] $BRANCH_NAME (current)${RESET}"
      CURRENT_INDEX=$NUM
    else
      echo -e "  [$NUM] $BRANCH_NAME"
    fi
  done

  read -r -p "Enter number [Default: $CURRENT_INDEX ($CURRENT_BRANCH)]: " BRANCH_CHOICE
  BRANCH_CHOICE=${BRANCH_CHOICE:-$CURRENT_INDEX}

  if [[ "$BRANCH_CHOICE" =~ ^[0-9]+$ ]] && [ "$BRANCH_CHOICE" -ge 1 ] && [ "$BRANCH_CHOICE" -le "${#LOCAL_BRANCHES[@]}" ]; then
    SOURCE_BRANCH="${LOCAL_BRANCHES[$((BRANCH_CHOICE - 1))]}"
  else
    if [[ " ${LOCAL_BRANCHES[*]} " =~ " ${BRANCH_CHOICE} " ]]; then
      SOURCE_BRANCH="$BRANCH_CHOICE"
    else
      echo -e "${YELLOW}ℹ Defaulting to current branch: $CURRENT_BRANCH${RESET}"
      SOURCE_BRANCH="$CURRENT_BRANCH"
    fi
  fi
fi

echo -e "\n${GREEN}✔ Selected source branch: ${BOLD}${SOURCE_BRANCH}${RESET}\n"

# ==============================================================================
# 3. Select Target Branch on Remotes (Numbered Menu to Prevent Mis-typing)
# ==============================================================================
TARGET_BRANCH=""
if [ -n "$2" ]; then
  TARGET_BRANCH="$2"
  echo -e "${GREEN}✔ Target remote branch passed as argument: ${BOLD}${TARGET_BRANCH}${RESET}"
else
  echo -e "${BOLD}Select target remote branch:${RESET}"
  echo -e "  ${CYAN}[1] Same as source branch ($SOURCE_BRANCH) [Default]${RESET}"
  echo -e "  [2] development"
  echo -e "  [3] main"
  echo -e "  [4] Custom branch name"
  read -r -p "Enter choice [Default: 1 ($SOURCE_BRANCH)]: " TARGET_MENU_CHOICE
  TARGET_MENU_CHOICE=${TARGET_MENU_CHOICE:-1}

  case "$TARGET_MENU_CHOICE" in
    1) TARGET_BRANCH="$SOURCE_BRANCH" ;;
    2) TARGET_BRANCH="development" ;;
    3) TARGET_BRANCH="main" ;;
    4)
      read -r -p "Enter custom target branch name: " CUSTOM_NAME
      TARGET_BRANCH=${CUSTOM_NAME:-$SOURCE_BRANCH}
      ;;
    *)
      # If user typed an exact branch name or number
      if [ "$TARGET_MENU_CHOICE" == "$SOURCE_BRANCH" ] || [ "$TARGET_MENU_CHOICE" == "development" ] || [ "$TARGET_MENU_CHOICE" == "main" ]; then
        TARGET_BRANCH="$TARGET_MENU_CHOICE"
      else
        TARGET_BRANCH="$SOURCE_BRANCH"
      fi
      ;;
  esac
fi

echo -e "\n${GREEN}✔ Target branch on remotes: ${BOLD}${TARGET_BRANCH}${RESET}\n"

# ==============================================================================
# 4. Select Remotes
# ==============================================================================
REMOTE_CHOICE=""
if [ -n "$3" ]; then
  REMOTE_CHOICE="$3"
else
  echo -e "${BOLD}Select destination remote(s):${RESET}"
  echo -e "  ${CYAN}[1] All Remotes (origin + fintech + fintech-backend) [Recommended]${RESET}"
  echo -e "  [2] GitLab Both (fintech Frontend + fintech-backend Backend)"
  echo -e "  [3] GitLab Frontend only (fintech -> super-app-manager.git)"
  echo -e "  [4] GitLab Backend only (fintech-backend -> super-app.git)"
  echo -e "  [5] GitHub Monorepo only (origin -> super-app-integration.git)"
  read -r -p "Enter choice [Default: 1]: " USER_REMOTE_CHOICE
  REMOTE_CHOICE=${USER_REMOTE_CHOICE:-1}
fi

# Summary confirmation
echo -e "\n${BOLD}${YELLOW}------------------------------------------------------${RESET}"
echo -e "${BOLD}${YELLOW} Push Summary:${RESET}"
echo -e "  - Source Branch:   ${CYAN}${SOURCE_BRANCH}${RESET}"
echo -e "  - Target Branch:   ${CYAN}${TARGET_BRANCH}${RESET}"
case "$REMOTE_CHOICE" in
  1) echo -e "  - Destinations:    ${GREEN}origin (Monorepo), fintech (Frontend), fintech-backend (Backend)${RESET}" ;;
  2) echo -e "  - Destinations:    ${GREEN}fintech (Frontend), fintech-backend (Backend)${RESET}" ;;
  3) echo -e "  - Destinations:    ${GREEN}fintech (Frontend)${RESET}" ;;
  4) echo -e "  - Destinations:    ${GREEN}fintech-backend (Backend)${RESET}" ;;
  5) echo -e "  - Destinations:    ${GREEN}origin (Monorepo)${RESET}" ;;
  *) echo -e "${RED}❌ Invalid remote choice!${RESET}"; exit 1 ;;
esac
echo -e "${BOLD}${YELLOW}------------------------------------------------------${RESET}\n"

read -r -p "Proceed with push? [Y/n]: " CONFIRM
if [[ "$CONFIRM" =~ ^[nN] ]]; then
  echo -e "${YELLOW}Push cancelled.${RESET}"
  exit 0
fi

echo ""

# Helper to push to origin (Monorepo)
push_origin() {
  echo -e "${BOLD}${BLUE}📦 [1/3] Pushing Monorepo to origin ($TARGET_BRANCH)...${RESET}"
  if git push origin "$SOURCE_BRANCH":"$TARGET_BRANCH"; then
    echo -e "${GREEN}✔ Monorepo successfully pushed to origin/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to origin/$TARGET_BRANCH.${RESET}\n"
  fi
}

# Helper to push to fintech (Frontend superapp_backoffice)
push_fintech() {
  echo -e "${BOLD}${BLUE}🏢 [2/3] Splitting & Pushing superapp_backoffice to fintech ($TARGET_BRANCH)...${RESET}"
  echo -e "  ${CYAN}➜ Computing subtree split for superapp_backoffice...${RESET}"
  SPLIT_COMMIT=$(git subtree split --prefix=superapp_backoffice "$SOURCE_BRANCH")
  if [ -z "$SPLIT_COMMIT" ]; then
    echo -e "${RED}❌ Subtree split failed for superapp_backoffice!${RESET}\n"
    return 1
  fi
  echo -e "  ${CYAN}➜ Split commit: $SPLIT_COMMIT${RESET}"
  if git push fintech "$SPLIT_COMMIT":"$TARGET_BRANCH"; then
    echo -e "${GREEN}✔ Frontend successfully pushed to fintech/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to fintech/$TARGET_BRANCH.${RESET}\n"
  fi
}

# Helper to push to fintech-backend (Backend superapp_backend)
push_fintech_backend() {
  echo -e "${BOLD}${BLUE}⚙️  [3/3] Splitting & Pushing superapp_backend to fintech-backend ($TARGET_BRANCH)...${RESET}"
  echo -e "  ${CYAN}➜ Computing subtree split for superapp_backend...${RESET}"
  SPLIT_COMMIT=$(git subtree split --prefix=superapp_backend "$SOURCE_BRANCH")
  if [ -z "$SPLIT_COMMIT" ]; then
    echo -e "${RED}❌ Subtree split failed for superapp_backend!${RESET}\n"
    return 1
  fi
  echo -e "  ${CYAN}➜ Split commit: $SPLIT_COMMIT${RESET}"
  if git push fintech-backend "$SPLIT_COMMIT":"$TARGET_BRANCH"; then
    echo -e "${GREEN}✔ Backend successfully pushed to fintech-backend/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to fintech-backend/$TARGET_BRANCH.${RESET}\n"
  fi
}

case "$REMOTE_CHOICE" in
  1)
    push_origin
    push_fintech
    push_fintech_backend
    ;;
  2)
    push_fintech
    push_fintech_backend
    ;;
  3)
    push_fintech
    ;;
  4)
    push_fintech_backend
    ;;
  5)
    push_origin
    ;;
esac

echo -e "${BOLD}${GREEN}======================================================${RESET}"
echo -e "${BOLD}${GREEN} 🎉 All selected operations completed! ${RESET}"
echo -e "${BOLD}${GREEN}======================================================${RESET}"

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

# Verify in Git root and switch to toplevel
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo -e "${RED}❌ Error: Not inside a Git repository!${RESET}"
  exit 1
fi

GIT_ROOT=$(git rev-parse --show-toplevel)
cd "$GIT_ROOT"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD | tr -d '\r\n ')

# Rewritten by the backend while it runs locally: left out of commits
NEVER_COMMIT=(
  "superapp_backend/data/super_app_release.json"
)

# ==============================================================================
# 1. Check for Uncommitted Changes & Prompt to Commit (git add . && git commit)
# ==============================================================================
STATUS_CHANGES=$(git status --porcelain)

if [ -n "$STATUS_CHANGES" ]; then
  echo -e "${BOLD}${YELLOW}📝 Uncommitted changes detected:${RESET}"
  git status --short
  echo ""
  
  read -r -p "Enter commit message (or leave blank to skip commit): " COMMIT_MSG
  COMMIT_MSG=$(echo "$COMMIT_MSG" | tr -d '\r')
  
  if [ -n "$COMMIT_MSG" ]; then
    echo -e "\n${CYAN}➜ Running: git add .${RESET}"
    git add .
    # Files the backend rewrites while it runs locally: never part of a commit
    for f in "${NEVER_COMMIT[@]}"; do
      if ! git diff --cached --quiet -- "$f" 2>/dev/null; then
        git reset -q -- "$f"
        echo -e "${YELLOW}ℹ Left out (generated at runtime): $f${RESET}"
      fi
    done
    if git diff --cached --quiet; then
      echo -e "${YELLOW}ℹ Nothing left to commit. Proceeding with existing commits...${RESET}\n"
    else
      echo -e "\n${BOLD}Files in this commit:${RESET}"
      git diff --cached --stat
      read -r -p "Commit these files? [Y/n]: " COMMIT_OK
      if [[ "$(echo "$COMMIT_OK" | tr -d '\r')" =~ ^[nN] ]]; then
        git reset -q
        echo -e "${YELLOW}Commit cancelled (files unstaged).${RESET}"
        exit 0
      fi
      echo -e "${CYAN}➜ Running: git commit -m \"$COMMIT_MSG\"${RESET}"
      git commit -m "$COMMIT_MSG"
      echo -e "${GREEN}✔ Changes staged and committed successfully!${RESET}\n"
    fi
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
  SOURCE_BRANCH=$(echo "$1" | tr -d '\r\n ')
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
  BRANCH_CHOICE=$(echo "$BRANCH_CHOICE" | tr -d '\r\n ')
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

SOURCE_BRANCH=$(echo "$SOURCE_BRANCH" | tr -d '\r\n ')
echo -e "\n${GREEN}✔ Selected source branch: ${BOLD}${SOURCE_BRANCH}${RESET}\n"

# ==============================================================================
# 3. Select Target Branch on Remotes
# ==============================================================================
TARGET_BRANCH=""
if [ -n "$2" ]; then
  TARGET_BRANCH=$(echo "$2" | tr -d '\r\n ')
  echo -e "${GREEN}✔ Target remote branch passed as argument: ${BOLD}${TARGET_BRANCH}${RESET}"
else
  echo -e "${BOLD}Select target remote branch:${RESET}"
  echo -e "  ${CYAN}[1] Same as source branch ($SOURCE_BRANCH) [Default]${RESET}"
  echo -e "  [2] development"
  echo -e "  [3] main"
  echo -e "  [4] Custom branch name"
  read -r -p "Enter choice [Default: 1 ($SOURCE_BRANCH)]: " TARGET_MENU_CHOICE
  TARGET_MENU_CHOICE=$(echo "$TARGET_MENU_CHOICE" | tr -d '\r\n ')
  TARGET_MENU_CHOICE=${TARGET_MENU_CHOICE:-1}

  case "$TARGET_MENU_CHOICE" in
    1) TARGET_BRANCH="$SOURCE_BRANCH" ;;
    2) TARGET_BRANCH="development" ;;
    3) TARGET_BRANCH="main" ;;
    4)
      read -r -p "Enter custom target branch name: " CUSTOM_NAME
      CUSTOM_NAME=$(echo "$CUSTOM_NAME" | tr -d '\r\n ')
      TARGET_BRANCH=${CUSTOM_NAME:-$SOURCE_BRANCH}
      ;;
    *)
      if [ "$TARGET_MENU_CHOICE" == "$SOURCE_BRANCH" ] || [ "$TARGET_MENU_CHOICE" == "development" ] || [ "$TARGET_MENU_CHOICE" == "main" ]; then
        TARGET_BRANCH="$TARGET_MENU_CHOICE"
      else
        TARGET_BRANCH="$SOURCE_BRANCH"
      fi
      ;;
  esac
fi

TARGET_BRANCH=$(echo "$TARGET_BRANCH" | tr -d '\r\n ')
echo -e "\n${GREEN}✔ Target branch on remotes: ${BOLD}${TARGET_BRANCH}${RESET}\n"

# ==============================================================================
# 4. Select Remotes
# ==============================================================================
REMOTE_CHOICE=""
if [ -n "$3" ]; then
  REMOTE_CHOICE=$(echo "$3" | tr -d '\r\n ')
else
  echo -e "${BOLD}Select destination remote(s):${RESET}"
  echo -e "  ${CYAN}[1] All Remotes (origin + superapp-manager + superapp-backend + superapp-mobile) [Recommended]${RESET}"
  echo -e "  [2] GitLab All (superapp-manager Backoffice + superapp-backend Backend + superapp-mobile Mobile)"
  echo -e "  [3] GitLab Mobile only (superapp-mobile -> super-app.git)"
  echo -e "  [4] GitLab Backoffice only (superapp-manager -> super-app-manager.git)"
  echo -e "  [5] GitLab Backend only (superapp-backend -> super-app.git)"
  echo -e "  [6] GitHub Monorepo only (origin -> super-app-integration.git)"
  read -r -p "Enter choice [Default: 1]: " USER_REMOTE_CHOICE
  USER_REMOTE_CHOICE=$(echo "$USER_REMOTE_CHOICE" | tr -d '\r\n ')
  REMOTE_CHOICE=${USER_REMOTE_CHOICE:-1}
fi

REMOTE_CHOICE=$(echo "$REMOTE_CHOICE" | tr -d '\r\n ')

# Summary confirmation
echo -e "\n${BOLD}${YELLOW}------------------------------------------------------${RESET}"
echo -e "${BOLD}${YELLOW} Push Summary:${RESET}"
echo -e "  - Source Branch:   ${CYAN}${SOURCE_BRANCH}${RESET}"
echo -e "  - Target Branch:   ${CYAN}${TARGET_BRANCH}${RESET}"
case "$REMOTE_CHOICE" in
  1) echo -e "  - Destinations:    ${GREEN}origin (Monorepo), superapp-manager (Backoffice), superapp-backend (Backend), superapp-mobile (Mobile: super-app's own branch)${RESET}" ;;
  2) echo -e "  - Destinations:    ${GREEN}superapp-manager (Backoffice), superapp-backend (Backend), superapp-mobile (Mobile: super-app's own branch)${RESET}" ;;
  3) echo -e "  - Destinations:    ${GREEN}superapp-mobile (Mobile: super-app's own branch)${RESET}" ;;
  4) echo -e "  - Destinations:    ${GREEN}superapp-manager (Backoffice)${RESET}" ;;
  5) echo -e "  - Destinations:    ${GREEN}superapp-backend (Backend)${RESET}" ;;
  6) echo -e "  - Destinations:    ${GREEN}origin (Monorepo)${RESET}" ;;
  *) echo -e "${RED}❌ Invalid remote choice: '$REMOTE_CHOICE'${RESET}"; exit 1 ;;
esac
echo -e "${BOLD}${YELLOW}------------------------------------------------------${RESET}\n"

if [ -n "$4" ] && [[ "$4" =~ ^(-y|y|yes)$ ]]; then
  CONFIRM="y"
else
  read -r -p "Proceed with push? [Y/n]: " CONFIRM
  CONFIRM=$(echo "$CONFIRM" | tr -d '\r\n ')
fi
if [[ "$CONFIRM" =~ ^[nN] ]]; then
  echo -e "${YELLOW}Push cancelled.${RESET}"
  exit 0
fi

echo ""

# Helper to push to origin (Monorepo)
push_origin() {
  echo -e "${BOLD}${BLUE}📦 [1/4] Pushing Monorepo to origin ($TARGET_BRANCH)...${RESET}"
  if git push origin "$SOURCE_BRANCH":"$TARGET_BRANCH"; then
    echo -e "${GREEN}✔ Monorepo successfully pushed to origin/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to origin/$TARGET_BRANCH.${RESET}\n"
  fi
}

# Helper to push to superapp-manager (Backoffice superapp_backoffice)
push_superapp_manager() {
  echo -e "${BOLD}${BLUE}🏢 [2/4] Splitting & Pushing superapp_backoffice to superapp-manager ($TARGET_BRANCH)...${RESET}"
  echo -e "  ${CYAN}➜ Computing subtree split for superapp_backoffice...${RESET}"
  SPLIT_COMMIT=$(git subtree split --prefix=superapp_backoffice "$SOURCE_BRANCH" | tr -d '\r\n ')
  if [ -z "$SPLIT_COMMIT" ]; then
    echo -e "${RED}❌ Subtree split failed for superapp_backoffice!${RESET}\n"
    return 1
  fi
  echo -e "  ${CYAN}➜ Split commit: $SPLIT_COMMIT${RESET}"
  if [ "$(git ls-remote superapp-manager "refs/heads/$TARGET_BRANCH" | cut -f1)" = "$SPLIT_COMMIT" ]; then
    echo -e "${GREEN}✔ Backoffice already up to date on superapp-manager/$TARGET_BRANCH.${RESET}\n"
    return 0
  fi
  # --force: the split is rebuilt from the monorepo each time. Never commit to
  # superapp-manager directly: it would be overwritten here.
  if git push superapp-manager "$SPLIT_COMMIT":"refs/heads/$TARGET_BRANCH" --force; then
    echo -e "${GREEN}✔ Backoffice successfully pushed to superapp-manager/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to superapp-manager/$TARGET_BRANCH.${RESET}\n"
  fi
}

# Helper to push to superapp-backend (Backend superapp_backend)
push_superapp_backend() {
  echo -e "${BOLD}${BLUE}⚙️  [3/4] Splitting & Pushing superapp_backend to superapp-backend ($TARGET_BRANCH)...${RESET}"
  echo -e "  ${CYAN}➜ Computing subtree split for superapp_backend...${RESET}"
  SPLIT_COMMIT=$(git subtree split --prefix=superapp_backend "$SOURCE_BRANCH" | tr -d '\r\n ')
  if [ -z "$SPLIT_COMMIT" ]; then
    echo -e "${RED}❌ Subtree split failed for superapp_backend!${RESET}\n"
    return 1
  fi
  echo -e "  ${CYAN}➜ Split commit: $SPLIT_COMMIT${RESET}"
  if [ "$(git ls-remote superapp-backend "refs/heads/$TARGET_BRANCH" | cut -f1)" = "$SPLIT_COMMIT" ]; then
    echo -e "${GREEN}✔ Backend already up to date on superapp-backend/$TARGET_BRANCH.${RESET}\n"
    return 0
  fi
  # --force: the split is rebuilt from the monorepo each time. Never commit to
  # superapp-backend directly: it would be overwritten here.
  if git push superapp-backend "$SPLIT_COMMIT":"refs/heads/$TARGET_BRANCH" --force; then
    echo -e "${GREEN}✔ Backend successfully pushed to superapp-backend/$TARGET_BRANCH!${RESET}\n"
  else
    echo -e "${RED}❌ Failed to push to superapp-backend/$TARGET_BRANCH.${RESET}\n"
  fi
}

# Helper to push to superapp-mobile (Mobile super-app)
# super-app/ is its own Git repository inside the monorepo (not a subtree), so
# its own current branch is pushed. Jenkins builds the mobile app from `development`.
push_superapp_mobile() {
  echo -e "${BOLD}${BLUE}📱 [4/4] Pushing super-app (its own repository) to superapp-mobile...${RESET}"
  local M="$GIT_ROOT/super-app"
  if [ ! -e "$M/.git" ]; then
    echo -e "${YELLOW}ℹ super-app is not a Git repository here: skipped.${RESET}\n"
    return 0
  fi
  if ! git -C "$M" remote get-url superapp-mobile >/dev/null 2>&1; then
    echo -e "${RED}❌ super-app has no remote 'superapp-mobile': skipped.${RESET}\n"
    return 0
  fi
  local MB
  MB=$(git -C "$M" rev-parse --abbrev-ref HEAD | tr -d '\r\n ')
  if [ -n "$(git -C "$M" status --porcelain)" ]; then
    echo -e "${YELLOW}⚠ super-app has uncommitted changes (not pushed):${RESET}"
    git -C "$M" status --short
    echo -e "${YELLOW}  Commit them inside super-app first if they should go out.${RESET}"
  fi

  echo -e "  ${CYAN}➜ git push superapp-mobile $MB${RESET}"
  if git -C "$M" push superapp-mobile "$MB:refs/heads/$MB"; then
    echo -e "${GREEN}✔ super-app $MB pushed to superapp-mobile/$MB.${RESET}"
  else
    echo -e "${RED}❌ Push of super-app $MB failed (behind the remote? pull it first).${RESET}\n"
    return 0
  fi

  if [ "$MB" != "development" ]; then
    read -r -p "Also merge super-app $MB into development (the branch Jenkins builds)? [y/N]: " MERGE_DEV
    if [[ "$(echo "$MERGE_DEV" | tr -d '\r')" =~ ^[yY] ]]; then
      if [ -n "$(git -C "$M" status --porcelain)" ]; then
        echo -e "${RED}❌ Not merging: super-app has uncommitted changes.${RESET}\n"
        return 0
      fi
      git -C "$M" fetch -q superapp-mobile development
      if git -C "$M" checkout -q development 2>/dev/null || git -C "$M" checkout -q -b development superapp-mobile/development; then
        git -C "$M" merge -q --ff-only superapp-mobile/development 2>/dev/null || true
        if git -C "$M" merge --no-edit "$MB"; then
          if git -C "$M" push superapp-mobile development; then
            echo -e "${GREEN}✔ development updated on superapp-mobile.${RESET}"
          else
            echo -e "${RED}❌ Push of development failed.${RESET}"
          fi
        else
          git -C "$M" merge --abort 2>/dev/null || true
          echo -e "${RED}❌ Merge conflict: development left unchanged. Merge it by hand inside super-app.${RESET}"
        fi
        git -C "$M" checkout -q "$MB"
      else
        echo -e "${RED}❌ Could not switch super-app to development.${RESET}"
      fi
    fi
  fi
  echo ""
}

case "$REMOTE_CHOICE" in
  1)
    push_origin
    push_superapp_manager
    push_superapp_backend
    push_superapp_mobile
    ;;
  2)
    push_superapp_manager
    push_superapp_backend
    push_superapp_mobile
    ;;
  3)
    push_superapp_mobile
    ;;
  4)
    push_superapp_manager
    ;;
  5)
    push_superapp_backend
    ;;
  6)
    push_origin
    ;;
esac

echo -e "${BOLD}${GREEN}======================================================${RESET}"
echo -e "${BOLD}${GREEN} 🎉 All selected operations completed! ${RESET}"
echo -e "${CYAN} Not covered here: mini app packages (../superapp-miniapps) are their own repository.${RESET}"
echo -e "${BOLD}${GREEN}======================================================${RESET}"

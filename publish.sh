#!/usr/bin/env bash
set -euo pipefail

REPO_NAME="valorant-aim-trainer"
GITHUB_USER="mohammadeiad"
REMOTE_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

git init
git add .
if ! git diff --cached --quiet; then
  git commit -m "Add Valorant aim tracking trainer"
fi
git branch -M main
if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REMOTE_URL"
else
  git remote add origin "$REMOTE_URL"
fi
git push -u origin main

echo "Published: https://${GITHUB_USER}.github.io/${REPO_NAME}/"

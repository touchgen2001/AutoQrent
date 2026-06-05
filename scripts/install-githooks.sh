#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -d ".githooks" ]]; then
  echo ".githooks directory not found."
  exit 1
fi

chmod +x .githooks/pre-commit .githooks/pre-push
git config core.hooksPath .githooks

echo "Git hooks installed via core.hooksPath=.githooks"

#!/usr/bin/env bash
set -euo pipefail

# Install the exact five skills shown in the supplied reference plus their
# orchestrator. Run from the RABTO repository root on the developer machine.
if [[ ! -f package.json ]]; then
  echo "Run this script from the RABTO repository root." >&2
  exit 1
fi
command -v git >/dev/null 2>&1 || { echo "Git is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Node.js/npm is required." >&2; exit 1; }
PROJECT_ROOT="$(pwd)"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 https://github.com/arthurmi681/design-workbench-skills.git "$TMP_DIR/design-workbench-skills"
cd "$TMP_DIR/design-workbench-skills"

# Validate the complete upstream bundle before changing the local skill setup.
./test.sh

# Installs Taste, Web Design Guidelines, Playwright CLI, Awesome Design,
# Image-to-Code, and the Design Workbench orchestrator. Browser download is
# intentionally skipped; it can be installed later with playwright-cli.
./install.sh --no-browser

echo
echo "Installed the design-workbench skill pack."

# Return to RABTO so the project-scoped UI/UX Pro Max skill is installed here.
cd "$PROJECT_ROOT"

# Install the official UI/UX Pro Max design-intelligence skill for the
# universal Agent Skills directory used by Codex-compatible agents.
npm exec --yes --package=ui-ux-pro-max-cli -- uipro init --ai universal

echo "Installed UI/UX Pro Max for the universal agent skills directory."

# Install Motion's official AI documentation skill and React animation package.
npx --yes motion-ai
npm install motion

echo "Installed Motion AI skill and Motion for React runtime."
echo "Start a new agent session so the newly installed skills are discovered."

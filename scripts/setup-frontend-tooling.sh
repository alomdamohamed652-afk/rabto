#!/usr/bin/env bash
set -euo pipefail

# Run from the RABTO repository root.
if [[ ! -f package.json ]]; then
  echo "Run this script from the RABTO repository root." >&2
  exit 1
fi

node --version
npm --version

npx skills add https://github.com/heydamir/unslop
npx skills add pbakaus/impeccable
npx skills add https://github.com/Leonxlnx/taste-skill --skill "redesign-existing-projects"
npx skills add https://github.com/greensock/gsap-skills
npx skills add Jakubantalik/transitions.dev

npm install -D designlang @playwright/cli
npx playwright-cli install

echo "Toolchain setup complete. See docs/FRONTEND_TOOLING.md for optional Impeccable hooks, Designlang MCP, React Bits, and GSAP runtime usage."

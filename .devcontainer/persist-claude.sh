#!/usr/bin/env bash
# Keep Claude Code login/config across Codespace rebuilds.
# /workspaces survives rebuilds; $HOME does not. CLAUDE_CONFIG_DIR (set in
# devcontainer.json) points at a folder outside the repo so it's never committed.
set -euo pipefail

STORE="${CLAUDE_CONFIG_DIR:-/workspaces/.claude-home}"
mkdir -p "$STORE"
chmod 700 "$STORE"

# One-time migration of an existing login from $HOME
if [ -d "$HOME/.claude" ] && [ ! -L "$HOME/.claude" ]; then
  cp -a --update=none "$HOME/.claude/." "$STORE/" && rm -rf "$HOME/.claude"
fi
if [ -f "$HOME/.claude.json" ] && [ ! -L "$HOME/.claude.json" ] && [ ! -e "$STORE/.claude.json" ]; then
  mv "$HOME/.claude.json" "$STORE/.claude.json"
fi

# Symlink ~/.claude so tools that ignore CLAUDE_CONFIG_DIR find the same data
[ -e "$HOME/.claude" ] || ln -s "$STORE" "$HOME/.claude"

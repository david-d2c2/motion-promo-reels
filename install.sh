#!/usr/bin/env bash
# motion-promo-reels installer (macOS / Linux)
#
#   curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash -s -- --project
#   curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash -s -- --dir /path/to/skills
#   curl -fsSL https://raw.githubusercontent.com/david-d2c2/motion-promo-reels/main/install.sh | bash -s -- --agents
#
# Options:
#   --dir PATH   skills folder to install into (the skill goes in PATH/motion-promo-reels)
#   --project    install into ./.claude/skills of the current folder
#   --agents     install into ~/.agents/skills (agents that read that folder, such as pi)
#   --force      replace an existing installation
#   --version    tag to install (default: latest)
set -euo pipefail

NAME="motion-promo-reels"
REPO="david-d2c2/motion-promo-reels"
DEST_PARENT="${HOME}/.claude/skills"
FORCE=0
TAG="latest"

while [ $# -gt 0 ]; do
  case "$1" in
    --dir)      [ $# -ge 2 ] || { echo "--dir needs a path" >&2; exit 1; }; DEST_PARENT="$2"; shift 2 ;;
    --dir=*)    DEST_PARENT="${1#--dir=}"; shift ;;
    --project)  DEST_PARENT="$(pwd)/.claude/skills"; shift ;;
    --agents)   DEST_PARENT="${HOME}/.agents/skills"; shift ;;
    --force)    FORCE=1; shift ;;
    --version)  [ $# -ge 2 ] || { echo "--version needs a tag" >&2; exit 1; }; TAG="$2"; shift 2 ;;
    -h|--help)  sed -n '2,14p' "$0" 2>/dev/null || true; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

case "$DEST_PARENT" in "~"|"~/"*) DEST_PARENT="${HOME}${DEST_PARENT#\~}" ;; esac
DEST="${DEST_PARENT%/}/${NAME}"

if [ "$TAG" = "latest" ]; then
  URL="https://github.com/${REPO}/releases/latest/download/${NAME}.zip"
else
  URL="https://github.com/${REPO}/releases/download/${TAG}/${NAME}.zip"
fi

if [ -e "$DEST" ] && [ "$FORCE" -ne 1 ]; then
  echo "Already installed at $DEST" >&2
  echo "Run again with --force to replace it." >&2
  exit 1
fi

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading $URL"
curl -fsSL "$URL" -o "$TMP/skill.zip"

if command -v unzip >/dev/null 2>&1; then
  unzip -q "$TMP/skill.zip" -d "$TMP/x"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c 'import sys,zipfile; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$TMP/skill.zip" "$TMP/x"
elif command -v bsdtar >/dev/null 2>&1; then
  mkdir -p "$TMP/x" && bsdtar -xf "$TMP/skill.zip" -C "$TMP/x"
else
  echo "Need unzip, python3 or bsdtar to extract the package" >&2; exit 1
fi

[ -f "$TMP/x/$NAME/SKILL.md" ] || { echo "Unexpected package layout: $NAME/SKILL.md not found" >&2; exit 1; }

mkdir -p "$DEST_PARENT"
rm -rf "$DEST"
mv "$TMP/x/$NAME" "$DEST"

echo "Installed: $DEST"
echo "Restart your agent (or open a new session) and ask: \"make a promo reel for this product\"."
echo "Rendering needs Node 18+, ffmpeg, Python 3 (numpy, scipy) and Chrome or Edge. See README.md."

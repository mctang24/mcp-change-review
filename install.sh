#!/bin/sh
set -eu

repo="${MCPCR_REPO:-https://github.com/mctang24/mcp-change-review.git}"
ref="${MCPCR_REF:-main}"
install_dir="${MCPCR_INSTALL_DIR:-$HOME/.local/bin}"
app_dir="${MCPCR_APP_DIR:-$HOME/.local/share/mcp-change-review}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

need git
need node
need npm

node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) process.exit(1);' || {
  echo "Node.js 20 or newer is required." >&2
  exit 1
}

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT INT TERM

git clone --depth 1 --branch "$ref" "$repo" "$tmp_dir/repo" >/dev/null 2>&1
cd "$tmp_dir/repo"

npm ci >/dev/null
npm run build >/dev/null

rm -rf "$app_dir"
mkdir -p "$app_dir" "$install_dir"
cp -R dist node_modules package.json package-lock.json "$app_dir"/

cat > "$install_dir/mcpcr" <<EOF
#!/bin/sh
exec node "$app_dir/dist/src/cli.js" "\$@"
EOF
chmod +x "$install_dir/mcpcr"

echo "mcp-change-review installed to $install_dir/mcpcr"
case ":$PATH:" in
  *":$install_dir:"*) ;;
  *) echo "Add $install_dir to PATH to run mcpcr from any directory." ;;
esac

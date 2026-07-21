#!/bin/sh
set -eu

RUNTIME_CONFIG_FILE="/usr/share/nginx/html/runtime-config.js"
API_URL="${VITE_API_URL:-/api}"
LOG_LEVEL="${VITE_LOG_LEVEL:-info}"

escape_js_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

API_URL_ESCAPED="$(escape_js_string "$API_URL")"
LOG_LEVEL_ESCAPED="$(escape_js_string "$LOG_LEVEL")"

cat > "$RUNTIME_CONFIG_FILE" <<EOF
window.__APP_CONFIG__ = {
  VITE_API_URL: "$API_URL_ESCAPED",
  VITE_LOG_LEVEL: "$LOG_LEVEL_ESCAPED"
};
EOF

echo "runtime-config.js generated with VITE_API_URL=$API_URL"

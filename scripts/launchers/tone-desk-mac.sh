#!/bin/sh
set -eu

show_error() {
    /usr/bin/osascript -e 'display alert "GP-200 Tone Desk" message "'"$1"'" as critical'
}

bundle_dir=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
page_dir="$HOME/Library/Application Support/GP-200 Tone Desk"
page="$page_dir/GP-200 Tone Desk.html"

# Keep the browser's page address stable when the app is moved or updated.
if ! /bin/mkdir -p "$page_dir" || ! /bin/cp "$bundle_dir/Resources/GP-200 Tone Desk.html" "$page"; then
    show_error 'Tone Desk could not save its page in your Application Support folder.'
    exit 1
fi

if /usr/bin/open -a 'Google Chrome' "$page" 2>/dev/null; then
    exit 0
fi
if /usr/bin/open -a 'Microsoft Edge' "$page" 2>/dev/null; then
    exit 0
fi
show_error 'Install Google Chrome or Microsoft Edge, then open Tone Desk again.'
exit 1

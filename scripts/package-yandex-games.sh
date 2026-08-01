#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
output_dir="$project_dir/dist"
output_file="${1:-$output_dir/slovoboy-yandex-games.zip}"

mkdir -p "$(dirname "$output_file")"
cd "$project_dir"
zip -q -r -FS "$output_file" index.html styles.css game.js word-bank.js yandex-games.js sounds.js
echo "Готово: $output_file"

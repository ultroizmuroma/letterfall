#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
style_engine_dir="$project_dir/../browser-game-style-engine"
output_dir="$project_dir/dist"
output_file="${1:-$output_dir/slovoboy-yandex-games.zip}"

if [[ -f "$style_engine_dir/scripts/build.mjs" ]]; then
  node "$style_engine_dir/scripts/build.mjs" --consumer=letterfall
elif [[ ! -f "$project_dir/vendor/game-style-engine.css" ]]; then
  echo "Ошибка: не найден ни общий движок стилей, ни готовый vendor/game-style-engine.css" >&2
  exit 1
fi
mkdir -p "$(dirname "$output_file")"
cd "$project_dir"
zip -q -r -FS "$output_file" index.html styles.css vendor/game-style-engine.css game.js word-bank.js yandex-games.js sounds.js
echo "Готово: $output_file"

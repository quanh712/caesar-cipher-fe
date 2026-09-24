#!/bin/sh
set -eu

base_url=${1:-http://127.0.0.1:8080}
validation_dir=$(mktemp -d)
trap 'rm -rf "$validation_dir"' EXIT

curl --fail --show-error --silent "$base_url/" > /dev/null
curl --fail --show-error --silent "$base_url/openapi.json" > /dev/null

text_result=$(
  curl --fail --show-error --silent \
    -X POST "$base_url/api/caesar/encrypt" \
    -H 'Content-Type: application/json' \
    -d '{"text":"Hello World","key":3}'
)

if [ "$text_result" != '{"success":true,"result":"Khoor Zruog"}' ]; then
  echo "Text API trả kết quả không mong đợi: $text_result" >&2
  exit 1
fi

affine_result=$(
  curl --fail --show-error --silent \
    -X POST "$base_url/api/affine/encrypt" \
    -H 'Content-Type: application/json' \
    -d '{"text":"HELLO","a":5,"b":8}'
)

if [ "$affine_result" != '{"success":true,"result":"RCLLA"}' ]; then
  echo "Affine API trả kết quả không mong đợi: $affine_result" >&2
  exit 1
fi

columnar_result=$(
  curl --fail --show-error --silent \
    -X POST "$base_url/api/columnar/encrypt" \
    -H 'Content-Type: application/json' \
    -d '{"text":"ABCDE","key":"3 1 4 2"}'
)

if [ "$columnar_result" != '{"success":true,"result":"BDAEC"}' ]; then
  echo "Columnar API trả kết quả không mong đợi: $columnar_result" >&2
  exit 1
fi

file_preview=$(
  curl --fail --show-error --silent \
    -X POST "$base_url/api/caesar/file" \
    -F 'file=Hello World;filename=bao.cao.v2.txt;type=text/plain' \
    -F 'key=3' \
    -F 'action=encrypt' \
    -F 'response_mode=content'
)

if [ "$file_preview" != '{"success":true,"result":"Khoor Zruog"}' ]; then
  echo "File preview trả kết quả không mong đợi: $file_preview" >&2
  exit 1
fi

curl --fail --show-error --silent \
  --dump-header "$validation_dir/headers" \
  --output "$validation_dir/result" \
  -X POST "$base_url/api/caesar/file" \
  -F 'file=Hello World;filename=bao.cao.v2.txt;type=text/plain' \
  -F 'key=3' \
  -F 'action=encrypt' \
  -F 'response_mode=file'

if [ "$(cat "$validation_dir/result")" != 'Khoor Zruog' ]; then
  echo "File download có nội dung không mong đợi." >&2
  exit 1
fi

if ! grep -qi '^content-disposition: attachment; filename="bao.cao.v2.encrypted.txt"' "$validation_dir/headers"; then
  echo "File download có Content-Disposition không hợp lệ." >&2
  exit 1
fi

echo "Smoke test thành công: $base_url"

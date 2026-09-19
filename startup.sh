#!/bin/bash
set -eu
cd /workspace
if curl -sf -o /dev/null http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev &
i=1
while [ "$i" -le 40 ]; do
  if curl -sf -o /dev/null http://127.0.0.1:8080/; then
    exit 0
  fi
  sleep 0.5
  i=$((i + 1))
done
exit 1

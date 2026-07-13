#!/bin/bash
cd /home/z/my-project
while true; do
  SKIP_ENV_VALIDATION=1 node --max-old-space-size=2048 node_modules/.bin/next dev -p 3000 2>&1
  echo "[KEEPALIVE] Server exited, restarting in 2s..."
  sleep 2
done

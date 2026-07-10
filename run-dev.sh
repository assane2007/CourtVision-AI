#!/bin/bash
cd /home/z/my-project
while true; do
  SKIP_ENV_VALIDATION=1 node node_modules/next/dist/bin/next dev -p 3000 2>&1
  sleep 2
done

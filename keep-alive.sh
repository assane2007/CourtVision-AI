#!/bin/bash
cd /home/z/my-project
while true; do
  bun run dev
  echo "Server crashed, restarting in 3s..."
  sleep 3
done
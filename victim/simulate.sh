#!/bin/sh
echo "[VICTIM] Starting browsing simulation..."

while true; do
  echo "[VICTIM] Logging in..."
  curl -s \
    -b "session_token=s3cr3t-t0k3n-abc123xyz" \
    -H "User-Agent: Mozilla/5.0 VictimBrowser" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.dXNlcjphZG1pbg.fake_jwt_token" \
    http://10.0.0.20/login > /dev/null

  sleep 3

  echo "[VICTIM] Transferring funds..."
  curl -s -X POST \
    -b "session_token=s3cr3t-t0k3n-abc123xyz" \
    -H "User-Agent: Mozilla/5.0 VictimBrowser" \
    -H "Content-Type: application/json" \
    -d '{"to":"user2","amount":500}' \
    http://10.0.0.20/transfer > /dev/null

  sleep 5
done

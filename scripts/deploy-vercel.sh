#!/bin/bash
# Pushes all env vars from .env.local to Vercel and deploys to production.
set -e
cd "$(dirname "$0")/.."
vercel link --yes
grep -E '^[A-Z_]+=' .env.local | while IFS='=' read -r key value; do
  printf '%s' "$value" | vercel env add "$key" production --force
done
vercel deploy --prod

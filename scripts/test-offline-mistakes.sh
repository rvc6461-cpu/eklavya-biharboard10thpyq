#!/usr/bin/env bash
# Replay the offline mistake notebook tests locally with the same retry
# settings used in CI. Run with a specific Node version via your version
# manager, e.g.:
#   nvm use 20 && ./scripts/test-offline-mistakes.sh
# or:
#   fnm use 22 && ./scripts/test-offline-mistakes.sh

set -euo pipefail

TEST_FILE="src/lib/pyq/store.test.ts"
RETRIES=3
SLEEP_SECONDS=5

for i in $(seq 1 $RETRIES); do
  echo "::group::Attempt $i/$RETRIES"
  bunx vitest run "$TEST_FILE" > "attempt-$i-stdout.log" 2> "attempt-$i-stderr.log" || true
  EXIT_CODE=$?
  echo "::endgroup::"
  if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Attempt $i/$RETRIES succeeded."
    exit 0
  fi
  echo "❌ Attempt $i/$RETRIES failed with exit code $EXIT_CODE."
  echo "--- STDOUT ---"
  cat "attempt-$i-stdout.log"
  echo "--- STDERR ---"
  cat "attempt-$i-stderr.log"
  echo "--------------"
  if [ "$i" -lt "$RETRIES" ]; then
    echo "⏳ Retrying in ${SLEEP_SECONDS}s..."
    sleep "$SLEEP_SECONDS"
  fi
done

echo "🚨 All $RETRIES attempts exhausted — treating as persistent failure."
exit 1

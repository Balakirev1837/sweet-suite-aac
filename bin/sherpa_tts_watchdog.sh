#!/usr/bin/env bash
#
# sherpa_tts_watchdog.sh — Monitor the SherpaTTS service and auto-restart on failure.
#
# Periodically polls the /health endpoint. If the service is unreachable
# or reports an error status, the watchdog kills the existing process and
# starts a fresh instance. All restarts are logged with timestamps for
# post-incident debugging.
#
# Usage:
#   bin/sherpa_tts_watchdog.sh [BASE_URL] [CHECK_INTERVAL] [MAX_FAILURES]
#
# Environment:
#   SHERPA_TTS_BASE_URL          - TTS service URL (default: http://localhost:5003)
#   SHERPA_TTS_WATCHDOG_INTERVAL - Seconds between health checks (default: 30)
#   SHERPA_TTS_WATCHDOG_FAILURES - Consecutive failures before restart (default: 3)
#   SHERPA_TTS_PID_FILE          - Path to PID file (default: tmp/pids/sherpa_tts.pid)
#   SHERPA_TTS_LOG_FILE          - Path to watchdog log (default: log/sherpa_tts_watchdog.log)
#
# Exit codes:
#   0 - Normal shutdown (SIGTERM/SIGINT)
#   1 - Fatal error during startup

set -euo pipefail

BASE_URL="${1:-${SHERPA_TTS_BASE_URL:-http://localhost:5003}}"
CHECK_INTERVAL="${2:-${SHERPA_TTS_WATCHDOG_INTERVAL:-30}}"
MAX_FAILURES="${3:-${SHERPA_TTS_WATCHDOG_FAILURES:-3}}"
HEALTH_URL="${BASE_URL%/}/health"
PID_FILE="${SHERPA_TTS_PID_FILE:-tmp/pids/sherpa_tts.pid}"
LOG_FILE="${SHERPA_TTS_LOG_FILE:-log/sherpa_tts_watchdog.log}"

# Ensure directories exist
mkdir -p "$(dirname "$PID_FILE")" 2>/dev/null || true
mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

log() {
    echo "[$(timestamp)] [watchdog] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(timestamp)] [watchdog] ERROR: $*" | tee -a "$LOG_FILE" >&2
}

# ---------------------------------------------------------------------------
# Service management
# ---------------------------------------------------------------------------

# Find the PID of the running SherpaTTS server process.
# Checks the PID file first, then falls back to pgrep.
find_tts_pid() {
    local pid=""
    # Check PID file first
    if [ -f "$PID_FILE" ]; then
        pid=$(cat "$PID_FILE" 2>/dev/null || true)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            echo "$pid"
            return 0
        fi
    fi
    # Fall back to finding the process by command line
    pid=$(pgrep -f "python.*lib/sherpa_tts/server.py" 2>/dev/null | head -1 || true)
    if [ -n "$pid" ]; then
        echo "$pid"
        return 0
    fi
    return 1
}

# Start the SherpaTTS server in the background.
start_tts() {
    log "Starting SherpaTTS server..."
    python lib/sherpa_tts/server.py >> "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    log "SherpaTTS started with PID ${pid}"
    # Give the service a moment to begin initializing
    sleep 2
}

# Stop the SherpaTTS server gracefully, then forcefully if needed.
stop_tts() {
    local pid
    pid=$(find_tts_pid) || true
    if [ -n "$pid" ]; then
        log "Stopping SherpaTTS (PID ${pid})..."
        kill -TERM "$pid" 2>/dev/null || true
        # Wait up to 15 seconds for graceful shutdown
        local waited=0
        while [ $waited -lt 15 ]; do
            if ! kill -0 "$pid" 2>/dev/null; then
                log "SherpaTTS stopped gracefully"
                rm -f "$PID_FILE"
                return 0
            fi
            sleep 1
            waited=$((waited + 1))
        done
        # Force kill
        log "Force-killing SherpaTTS (PID ${pid})..."
        kill -KILL "$pid" 2>/dev/null || true
        rm -f "$PID_FILE"
        log "SherpaTTS killed"
    else
        log "No SherpaTTS process found"
    fi
}

# Restart the SherpaTTS server.
restart_tts() {
    log "=== RESTARTING SherpaTTS service ==="
    stop_tts
    sleep 2
    start_tts
    log "Restart complete"
}

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

check_health() {
    local payload
    payload=$(curl --silent --fail --max-time 5 "$HEALTH_URL" 2>/dev/null) || return 1

    local status
    status=$(echo "$payload" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print('ok' if data.get('model_loaded') else data.get('status', 'unknown'))
" 2>/dev/null || echo "unknown")

    if [ "$status" = "ok" ]; then
        return 0
    else
        log "Health check: status=${status}"
        return 1
    fi
}

# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

cleanup() {
    log "Watchdog shutting down (received signal)"
    exit 0
}

trap cleanup SIGTERM SIGINT

# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

log "Watchdog started (url=${HEALTH_URL}, interval=${CHECK_INTERVAL}s, max_failures=${MAX_FAILURES})"

# If the service isn't running yet, start it
if ! find_tts_pid > /dev/null 2>&1; then
    start_tts
fi

consecutive_failures=0

while true; do
    if check_health; then
        if [ "$consecutive_failures" -gt 0 ]; then
            log "Health check recovered after ${consecutive_failures} failure(s)"
        fi
        consecutive_failures=0
    else
        consecutive_failures=$((consecutive_failures + 1))
        log_error "Health check failed (${consecutive_failures}/${MAX_FAILURES})"

        if [ "$consecutive_failures" -ge "$MAX_FAILURES" ]; then
            log_error "Max failures reached — triggering auto-restart"
            restart_tts
            consecutive_failures=0
        fi
    fi

    sleep "$CHECK_INTERVAL"
done

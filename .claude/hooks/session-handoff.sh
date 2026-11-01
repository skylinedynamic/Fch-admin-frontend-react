#!/usr/bin/env bash
# .claude/hooks/session-handoff.sh
#
# Fires on SessionEnd. Resumes the ending session headlessly and asks it to
# write a short handoff note into docs/handoff/, so the next session (or
# person) picking up this repo has context: what was done, why, what's open.
set -uo pipefail

# The `claude --resume -p` below is a session too: when it ends, SessionEnd runs
# this hook again for the same session, which resumes it again - an endless
# chain of empty notes. That inner run is marked, so stop there. Both names are
# honoured: FCH_HANDOFF_HOOK and CLAUDE_HANDOFF_RUN were each used by a branch,
# and a run started by either version must not start another.
[ -n "${FCH_HANDOFF_HOOK:-}" ] && exit 0
[ -n "${CLAUDE_HANDOFF_RUN:-}" ] && exit 0

input="$(cat)"
field() {
  printf '%s' "$input" | node -e '
    let d = "";
    process.stdin.on("data", c => d += c);
    process.stdin.on("end", () => {
      try { process.stdout.write(String(JSON.parse(d)[process.argv[1]] || "")); } catch (e) {}
    });
  ' "$1"
}
session_id="$(field session_id)"
transcript="$(field transcript_path)"

[ -z "$session_id" ] && exit 0

# Second guard that doesn't rely on the env var: one note per session at a time.
# If a run for this session is already in progress (or started < 10 min ago), stop.
lock="${TMPDIR:-/tmp}/fch-handoff-${session_id}.lock"
if [ -f "$lock" ] && [ -n "$(find "$lock" -mmin -10 2>/dev/null)" ]; then
  exit 0
fi
touch "$lock"

# Nothing worth handing off: no transcript, or no prompt typed by the user
# (e.g. Claude opened then closed, or /clear right after a branch switch).
if [ -n "$transcript" ] && [ -f "$transcript" ]; then
  prompts="$(node -e '
    const lines = require("fs").readFileSync(process.argv[1], "utf8").split("\n");
    let n = 0;
    for (const l of lines) {
      try {
        const e = JSON.parse(l);
        if (e.type !== "user" || e.isMeta) continue;
        const c = e.message && e.message.content;
        const text = typeof c === "string" ? c
          : Array.isArray(c) ? c.filter(p => p.type === "text").map(p => p.text).join("") : "";
        if (text.trim() && !/^<(command-|local-command-)/.test(text.trim())) n++;
      } catch (err) {}
    }
    process.stdout.write(String(n));
  ' "$transcript" 2>/dev/null)"
  [ "${prompts:-0}" -eq 0 ] && { rm -f "$lock"; exit 0; }
fi

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
ts="$(date +%Y-%m-%d_%H-%M-%S)"
short_id="${session_id:0:8}"
out="$root/docs/handoff/${ts}_${short_id}.md"

# Write to a temp file first: if the hook is killed mid-run (timeout, /clear,
# closing the terminal) no empty file is left in docs/handoff/.
tmp="$(mktemp)"
trap 'rm -f "$tmp" "$lock"' EXIT
FCH_HANDOFF_HOOK=1 CLAUDE_HANDOFF_RUN=1 claude --resume "$session_id" -p "Write a concise session handoff note in Markdown for whoever (or whichever session) picks this work up next in this repo. Cover, only using this conversation: 1) what was done this session, 2) key decisions and why, 3) files/areas touched, 4) open next steps or blockers. Output ONLY the markdown content itself — no preamble, no code fences around it." > "$tmp" 2>/dev/null

# Keep it only if it's a real note: non-trivial length and not a CLI/API error.
if [ "$(wc -c < "$tmp")" -ge 200 ] && ! head -n 3 "$tmp" | grep -qiE '^(API Error|Error:|Execution error|No conversation found)'; then
  mkdir -p "$root/docs/handoff"
  mv "$tmp" "$out"
else
  rm -f "$tmp"
fi
rm -f "$lock"

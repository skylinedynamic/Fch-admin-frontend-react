#!/usr/bin/env bash
# .claude/hooks/session-handoff.sh
#
# Fires on SessionEnd. Resumes the ending session headlessly and asks it to
# write a short handoff note into docs/handoff/, so the next session (or
# person) picking up this repo has context: what was done, why, what's open.
set -uo pipefail

input="$(cat)"
session_id="$(printf '%s' "$input" | node -e '
  let d = "";
  process.stdin.on("data", c => d += c);
  process.stdin.on("end", () => {
    try { process.stdout.write(JSON.parse(d).session_id || ""); } catch (e) {}
  });
')"

[ -z "$session_id" ] && exit 0

root="${CLAUDE_PROJECT_DIR:-$(pwd)}"
mkdir -p "$root/docs/handoff"
ts="$(date +%Y-%m-%d_%H-%M-%S)"
short_id="${session_id:0:8}"
out="$root/docs/handoff/${ts}_${short_id}.md"

claude --resume "$session_id" -p "Write a concise session handoff note in Markdown for whoever (or whichever session) picks this work up next in this repo. Cover, only using this conversation: 1) what was done this session, 2) key decisions and why, 3) files/areas touched, 4) open next steps or blockers. Output ONLY the markdown content itself — no preamble, no code fences around it." > "$out" 2>/dev/null

# Don't leave an empty file behind if the call produced nothing (e.g. resume failed).
[ -s "$out" ] || rm -f "$out"

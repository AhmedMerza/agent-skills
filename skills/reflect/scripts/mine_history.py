#!/usr/bin/env python3
"""Count how each skill was used in past sessions and what the user said right after.

Reads ~/.claude/projects/*/*.jsonl. A skill counts as used when the model called the Skill
tool, or the user typed it as a slash command. Throwaway sessions (scratchpads, /tmp) are
skipped. Prints JSON; never writes anything.

usage: mine_history.py [--since DAYS] [--skill NAME] [--projects-dir DIR] [--examples N]
"""
import argparse, json, os, re, sys, glob, datetime, collections

CORRECTION = re.compile(r"\b(no[,.! ]|nope|wrong|don'?t|do not|stop|that'?s not|not what|revert|undo|i said|again|why did you|instead)\b", re.I)
NOISE = ("<system-reminder>", "<task-notification>", "<local-command", "<command-name>", "[Request interrupted", "<pasted_content")
SLASH = re.compile(r"<command-name>/?([\w:.-]+)</command-name>")


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def is_real_user_text(text):
    t = text.strip()
    return bool(t) and not t.startswith(NOISE)


def mine(path, cutoff):
    """Yield one record per skill use in a session file."""
    last_task = None  # the last real user message, the likely task a skill was invoked for
    pending = []      # uses still waiting for the user's next message
    for line in open(path, errors="replace"):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        ts = d.get("timestamp")
        if cutoff and ts and ts < cutoff:
            continue
        msg = d.get("message") or {}
        content = msg.get("content")
        if d.get("type") == "assistant" and isinstance(content, list):
            for b in content:
                if b.get("type") == "tool_use" and b.get("name") == "Skill":
                    name = (b.get("input") or {}).get("skill")
                    if name:
                        pending.append(dict(skill=name.split(":")[-1], via="tool", ts=ts, session=d.get("sessionId"), cwd=d.get("cwd"), branch=d.get("gitBranch"), task=last_task))
        elif d.get("type") == "user":
            text = text_of(content)
            slash = SLASH.search(text)
            if slash and not any(b.get("type") == "tool_result" for b in content if isinstance(b, dict)) if isinstance(content, list) else slash:
                pending.append(dict(skill=slash.group(1).split(":")[-1], via="slash", ts=ts, session=d.get("sessionId"), cwd=d.get("cwd"), branch=d.get("gitBranch"), task=last_task))
            elif is_real_user_text(text):
                for use in pending:
                    use["followup"] = text.strip()[:240]
                    use["correction_cue"] = bool(CORRECTION.search(text[:400]))
                    yield use
                pending = []
                last_task = text.strip()[:600]
    for use in pending:
        yield use


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--since", type=int, default=0, help="only the last N days")
    ap.add_argument("--skill")
    ap.add_argument("--projects-dir", default=os.path.expanduser("~/.claude/projects"))
    ap.add_argument("--examples", type=int, default=5)
    a = ap.parse_args()
    cutoff = None
    if a.since:
        cutoff = (datetime.datetime.utcnow() - datetime.timedelta(days=a.since)).strftime("%Y-%m-%dT%H:%M:%S")
    skipped, per = [], collections.defaultdict(lambda: dict(uses=0, sessions=set(), via=collections.Counter(), correction_cues=0, projects=set(), examples=[]))
    for proj in sorted(glob.glob(os.path.join(a.projects_dir, "*"))):
        name = os.path.basename(proj)
        if "scratchpad" in name or name.startswith("-private-tmp") or name.startswith("-tmp"):
            skipped.append(name)
            continue
        for path in glob.glob(os.path.join(proj, "*.jsonl")):
            for use in mine(path, cutoff):
                if a.skill and use["skill"] != a.skill:
                    continue
                s = per[use["skill"]]
                s["uses"] += 1
                s["sessions"].add(use["session"])
                s["via"][use["via"]] += 1
                s["projects"].add(name)
                s["correction_cues"] += bool(use.get("correction_cue"))
                if len(s["examples"]) < a.examples:
                    s["examples"].append({k: use.get(k) for k in ("ts", "session", "cwd", "branch", "via", "task", "followup", "correction_cue")})
    out = {n: dict(s, sessions=len(s["sessions"]), via=dict(s["via"]), projects=sorted(s["projects"])) for n, s in sorted(per.items(), key=lambda kv: -kv[1]["uses"])}
    json.dump(dict(skills=out, skipped_throwaway_projects=len(skipped)), sys.stdout, indent=1)


if __name__ == "__main__":
    main()

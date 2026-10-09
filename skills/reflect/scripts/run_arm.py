#!/usr/bin/env python3
"""Run one task headlessly, either with a skill available or with that one skill blocked.

The blocked arm uses a deny rule, `Skill(NAME)`, so everything else about the session
(login, other skills, CLAUDE.md, model) is identical. Writes stream.jsonl, final.txt and
summary.json into --out. Never pushes and never uses the network tools.

usage: run_arm.py --arm with|without --skill NAME --workdir DIR --prompt-file FILE --out DIR
                  [--model haiku] [--max-usd 1.0] [--invoke natural|slash]
"""
import argparse, json, os, subprocess, sys

ALLOWED = "Read,Grep,Glob,Edit,Write,Bash,Skill"
DENIED = ["WebFetch", "WebSearch", "Bash(git push*)"]


def summarize(stream_path, skill):
    s = dict(skill_called=False, skill_blocked=False, tool_calls=0, cost_usd=None, turns=None, final="")
    for line in open(stream_path, errors="replace"):
        try:
            d = json.loads(line)
        except ValueError:
            continue
        if d.get("type") == "assistant":
            for b in d["message"].get("content", []):
                if b.get("type") == "tool_use":
                    s["tool_calls"] += 1
                    if b["name"] == "Skill" and (b.get("input") or {}).get("skill", "").split(":")[-1] == skill:
                        s["skill_called"] = True
        elif d.get("type") == "user":
            for b in d["message"].get("content", []) if isinstance(d["message"].get("content"), list) else []:
                if isinstance(b, dict) and b.get("type") == "tool_result" and "blocked by permission" in str(b.get("content")):
                    s["skill_blocked"] = True
        elif d.get("type") == "result":
            s.update(cost_usd=d.get("total_cost_usd"), turns=d.get("num_turns"), final=str(d.get("result", "")))
    return s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arm", choices=["with", "without"], required=True)
    ap.add_argument("--skill", required=True)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="haiku")
    ap.add_argument("--max-usd", default="1.0")
    ap.add_argument("--invoke", choices=["natural", "slash"], default="natural")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    prompt = open(a.prompt_file).read().strip()
    if a.arm == "with" and a.invoke == "slash":
        prompt = f"/{a.skill} {prompt}"
    denied = DENIED + ([f"Skill({a.skill})"] if a.arm == "without" else [])
    cmd = ["claude", "-p", prompt, "--model", a.model, "--max-budget-usd", a.max_usd, "--no-session-persistence",
           "--output-format", "stream-json", "--verbose", "--allowedTools", ALLOWED, "--disallowedTools", *denied]
    stream = os.path.join(a.out, "stream.jsonl")
    with open(stream, "w") as out:
        code = subprocess.run(cmd, cwd=a.workdir, stdin=subprocess.DEVNULL, stdout=out, stderr=subprocess.DEVNULL).returncode
    summary = dict(summarize(stream, a.skill), arm=a.arm, skill=a.skill, model=a.model, exit_code=code)
    # A slash invocation expands the skill before the stream starts, so no Skill tool call is ever logged.
    # It counts as fired when the run succeeded and the command was not rejected as unknown.
    if a.arm == "with" and a.invoke == "slash" and code == 0 and not summary["skill_called"]:
        rejected = "unknown skill" in summary["final"].lower() or "unknown command" in summary["final"].lower()
        summary["skill_called"] = not rejected
        summary["fired_via"] = "slash" if not rejected else None
    open(os.path.join(a.out, "final.txt"), "w").write(summary.pop("final"))
    json.dump(summary, open(os.path.join(a.out, "summary.json"), "w"), indent=1)
    print(json.dumps(summary))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Run one task headlessly, either with a skill available or with that one skill blocked.

The blocked arm uses a deny rule, `Skill(NAME)`, so everything else about the session
(login, other skills, CLAUDE.md, model) is identical. Writes stream.jsonl, final.txt and
summary.json into --out. Never pushes and never uses the network tools.

Device scenarios (a phone or emulator the arm drives): --device SERIAL holds an exclusive lock on
~/.cache/reflect/locks/SERIAL.lock (flock(2), so `flock` in a shell shares it) for setup + run, so arms
on one device never overlap, across concurrent reflect runs too. --setup SCRIPT runs before the arm with
SERIAL, OUT (<out>/setup) and ARM_OUT in the environment; it must put the device in the scenario's start
state and verify it, and a non-zero exit aborts the arm (summary.json says setup_failed). Screenshots the
arm saves into --out are listed in summary.json.

usage: run_arm.py --arm with|without|<label> --skill NAME --workdir DIR --prompt-file FILE --out DIR
                  [--model haiku] [--max-usd 1.0] [--invoke natural|slash] [--device SERIAL] [--setup SCRIPT]
  --arm without blocks the skill; any other label (with, old, new...) leaves it available.
"""
import argparse, fcntl, glob, json, os, subprocess, sys, time

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
    ap.add_argument("--arm", required=True)
    ap.add_argument("--skill", required=True)
    ap.add_argument("--workdir", required=True)
    ap.add_argument("--prompt-file", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--model", default="haiku")
    ap.add_argument("--max-usd", default="1.0")
    ap.add_argument("--invoke", choices=["natural", "slash"], default="natural")
    ap.add_argument("--allow", default=ALLOWED, help="allowed tools; narrow Bash for device arms, e.g. 'Read,Bash(/arm/droid:*)'")
    ap.add_argument("--device")
    ap.add_argument("--setup")
    a = ap.parse_args()
    a.out = os.path.abspath(a.out)
    os.makedirs(a.out, exist_ok=True)
    env = dict(os.environ)
    if a.device:
        env["SERIAL"] = a.device
        sdk = os.path.join(env.get("ANDROID_HOME", os.path.expanduser("~/Android/Sdk")), "platform-tools")
        env["PATH"] = sdk + os.pathsep + env["PATH"]
        lockdir = os.path.expanduser("~/.cache/reflect/locks"); os.makedirs(lockdir, exist_ok=True)
        lock = open(os.path.join(lockdir, f"{a.device}.lock"), "w")  # held until this process exits
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print(f"waiting for device lock {lock.name}", file=sys.stderr, flush=True)
            fcntl.flock(lock, fcntl.LOCK_EX)
    if a.setup:
        env.update(OUT=os.path.join(a.out, "setup"), ARM_OUT=a.out)
        os.makedirs(env["OUT"], exist_ok=True)
        with open(os.path.join(a.out, "setup.log"), "w") as log:
            rc = subprocess.run(["bash", a.setup], env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=subprocess.STDOUT).returncode
        if rc != 0:
            summary = dict(arm=a.arm, skill=a.skill, setup_failed=rc, device=a.device)
            json.dump(summary, open(os.path.join(a.out, "summary.json"), "w"), indent=1)
            print(json.dumps(summary)); sys.exit(3)
    prompt = open(a.prompt_file).read().strip()
    if a.arm == "with" and a.invoke == "slash":
        prompt = f"/{a.skill} {prompt}"
    denied = DENIED + ([f"Skill({a.skill})"] if a.arm == "without" else [])
    cmd = ["claude", "-p", prompt, "--model", a.model, "--max-budget-usd", a.max_usd, "--no-session-persistence",
           # explicit mode: the user's default (e.g. auto) would put a classifier in the arm and make arms differ
           "--permission-mode", "default",
           "--output-format", "stream-json", "--verbose", "--allowedTools", a.allow, "--disallowedTools", *denied]
    stream = os.path.join(a.out, "stream.jsonl")
    t0 = time.time()
    with open(stream, "w") as out:
        code = subprocess.run(cmd, cwd=a.workdir, env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=subprocess.DEVNULL).returncode
    summary = dict(summarize(stream, a.skill), arm=a.arm, skill=a.skill, model=a.model, exit_code=code,
                   seconds=round(time.time() - t0))
    if a.device:
        summary.update(device=a.device, screenshots=sorted(os.path.relpath(p, a.out) for p in glob.glob(os.path.join(a.out, "*.png"))))
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

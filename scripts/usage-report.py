#!/usr/bin/env python3
"""Where Claude Code tokens actually go.

Reads ~/.claude/projects/**/*.jsonl and reports the levers that matter:
amplification (how many times each context token gets re-read), what fills
the context, and how much spend happens at large context sizes.

    ./usage-report.py [days]        # default 7

Note: byte-size proxies mislead badly for images (base64 in the transcript is
~20x the billed token count), so everything here is attributed from real
usage counters, never from payload length.

One assistant message is written as several transcript lines (one per content
block), each repeating the same usage, so usage is counted once per message id.
The weekly plan limit is one bucket for all models (Fable included, capped at
50% of it), so the by-model split shows the mix, not separate budgets.
"""
import glob
import json
import os
import sys
import time
from collections import defaultdict

ROOT = os.path.expanduser("~/.claude/projects")
DAYS = float(sys.argv[1]) if len(sys.argv) > 1 else 7
CUTOFF = time.time() - DAYS * 86400
CUTOFF_ISO = time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(CUTOFF))
KEYS = ("input_tokens", "output_tokens",
        "cache_creation_input_tokens", "cache_read_input_tokens")


def total(d):
    return sum(d[k] for k in KEYS)


def total_of(u):
    return sum(u.get(k) or 0 for k in KEYS)


def usage_of(rec):
    msg = rec.get("message")
    if not isinstance(msg, dict):
        return None
    u = msg.get("usage")
    return u if isinstance(u, dict) else None


def records(path):
    try:
        fh = open(path, errors="replace")
    except OSError:
        return
    with fh:
        for line in fh:
            try:
                yield json.loads(line)
            except Exception:
                continue


main_files = [f for f in glob.glob(os.path.join(ROOT, "*", "*.jsonl"))
              if os.path.getmtime(f) >= CUTOFF]
sub_files = [f for f in glob.glob(os.path.join(ROOT, "*", "**", "*.jsonl"), recursive=True)
             if os.path.getmtime(f) >= CUTOFF and f not in set(main_files)]

agg = {"main": defaultdict(int), "subagent": defaultdict(int)}
bands = defaultdict(lambda: [0, 0])
peaks = {"main": [], "subagent": []}
by_project = defaultdict(int)
by_model = defaultdict(int)
by_day = defaultdict(int)
by_session = defaultdict(int)
session_project = {}
cc_by_tool = defaultdict(int)
n_by_tool = defaultdict(int)
bash_by_cmd = defaultdict(int)
bursts = []

for kind, files in (("main", main_files), ("subagent", sub_files)):
    for f in files:
        proj = os.path.relpath(f, ROOT).split(os.sep)[0]
        peak = 0
        pending, burst, burst_ctx = [], 0, 0
        seen_tool = {}
        seen_msg = set()
        for rec in records(f):
            msg = rec.get("message") if isinstance(rec.get("message"), dict) else {}
            role = msg.get("role")
            content = msg.get("content")

            # a real user message (not a tool_result) ends an autonomous stretch
            if kind == "main" and role == "user":
                is_text = (isinstance(content, str) and content.strip()) or (
                    isinstance(content, list)
                    and any(isinstance(c, dict) and c.get("type") == "text" for c in content))
                if is_text:
                    if burst:
                        bursts.append((burst, burst_ctx))
                    burst, burst_ctx = 0, 0

            u = usage_of(rec)
            mid = msg.get("id") or rec.get("uuid")
            if u and (mid in seen_msg or rec.get("timestamp", "") < CUTOFF_ISO):
                u = None
            if u:
                seen_msg.add(mid)
                t = total_of(u)
                by_model[(msg.get("model", "?"), kind)] += t
                by_day[rec.get("timestamp", "")[:10]] += t
                by_session[rec.get("sessionId", "?")] += t
                session_project[rec.get("sessionId", "?")] = proj
                for k in KEYS:
                    agg[kind][k] += u.get(k) or 0
                agg[kind]["turns"] += 1
                ctx = sum(u.get(k) or 0 for k in KEYS[:1] + KEYS[2:])
                peak = max(peak, ctx)
                by_project[proj] += t
                if kind == "main":
                    bands[min(int(ctx // 100_000) * 100, 900)][0] += ctx
                    bands[min(int(ctx // 100_000) * 100, 900)][1] += 1
                    burst_ctx += u.get("cache_creation_input_tokens") or 0
                    # attribute this turn's new material to the tools that just returned
                    if pending:
                        share = (u.get("cache_creation_input_tokens") or 0) // len(pending)
                        for name in pending:
                            cc_by_tool[name] += share
                            n_by_tool[name] += 1
                        pending = []

            if isinstance(content, list):
                for c in content:
                    if not isinstance(c, dict):
                        continue
                    if c.get("type") == "tool_use":
                        seen_tool[c.get("id")] = (c.get("name"), c.get("input") or {})
                        if kind == "main":
                            burst += 1
                    elif c.get("type") == "tool_result":
                        name, inp = seen_tool.get(c.get("tool_use_id"), ("?", {}))
                        pending.append(name)
                        if name == "Bash":
                            cmd = str(inp.get("command", "")).strip().split()
                            if cmd:
                                bash_by_cmd[os.path.basename(cmd[0])] += 1
        if burst:
            bursts.append((burst, burst_ctx))
        if peak:
            peaks[kind].append(peak)

grand = total(agg["main"]) + total(agg["subagent"])
if not grand:
    sys.exit(f"No transcripts modified in the last {DAYS} days.")

print(f"=== {DAYS:g}-day window — {len(main_files)} sessions, {len(sub_files)} subagent contexts ===\n")
print(f"GRAND TOTAL {grand:,} tokens")
for label in ("main", "subagent"):
    a = agg[label]
    print(f"  {label:9} {total(a):>15,}  ({100 * total(a) / grand:>5.1f}%)  turns={a['turns']:>7,}")
cr = sum(agg[k]["cache_read_input_tokens"] for k in agg)
oo = sum(agg[k]["output_tokens"] for k in agg)
print(f"  cache reads {cr:>13,}  ({100 * cr / grand:.1f}%)     output {oo:,} ({100 * oo / grand:.1f}%)")

print("\n=== AMPLIFICATION (times each context token is re-read) ===")
for label in ("main", "subagent"):
    a = agg[label]
    written = a["cache_creation_input_tokens"] + a["input_tokens"]
    pk = sorted(peaks[label])
    amp = a["cache_read_input_tokens"] / max(written, 1)
    med = pk[len(pk) // 2] if pk else 0
    print(f"  {label:9} {amp:>6.1f}x   written={written:>13,}  peak ctx median={med:>9,}  max={pk[-1] if pk else 0:>10,}")

print("\n=== WHAT FILLS THE MAIN CONTEXT (cache-creation attributed) ===")
tc = sum(cc_by_tool.values()) or 1
for name, v in sorted(cc_by_tool.items(), key=lambda kv: -kv[1])[:10]:
    print(f"  {str(name)[:20]:20} {v:>12,} {100 * v / tc:>6.1f}%  results={n_by_tool[name]:>6,}  avg={v // max(n_by_tool[name], 1):>7,}")
if bash_by_cmd:
    top = sorted(bash_by_cmd.items(), key=lambda kv: -kv[1])[:8]
    print("  bash commands by count: " + ", ".join(f"{k} {v:,}" for k, v in top))

print("\n=== SPEND BY CONTEXT SIZE AT TIME OF TURN ===")
gb = sum(v[0] for v in bands.values()) or 1
for b in sorted(bands):
    v = bands[b]
    label = f"{b}k-{b + 100}k" if b < 900 else "900k+"
    print(f"  {label:>12} {v[1]:>8,} turns {v[0]:>15,} {100 * v[0] / gb:>7.1f}%")
big = sum(v[0] for k, v in bands.items() if k >= 300)
print(f"  above 300k: {100 * big / gb:.1f}% of spend")

if bursts:
    print("\n=== AUTONOMOUS STRETCHES BETWEEN USER MESSAGES ===")
    tb = sum(b[1] for b in bursts) or 1
    for lo, hi in ((1, 1), (2, 5), (6, 10), (11, 20), (21, 40), (41, 80), (81, 10 ** 6)):
        sel = [b for b in bursts if lo <= b[0] <= hi]
        if not sel:
            continue
        t = sum(b[1] for b in sel)
        label = str(lo) if lo == hi else (f"{lo}-{hi}" if hi < 10 ** 6 else f"{lo}+")
        print(f"  {label:>8} calls {len(sel):>6,} stretches {t:>13,} ctx  {100 * t / tb:>6.1f}%")
    heavy = sum(b[1] for b in bursts if b[0] >= 11)
    print(f"  stretches of 11+ calls drive {100 * heavy / tb:.1f}% of context growth  <- delegate these")

print("\n=== BY MODEL (one weekly bucket; Fable capped at 50% of it) ===")
for (model, kind), v in sorted(by_model.items(), key=lambda kv: -kv[1]):
    print(f"  {model[:32]:32} {kind:9} {v:>15,} {100 * v / grand:>6.1f}%")

print("\n=== BY DAY (UTC) ===")
for day, v in sorted(by_day.items()):
    print(f"  {day}  {v:>15,}")

print("\n=== BY PROJECT ===")
for p, v in sorted(by_project.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  {p[:60]:60} {100 * v / grand:>6.1f}%")

print("\n=== TOP SESSIONS ===")
for sid, v in sorted(by_session.items(), key=lambda kv: -kv[1])[:8]:
    print(f"  {sid[:8]}  {v:>14,} {100 * v / grand:>6.1f}%  {session_project.get(sid, '')[:50]}")

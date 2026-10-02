#!/usr/bin/env python3
"""What did the run change? Compare a pristine SQLite DB with the run's copy, per table, by primary key.

usage: db-diff.py BEFORE.sqlite AFTER.sqlite [--ignore t1,t2] [--max-rows 5]

Reports added / removed / changed rows (changed rows list the columns that differ). Noise tables
(logs, sessions, tokens, cache, jobs) are summarised as counts only. Because the run used a COPY of the
dev DB, "restore the data" is just deleting the copy; this report is the "data left behind" list.
"""
import sqlite3, sys, argparse

NOISE = {"log_entries", "log_groups", "activity_events", "personal_access_tokens", "sessions", "cache",
         "cache_locks", "jobs", "job_batches", "failed_jobs", "visits", "user_devices", "otp_codes"}

QUIET_COLS = {"updated_at", "last_active_at", "last_login_at", "last_used_at"}

def around(a, b, w=36):
    """Show the first differing region of two values, not just their (identical) beginnings."""
    a, b = str(a), str(b)
    i = next((n for n in range(min(len(a), len(b))) if a[n] != b[n]), min(len(a), len(b)))
    lo = max(0, i - w // 2)
    return (("…" if lo else "") + a[lo:lo + w], ("…" if lo else "") + b[lo:lo + w])

def tables(c):
    return [r[0] for r in c.execute("select name from sqlite_master where type='table' and name not like 'sqlite_%'")]

def rows(c, t):
    cols = [r[1] for r in c.execute(f"pragma table_info('{t}')")]
    pk = [r[1] for r in c.execute(f"pragma table_info('{t}')") if r[5]] or (["id"] if "id" in cols else [])
    data = {}
    for i, r in enumerate(c.execute(f"select * from '{t}'")):
        key = tuple(r[cols.index(k)] for k in pk) if pk else (i,)
        data[key] = dict(zip(cols, r))
    return cols, data

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("before"); ap.add_argument("after")
    ap.add_argument("--ignore", default=""); ap.add_argument("--max-rows", type=int, default=5)
    a = ap.parse_args(); ignore = set(filter(None, a.ignore.split(",")))
    b, n = sqlite3.connect(a.before), sqlite3.connect(a.after)
    out, noise = [], []
    for t in sorted(set(tables(b)) | set(tables(n))):
        if t in ignore: continue
        if t not in tables(b): out.append(f"## {t}: NEW TABLE"); continue
        if t not in tables(n): out.append(f"## {t}: DROPPED TABLE"); continue
        _, rb = rows(b, t); _, rn = rows(n, t)
        added = [k for k in rn if k not in rb]; removed = [k for k in rb if k not in rn]
        changed = [k for k in rn if k in rb and any(rn[k][c] != rb[k].get(c) for c in rn[k] if c not in QUIET_COLS)]
        if not (added or removed or changed): continue
        if t in NOISE:
            noise.append(f"{t}: +{len(added)} -{len(removed)} ~{len(changed)}"); continue
        out.append(f"## {t}: +{len(added)} added, -{len(removed)} removed, ~{len(changed)} changed")
        def brief(r): return {k: v for k, v in r.items() if v is not None and k not in ("created_at", "updated_at", "password", "remember_token")}
        for k in added[:a.max_rows]: out.append(f"  + {k}: {str(brief(rn[k]))[:160]}")
        for k in removed[:a.max_rows]: out.append(f"  - {k}: {str(brief(rb[k]))[:160]}")
        for k in changed[:a.max_rows]:
            d = {c: around(rb[k][c], rn[k][c]) for c in rn[k] if rn[k][c] != rb[k].get(c) and c not in QUIET_COLS}
            if d: out.append(f"  ~ {k}: {d}")
    print("\n".join(out) if out else "no changes in non-noise tables")
    if noise: print("\n(noise tables, counts only) " + "; ".join(noise))

if __name__ == "__main__":
    main()

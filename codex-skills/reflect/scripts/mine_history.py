#!/usr/bin/env python3
"""Mine explicit Codex skill requests from history.jsonl; never infer silent invocation.

usage: mine_history.py [--since DAYS] [--skill NAME] [--history PATH] [--examples N]
"""
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import re
import sys

REQUEST = re.compile(r'(?<!\w)\$([a-z][a-z0-9-]*)\b')
CORRECTION = re.compile(r"\b(no[,.! ]|nope|wrong|don'?t|do not|stop|that'?s not|not what|revert|undo|i said|again|why did you|instead)\b", re.I)


def mine(path, installed, cutoff, example_limit):
    sessions = defaultdict(list)
    for line in path.open(errors='replace'):
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if row.get('session_id') and isinstance(row.get('text'), str):
            sessions[row['session_id']].append(row)
    result = defaultdict(lambda: dict(uses=0, sessions=set(), correction_cues=0, examples=[]))
    for session, rows in sessions.items():
        rows.sort(key=lambda row: row.get('ts', 0))
        for index, row in enumerate(rows):
            if cutoff and row.get('ts', 0) < cutoff:
                continue
            names = set(REQUEST.findall(row['text'])) & installed
            for name in names:
                record = result[name]
                record['uses'] += 1
                record['sessions'].add(session)
                followup = rows[index + 1]['text'] if index + 1 < len(rows) else ''
                record['correction_cues'] += bool(CORRECTION.search(followup[:400]))
                if len(record['examples']) < example_limit:
                    record['examples'].append(dict(ts=row.get('ts'), session=session, task=row['text'][:400],
                                                   followup=followup[:240], correction_cue=bool(CORRECTION.search(followup[:400]))))
    return {name: dict(uses=data['uses'], sessions=len(data['sessions']), correction_cues=data['correction_cues'],
                       examples=data['examples']) for name, data in sorted(result.items(), key=lambda pair: -pair[1]['uses'])}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--since', type=int, default=0)
    parser.add_argument('--skill')
    codex_home = Path(os.environ.get('CODEX_HOME', Path.home() / '.codex'))
    parser.add_argument('--history', type=Path, default=codex_home / 'history.jsonl')
    parser.add_argument('--examples', type=int, default=5)
    args = parser.parse_args()
    skill_root = codex_home / 'skills'
    installed = {path.name for path in skill_root.iterdir() if (path / 'SKILL.md').is_file()}
    if args.skill:
        installed &= {args.skill}
    cutoff = int((datetime.now(timezone.utc) - timedelta(days=args.since)).timestamp()) if args.since else None
    data = mine(args.history, installed, cutoff, args.examples) if args.history.exists() else {}
    json.dump(dict(skills=data, coverage='explicit $skill requests only; natural invocations are not observable here'), sys.stdout, indent=2)
    print()


if __name__ == '__main__':
    main()
